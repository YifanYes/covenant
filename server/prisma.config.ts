import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load .env file before accessing environment variables
config()

const directUrl = process.env.DIRECT_URL

if (!directUrl) {
  throw new Error('DIRECT_URL is missing from environment variables')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: directUrl
  }
})
