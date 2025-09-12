import React, { useState, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Download,
  X
} from 'lucide-react';
import { LeadType } from '@/hooks/useLeads';
import { 
  parseCSVAdvanced, 
  validateCSV, 
  generateCSVTemplate, 
  CSV_TEMPLATES,
  type CSVValidationResult 
} from '@/utils/csvUtils';

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadType: LeadType;
  onImport: (file: File, leadType: LeadType) => Promise<{ success: number; errors: string[] }>;
}

interface ImportStep {
  id: 'upload' | 'validate' | 'import' | 'complete';
  title: string;
  description: string;
}

const IMPORT_STEPS: ImportStep[] = [
  { id: 'upload', title: 'Upload File', description: 'Select your CSV file' },
  { id: 'validate', title: 'Validate Data', description: 'Check for errors and warnings' },
  { id: 'import', title: 'Import Leads', description: 'Import validated data' },
  { id: 'complete', title: 'Complete', description: 'Import finished' }
];

export const ImportCSVDialog: React.FC<ImportCSVDialogProps> = ({
  open,
  onOpenChange,
  leadType,
  onImport
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep['id']>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetDialog = useCallback(() => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setValidationResult(null);
    setImportProgress(0);
    setImportResult(null);
    setIsProcessing(false);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      validateFile(file);
    }
  }, []);

  const validateFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const rows = parseCSVAdvanced(text);
      const result = validateCSV(rows, leadType);
      
      setValidationResult(result);
      setCurrentStep('validate');
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        isValid: false,
        errors: [{ row: 0, column: '', message: 'Failed to parse CSV file', value: '' }],
        warnings: [],
        totalRows: 0,
        validRows: 0
      });
      setCurrentStep('validate');
    } finally {
      setIsProcessing(false);
    }
  }, [leadType]);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !validationResult) return;

    setIsProcessing(true);
    setCurrentStep('import');
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await onImport(selectedFile, leadType);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Import failed']
      });
      setCurrentStep('complete');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, validationResult, onImport, leadType]);

  const handleClose = useCallback(() => {
    resetDialog();
    onOpenChange(false);
  }, [resetDialog, onOpenChange]);

  const currentStepIndex = IMPORT_STEPS.findIndex(step => step.id === currentStep);
  const template = CSV_TEMPLATES[leadType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import {leadType.charAt(0) + leadType.slice(1).toLowerCase()} Leads
          </DialogTitle>
          <DialogDescription>
            Import leads from a CSV file. Follow the steps below to validate and import your data.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-4 border-b">
          {IMPORT_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index < currentStepIndex ? 'bg-green-100 text-green-600' :
                  index === currentStepIndex ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-400'}
              `}>
                {index < currentStepIndex ? 
                  <CheckCircle className="w-4 h-4" /> : 
                  index + 1
                }
              </div>
              {index < IMPORT_STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  index < currentStepIndex ? 'bg-green-200' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </h3>
                <p className="text-gray-600 mb-4">
                  Select a CSV file containing your {leadType.toLowerCase()} leads
                </p>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer">
                  <Button asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </label>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Don't have a CSV file? Download our template:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateCSVTemplate(leadType)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Required Fields:</h4>
                <div className="flex flex-wrap gap-2">
                  {template.requiredFields.map(field => (
                    <Badge key={field} variant="secondary">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Validate */}
          {currentStep === 'validate' && validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {validationResult.totalRows}
                  </div>
                  <div className="text-sm text-blue-600">Total Rows</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResult.validRows}
                  </div>
                  <div className="text-sm text-green-600">Valid Rows</div>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{validationResult.errors.length} errors found:</strong>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {validationResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm">
                          Row {error.row}: {error.message} ({error.column})
                        </div>
                      ))}
                      {validationResult.errors.length > 10 && (
                        <div className="text-sm text-gray-600">
                          ...and {validationResult.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{validationResult.warnings.length} warnings:</strong>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {validationResult.warnings.slice(0, 5).map((warning, index) => (
                        <div key={index} className="text-sm">
                          Row {warning.row}: {warning.message} ({warning.column})
                        </div>
                      ))}
                      {validationResult.warnings.length > 5 && (
                        <div className="text-sm text-gray-600">
                          ...and {validationResult.warnings.length - 5} more warnings
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.isValid && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Data validation successful! Ready to import {validationResult.validRows} leads.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Import */}
          {currentStep === 'import' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Importing Leads...
                </h3>
                <p className="text-gray-600 mb-4">
                  Please wait while we import your leads
                </p>
                
                <div className="max-w-md mx-auto">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-gray-600 mt-2">
                    {importProgress}% complete
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && importResult && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  importResult.success > 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {importResult.success > 0 ? 
                    <CheckCircle className="w-8 h-8 text-green-600" /> :
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  }
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import Complete
                </h3>
                
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {importResult.success}
                    </div>
                    <div className="text-sm text-green-600">Imported</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-red-600">
                      {importResult.errors.length}
                    </div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Import errors:</strong>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm">
                          {error}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="text-sm text-gray-600">
                          ...and {importResult.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            {currentStep === 'complete' ? 'Close' : 'Cancel'}
          </Button>

          <div className="flex gap-2">
            {currentStep === 'validate' && validationResult && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('upload')}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!validationResult.isValid || isProcessing || validationResult.validRows === 0}
                >
                  Import {validationResult.validRows} Leads
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
