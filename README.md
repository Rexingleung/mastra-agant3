# Mastra Weather Agent with SSE Support

A Mastra-powered weather agent with Server-Sent Events (SSE) support for Cloudflare Workers deployment.

## Features

- 🌤️ Weather information agent using DeepSeek AI
- 🔄 Real-time streaming responses with SSE
- ☁️ Optimized for Cloudflare Workers deployment
- 🎯 Type-safe API with TypeScript
- 🔧 Built-in error handling and CORS support

## Quick Start

### Prerequisites

- Node.js >= 20.9.0
- npm or pnpm or yarn
- Cloudflare account
- DeepSeek API key

### Installation

```bash
npm install
```

### Environment Setup

Set up your API keys:

```bash
# Set DeepSeek API Key
wrangler secret put DEEPSEEK_API_KEY

# Optional: Set OpenAI API Key
wrangler secret put OPENAI_API_KEY
```

### Development

```bash
# Start development server
npm run dev

# Or test with Cloudflare Workers locally
wrangler dev
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## API Endpoints

### Streaming Endpoint

`POST /api/stream`

Sends streaming responses in SSE format.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What's the weather in Tokyo?" }
  ],
  "agentId": "weatherAgent"
}
```

**Response:** Server-Sent Events stream
```
retry: 3000

data: {"text": "I'll help you get the weather information for Tokyo."}

data: {"text": " The current weather in Tokyo..."}

data: [DONE]
```

### Health Check

`GET /health`

Returns `OK` if the service is running.

## Client Usage

```typescript
import { MastraSSEClient } from './src/client/sse-client';

const client = new MastraSSEClient('https://your-worker.your-subdomain.workers.dev');

const eventSource = await client.streamChat([
  { role: 'user', content: 'What is the weather in New York?' }
]);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data.text);
};
```

## Project Structure

```
src/
├── mastra/
│   ├── agents/
│   │   └── weather-agent.ts    # Weather agent configuration
│   └── index.ts                # Mastra setup
├── utils/
│   └── sse-middleware.ts       # SSE formatting utilities
├── api/
│   └── stream.ts              # Stream endpoint handler
├── client/
│   └── sse-client.ts          # Client-side SSE utilities
└── worker.ts                  # Cloudflare Workers entry point
```

## Configuration

### wrangler.toml

The project includes optimized Cloudflare Workers configuration with:
- Streaming support enabled
- Proper compatibility flags
- KV namespace binding for storage

### Environment Variables

- `DEEPSEEK_API_KEY` - Required for the weather agent
- `OPENAI_API_KEY` - Optional, for OpenAI models
- `NODE_ENV` - Set to 'production' in deployment

## Troubleshooting

### SSE Connection Issues

1. Verify CORS headers are properly set
2. Check that `Content-Type: text/event-stream` is present
3. Ensure no proxy caching between client and server

### Cloudflare Workers Issues

1. Check worker logs: `wrangler tail`
2. Verify environment variables are set
3. Ensure compatibility flags are enabled

### API Key Issues

1. Confirm secrets are set: `wrangler secret list`
2. Verify API key validity
3. Check rate limits and quotas

## Development

### Scripts

- `npm run dev` - Start Mastra development server
- `npm run build` - Build the project
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run preview` - Preview with Wrangler

### Monitoring

```bash
# View real-time logs
wrangler tail

# Check deployment status
wrangler deployments list
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - see LICENSE file for details.
