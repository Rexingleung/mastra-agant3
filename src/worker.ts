import { mastra } from './mastra';
import { handleStreamRequest } from './api/stream';

export interface Env {
  // 环境变量类型定义
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 路由到流式端点
    if (url.pathname === '/api/stream') {
      return handleStreamRequest(request);
    }
    
    // 路由到 Mastra 默认处理器
    if (url.pathname.startsWith('/api/agents/')) {
      // 使用 Mastra 的内置路由处理
      return mastra.apiHandler(request, env, ctx);
    }

    // 健康检查端点
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // 默认响应
    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
