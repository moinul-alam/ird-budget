export function toBanglaNumber(number) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(number).replace(/[0-9]/g, d => banglaDigits[d]);
}

export function toBanglaCurrency(number) {
  if (!number && number !== 0) return '—';
  const n = Math.round(Number(number));
  const str = n.toString();
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    result = remaining + ',' + result;
  }
  return toBanglaNumber(result) + ' টাকা';
}

export const banglaMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
  'মে', 'জুন', 'জুলাই', 'আগস্ট',
  'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export function toBanglaDate(dateStr) {
  const d = new Date(dateStr);
  return `${toBanglaNumber(d.getDate())} ${banglaMonths[d.getMonth()]} ${toBanglaNumber(d.getFullYear())}`;
}
