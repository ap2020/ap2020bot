/* eslint-disable global-require */
/* eslint indent: ["warn", 2] */
import type { Serverless } from 'serverless/aws';

const serverlessConfiguration: Serverless = {
  service: {
    name: 'aws',
    // app and org for use with dashboard.serverless.com
    // app: your-app-name,
    // org: your-org-name,
  },
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true,
    },
  },
  // Add the serverless-webpack plugin
  plugins: ['serverless-webpack'],
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      ...require('./.env.json'),
    },
  },
  functions: {
    hello: {
      handler: 'handler.hello',
      events: [
        {
          schedule: {
            rate: 'cron(5 * * * ? *)',
          },
        },
      ],
    },
  },
};

module.exports = serverlessConfiguration;
