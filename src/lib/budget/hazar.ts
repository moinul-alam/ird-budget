/**
 * The office-facing amount unit is হাজার (thousands of taka): an office types `10` to
 * mean ১০,০০০ টাকা. The database and the calculation engine stay in taka, so this
 * module is the only place the two units meet.
 *
 * Keeping the unit switch here — and not in the schema — is what lets the engine keep
 * working on exact taka figures, which is the only way its rates and slabs stay right.
 */

export const TAKA_PER_HAZAR = 1000

/** The cap every office level starts with; the administrator may raise or lower it. */
export const DEFAULT_DIGIT_CAP = 3

/** Digits an amount field accepts after the point: 10.25 is fine, 10.256 is not. */
export const AMOUNT_DECIMALS = 2

export const toHazar = (taka: number): number => Number(taka) / TAKA_PER_HAZAR

export const toTaka = (hazar: number): number => Number(hazar) * TAKA_PER_HAZAR

/**
 * Rounds a computed amount up to the next whole হাজার — the deliberate over-provision
 * that keeps a budget from ever falling short.
 *
 * Only the engine applies this, and only to a figure its formula produced. An office's
 * typed input is stored exactly as entered, and a budget-sheet override is a whole
 * number the office chose itself, so neither is ever raised.
 */
export const ceilingToHazar = (taka: number): number =>
  Math.ceil(Number(taka) / TAKA_PER_HAZAR) * TAKA_PER_HAZAR

/** A হাজার value's whole part — the half the digit cap counts. */
const hazarWhole = (hazar: number): number => Math.trunc(Math.abs(Number(hazar) || 0))

/** Digits in a হাজার value's integer part: 10.25 counts as 2, 0 as 1. */
export const hazarDigits = (hazar: number): number => String(hazarWhole(hazar)).length

/** The largest whole হাজার a `cap`-digit field can hold: 3 → ৯৯৯. */
export const hazarCapCeiling = (cap: number): number => Math.pow(10, cap) - 1

/** Whether a হাজার value needs more digits than the office level allows. */
export const exceedsDigitCap = (hazar: number, cap: number): boolean =>
  hazarWhole(hazar) > hazarCapCeiling(cap)
