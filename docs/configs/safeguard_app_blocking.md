# Emergency AWS Infrastructure Blocking Guide

This guide provides immediate steps to block the AWS infrastructure in case of an emergency (e.g., security breach, unexpected cost spike).

> [!WARNING]
> Following these steps will result in immediate downtime for both the frontend and backend of the application.

## 1. Stop Backend Execution (Lambda)

Setting the reserved concurrency to 0 prevents any new Lambda executions, effectively stopping the backend.

### AWS CLI

```bash
# Replace <FUNCTION_NAME> with the actual name of the ApiHandler function
# You can find it by searching for "ApiHandler" in the Lambda console
aws lambda put-function-concurrency \
    --function-name <FUNCTION_NAME> \
    --reserved-concurrent-executions 0
```

### AWS Management Console

1. Navigate to **Lambda** > **Functions**.
2. Select the function (e.g., `ServerStack-ApiHandler...`).
3. Go to the **Configuration** tab and select **Concurrency**.
4. Click **Edit**.
5. Select **Reserve concurrency** and set the value to **0**.
6. Click **Save**.

## 2. Disable Frontend Access (CloudFront)

Disabling the CloudFront distribution stops it from serving any content to users.

### AWS CLI

```bash
# 1. Get the current configuration and ETag
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?contains(DefaultRootObject, 'index.html')].Id" --output text)
aws cloudfront get-distribution-config --id $DIST_ID > config.json
ETAG=$(jq -r '.ETag' config.json)

# 2. Update the Enabled flag to false
jq '.DistributionConfig.Enabled = false' config.json > new_config.json

# 3. Apply the update
aws cloudfront update-distribution \
    --id $DIST_ID \
    --if-match $ETAG \
    --distribution-config file://new_config.json
```

### AWS Management Console

1. Navigate to **CloudFront** > **Distributions**.
2. Find the distribution associated with the project (check the Origin for the **WebsiteBucket**).
3. Select the distribution.
4. Click **Disable**.
5. Confirm the action.

## 3. Remove Frontend Assets (S3)

Emptying and deleting the S3 bucket ensures that the source files are removed and cannot be served even if CloudFront is re-enabled.

### AWS CLI

```bash
# Replace <BUCKET_NAME> with the name of the WebsiteBucket
# 1. Empty the bucket
aws s3 rm s3://<BUCKET_NAME> --recursive

# 2. Delete the bucket
aws s3 rb s3://<BUCKET_NAME> --force
```

### AWS Management Console

1. Navigate to **S3** > **Buckets**.
2. Select the bucket (e.g., `frontstack-websitebucket...`).
3. Click **Empty** and type `permanently delete` to confirm.
4. Once empty, go back to the Buckets list and select the bucket again.
5. Click **Delete** and type the bucket name to confirm.

## Infrastructure Reference

According to the CDK code in `aws/lib/`:

- **Backend Stack**: `ServerStack`
- **Lambda Function**: `ApiHandler`
- **Frontend Stack**: `FrontStack`
- **CloudFront Distribution**: `Distribution`
- **S3 Bucket**: `WebsiteBucket`
