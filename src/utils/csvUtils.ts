import { LeadType } from '@/hooks/useLeads';

export interface CSVTemplate {
  leadType: LeadType;
  headers: string[];
  sampleData: string[];
  requiredFields: string[];
}

// CSV Templates for each lead type
export const CSV_TEMPLATES: Record<LeadType, CSVTemplate> = {
  SELLER: {
    leadType: 'SELLER',
    headers: [
      'First Name*', 'Last Name*', 'Phone*', 'Email*', 'Address', 'City', 'State', 'ZIP',
      'Motivation', 'Lead Source', 'Notes'
    ],
    sampleData: [
      'John', 'Smith', '(555) 123-4567', 'john.smith@email.com', '123 Main St', 'Charlotte', 'NC', '28202',
      'High', 'Website', 'Interested in quick sale'
    ],
    requiredFields: ['First Name*', 'Last Name*', 'Phone*', 'Email*']
  },
  BUYER: {
    leadType: 'BUYER',
    headers: [
      'First Name*', 'Last Name*', 'Phone*', 'Email*', 'Price Range', 'Asset Class', 'Credit Score',
      'Pre-Approved', 'Motivation', 'Timeline', 'Properties Purchased', 'Notes'
    ],
    sampleData: [
      'Jane', 'Doe', '(555) 987-6543', 'jane.doe@email.com', '$300K - $500K', 'Single Family', 'Excellent',
      'Yes', 'Very High', '1-3 months', '2', 'Looking for investment property'
    ],
    requiredFields: ['First Name*', 'Last Name*', 'Phone*', 'Email*']
  },
  VENDOR: {
    leadType: 'VENDOR',
    headers: [
      'First Name*', 'Last Name*', 'Company*', 'Industry*', 'Phone*', 'Email*', 'Service Area',
      'Rating', 'Verified', 'Website', 'Notes'
    ],
    sampleData: [
      'Bob', 'Johnson', 'Johnson Construction', 'Construction', '(555) 456-7890', 'bob@johnsonconstruction.com',
      'Charlotte Metro', '5', 'Yes', 'www.johnsonconstruction.com', 'Specializes in renovations'
    ],
    requiredFields: ['First Name*', 'Last Name*', 'Company*', 'Industry*', 'Phone*', 'Email*']
  }
};

export interface CSVValidationError {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface CSVValidationResult {
  isValid: boolean;
  errors: CSVValidationError[];
  warnings: CSVValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * Advanced CSV parser that handles quoted fields, escaped characters, and different delimiters
 */
export function parseCSVAdvanced(csvText: string, delimiter: string = ','): string[][] {
  const result: string[][] = [];
  const lines = csvText.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim());
    result.push(fields);
  }
  
  return result;
}

/**
 * Validate CSV data against lead type requirements
 */
