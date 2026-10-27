/**
 * Policy constants that used to be scattered as bare literals across the auth, landing and
 * budget-cycle code. They are not business *rates* (those live in the DB and the admin UI) —
 * they are fixed rules of the application itself, so they live in one place here and are
 * imported wherever the rule is enforced.
 */

/** A staff budget id is exactly this many English digits (০-৯ are rejected). */
export const BUDGET_ID_LENGTH = 13

/** Floor for any password an admin sets for themselves. */
export const MIN_PASSWORD_LENGTH = 6

/** How long a session cookie stays valid, in seconds (7 days). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/** বেতন-মাস — the annualising multiplier of a cycle must fall inside this range. */
export const SALARY_MONTHS_MIN = 1
export const SALARY_MONTHS_MAX = 12
