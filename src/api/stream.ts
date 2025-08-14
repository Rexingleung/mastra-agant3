import { mastra } from '../mastra';

interface RSCChunk {
  type: 'f' | '0' | 'e' | 'd';
  data: any;
}

class RSCToSSEConverter {
  private messageId: string = '';
  private accumulatedText: string = '';
  
  constructor(private onSSEData: (sseData: string) => void) {}
  
  processRSCLine(line: string): void {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    
    const type = line.substring(0, colonIndex) as RSCChunk['type'];
    const dataStr = line.substring(colonIndex + 1);
    
    try {
      const data = JSON.parse(dataStr);
      
      switch (type) {
        case 'f':
          // 框架/元数据信息
          if (data.messageId) {
            this.messageId = data.messageId;
          }
          this.onSSEData(`data: ${JSON.stringify({ type: 'metadata', ...data })}\n\n`);
          break;
          
        case '0':
          // 文本块
          this.accumulatedText += data;
          this.onSSEData(`data: ${JSON.stringify({ 
            type: 'text', 
            text: data, 
            accumulated: this.accumulatedText 
          })}\n\n`);
          break;
          
        case 'e':
        case 'd':
          // 结束/完成事件
          const completeData = {
            type: 'complete',
            messageId: this.messageId,
            fullText: this.accumulatedText,
            ...data
          };
          this.onSSEData(`data: ${JSON.stringify(completeData)}\n\n`);
          this.onSSEData('data: [DONE]\n\n');
          break;
      }
    } catch (error) {
      console.error('Failed to parse RSC chunk:', line, error);
    }
  }
}

export async function handleStreamRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { messages, agentId = 'weatherAgent' } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    const agent = mastra.getAgent(agentId);
    if (!agent) {
      return new Response(`Agent ${agentId} not found`, { status: 404 });
    }

    // 创建 SSE 响应流
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    
    // 创建 RSC 到 SSE 转换器
    const converter = new RSCToSSEConverter((sseData) => {
      writer.write(encoder.encode(sseData));
    });

    // 异步处理 Mastra 流
    (async () => {
      try {
        // 发送 SSE 初始配置
        await writer.write(encoder.encode('retry: 3000\n\n'));
        
        // 获取 Mastra 的流式响应
        const stream = agent.stream({
          messages,
          output: 'text',
        });

        // 检查流的类型
        if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
          // 如果是异步迭代器，直接处理
          for await (const chunk of stream) {
            if (chunk.text) {
              const sseData = `data: ${JSON.stringify({ 
                type: 'text', 
                text: chunk.text 
              })}\n\n`;
              await writer.write(encoder.encode(sseData));
            }
          }
          await writer.write(encoder.encode('data: [DONE]\n\n'));
        } else {
          // 如果是 ReadableStream，需要读取并转换
          const response = new Response(stream as any);
          const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
          
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
            
            for (const line of lines) {
              if (line.trim()) {
                converter.processRSCLine(line.trim());
              }
            }
          }
          
          // 处理剩余的缓冲数据
          if (buffer.trim()) {
            converter.processRSCLine(buffer.trim());
          }
        }
        
      } catch (error) {
        console.error('Stream processing error:', error);
        await writer.write(encoder.encode(`data: {"error": "Stream processing failed", "details": "${error.message}"}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Request handling error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
