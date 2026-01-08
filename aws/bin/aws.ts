import * as cdk from 'aws-cdk-lib'
import 'source-map-support/register'
import { FrontStack } from '../lib/front-stack'
import { ServerStack } from '../lib/server-stack'

async function main() {
  const app = new cdk.App()

  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }

  const server = new ServerStack(app, 'Server', { env })

  new FrontStack(app, 'Front', { env, apiDomainName: server.apiDomainName, apiStage: 'prod' })

  cdk.Tags.of(app).add('Project', 'Arq')
  cdk.Tags.of(app).add('Environment', 'Prod')
  cdk.Tags.of(app).add('ManagedBy', 'CDK')
}

main()
