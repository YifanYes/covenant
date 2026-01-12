# CI/CD Configuration Guide

This project uses [GitHub Actions](https://github.com/features/actions) to automate the deployment process to AWS.

## Workflow Overview

The deployment pipeline is defined in `.github/workflows/deploy.yml`.

- **Trigger**: The workflow is triggered automatically whenever code is **pushed** or **merged** into the `main` branch.
- **Environment**: The job targets the `production` environment.
- **Key Steps**:
  1.  **Checkout**: Retrieves the latest code.
  2.  **Install Dependencies**: Runs `npm ci` to install project dependencies.
  3.  **Deploy**: Executes `npm run deploy` from the `aws` directory.
      - **Database Push**: `npm run db:push:prod` (Updates database schema in production).
      - **Frontend Build**: `npm run build:prod` (Builds the React application).
      - **CDK Deploy**: `npx cdk deploy --all` (Updates AWS infrastructure).

## Environment Setup

Because this workflow targets a specific **Environment**, you must configure it in the GitHub repository settings.

1.  **Create the Environment**:
    - Go to **Settings > Environments**.
    - Click **New environment**.
    - Name it `production`.

2.  **Add Environment Secrets**:
    - Click on the new `production` environment.
    - Scroll down to **Environment secrets**.
    - Click **Add secret** for each of the variables below.

| Secret Name              | Description                                                               |
| :----------------------- | :------------------------------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`      | Access Key ID for the IAM user with deployment permissions.               |
| `AWS_SECRET_ACCESS_KEY`  | Secret Access Key for the IAM user.                                       |
| `AWS_REGION`             | The AWS region for deployment (e.g., `eu-west-1`).                        |
| `DIRECT_URL`             | Direct PostgreSQL connection string (must be accessible from the runner). |
| `VITE_API_URL`           | Production URL for the backend API.                                       |
| `VITE_SUPABASE_URL`      | URL of the Supabase project.                                              |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous key for Supabase.                                        |

## Usage and Billing Info

_Github Actions usage details for deployment on private repositories:_

### Free Quotas (Monthly)

| GitHub Plan       | Free Minutes / Month | Free Artifact Storage | Cache Storage |
| ----------------- | -------------------- | --------------------- | ------------- |
| GitHub Free       | 2,000                | 500 MB                | 10 GB         |
| GitHub Pro / Team | ~3,000               | 1–2 GB                | 10 GB         |
| Enterprise Cloud  | 50,000               | 50 GB                 | 10 GB         |

### Example Per-Minute Rates (Hosted Runners)

| Runner Type   | Approx Cost per Minute (USD) |
| ------------- | ---------------------------- |
| Linux (small) | ~$0.002–$0.006               |
| Windows       | ~$0.010                      |
| macOS         | ~$0.062                      |
| Larger / GPU  | Higher (varies by size)      |
