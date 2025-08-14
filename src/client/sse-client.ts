/**
 * MastraSSEClient - A client for consuming SSE streams from Mastra agents
 */
export class MastraSSEClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async streamChat(messages: any[], agentId: string = 'weatherAgent'): Promise<EventSource> {
    // 首先发送 POST 请求启动流
    const response = await fetch(`${this.baseUrl}/api/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        agentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 检查响应是否是 SSE 格式
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      throw new Error('Response is not a valid SSE stream');
    }

    // 使用 ReadableStream 处理响应
    return this.createEventSourceFromStream(response);
  }

  private createEventSourceFromStream(response: Response): EventSource {
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    
    // 创建一个模拟的 EventSource 对象
    const mockEventSource = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onopen: null as ((event: Event) => void) | null,
      close: () => reader.cancel(),
      readyState: 1, // OPEN
    };

    // 处理流数据
    (async () => {
      try {
        if (mockEventSource.onopen) {
          mockEventSource.onopen(new Event('open'));
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const lines = value.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                mockEventSource.readyState = 2; // CLOSED
                return;
              }
              
              if (mockEventSource.onmessage) {
                mockEventSource.onmessage(new MessageEvent('message', { data }));
              }
            }
          }
        }
      } catch (error) {
        if (mockEventSource.onerror) {
          mockEventSource.onerror(new Event('error'));
        }
      }
    })();

    return mockEventSource as EventSource;
  }
}

// 使用示例
// const client = new MastraSSEClient('https://your-worker.your-subdomain.workers.dev');
// 
// async function chatWithAgent() {
//   const messages = [
//     { role: 'user', content: 'What is the weather like in New York?' }
//   ];
// 
//   try {
//     const eventSource = await client.streamChat(messages);
//     
//     eventSource.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         console.log('Received:', data);
//         // 更新 UI
//       } catch (error) {
//         console.error('Failed to parse message:', event.data);
//       }
//     };
// 
//     eventSource.onerror = (error) => {
//       console.error('SSE error:', error);
//       eventSource.close();
//     };
// 
//   } catch (error) {
//     console.error('Failed to start chat:', error);
//   }
// }
