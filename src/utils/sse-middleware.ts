export interface SSEOptions {
  headers?: Record<string, string>;
  retry?: number;
}

export function createSSEResponse(
  generator: AsyncGenerator<string, void, unknown>,
  options: SSEOptions = {}
): Response {
  const { headers = {}, retry = 3000 } = options;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // 异步处理流数据
  (async () => {
    try {
      // 发送初始重连配置
      await writer.write(encoder.encode(`retry: ${retry}\n\n`));
      
      for await (const chunk of generator) {
        // 确保 chunk 不为空
        if (chunk && chunk.trim()) {
          // 格式化为标准 SSE 格式
          const sseData = formatSSEMessage(chunk);
          await writer.write(encoder.encode(sseData));
        }
      }
      
      // 发送结束信号
      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch (error) {
      console.error('SSE streaming error:', error);
      await writer.write(encoder.encode(`data: {"error": "Stream error"}\n\n`));
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
      'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
      ...headers,
    },
  });
}

function formatSSEMessage(data: string): string {
  // 清理和验证数据
  const cleanData = data.replace(/\r?\n/g, ' ').trim();
  
  if (!cleanData) return '';
  
  try {
    // 尝试解析为 JSON 以验证格式
    const parsed = JSON.parse(cleanData);
    return `data: ${JSON.stringify(parsed)}\n\n`;
  } catch {
    // 如果不是有效 JSON，作为文本处理
    return `data: ${JSON.stringify({ text: cleanData })}\n\n`;
  }
}
