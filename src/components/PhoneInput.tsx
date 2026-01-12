import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle } from 'lucide-react';
import { extractDigits, normalizeUsPhoneToE164 } from '@/utils/phone';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Phone Number',
  value,
  onChange,
  error: externalError,
  placeholder = 'Enter 10-digit phone number',
  required = false,
  disabled = false,
  className = ''
}) => {
  const [phoneNumber, setPhoneNumber] = useState(''); // digits only (US 10-digit)
  const [internalError, setInternalError] = useState('');
  const isInternalChange = useRef(false);

  // Parse existing value on mount or when value changes externally
  useEffect(() => {
    // Skip if this change came from within the component
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const digits = extractDigits(value || '');
    if (!digits) return setPhoneNumber('');

    // Hide +1 in UI; keep only 10 digits
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    setPhoneNumber(normalized.slice(0, 10));
  }, [value]);

  const handlePhoneChange = (newPhone: string) => {
    const digits = extractDigits(newPhone).slice(0, 10);
    setPhoneNumber(digits);

    // Validate: if user typed something, it must be exactly 10 digits (US-only)
    if (digits && digits.length !== 10) setInternalError('Enter a valid 10-digit US phone number');
    else setInternalError('');

    // Mark this as an internal change
    isInternalChange.current = true;

    // Store E.164 (+1XXXXXXXXXX) in state/backend payloads, but never show +1 in UI.
    const e164 = normalizeUsPhoneToE164(digits);
    onChange(e164 || (digits ? `+1${digits}` : ''));
  };

  const displayError = externalError || internalError;

  return (
    <div className={className}>
      {label && (
        <Label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        {/* Phone Number Input (US-only, no +1 shown) */}
        <div className="flex-1">
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`h-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 ${displayError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          />
        </div>
      </div>

      {/* Error Message */}
      {displayError && (
        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};

