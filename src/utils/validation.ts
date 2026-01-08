// Validation utilities for form fields
import { format, isValid } from 'date-fns';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// US Phone number validation and formatting
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 digits, optionally with country code)
  if (digitsOnly.length === 10) {
    return { isValid: true };
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return { isValid: true };
  } else if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  } else {
    return { isValid: false, error: 'Please enter a valid US phone number' };
  }
};

// Format phone number to US format (XXX) XXX-XXXX
export const formatPhoneNumber = (phone: string): string => {
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 0) return '';
  
  if (digitsOnly.length <= 3) {
    return `(${digitsOnly}`;
  } else if (digitsOnly.length <= 6) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
  } else if (digitsOnly.length <= 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Handle country code
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  } else {
    // Limit to 10 digits for US format
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
  }
};

// Required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

// Name validation (no numbers or special characters)
export const validateName = (name: string, fieldName: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} should only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  
  return { isValid: true };
};

// Company name validation
export const validateCompanyName = (company: string): ValidationResult => {
  if (!company.trim()) {
    return { isValid: false, error: 'Company name is required' };
  }
  
  if (company.trim().length < 2) {
    return { isValid: false, error: 'Company name must be at least 2 characters long' };
  }
  
  return { isValid: true };
};

// Address validation
export const validateAddress = (address: string): ValidationResult => {
  if (!address.trim()) {
    return { isValid: false, error: 'Address is required' };
  }
  
  if (address.trim().length < 5) {
    return { isValid: false, error: 'Please enter a complete address' };
  }
  
  return { isValid: true };
};

// ZIP code validation (US format)
export const validateZipCode = (zip: string): ValidationResult => {
  if (!zip.trim()) {
    return { isValid: false, error: 'ZIP code is required' };
  }
  
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zip)) {
    return { isValid: false, error: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)' };
  }
  
  return { isValid: true };
};

// State validation (2-letter state code)
export const validateState = (state: string): ValidationResult => {
  if (!state.trim()) {
    return { isValid: false, error: 'State is required' };
  }
  
  const stateRegex = /^[A-Za-z]{2}$/;
  if (!stateRegex.test(state)) {
    return { isValid: false, error: 'Please enter a valid 2-letter state code (e.g., CA, NY)' };
  }
  
  return { isValid: true };
};

// City validation
export const validateCity = (city: string): ValidationResult => {
  if (!city.trim()) {
    return { isValid: false, error: 'City is required' };
  }
  
  const cityRegex = /^[a-zA-Z\s'-]+$/;
  if (!cityRegex.test(city)) {
    return { isValid: false, error: 'City should only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
};

// Date utility functions for safe date handling
export const safeDate = (dateValue: Date | string | null | undefined): Date => {
  if (!dateValue) return new Date();
  const date = new Date(dateValue);
  return isValid(date) ? date : new Date();
};

// Safe date formatting with fallback
export const safeDateFormat = (dateValue: Date | string | null | undefined, formatString: string): string => {
  const date = safeDate(dateValue);
  try {
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error, 'for value:', dateValue);
    return format(new Date(), formatString);
  }
};

// Check if a date value is valid
export const isValidDate = (dateValue: Date | string | null | undefined): boolean => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return isValid(date);
};

// E.164 Phone number validation (for Twilio)
// Format: +[country code][number] e.g., +17752548172
export const validateE164PhoneNumber = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: true }; // Optional field
  }
  
  // E.164 format: + followed by country code and number (up to 15 digits total)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  
  if (e164Regex.test(phone)) {
    return { isValid: true };
  }
  
  // Check if it's just missing the + sign
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { isValid: false, error: 'Phone number must be in E.164 format (e.g., +17752548172)' };
  }
  
  return { isValid: false, error: 'Please enter a valid phone number in E.164 format (e.g., +17752548172)' };
};

// Format phone number to E.164 format
export const formatE164PhoneNumber = (phone: string): string => {
  // If already starts with +, keep it as-is but remove any formatting
  if (phone.startsWith('+')) {
    return '+' + phone.substring(1).replace(/\D/g, '');
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If empty, return empty
  if (digitsOnly.length === 0) return '';
  
  // If starts with 1 and has 11 digits, it's a US number with country code
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return '+' + digitsOnly;
  }
  
  // If 10 digits, assume US number and add +1
  if (digitsOnly.length === 10) {
    return '+1' + digitsOnly;
  }
  
  // Otherwise return with + prefix
  return '+' + digitsOnly;
};
