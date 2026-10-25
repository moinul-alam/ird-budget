/**
 * The password a new admin account is given when the superadmin leaves the password
 * field blank. It lives in one place so the hint under the password field on
 * /admin/users always shows the value `createAdminUser` actually applies.
 *
 * Server-only by convention: the value reaches the browser only as a prop from the
 * superadmin-only /admin/users page, never by being imported into a client component.
 */
export const DEFAULT_ADMIN_PASSWORD = '123'
