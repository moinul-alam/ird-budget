// src/lib/bangla.js
// Utility functions for Bangla number formatting, currency, and dates
// RULE: Never display raw English numbers to the user.
// Always pass display values through toBanglaNumber() or toBanglaCurrency()

// ============================================================
// NUMERAL CONVERSION
// ============================================================

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Convert English numerals to Bangla numerals
 * @param {number|string} number
 * @returns {string}
 */
export function toBanglaNumber(number) {
    if (number === null || number === undefined || number === '') return '';
    return String(number).replace(/[0-9]/g, d => BANGLA_DIGITS[d]);
}

/**
 * Convert Bangla numerals back to English (for input processing)
 * @param {string} str
 * @returns {string}
 */
export function toEnglishNumber(str) {
    if (!str) return '';
    return String(str).replace(/[০-৯]/g, d => BANGLA_DIGITS.indexOf(d));
}

// ============================================================
// CURRENCY FORMATTING
// ============================================================

/**
 * Format number as Bangladeshi Taka with BD grouping
 * BD grouping: last 3 digits, then groups of 2 (e.g. ১,৫০,০০০)
 * @param {number|string} number
 * @param {boolean} showUnit - whether to append 'টাকা'
 * @returns {string}
 */
export function toBanglaCurrency(number, showUnit = true) {
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

/**
 * Format number with BD grouping, no currency unit
 * For use in tables and reports
 * @param {number|string} number
 * @returns {string}
 */
export function toBanglaAmount(number) {
    return toBanglaCurrency(number, false);
}

// ============================================================
// DATE FORMATTING
// ============================================================

export const BANGLA_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
    'মে', 'জুন', 'জুলাই', 'আগস্ট',
    'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const BANGLA_DAYS = [
    'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার',
    'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

/**
 * Format date in Bangla — e.g. ৭ জুন ২০২৬
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function toBanglaDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return `${toBanglaNumber(d.getDate())} ${BANGLA_MONTHS[d.getMonth()]} ${toBanglaNumber(d.getFullYear())}`;
}

/**
 * Format date with day name — e.g. রবিবার, ৭ জুন ২০২৬
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function toBanglaDateFull(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return `${BANGLA_DAYS[d.getDay()]}, ${toBanglaDate(dateStr)}`;
}

/**
 * Format time in Bangla — e.g. ০৩:৪৫ অপরাহ্ন
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function toBanglaTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
    const h = hours % 12 || 12;
    return `${toBanglaNumber(String(h).padStart(2, '0'))}:${toBanglaNumber(String(minutes).padStart(2, '0'))} ${period}`;
}

/**
 * Format datetime — e.g. ৭ জুন ২০২৬, ০৩:৪৫ অপরাহ্ন
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function toBanglaDateTime(dateStr) {
    if (!dateStr) return '—';
    return `${toBanglaDate(dateStr)}, ${toBanglaTime(dateStr)}`;
}

// ============================================================
// FISCAL YEAR FORMATTING
// ============================================================

/**
 * Format fiscal year in Bangla — e.g. ২০২৬-২৭
 * @param {string} fiscalYear - e.g. '2026-27'
 * @returns {string}
 */
export function toBanglaFiscalYear(fiscalYear) {
    if (!fiscalYear) return '—';
    return toBanglaNumber(fiscalYear);
}

/**
 * Format budget type in Bangla
 * @param {string} type - 'new' or 'revised'
 * @returns {string}
 */
export function toBanglaBudgetType(type) {
    return type === 'new' ? 'প্রাক্কলিত বাজেট' : 'সংশোধিত বাজেট';
}

// ============================================================
// PERCENTAGE FORMATTING
// ============================================================

/**
 * Format percentage in Bangla — e.g. ১৫%
 * @param {number} value
 * @returns {string}
 */
export function toBanglaPercent(value) {
    if (value === null || value === undefined) return '—';
    return `${toBanglaNumber(value)}%`;
}

// ============================================================
// ORDINAL FORMATTING
// ============================================================

/**
 * Format ordinal number in Bangla — e.g. ১ম, ২য়, ৩য়
 * @param {number} n
 * @returns {string}
 */
export function toBanglaOrdinal(n) {
    const suffixes = { 1: 'ম', 2: 'য়', 3: 'য়' };
    const suffix = suffixes[n] || 'তম';
    return `${toBanglaNumber(n)}${suffix}`;
}