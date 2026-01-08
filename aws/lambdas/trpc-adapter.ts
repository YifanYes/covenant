import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import type { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda'
import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda'
import type { APIGatewayProxyEvent } from 'aws-lambda'

// Helper to create context.
// We define the type but the implementation is loaded dynamically to avoid static init issues.
async function createLambdaContext(opts: CreateAWSLambdaContextOptions<APIGatewayProxyEvent>) {
  // We need to import these dynamically too if their init depends on env
  const { supabase } = await import('../../server/lib/supabase')
  const { prisma } = await import('../../server/lib/prisma')

  const event = opts.event
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.split(' ')[1]

  let user = null
  if (token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (!error) user = data.user
  }

  return { user, supabase, prisma, event }
}

let handlerInstance: any

export const handler = async (event: APIGatewayProxyEvent, context: any) => {
  if (!handlerInstance) {
    if (process.env.SECRETS_NAME) {
      try {
        const client = new SecretsManagerClient({})
        const response = await client.send(new GetSecretValueCommand({ SecretId: process.env.SECRETS_NAME }))
        if (response.SecretString) {
          const secrets = JSON.parse(response.SecretString)
          Object.assign(process.env, secrets)
        }
      } catch (e) {
        console.error('Failed to fetch secrets', e)
        // Fallthrough, maybe env vars are set manually
      }
    }

    if (process.env.FRONT_URL_PARAM) {
      try {
        const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
        const ssm = new SSMClient({})
        const response = await ssm.send(new GetParameterCommand({ Name: process.env.FRONT_URL_PARAM }))
        if (response.Parameter?.Value) {
          process.env.FRONT_URL = `https://${response.Parameter.Value}`
        }
      } catch (e) {
        console.error('Failed to fetch front url param', e)
      }
    }

    // Dynamic import to ensure config runs AFTER env is set
    const { appRouter } = await import('../../server/router')

    handlerInstance = awsLambdaRequestHandler({
      router: appRouter,
      createContext: createLambdaContext,
      onError({ path, error }) {
        console.error(`Error in tRPC handler on path '${path}':`, error)
      }
    })
  }

  return handlerInstance(event, context)
}
