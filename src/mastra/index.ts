import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { weatherAgent } from './agents/weather-agent';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare'

export const mastra = new Mastra({
  agents: { weatherAgent },
  deployer: new CloudflareDeployer({
    projectName: 'mastra-weather-agent',
    // 添加流式响应配置
    compatibility: {
      date: '2023-10-30',
      flags: ['streams_enable_constructors']
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
