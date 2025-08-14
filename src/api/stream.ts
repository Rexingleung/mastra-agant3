import { mastra } from '../mastra';
import { createSSEResponse } from '../utils/sse-middleware';

export async function handleStreamRequest(request: Request): Promise<Response> {
  // 处理 CORS 预检请求
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

    // 创建异步生成器来处理流式响应
    async function* streamGenerator() {
      try {
        const stream = agent.stream({
          messages,
          output: 'text', // 确保输出格式正确
        });

        for await (const chunk of stream) {
          if (chunk.text) {
            yield chunk.text;
          }
        }
      } catch (error) {
        console.error('Agent streaming error:', error);
        yield JSON.stringify({ error: 'Failed to stream response' });
      }
    }

    return createSSEResponse(streamGenerator());

  } catch (error) {
    console.error('Request handling error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
