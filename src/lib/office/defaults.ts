/**
 * The password an office is given until a superadmin sets its own. It is applied when
 * an office registers, when a login record is auto-created, and by the reset actions —
 * so the value the admin sees on /admin/offices-users is the value that actually works.
 *
 * Server-only. It is read from the environment rather than hardcoded so the value does
 * not live in the repository, and it must never be imported by a client component: a
 * non-`NEXT_PUBLIC_` variable is undefined in the browser, which would silently create
 * offices with no usable password. Client components receive it from the server action
 * response instead (see /admin/offices-users and saveFieldOffice).
 */
function readDefaultOfficePassword(): string {
  const value = process.env.OFFICE_DEFAULT_PASSWORD
  if (!value) {
    throw new Error(
      'OFFICE_DEFAULT_PASSWORD is not set. Refusing to create offices with an unknown default password — set it in the environment (GUIDE.md §3).'
    )
  }
  return value
}

export const DEFAULT_OFFICE_PASSWORD = readDefaultOfficePassword()
