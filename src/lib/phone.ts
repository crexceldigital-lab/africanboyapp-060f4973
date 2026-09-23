/**
 * Phone helpers for the payment gateway.
 * The gateway only accepts E.164 mobile numbers for Tanzania, Kenya and Uganda,
 * and rejects landline/invalid prefixes, so validate the mobile prefix too.
 */

type SupportedPrefix = { code: string; nationalLength: number; mobilePrefixes: string[] };

const SUPPORTED: SupportedPrefix[] = [
  { code: '255', nationalLength: 9, mobilePrefixes: ['6', '7'] }, // Tanzania
  { code: '254', nationalLength: 9, mobilePrefixes: ['7', '1'] }, // Kenya
  { code: '256', nationalLength: 9, mobilePrefixes: ['7'] }, // Uganda
];

const DEFAULT_CODE = '255';

export const UNSUPPORTED_PHONE_MESSAGE =
  'Please enter a valid Tanzanian, Kenyan or Ugandan mobile money number (for example 0712 345 678).';

function isValidNational(country: SupportedPrefix, national: string): boolean {
  return (
    national.length === country.nationalLength &&
    country.mobilePrefixes.some((prefix) => national.startsWith(prefix))
  );
}

/**
 * Convert a locally typed mobile number into E.164 (e.g. 0712345678 -> +255712345678).
 * Returns null when the number cannot be a valid TZ/KE/UG mobile number.
 */
export function normalizePhoneE164(raw: string | null | undefined, defaultCode = DEFAULT_CODE): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');
  if (!digits) return null;

  // Already carries a supported country code
  for (const country of SUPPORTED) {
    const { code } = country;
    if (digits.startsWith(code)) {
      let national = digits.slice(code.length);
      // e.g. 2550712345678 (country code + trunk zero)
      if (national.startsWith('0') && national.length === country.nationalLength + 1) {
        national = national.slice(1);
      }
      if (isValidNational(country, national)) return `+${code}${national}`;
    }
  }

  const fallback = SUPPORTED.find((s) => s.code === defaultCode) || SUPPORTED[0];

  // Local format with trunk zero: 0712345678
  if (digits.startsWith('0')) {
    const national = digits.slice(1);
    if (isValidNational(fallback, national)) return `+${fallback.code}${national}`;
  }

  // Bare national number: 712345678
  if (isValidNational(fallback, digits)) return `+${fallback.code}${digits}`;

  return null;
}

export function isSupportedPhone(raw: string | null | undefined): boolean {
  return normalizePhoneE164(raw) !== null;
}
