import { z } from 'zod';

// Valid role names
const roleNames = ['ADMIN', 'MANAGER', 'ACQ', 'DISP', 'TC'] as const;

export const createAgentSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(val => val.toLowerCase()),
  
  phone: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      // Remove all non-digit characters and check length
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 15;
    }, 'Phone number must be between 10-15 digits'),
  
  status: z.enum(['active', 'inactive'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be either active or inactive'
  }),
  
  roles: z.array(z.enum(roleNames))
    .min(1, 'At least one role is required')
    .max(5, 'Maximum 5 roles allowed'),
  
  password: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      return val.length >= 1;
    }, 'Password must be at least 1 character long')
});

export const updateAgentSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(val => val.toLowerCase())
    .optional(),
  
  phone: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      // Remove all non-digit characters and check length
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 15;
    }, 'Phone number must be between 10-15 digits'),
  
  status: z.enum(['active', 'inactive'], {
    invalid_type_error: 'Status must be either active or inactive'
  }).optional(),
  
  roles: z.array(z.enum(roleNames))
    .min(1, 'At least one role is required')
    .max(5, 'Maximum 5 roles allowed')
    .optional(),
  
  password: z.string()
    .min(1, 'Password must be at least 1 character long')
    .optional()
}).refine(data => {
  // At least one field must be provided for update
  return Object.values(data).some(value => value !== undefined);
}, {
  message: 'At least one field must be provided for update'
});
