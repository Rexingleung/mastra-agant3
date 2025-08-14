
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { weatherAgent } from './agents/weather-agent';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare'

export const mastra = new Mastra({
  agents: { weatherAgent },
  deployer: new CloudflareDeployer({
    projectName: 'a',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