export function validateCSV(rows: string[][], leadType: LeadType): CSVValidationResult {
  const template = CSV_TEMPLATES[leadType];
  const errors: CSVValidationError[] = [];
  const warnings: CSVValidationError[] = [];
  
  if (rows.length === 0) {
    return {
      isValid: false,
      errors: [{ row: 0, column: '', message: 'CSV file is empty', value: '' }],
      warnings: [],
      totalRows: 0,
      validRows: 0
    };
  }
  
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);
  let validRows = 0;
  
  // Check for required headers
  for (const requiredField of template.requiredFields) {
    const cleanField = requiredField.replace('*', '').toLowerCase().trim();
    const found = headers.some(h => 
      h.includes(cleanField.replace(' ', '')) || 
      h === cleanField ||
      h.replace(/[^a-z]/g, '') === cleanField.replace(/[^a-z]/g, '')
    );
    
    if (!found) {
      errors.push({
        row: 0,
        column: requiredField,
        message: `Required field "${requiredField}" not found in headers`,
        value: ''
      });
    }
  }
  
  // Validate each data row
  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index 0 is headers and we want 1-based numbering
    let rowValid = true;
    
    // Check required fields for this row
    template.requiredFields.forEach(requiredField => {
      const cleanField = requiredField.replace('*', '').toLowerCase().trim();
      const fieldIndex = headers.findIndex(h => 
        h.includes(cleanField.replace(' ', '')) || 
        h === cleanField ||
        h.replace(/[^a-z]/g, '') === cleanField.replace(/[^a-z]/g, '')
      );
      
      if (fieldIndex >= 0 && (!row[fieldIndex] || row[fieldIndex].trim() === '')) {
        errors.push({
          row: rowNumber,
          column: requiredField,
          message: `Required field is empty`,
          value: row[fieldIndex] || ''
        });
        rowValid = false;
      }
    });
    
    // Validate email format
    const emailIndex = headers.findIndex(h => h.includes('email'));
    if (emailIndex >= 0 && row[emailIndex]) {
      const email = row[emailIndex].trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        errors.push({
          row: rowNumber,
          column: 'Email',
          message: 'Invalid email format',
          value: email
        });
        rowValid = false;
      }
    }
    
    // Validate phone format
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    if (phoneIndex >= 0 && row[phoneIndex]) {
      const phone = row[phoneIndex].trim();
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (phone && !phoneRegex.test(cleanPhone) && cleanPhone.length < 10) {
        warnings.push({
          row: rowNumber,
          column: 'Phone',
          message: 'Phone number format may be invalid',
          value: phone
        });
      }
    }
    
    // Specific validations based on lead type
    if (leadType === 'BUYER') {
      const preApprovedIndex = headers.findIndex(h => h.includes('approved'));
      if (preApprovedIndex >= 0 && row[preApprovedIndex]) {
        const value = row[preApprovedIndex].toLowerCase().trim();
        if (!['yes', 'no', 'true', 'false', '1', '0'].includes(value)) {
          warnings.push({
            row: rowNumber,
            column: 'Pre-Approved',
            message: 'Pre-Approved should be Yes/No or True/False',
            value: row[preApprovedIndex]
          });
        }
      }
      
      const propertiesPurchasedIndex = headers.findIndex(h => h.includes('properties') && h.includes('purchased'));
      if (propertiesPurchasedIndex >= 0 && row[propertiesPurchasedIndex]) {
        const value = row[propertiesPurchasedIndex].trim();
        if (value && isNaN(Number(value))) {
          errors.push({
            row: rowNumber,
            column: 'Properties Purchased',
            message: 'Properties Purchased must be a number',
            value: value
          });
          rowValid = false;
        }
      }
    } else if (leadType === 'VENDOR') {
      const ratingIndex = headers.findIndex(h => h.includes('rating'));
      if (ratingIndex >= 0 && row[ratingIndex]) {
        const value = row[ratingIndex].trim();
        const rating = Number(value);
        if (value && (isNaN(rating) || rating < 1 || rating > 5)) {
          errors.push({
            row: rowNumber,
            column: 'Rating',
            message: 'Rating must be a number between 1 and 5',
            value: value
          });
          rowValid = false;
        }
      }
      
      const verifiedIndex = headers.findIndex(h => h.includes('verified'));
      if (verifiedIndex >= 0 && row[verifiedIndex]) {
        const value = row[verifiedIndex].toLowerCase().trim();
        if (!['yes', 'no', 'true', 'false', '1', '0'].includes(value)) {
          warnings.push({
            row: rowNumber,
            column: 'Verified',
            message: 'Verified should be Yes/No or True/False',
            value: row[verifiedIndex]
          });
        }
      }
    }
    
    if (rowValid) {
      validRows++;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRows: dataRows.length,
    validRows
  };
}

/**
 * Generate CSV template file for download
 */
