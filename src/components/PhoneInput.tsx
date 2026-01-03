import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { validatePhoneNumber, formatPhoneNumber, COUNTRY_CODES } from '@/utils/phoneValidation';
import { AlertCircle } from 'lucide-react';

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
  placeholder = 'Enter phone number',
  required = false,
  disabled = false,
  className = ''
}) => {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [internalError, setInternalError] = useState('');
  const isInternalChange = useRef(false);

  // Parse existing value on mount or when value changes externally
  useEffect(() => {
    // Skip if this change came from within the component
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (value) {
      // Check if value has country code
      if (value.startsWith('+')) {
        // Prefer matching against known country codes to avoid greedy parsing
        const normalized = value.trim();
        const codeMatch = [...COUNTRY_CODES]
          .sort((a, b) => b.code.length - a.code.length)
          .find((c) => normalized.startsWith(c.code));

        if (codeMatch) {
          setCountryCode(codeMatch.code);
          setPhoneNumber(normalized.slice(codeMatch.code.length).replace(/[^\d]/g, ''));
        } else {
          // Fallback: split on first 1-3 digits after +
          const match = normalized.match(/^(\+\d{1,3})(.*)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhoneNumber(match[2].replace(/[^\d]/g, ''));
          }
        }
      } else {
        setPhoneNumber(value.replace(/[^\d]/g, ''));
      }
    } else {
      // Clear phone number if value is empty
      setPhoneNumber('');
    }
  }, [value]);

  const handlePhoneChange = (newPhone: string) => {
    // Allow only digits, spaces, dashes, parentheses
    const cleaned = newPhone.replace(/[^\d\s\-()]/g, '');
    setPhoneNumber(cleaned);

    // Combine country code with phone number
    const fullNumber = countryCode + cleaned.replace(/[^\d]/g, '');
    
    // Validate
    const validation = validatePhoneNumber(fullNumber, countryCode);
    
    if (cleaned && !validation.isValid) {
      setInternalError(validation.error || '');
    } else {
      setInternalError('');
    }

    // Mark this as an internal change
    isInternalChange.current = true;
    
    // Pass formatted value to parent
    onChange(validation.formatted || fullNumber);
  };

  const handleCountryCodeChange = (newCode: string) => {
    setCountryCode(newCode);
    
    // Update full number with new country code
    const fullNumber = newCode + phoneNumber.replace(/[^\d]/g, '');
    const validation = validatePhoneNumber(fullNumber, newCode);
    
    // Mark this as an internal change
    isInternalChange.current = true;
    
    onChange(validation.formatted || fullNumber);
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
        {/* Country Code Selector */}
        <Select value={countryCode} onValueChange={handleCountryCodeChange} disabled={disabled}>
          <SelectTrigger className="w-[120px] h-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                <span className="flex items-center gap-1.5">
                  <span>{item.flag}</span>
                  <span>{item.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Phone Number Input */}
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

