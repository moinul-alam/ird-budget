/**
 * Bangla Number & Currency Formatting Utilities
 * Pure utility functions — no React/Next.js/Supabase imports.
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

export function toBanglaCurrency(number: number | string | null | undefined, showUnit = true): string {
  if (number === null || number === undefined || number === '') return '—';
  const n = Math.round(Number(number));
  if (isNaN(n)) return '—';

  const isNegative = n < 0;
  const absStr = Math.abs(n).toString();

  let formatted = '';
  if (absStr.length <= 3) {
    formatted = absStr;
  } else {
    formatted = absStr.slice(-3);
    let remaining = absStr.slice(0, -3);
    while (remaining.length > 2) {
      formatted = remaining.slice(-2) + ',' + formatted;
      remaining = remaining.slice(0, -2);
    }
    formatted = remaining + ',' + formatted;
  }

  const bangla = toBanglaNumber(formatted);
  const sign = isNegative ? '-' : '';
  return showUnit ? `${sign}${bangla} টাকা` : `${sign}${bangla}`;
}

export function toBanglaAmount(number: number | string | null | undefined): string {
  return toBanglaCurrency(number, false);
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
