import { z } from 'zod'

export const bigintIdSchema = z
  .union([z.bigint(), z.string().regex(/^\d+$/, 'Must be a positive integer').transform((s) => BigInt(s))])
  .pipe(z.bigint().positive())

// Server-generated via `generatePublicId()` — 12 chars, starts with lowercase letter,
// lowercase alphanumeric. Format chosen so URLs stay short while keeping ~62 bits of entropy.
export const publicIdSchema = z.string().regex(/^[a-z][a-z0-9]{11}$/, 'Invalid public id')
export const slugSchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/, 'Invalid slug')
