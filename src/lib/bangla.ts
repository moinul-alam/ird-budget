/**
 * Bangla Number & Currency Formatting Utilities
 * Pure utility functions — no React/Next.js/database imports.
 */

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function toBanglaNumber(number: number | string | null | undefined): string {
  if (number === null || number === undefined || number === '') return '';
  return String(number).replace(/[0-9]/g, (d) => BANGLA_DIGITS[parseInt(d, 10)]);
}

export function toEnglishNumber(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d as typeof BANGLA_DIGITS[number])));
}

export function cleanTypeName(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.split(':::')[0].trim();
}

/** Indian grouping of an unsigned digit string: 1234567 → ১২,৩৪,৫৬৭. */
function groupBanglaDigits(absDigits: string): string {
  if (absDigits.length <= 3) return toBanglaNumber(absDigits);

  let formatted = absDigits.slice(-3);
  let remaining = absDigits.slice(0, -3);
  while (remaining.length > 2) {
    formatted = remaining.slice(-2) + ',' + formatted;
    remaining = remaining.slice(0, -2);
  }
  return toBanglaNumber(remaining + ',' + formatted);
}

export function toBanglaCurrency(number: number | string | null | undefined, showUnit = true): string {
  if (number === null || number === undefined || number === '') return '—';
  const n = Math.round(Number(number));
  if (isNaN(n)) return '—';

  const sign = n < 0 ? '-' : '';
  const bangla = groupBanglaDigits(Math.abs(n).toString());
  return showUnit ? `${sign}${bangla} টাকা` : `${sign}${bangla}`;
}

export function toBanglaAmount(number: number | string | null | undefined): string {
  return toBanglaCurrency(number, false);
}

/**
 * An amount in হাজার — the unit every office-facing surface reads and writes, where
 * `10` means ১০,০০০ টাকা. A computed budget always lands on a whole হাজার (the engine
 * ceilings it there), but an office's typed figure may carry two decimals, so 10250
 * taka reads '১০.২৫'. `toBanglaAmount` remains the taka formatter — the admin's
 * settings screens are the only place that still speaks in real taka.
 */
export function toBanglaHazar(number: number | string | null | undefined): string {
  if (number === null || number === undefined || number === '') return '—';
  const hazar = Number(number) / 1000;
  if (!Number.isFinite(hazar)) return '—';

  const rounded = Math.round(hazar * 100) / 100;
  const [whole, fraction] = Math.abs(rounded).toFixed(2).split('.');
  const decimals = fraction.replace(/0+$/, '');
  const sign = rounded < 0 ? '-' : '';

  return `${sign}${groupBanglaDigits(whole)}${decimals ? `.${toBanglaNumber(decimals)}` : ''}`;
}

/**
 * Short form of an amount for tight spots (chart centres, chips), on the Indian
 * crore/lakh scale: 123456789 → ১২.৩৫ কোটি. Use `toBanglaAmount` where the exact
 * figure matters.
 */
export function toBanglaAmountCompact(number: number | string | null | undefined): string {
  if (number === null || number === undefined || number === '') return '—';
  const n = Number(number);
  if (isNaN(n)) return '—';

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  // toFixed always yields two decimals, so trailing zeros are trimmed back off.
  const trim = (value: number) => toBanglaNumber(value.toFixed(2).replace(/\.?0+$/, ''));

  if (abs >= 1e7) return `${sign}${trim(abs / 1e7)} কোটি`;
  if (abs >= 1e5) return `${sign}${trim(abs / 1e5)} লক্ষ`;
  return `${sign}${toBanglaNumber(Math.round(abs))}`;
}

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
  'মে', 'জুন', 'জুলাই', 'আগস্ট',
  'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
] as const;

const BANGLA_DAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার',
  'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার',
] as const;

export function toBanglaDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${toBanglaNumber(d.getDate())} ${BANGLA_MONTHS[d.getMonth()]} ${toBanglaNumber(d.getFullYear())}`;
}

export function toBanglaDateFull(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${BANGLA_DAYS[d.getDay()]}, ${toBanglaDate(dateStr)}`;
}

export function toBanglaTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
  const h = hours % 12 || 12;
  return `${toBanglaNumber(String(h).padStart(2, '0'))}:${toBanglaNumber(String(minutes).padStart(2, '0'))} ${period}`;
}

export function toBanglaDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  return `${toBanglaDate(dateStr)}, ${toBanglaTime(dateStr)}`;
}

export function toBanglaFiscalYear(fiscalYear: string | null | undefined): string {
  if (!fiscalYear) return '—';
  return toBanglaNumber(fiscalYear);
}

export function toBanglaPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${toBanglaNumber(value)}%`;
}
