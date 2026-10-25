/**
 * The password a new admin account is given when the superadmin leaves the password
 * field blank. It lives in one place so the hint under the password field on
 * /admin/users always shows the value `createAdminUser` actually applies.
 *
 * Server-only. It is read from the environment rather than hardcoded so the value does
 * not live in the repository, and it must never be imported by a client component: a
 * non-`NEXT_PUBLIC_` variable is undefined in the browser. Client components receive it
 * from the server action's response instead (see /admin/users).
 */
function readDefaultAdminPassword(): string {
  const value = process.env.ADMIN_DEFAULT_PASSWORD
  if (!value) {
    throw new Error(
      'ADMIN_DEFAULT_PASSWORD is not set. Refusing to create admin accounts with an unknown default password — set it in the environment (GUIDE.md §3).'
    )
  }
  return value
}

export const DEFAULT_ADMIN_PASSWORD = readDefaultAdminPassword()
