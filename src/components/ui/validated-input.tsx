import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationResult } from '@/utils/validation';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  validator?: (value: string) => ValidationResult;
  formatter?: (value: string) => string;
  required?: boolean;
  icon?: React.ReactNode;
  showValidation?: boolean;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  name,
  value,
  onValueChange,
  validator,
  formatter,
  required = false,
  icon,
  showValidation = true,
  className,
  ...props
}) => {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [isTouched, setIsTouched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Validate on value change
  useEffect(() => {
    if (validator && (isTouched || value)) {
      const result = validator(value);
      setValidation(result);
    }
  }, [value, validator, isTouched]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Apply formatter if provided
    if (formatter) {
      newValue = formatter(newValue);
    }
    
    onValueChange(newValue);
  };

  const handleBlur = () => {
    setIsTouched(true);
    setIsFocused(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const getInputClasses = () => {
    let classes = 'transition-all duration-200';
    
    if (!showValidation || !isTouched) {
      classes += ' border-gray-300 focus:border-blue-500 focus:ring-blue-500/20';
    } else if (validation.isValid) {
      classes += ' border-green-500 focus:border-green-500 focus:ring-green-500/20';
    } else {
      classes += ' border-red-500 focus:border-red-500 focus:ring-red-500/20';
    }
    
    if (icon) {
      classes += ' pl-10';
    }
    
    return cn(classes, className);
  };

  const showError = showValidation && isTouched && !validation.isValid && validation.error;
  const showSuccess = showValidation && isTouched && validation.isValid && value.trim();

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <Input
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={getInputClasses()}
          {...props}
        />
        
        {showValidation && isTouched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation.isValid && value.trim() ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : !validation.isValid ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : null}
          </div>
        )}
      </div>
      
      {showError && (
        <Alert className="py-2 px-3 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-600">
            {validation.error}
          </AlertDescription>
        </Alert>
      )}
      
      {showSuccess && !isFocused && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Valid {label ? label.toLowerCase() : 'input'}
        </p>
      )}
    </div>
  );
};
