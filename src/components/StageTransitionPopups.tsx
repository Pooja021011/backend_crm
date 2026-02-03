import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useId, useState, useEffect } from "react";
import { Upload, X, ClipboardList, AlertCircle, DollarSign, Calendar, Loader2 } from "lucide-react";
import { API_BASE } from '@/config/api';

// Popup for Appointment Complete - Photo Upload Required
export const AppointmentCompletePopup = ({ 
  open, 
  onClose, 
  onSubmit,
  leadId
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (files: File[]) => Promise<void>;
  leadId: string;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputId = useId();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incoming = Array.from(e.target.files);
      
      // Filter for images only (JPEG, PNG, HEIC)
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
      
      const validFiles = incoming.filter(file => {
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        const hasValidMimeType = allowedMimeTypes.includes(file.type.toLowerCase());
        return hasValidExtension || hasValidMimeType;
      });
      
      // Append so user can select multiple times (bulk upload), while de-duping by file identity
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
        const next = [...prev];
        for (const f of validFiles) {
          const key = `${f.name}:${f.size}:${f.lastModified}`;
          if (!seen.has(key)) {
            seen.add(key);
            next.push(f);
          }
        }
        return next;
      });

      // Reset input so the same file can be selected again if needed
      e.target.value = "";
    }
  };
  
  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await onSubmit(files);
      setFiles([]);
      onClose(); // close popup after successful upload + stage update
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" />
            Pictures Required
          </DialogTitle>
          <DialogDescription>
            Please upload at least 3 pictures before moving to this stage. Only JPEG, PNG, and HEIC images are allowed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center">
            <Label
              htmlFor={inputId}
              className="cursor-pointer text-sm text-slate-600 hover:text-slate-900"
            >
              Click to upload
            </Label>
            <Input 
              id={inputId}
              type="file" 
              multiple 
              accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
              onChange={handleFileChange}
              className="hidden"
            />
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-8 w-8 text-slate-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={files.length < 3 || uploading}
            >
              {uploading ? 'Uploading...' : files.length < 3 ? `Upload ${files.length} Picture${files.length !== 1 ? 's' : ''} (${3 - files.length} more needed)` : `Upload ${files.length} Picture${files.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Popup for Due Diligence Complete - Property Information Required
export const DueDiligencePopup = ({ 
  open, 
  onClose, 
  onSubmit, 
  existingData,
  missingFields
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  existingData?: any;
  missingFields?: string[];
}) => {
  const [hvacType, setHvacType] = useState('');
  const [hvacAge, setHvacAge] = useState('');
  const [waterHeaterAge, setWaterHeaterAge] = useState('');
  const [roofAge, setRoofAge] = useState('');
  const [waterType, setWaterType] = useState('');
  const [sewerType, setSewerType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync with existingData whenever popup opens or existingData changes
  useEffect(() => {
    if (open) {
      console.log('🔄 DueDiligencePopup - Syncing with existingData:', existingData);
      setHvacType(existingData?.hvacType || '');
      setHvacAge(existingData?.hvacAge?.toString() || '');
      setWaterHeaterAge(existingData?.waterHeaterAge?.toString() || '');
      setRoofAge(existingData?.roofAge?.toString() || '');
      setWaterType(existingData?.waterType || '');
      setSewerType(existingData?.sewerType || '');
    }
  }, [open, JSON.stringify(existingData)]);

  const want = (key: string) => !missingFields || missingFields.length === 0 || missingFields.includes(key);
  
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: any = {};
      if (want('hvacType') && hvacType) payload.hvacType = hvacType;
      if (want('hvacAge') && hvacAge) payload.hvacAge = parseInt(hvacAge);
      if (want('waterHeaterAge') && waterHeaterAge) payload.waterHeaterAge = parseInt(waterHeaterAge);
      if (want('roofAge') && roofAge) payload.roofAge = parseInt(roofAge);
      if (want('waterType') && waterType) payload.waterType = waterType;
      if (want('sewerType') && sewerType) payload.sewerType = sewerType;

      await onSubmit(payload);
      // Don't call onClose here - let the parent handle it
    } catch (error) {
      console.error('❌ Submit failed with error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Only validate fields that are actually required (in missingFields)
  const isValid =
    (!want('hvacType') || !!hvacType) &&
    (!want('hvacAge') || !!hvacAge) &&
    (!want('waterHeaterAge') || !!waterHeaterAge) &&
    (!want('roofAge') || !!roofAge) &&
    (!want('waterType') || !!waterType) &&
    (!want('sewerType') || !!sewerType);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            Property Information Required
          </DialogTitle>
          <DialogDescription>
            Please provide the following property details to complete due diligence.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-1 pb-2">
          <div className="grid grid-cols-2 gap-3">
          {want('hvacType') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">HVAC *</Label>
              <Input 
                value={hvacType} 
                onChange={(e) => setHvacType(e.target.value)}
                placeholder="Type"
                className="h-7 text-xs"
              />
            </div>
          )}
          {want('hvacAge') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">HVAC Age *</Label>
              <Input 
                type="number" 
                value={hvacAge} 
                onChange={(e) => setHvacAge(e.target.value)}
                placeholder="Yrs"
                min="0"
                className="h-7 text-xs"
              />
            </div>
          )}
          {want('waterHeaterAge') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">WH Age *</Label>
              <Input 
                type="number" 
                value={waterHeaterAge} 
                onChange={(e) => setWaterHeaterAge(e.target.value)}
                placeholder="Yrs"
                min="0"
                className="h-7 text-xs"
              />
            </div>
          )}
          {want('roofAge') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Roof Age *</Label>
              <Input 
                type="number" 
                value={roofAge} 
                onChange={(e) => setRoofAge(e.target.value)}
                placeholder="Yrs"
                min="0"
                className="h-7 text-xs"
              />
            </div>
          )}
          {want('waterType') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Water *</Label>
              <Input
                value={waterType}
                onChange={(e) => setWaterType(e.target.value)}
                placeholder="Type"
                className="h-6 text-xs"
              />
            </div>
          )}
          {want('sewerType') && (
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Sewer *</Label>
              <Input
                value={sewerType}
                onChange={(e) => setSewerType(e.target.value)}
                placeholder="Type"
                className="h-6 text-xs"
              />
            </div>
          )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DueDiligenceCompleteRequirementsPopup = ({
  open,
  onClose,
  missingItems
}: {
  open: boolean;
  onClose: () => void;
  missingItems: string[];
}) => {
  const labelFor = (k: string) => {
    switch (k) {
      case 'arv': return 'ARV Input';
      case 'comparables': return 'Comparable properties';
      case 'rehabBudget': return 'Rehab Budget';
      case 'underwritingCalculation': return 'Underwriting Calculator';
      case 'underwritingTaxes': return 'Annual Taxes';
      case 'underwritingTimeline': return 'Timeline (Months)';
      default: return k;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            Due Diligence Complete Requirements
          </DialogTitle>
          <DialogDescription>
            Please complete the following items before moving to Due Diligence Complete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {(missingItems || []).map((k) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
              <span>{labelFor(k)}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Popup for Offer Made - Offer Details Required
export const OfferMadePopup = ({ 
  open, 
  onClose, 
  onSubmit, 
  existingData 
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  existingData?: any;
}) => {
  const [offerMadePrice, setOfferMadePrice] = useState(existingData?.offerMadePrice?.toString() || '');
  const [offerMadeResponse, setOfferMadeResponse] = useState(existingData?.offerMadeResponse || '');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        offerMadePrice: parseFloat(offerMadePrice),
        offerMadeResponse
      });
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const isValid = offerMadePrice && offerMadeResponse;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            Offer Details Required
          </DialogTitle>
          <DialogDescription>
            Please provide offer details to track this opportunity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Offer Price *</Label>
              <Input 
                type="number" 
                value={offerMadePrice} 
                onChange={(e) => setOfferMadePrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500">Response *</Label>
            <Select value={offerMadeResponse} onValueChange={setOfferMadeResponse}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Negotiating">Negotiating</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {offerMadeResponse === 'Negotiating' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
              Offer is being negotiated. Please create a follow-up task manually if needed.
            </div>
          )}
          {offerMadeResponse === 'Accepted' && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
              Congratulations! Contract process will begin.
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Popup for Long Term Follow Up - Follow-up Task Required (task only; no notes)
export const FollowUpTaskRequiredPopup = ({
  open,
  onClose,
  onSubmit,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; dueAt: string }) => Promise<void>;
  message?: string;
}) => {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = title.trim().length > 0 && dueAt.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), dueAt });
      setTitle('');
      setDueAt('');
      onClose();
    } catch (e) {
      console.error('Submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Follow-up Task Required
          </DialogTitle>
          <DialogDescription>
            {message || 'Please create a follow-up task for this lead.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500">Task Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow up with lead"
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500">Due Date & Time *</Label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Popup for Appointment Set - Ask for Appointment Date
export const AppointmentSetPopup = ({ 
  open, 
  onClose, 
  onSubmit 
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (appointmentDate: string) => Promise<void>;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [amPm, setAmPm] = useState<'AM' | 'PM'>('PM');

  // Format display for button
  const formatDisplay = () => {
    if (!selectedDate) return 'Select appointment date & time';
    const dateStr = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateStr} at ${hour}:${minute} ${amPm}`;
  };

  // Compute ISO string from date + time
  const computeIsoString = (date: Date | null, h: string, m: string, period: 'AM' | 'PM'): string | null => {
    if (!date) return null;
    let hours = parseInt(h, 10);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const d = new Date(date);
    d.setHours(hours, parseInt(m, 10), 0, 0);
    return d.toISOString();
  };

  const handleSubmit = async () => {
    const isoString = computeIsoString(selectedDate, hour, minute, amPm);
    if (!isoString) return;
    
    setSubmitting(true);
    try {
      await onSubmit(isoString);
      // Reset state
      setSelectedDate(null);
      setHour('12');
      setMinute('00');
      setAmPm('PM');
      onClose();
    } catch (error) {
      console.error('Failed to set appointment date:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Set Appointment Date
          </DialogTitle>
          <DialogDescription>
            Please select the date and time for the appointment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2">
          <Label className="text-xs">Appointment Date & Time *</Label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal text-xs h-8"
                disabled={submitting}
              >
                {formatDisplay()}
                <Calendar className="w-4 h-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <UiCalendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setSelectedDate(d);
                  }}
                  initialFocus
                />

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Hour</Label>
                    <Select value={hour} onValueChange={setHour}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => {
                          const h = String(i + 1);
                          return (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Minute</Label>
                    <Select value={minute} onValueChange={setMinute}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }).map((_, i) => {
                          const m = String(i).padStart(2, '0');
                          return (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">AM/PM</Label>
                    <Select value={amPm} onValueChange={(v) => setAmPm(v as 'AM' | 'PM')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedDate || submitting}>
            {submitting ? 'Setting...' : 'Set Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Popup for ARV + Comparables (Due Diligence Step 1)
export const ArvComparablesPopup = ({
  open,
  onClose,
  onSubmit,
  existingData
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { arv: number; comparablesFiles: File[] }) => Promise<void>;
  existingData?: any;
}) => {
  const [arvValue, setArvValue] = useState(existingData?.arv || 0);
  const [arvDisplay, setArvDisplay] = useState(() => {
    if (existingData?.arv) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(existingData.arv);
    }
    return '';
  });
  const [comparablesFiles, setComparablesFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputId = useId();

  // Update ARV when popup opens with new data
  useEffect(() => {
    if (open && existingData?.arv) {
      setArvValue(existingData.arv);
      setArvDisplay(new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(existingData.arv));
    } else if (open && !existingData?.arv) {
      setArvValue(0);
      setArvDisplay('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(existingData)]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parseCurrencyInput = (raw: string): number => {
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      // Only accept PDFs
      const pdfFiles = files.filter(file => file.type === 'application/pdf');
      const nonPdfFiles = files.filter(file => file.type !== 'application/pdf');
      
      if (nonPdfFiles.length > 0) {
        alert('Only PDF files are allowed for comparable properties');
      }
      
      if (pdfFiles.length > 0) {
        setComparablesFiles(pdfFiles);
      } else {
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        arv: arvValue,
        comparablesFiles
      });
      // Reset on success
      setArvValue(0);
      setArvDisplay('');
      setComparablesFiles([]);
      // DON'T call onClose here - let parent decide when to close after checking validation
      // onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = arvValue > 0 && comparablesFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            ARV & Comparable Properties Required
          </DialogTitle>
          <DialogDescription>
            Please provide the After Repair Value (ARV) and comparable properties in PDF format.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm text-slate-700">ARV *</Label>
            <Input 
              type="text" 
              inputMode="numeric"
              value={arvDisplay} 
              onChange={(e) => {
                setArvDisplay(e.target.value);
                const value = parseCurrencyInput(e.target.value);
                setArvValue(value);
              }}
              onBlur={() => {
                if (arvValue > 0) {
                  setArvDisplay(formatCurrency(arvValue));
                }
              }}
              placeholder="$0"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-slate-700">Comparable Properties (PDF only) *</Label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
              <Label
                htmlFor={inputId}
                className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {comparablesFiles.length > 0 
                  ? `${comparablesFiles.length} file${comparablesFiles.length !== 1 ? 's' : ''} selected`
                  : 'Click to upload PDF(s)'}
              </Label>
              <Input 
                id={inputId}
                type="file" 
                multiple
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {comparablesFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-600 font-medium">
                  Selected files ({comparablesFiles.length}):
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {comparablesFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      <span className="flex-1">✓ {file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const newFiles = comparablesFiles.filter((_, i) => i !== index);
                          setComparablesFiles(newFiles);
                          const input = document.getElementById(inputId) as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Popup for Full Rehab Budget (Due Diligence Step 2)
export const RehabBudgetFullPopup = ({
  open,
  onClose,
  onSubmit,
  existingData,
  sqft
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  existingData?: any;
  sqft?: number;
}) => {
  const [finishLevel, setFinishLevel] = useState<'low_end' | 'mid_range' | 'high_end'>(
    existingData?.rehabFinishLevel || 'mid_range'
  );
  const [numberOfWindows, setNumberOfWindows] = useState(existingData?.rehabNumberOfWindows || 10);
  const [numberOfBathrooms, setNumberOfBathrooms] = useState<number | undefined>(existingData?.rehabBathrooms ?? existingData?.bathrooms);
  const [squareFeet, setSquareFeet] = useState<number>(sqft || existingData?.sqft || 0);
  const [miscLabel, setMiscLabel] = useState(existingData?.rehabCustomValues?.miscLabel || '');
  const [miscValue, setMiscValue] = useState(existingData?.rehabCustomValues?.miscValue?.toString() || '');
  const [submitting, setSubmitting] = useState(false);

  // Rehab items with toggles - Match RehabBudgetCalculatorCompact exactly
  const [items, setItems] = useState<any>({
    // Planning
    permits: existingData?.rehabToggledItems?.permits ?? false,
    demolition: existingData?.rehabToggledItems?.demolition ?? false,
    cleanup: existingData?.rehabToggledItems?.cleanup ?? false,
    // Structure
    foundation: existingData?.rehabToggledItems?.foundation ?? false,
    roof: existingData?.rehabToggledItems?.roof ?? false,
    framing: existingData?.rehabToggledItems?.framing ?? false,
    windows: existingData?.rehabToggledItems?.windows ?? false,
    entryDoor: existingData?.rehabToggledItems?.entryDoor ?? false,
    // Mechanicals
    hvac: existingData?.rehabToggledItems?.hvac ?? false,
    electrical: existingData?.rehabToggledItems?.electrical ?? false,
    plumbing: existingData?.rehabToggledItems?.plumbing ?? false,
    // Interior
    drywall: existingData?.rehabToggledItems?.drywall ?? false,
    insulation: existingData?.rehabToggledItems?.insulation ?? false,
    paintInterior: existingData?.rehabToggledItems?.paintInterior ?? false,
    paintExterior: existingData?.rehabToggledItems?.paintExterior ?? false,
    flooring: existingData?.rehabToggledItems?.flooring ?? false,
    // Kitchen
    kitchenCabinets: existingData?.rehabToggledItems?.kitchenCabinets ?? false,
    kitchenCountertops: existingData?.rehabToggledItems?.kitchenCountertops ?? false,
    kitchenAppliances: existingData?.rehabToggledItems?.kitchenAppliances ?? false,
    kitchenSink: existingData?.rehabToggledItems?.kitchenSink ?? false,
    // Bathrooms
    bathroomVanity: existingData?.rehabToggledItems?.bathroomVanity ?? false,
    bathroomShower: existingData?.rehabToggledItems?.bathroomShower ?? false,
    bathroomToilet: existingData?.rehabToggledItems?.bathroomToilet ?? false,
    bathroomFixtures: existingData?.rehabToggledItems?.bathroomFixtures ?? false,
    // Miscellaneous
    smartHome: existingData?.rehabToggledItems?.smartHome ?? false,
    landscaping: existingData?.rehabToggledItems?.landscaping ?? false,
  });

  // Calculation state for displaying costs
  const [calculation, setCalculation] = useState<{
    itemizedCosts: { [key: string]: number };
    subtotal: number;
    contingencyAmount: number;
    totalCost: number;
  }>({
    itemizedCosts: {},
    subtotal: 0,
    contingencyAmount: 0,
    totalCost: 0
  });

  // Calculate costs whenever inputs change
  useEffect(() => {
    if (open && squareFeet > 0) {
      calculateBudget();
    }
  }, [open, finishLevel, items, numberOfBathrooms, numberOfWindows, squareFeet]);

  const calculateBudget = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/rehab-budget/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sqft: squareFeet,
          finishLevel,
          toggledItems: items,
          numberOfBathrooms,
          numberOfWindows
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalculation(data.data);
      }
    } catch (error) {
      console.error('Error calculating budget:', error);
    }
  };

  const getItemCost = (key: string): number => {
    return (calculation.itemizedCosts && calculation.itemizedCosts[key]) ? calculation.itemizedCosts[key] : 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Update all fields when popup opens with new data
  useEffect(() => {
    if (open && existingData) {
      console.log('🔄 RehabBudgetFullPopup - Syncing data:', {
        rehabToggledItems: existingData.rehabToggledItems,
        bathrooms: existingData.bathrooms,
        sqft: existingData.sqft,
        finishLevel: existingData.rehabFinishLevel,
      });
      
      setFinishLevel(existingData.rehabFinishLevel || 'mid_range');
      setNumberOfWindows(existingData.rehabNumberOfWindows || 10);
      setNumberOfBathrooms(existingData.rehabBathrooms ?? existingData.bathrooms);
      setSquareFeet(existingData.sqft || sqft || 0);
      setMiscLabel(existingData.rehabCustomValues?.miscLabel || '');
      setMiscValue(existingData.rehabCustomValues?.miscValue?.toString() || '');
      
      // Update all rehab items
      setItems({
        // Planning
        permits: existingData?.rehabToggledItems?.permits ?? false,
        demolition: existingData?.rehabToggledItems?.demolition ?? false,
        cleanup: existingData?.rehabToggledItems?.cleanup ?? false,
        // Structure
        foundation: existingData?.rehabToggledItems?.foundation ?? false,
        roof: existingData?.rehabToggledItems?.roof ?? false,
        framing: existingData?.rehabToggledItems?.framing ?? false,
        windows: existingData?.rehabToggledItems?.windows ?? false,
        entryDoor: existingData?.rehabToggledItems?.entryDoor ?? false,
        // Mechanicals
        hvac: existingData?.rehabToggledItems?.hvac ?? false,
        electrical: existingData?.rehabToggledItems?.electrical ?? false,
        plumbing: existingData?.rehabToggledItems?.plumbing ?? false,
        // Interior
        drywall: existingData?.rehabToggledItems?.drywall ?? false,
        insulation: existingData?.rehabToggledItems?.insulation ?? false,
        paintInterior: existingData?.rehabToggledItems?.paintInterior ?? false,
        paintExterior: existingData?.rehabToggledItems?.paintExterior ?? false,
        flooring: existingData?.rehabToggledItems?.flooring ?? false,
        // Kitchen
        kitchenCabinets: existingData?.rehabToggledItems?.kitchenCabinets ?? false,
        kitchenCountertops: existingData?.rehabToggledItems?.kitchenCountertops ?? false,
        kitchenAppliances: existingData?.rehabToggledItems?.kitchenAppliances ?? false,
        kitchenSink: existingData?.rehabToggledItems?.kitchenSink ?? false,
        // Bathrooms
        bathroomVanity: existingData?.rehabToggledItems?.bathroomVanity ?? false,
        bathroomShower: existingData?.rehabToggledItems?.bathroomShower ?? false,
        bathroomToilet: existingData?.rehabToggledItems?.bathroomToilet ?? false,
        bathroomFixtures: existingData?.rehabToggledItems?.bathroomFixtures ?? false,
        // Miscellaneous
        smartHome: existingData?.rehabToggledItems?.smartHome ?? false,
        landscaping: existingData?.rehabToggledItems?.landscaping ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(existingData)]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const submitData = {
        sqft: squareFeet,
        bathrooms: numberOfBathrooms,
        rehabFinishLevel: finishLevel,
        rehabNumberOfWindows: numberOfWindows,
        rehabToggledItems: items,
        rehabCustomValues: {
          miscLabel: miscLabel.trim(),
          miscValue: miscValue ? parseFloat(miscValue) : 0
        },
        // Include calculation data for saving to backend
        calculation: calculation
      };
      
      console.log('📤 RehabBudgetFullPopup - Submitting data:', submitData);
      console.log('📋 Rehab items being submitted:', items);
      console.log('💰 Calculation data:', calculation);
      
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            Rehab Budget Details
          </DialogTitle>
          <DialogDescription>
            Please provide the complete rehab scope for this property.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-4">
            {/* Configuration Section (like RehabBudgetCalculatorCompact) */}
            <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 rounded">
              <div>
                <Label className="text-[10px] text-slate-500">Finish Level</Label>
                <Select value={finishLevel} onValueChange={(val: any) => setFinishLevel(val)}>
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low_end">Low</SelectItem>
                    <SelectItem value="mid_range">Mid</SelectItem>
                    <SelectItem value="high_end">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">SqFt</Label>
                <Input 
                  type="number" 
                  value={squareFeet || ''}
                  onChange={(e) => setSquareFeet(parseInt(e.target.value) || 0)}
                  className="h-6 text-xs"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Bathrooms</Label>
                <Input 
                  type="number" 
                  step="0.5"
                  value={numberOfBathrooms ?? ''}
                  onChange={(e) => setNumberOfBathrooms(e.target.value ? Number(e.target.value) : undefined)}
                  className="h-6 text-xs"
                  min={0}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Windows</Label>
                <Input 
                  type="number" 
                  value={numberOfWindows} 
                  onChange={(e) => setNumberOfWindows(parseInt(e.target.value) || 0)}
                  min="1"
                  className="h-6 text-xs"
                />
              </div>
            </div>

            {/* Rehab Items - Grouped exactly like RehabBudgetCalculatorCompact */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Rehab Items</Label>
              {/* Row 1: Planning + Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Planning */}
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Planning</div>
                  <div className="space-y-1">
                    {[
                      { key: 'permits', label: 'Permits' },
                      { key: 'demolition', label: 'Demo' },
                      { key: 'cleanup', label: 'Cleanup' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Structure */}
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Structure</div>
                  <div className="space-y-1">
                    {[
                      { key: 'foundation', label: 'Foundation' },
                      { key: 'roof', label: 'Roof' },
                      { key: 'framing', label: 'Framing' },
                      { key: 'windows', label: 'Windows' },
                      { key: 'entryDoor', label: 'Entry Door' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Mechanicals + Interior */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Mechanicals */}
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Mechanicals</div>
                  <div className="space-y-1">
                    {[
                      { key: 'hvac', label: 'HVAC' },
                      { key: 'electrical', label: 'Electrical' },
                      { key: 'plumbing', label: 'Plumbing' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interior */}
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Interior</div>
                  <div className="space-y-1">
                    {[
                      { key: 'drywall', label: 'Drywall' },
                      { key: 'insulation', label: 'Insulation' },
                      { key: 'paintInterior', label: 'Paint - Interior' },
                      { key: 'paintExterior', label: 'Paint - Exterior' },
                      { key: 'flooring', label: 'Flooring' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Kitchen + Bathrooms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Kitchen */}
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Kitchen</div>
                  <div className="space-y-1">
                    {[
                      { key: 'kitchenCabinets', label: 'Cabinets' },
                      { key: 'kitchenCountertops', label: 'Counters' },
                      { key: 'kitchenAppliances', label: 'Appliances' },
                      { key: 'kitchenSink', label: 'Sink' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Bathrooms</div>
                  <div className="space-y-1">
                    {[
                      { key: 'bathroomVanity', label: 'Vanity' },
                      { key: 'bathroomShower', label: 'Shower' },
                      { key: 'bathroomToilet', label: 'Toilet' },
                      { key: 'bathroomFixtures', label: 'Fixtures' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 4: Miscellaneous */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Miscellaneous</div>
                  <div className="space-y-1">
                    {[
                      { key: 'smartHome', label: 'Smart Home' },
                      { key: 'landscaping', label: 'Landscaping' },
                    ].map(({ key, label}) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Checkbox
                            id={key}
                            checked={items[key]}
                            onCheckedChange={(checked) => setItems({ ...items, [key]: !!checked })}
                            className="h-3 w-3"
                          />
                          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
                            {label}
                          </Label>
                        </div>
                        <span className={`text-[10px] font-medium tabular-nums ${items[key] ? 'text-slate-700' : 'text-slate-400'}`}>
                          {formatCurrency(getItemCost(key))}
                        </span>
                      </div>
                    ))}
                    {/* Custom Miscellaneous Row - Inline like RehabBudgetCalculatorCompact */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Checkbox
                          id="customMiscEnabled"
                          checked={!!miscValue && parseFloat(miscValue) > 0}
                          onCheckedChange={(checked) => !checked && setMiscValue('')}
                          className="h-3 w-3"
                        />
                        <Input
                          value={miscLabel}
                          onChange={(e) => setMiscLabel(e.target.value)}
                          placeholder="Miscellaneous"
                          style={{ fontSize: '10px', fontWeight: 400 }}
                          className="h-6 px-2 w-[16ch] sm:w-[18ch] md:w-[20ch]"
                        />
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={miscValue}
                        onChange={(e) => setMiscValue(e.target.value)}
                        placeholder="$0"
                        style={{ fontSize: '10px', fontWeight: 400 }}
                        className={`h-6 px-2 w-[10ch] text-right tabular-nums ${miscValue && parseFloat(miscValue) > 0 ? 'text-slate-700' : 'text-slate-400'}`}
                      />
                    </div>
                  </div>
                </div>
                {/* Spacer for alignment */}
                <div className="hidden md:block"></div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Popup for Timeline + Taxes (Due Diligence Step 3)
export const TimelineTaxesPopup = ({
  open,
  onClose,
  onSubmit,
  existingData
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { underwritingTimeline: number; underwritingTaxes: number }) => Promise<void>;
  existingData?: any;
}) => {
  const [timeline, setTimeline] = useState(existingData?.underwritingTimeline?.toString() || '');
  const [taxes, setTaxes] = useState(existingData?.underwritingTaxes || 0);
  const [taxesDisplay, setTaxesDisplay] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Currency formatting helpers (matching UnderwritingCalculator)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const parseCurrencyInput = (raw: string): number => {
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  // Update fields when popup opens with new data
  useEffect(() => {
    if (open) {
      console.log('🔄 TimelineTaxesPopup - Syncing data:', {
        open,
        hasExistingData: !!existingData,
        underwritingTimeline: existingData?.underwritingTimeline,
        underwritingTaxes: existingData?.underwritingTaxes,
        currentTimeline: timeline,
        currentTaxes: taxes
      });
      
      if (existingData) {
        const newTimeline = existingData.underwritingTimeline?.toString() || '';
        const newTaxes = existingData.underwritingTaxes || 0;
        
        console.log('📝 Setting values:', { newTimeline, newTaxes });
        setTimeline(newTimeline);
        setTaxes(newTaxes);
        setTaxesDisplay(newTaxes ? formatCurrency(newTaxes) : '');
      } else {
        console.log('⚠️ No existingData, clearing fields');
        setTimeline('');
        setTaxes(0);
        setTaxesDisplay('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(existingData)]);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        underwritingTimeline: parseInt(timeline),
        underwritingTaxes: taxes
      });
      // Reset on success
      setTimeline('');
      setTaxes(0);
      setTaxesDisplay('');
      // DON'T call onClose here - let parent decide when to close after stage move
      // onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = timeline && parseInt(timeline) > 0 && taxes > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Timeline & Annual Taxes Required
          </DialogTitle>
          <DialogDescription>
            Please provide the project timeline and annual property taxes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500">Timeline (Months)</Label>
            <Input 
              type="number" 
              value={timeline} 
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="6"
              min="1"
              className="h-6 text-xs placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-slate-500">Annual Taxes</Label>
            <Input 
              type="text"
              inputMode="numeric"
              value={taxesDisplay} 
              onChange={(e) => {
                const raw = e.target.value;
                setTaxesDisplay(raw);
                setTaxes(parseCurrencyInput(raw));
              }}
              onBlur={() => {
                setTaxesDisplay(taxes ? formatCurrency(taxes) : '');
              }}
              placeholder="$1,000"
              className="h-6 text-xs placeholder:text-slate-400"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={onClose} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : 'Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

