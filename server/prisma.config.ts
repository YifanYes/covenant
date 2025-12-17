import { defineConfig } from 'prisma/config'
import { env } from './config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env.DIRECT_URL
  }
})
