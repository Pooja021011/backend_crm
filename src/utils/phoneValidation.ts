/**
 * Phone number validation utility
 * Ensures phone numbers include country code
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  error?: string;
}

/**
 * Validates and formats phone number with country code
 * @param phone - Phone number to validate
 * @param defaultCountryCode - Default country code if not provided (default: +1 for US)
 */
export const validatePhoneNumber = (
  phone: string,
  defaultCountryCode: string = '+1'
): PhoneValidationResult => {
  if (!phone || phone.trim() === '') {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters except + at the start
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  // Check if it starts with +
  const hasCountryCode = cleaned.startsWith('+');

  if (!hasCountryCode) {
    // If no country code, add default
    cleaned = defaultCountryCode + cleaned;
  }

  // Validate format: should start with + followed by 1-3 digits (country code) and 10+ digits (phone)
  const phoneRegex = /^\+\d{1,3}\d{10,}$/;

  if (!phoneRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid phone format. Must include country code (e.g., +1 234-567-8900)'
    };
  }

  // Format the phone number for display
  const formatted = formatPhoneNumber(cleaned);

  return {
    isValid: true,
    formatted: formatted
  };
};

/**
 * Format phone number for display
 * Example: +12345678900 -> +1 (234) 567-8900
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Extract country code and number
  const match = cleaned.match(/^(\+\d{1,3})(\d{3})(\d{3})(\d{4})$/);

  if (match) {
    return `${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }

  // If doesn't match expected format, return as is with + prefix
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

/**
 * Check if phone number has country code
 */
export const hasCountryCode = (phone: string): boolean => {
  if (!phone) return false;
  return phone.trim().startsWith('+');
};

/**
 * Extract country code from phone number
 */
export const getCountryCode = (phone: string): string | null => {
  if (!phone) return null;
  
  const cleaned = phone.trim();
  if (!cleaned.startsWith('+')) return null;

  // Extract country code (1-3 digits after +)
  const match = cleaned.match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : null;
};

/**
 * Common country codes
 */
export const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
];

