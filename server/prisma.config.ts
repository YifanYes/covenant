import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'
import { logger } from './lib/logger'

// Load .env file before accessing environment variables
config()

const directUrl = process.env.DIRECT_URL

if (!directUrl) {
  logger.warn('DIRECT_URL is missing from environment variables')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(directUrl
    ? {
        datasource: {
          url: directUrl
        }
      }
    : {})
})
