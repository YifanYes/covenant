import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'
import * as path from 'path'

interface FrontStackProps extends cdk.StackProps {
  apiDomainName: string
  apiStage: string
}

export class FrontStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: FrontStackProps) {
    super(scope, id, props)

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI')
    websiteBucket.grantRead(oai)

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, { originAccessIdentity: oai }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(props.apiDomainName, {
            originPath: `/${props.apiStage}`
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        },
        '/trpc/*': {
          origin: new origins.HttpOrigin(props.apiDomainName, {
            originPath: `/${props.apiStage}`
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        }
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ]
    })

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../front/dist'))],
      destinationBucket: websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*']
    })

    new cdk.CfnOutput(this, 'DistributionDomain', { value: this.distribution.distributionDomainName })

    new cdk.aws_ssm.StringParameter(this, 'FrontUrlParam', {
      parameterName: `/arq/${props.apiStage}/front-url`,
      stringValue: this.distribution.distributionDomainName
    })
  }
}
