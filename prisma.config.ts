import { defineConfig } from 'prisma/config'

const directUrl = process.env.DIRECT_URL

if (!directUrl) {
  console.warn('DIRECT_URL is missing from environment variables')
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
