/**
 * US phone helpers.
 *
 * UI requirement: never show "+1" anywhere.
 * Storage requirement: keep E.164 in the backend (e.g. +15551234567).
 */

export function extractDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

/**
 * Normalize user input (digits, spaces, dashes, parentheses) into US E.164.
 * Returns null if input is empty or not a valid US 10-digit number.
 */
export function normalizeUsPhoneToE164(raw: string | null | undefined): string | null {
  const digits = extractDigits(String(raw ?? ''));
  if (!digits) return null;

  // Allow leading "1" when users paste 11 digits
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (normalized.length !== 10) return null;

  return `+1${normalized}`;
}

/**
 * Format phone for display without country code.
 * - "+15551234567" -> "(555) 123-4567"
 * - "5551234567"   -> "(555) 123-4567"
 */
export function formatUsPhoneForDisplay(raw: string | null | undefined): string {
  const digits = extractDigits(String(raw ?? ''));
  if (!digits) return '';

  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (normalized.length !== 10) return normalized; // fallback: show digits-only if unexpected length

  const area = normalized.slice(0, 3);
  const prefix = normalized.slice(3, 6);
  const line = normalized.slice(6);
  return `(${area}) ${prefix}-${line}`;
}


