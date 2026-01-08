import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'
import * as path from 'path'

export class ServerStack extends cdk.Stack {
  public readonly api: apigateway.RestApi
  public readonly apiDomainName: string // The domain name for CloudFront origin
  public readonly apiHandler: nodejs.NodejsFunction

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // 1. SSM Parameter Store
    const secretParam = new ssm.StringParameter(this, 'ArqSecretsParam', {
      parameterName: '/arq/prod/secrets',
      stringValue: '{"note": "Replace with real secrets"}',
      description: 'Supabase credentials for Arq (Placeholder)'
    })

    // 2. Lambda
    // CDK v2.99.1 doesn't have NODEJS_22_X in its types, but we can define it manually
    // to use the newer runtime supported by AWS (and match server workspace).
    const NODEJS_22_X = new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS)

    this.apiHandler = new nodejs.NodejsFunction(this, 'ApiHandler', {
      runtime: NODEJS_22_X,
      entry: path.join(__dirname, '../lambdas/trpc-adapter.ts'),
      handler: 'handler',
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/client-ssm']
      },
      environment: {
        SECRETS_PARAM_NAME: secretParam.parameterName,
        NODE_ENV: 'prod',
        FRONT_URL_PARAM: '/arq/prod/front-url',
        PORT: '3000' // Required by server config validation, though unused in Lambda
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512
    })

    secretParam.grantRead(this.apiHandler)

    // Grant permission to read the SSM parameter
    // We construct the ARN manually to avoid depending on the FrontStack resource
    // arn:aws:ssm:region:account:parameter/arq/prod/front-url
    // Note: Parameter names in ARN do not have the leading slash if they start with /
    this.apiHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/arq/prod/front-url`]
      })
    )

    // 3. API Gateway (REST)
    this.api = new apigateway.RestApi(this, 'ArqApi', {
      restApiName: 'ArqApi',
      deployOptions: {
        stageName: 'prod'
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS
      }
    })

    const integration = new apigateway.LambdaIntegration(this.apiHandler)

    this.api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true
    })

    // Construct the domain name for CloudFront
    // Format: {apiId}.execute-api.{region}.amazonaws.com
    this.apiDomainName = `${this.api.restApiId}.execute-api.${cdk.Stack.of(this).region}.${cdk.Stack.of(this).urlSuffix}`

    new cdk.CfnOutput(this, 'ApiUrl', { value: this.api.url })
  }
}
