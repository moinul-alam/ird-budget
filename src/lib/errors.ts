/**
 * Narrowing helpers for values caught by `try/catch`.
 *
 * TypeScript types a caught value as `unknown` — anything can be thrown, including
 * strings and plain objects. These helpers turn that into something printable without
 * an `any` cast, and without throwing a second time on an exotic value.
 */

/**
 * The message of a thrown value, or `''` when it carries none.
 *
 * Returning an empty string rather than a placeholder makes the common
 * `errorMessage(e) || 'fallback'` idiom work exactly like `e?.message || 'fallback'`.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

/**
 * The string `code` a thrown value carries, or `null`.
 *
 * Prisma's `PrismaClientKnownRequestError` reports its failure as a code — `P2002` for a
 * unique-constraint violation, for instance — which is what a caller branches on. Reading
 * it through this helper keeps `catch` parameters `unknown` and still tolerates anything
 * else that happens to be thrown.
 */
export function errorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string') return code
  }
  return null
}
