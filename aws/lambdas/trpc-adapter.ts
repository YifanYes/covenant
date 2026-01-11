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
    if (process.env.SECRETS_PARAM_NAME) {
      try {
        const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
        const client = new SSMClient({})
        const response = await client.send(new GetParameterCommand({ Name: process.env.SECRETS_PARAM_NAME }))
        if (response.Parameter?.Value) {
          const secrets = JSON.parse(response.Parameter.Value)
          Object.assign(process.env, secrets)
        }
      } catch (e) {
        console.error('Failed to fetch secrets form SSM', e)
        // Fallthrough, maybe env vars are set manually
      }
    }

    if (process.env.FRONT_URL_PARAM) {
      try {
        const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm')
        const ssm = new SSMClient({})
        const response = await ssm.send(new GetParameterCommand({ Name: process.env.FRONT_URL_PARAM }))
        if (response.Parameter?.Value) {
          const value = response.Parameter.Value
          // Don't add https:// if the value already contains a protocol
          process.env.FRONT_URL = value.includes('://') ? value : `https://${value}`
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
      responseMeta() {
        return {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
          }
        }
      },
      onError({ path, error }) {
        console.error(`Error in tRPC handler on path '${path}':`, error)
      }
    })
  }

  // Fix: Strip /trpc prefix from path so the router matches 'auth.signUp' instead of 'trpc/auth.signUp'
  if (event.pathParameters && event.pathParameters.proxy) {
    // For proxy integration {proxy+}
    if (event.pathParameters.proxy.startsWith('trpc/')) {
      event.pathParameters.proxy = event.pathParameters.proxy.substring(5)
    }
  }

  return handlerInstance(event, context)
}