export function generateCSVTemplate(leadType: LeadType): void {
  const template = CSV_TEMPLATES[leadType];
  const csvContent = [template.headers, template.sampleData]
    .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${leadType.toLowerCase()}-leads-template.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Map CSV headers to lead field mappings
 */
export function mapCSVHeaders(headers: string[], leadType: LeadType): Record<string, number> {
  const mapping: Record<string, number> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  const fieldMappings: Record<LeadType, Record<string, string[]>> = {
    SELLER: {
      firstName: ['firstname', 'first name', 'first_name'],
      lastName: ['lastname', 'last name', 'last_name'],
      phone: ['phone', 'phone number', 'phone_number'],
      email: ['email', 'email address', 'email_address'],
      address: ['address', 'street', 'street address', 'address1'],
      city: ['city'],
      state: ['state', 'province'],
      zip: ['zip', 'zipcode', 'postal code', 'postal_code'],
      motivation: ['motivation', 'urgency']
    },
    BUYER: {
      firstName: ['firstname', 'first name', 'first_name'],
      lastName: ['lastname', 'last name', 'last_name'],
      phone: ['phone', 'phone number', 'phone_number'],
      email: ['email', 'email address', 'email_address'],
      priceRange: ['price range', 'price_range', 'budget', 'price'],
      assetClass: ['asset class', 'asset_class', 'property type', 'type'],
      creditScore: ['credit score', 'credit_score', 'credit'],
      preApproved: ['pre-approved', 'pre_approved', 'preapproved', 'approved'],
      motivation: ['motivation', 'urgency'],
      timeline: ['timeline', 'timeframe', 'urgency'],
      propertiesPurchased: ['properties purchased', 'properties_purchased', 'experience']
    },
    VENDOR: {
      firstName: ['firstname', 'first name', 'first_name'],
      lastName: ['lastname', 'last name', 'last_name'],
      company: ['company', 'company name', 'company_name', 'business'],
      industry: ['industry', 'sector', 'business type'],
      phone: ['phone', 'phone number', 'phone_number'],
      email: ['email', 'email address', 'email_address'],
      serviceArea: ['service area', 'service_area', 'area', 'location'],
      rating: ['rating', 'score', 'stars'],
      verified: ['verified', 'approved', 'certified']
    }
  };
  
  const currentMappings = fieldMappings[leadType];
  
  Object.entries(currentMappings).forEach(([field, variations]) => {
    const index = lowerHeaders.findIndex(h => 
      variations.some(v => h.includes(v) || h.replace(/[^a-z]/g, '') === v.replace(/[^a-z]/g, ''))
    );
    if (index >= 0) {
      mapping[field] = index;
    }
  });
  
  return mapping;
}

/**
 * Clean and normalize CSV data
 */
export function cleanCSVData(value: string): string {
  if (!value) return '';
  
  return value
    .trim()
    .replace(/^["'](.*)["']$/, '$1') // Remove surrounding quotes
    .replace(/""/g, '"') // Unescape double quotes
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if format is unclear
}

/**
 * Validate and format email
 */
export function validateEmail(email: string): { isValid: boolean; formatted: string } {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return {
    isValid: emailRegex.test(trimmed),
    formatted: trimmed
  };
}

/**
 * Export leads to CSV with custom formatting
 */
export function exportToCSV(
  data: any[], 
  filename: string, 
  headers: string[], 
  customFormatters?: Record<string, (value: any) => string>
): void {
  const formatValue = (value: any, key: string): string => {
    if (value === null || value === undefined) return '';
    
    if (customFormatters && customFormatters[key]) {
      return customFormatters[key](value);
    }
    
    return String(value);
  };
  
  const csvRows = [headers];
  
  data.forEach(item => {
    const row = headers.map((header, index) => {
      const key = Object.keys(item)[index] || header.toLowerCase().replace(/\s+/g, '');
      const value = item[key] || '';
      const formatted = formatValue(value, key);
      return `"${formatted.replace(/"/g, '""')}"`;
    });
    csvRows.push(row);
  });
  
  const csvContent = csvRows.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
