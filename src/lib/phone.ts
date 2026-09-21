/**
 * Phone helpers for the payment gateway.
 * The gateway only accepts E.164 numbers for Tanzania, Kenya and Uganda.
 */

type SupportedPrefix = { code: string; nationalLength: number };

const SUPPORTED: SupportedPrefix[] = [
  { code: '255', nationalLength: 9 }, // Tanzania
  { code: '254', nationalLength: 9 }, // Kenya
  { code: '256', nationalLength: 9 }, // Uganda
];

const DEFAULT_CODE = '255';

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
  for (const { code, nationalLength } of SUPPORTED) {
    if (digits.startsWith(code) && digits.length === code.length + nationalLength) {
      return `+${digits}`;
    }
    // e.g. 2550712345678 (country code + leading zero)
    if (digits.startsWith(`${code}0`) && digits.length === code.length + nationalLength + 1) {
      return `+${code}${digits.slice(code.length + 1)}`;
    }
  }

  const fallback = SUPPORTED.find((s) => s.code === defaultCode) || SUPPORTED[0];

  // Local format with trunk zero: 0712345678
  if (digits.startsWith('0') && digits.length === fallback.nationalLength + 1) {
    return `+${fallback.code}${digits.slice(1)}`;
  }

  // Bare national number: 712345678
  if (digits.length === fallback.nationalLength) {
    return `+${fallback.code}${digits}`;
  }

  return null;
}

export function isSupportedPhone(raw: string | null | undefined): boolean {
  return normalizePhoneE164(raw) !== null;
}
