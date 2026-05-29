import { isPrismaUniqueViolationOn } from './prisma-errors'

const SLUG_MAX_LENGTH = 64
const MAX_SLUG_ATTEMPTS = 10
const SLUG_FIELD = 'slug'
const DIACRITIC_RE = /\p{Diacritic}/gu

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITIC_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')

  return slug || 'untitled'
}

function bumpSlug(base: string, suffix: number): string {
  const ending = `-${suffix}`
  return `${base.slice(0, SLUG_MAX_LENGTH - ending.length).replace(/-+$/g, '')}${ending}`
}

/**
 * Atomic unique-slug creation. Eliminates the check-then-act race by relying on the
 * DB unique constraint: try the create, and if it fails with P2002 on the `slug`
 * field, retry with the next numeric suffix. Non-slug unique violations propagate.
 */
export async function createWithUniqueSlug<T>(
  source: string,
  create: (slug: string) => Promise<T>
): Promise<T> {
  const base = slugify(source)
  let slug = base
  let suffix = 2

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    try {
      return await create(slug)
    } catch (error) {
      if (!isPrismaUniqueViolationOn(error, SLUG_FIELD)) throw error
      slug = bumpSlug(base, suffix)
      suffix += 1
    }
  }

  throw new Error(`Exhausted ${MAX_SLUG_ATTEMPTS} attempts to generate unique slug from "${source}"`)
}
