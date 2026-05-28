import { randomInt } from 'node:crypto'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const PUBLIC_ID_LENGTH = 12

/**
 * Generates a 12-char lowercase-alphanumeric public id. Starts with a lowercase letter
 * to match `publicIdSchema` (`^[a-z][a-z0-9]{23}$`). Uses crypto.randomInt for
 * uniform sampling — ~62 bits of entropy across 26 letters + 10 digits, ample for
 * collision-free generation against the DB-side @unique constraint.
 */
export function generatePublicId(): string {
  let id = ALPHABET[randomInt(26)] // first char: letter only
  for (let i = 1; i < PUBLIC_ID_LENGTH; i += 1) {
    id += ALPHABET[randomInt(ALPHABET.length)]
  }
  return id
}
