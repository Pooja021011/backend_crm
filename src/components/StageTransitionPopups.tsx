import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useId, useState, useEffect } from "react";
import { Upload, X, ClipboardList, AlertCircle, DollarSign, Calendar } from "lucide-react";

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
      // Append so user can select multiple times (bulk upload), while de-duping by file identity
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
        const next = [...prev];
        for (const f of incoming) {
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
            Pictures or Files Required
          </DialogTitle>
          <DialogDescription>
            Please upload at least one picture or file before moving to this stage.
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
              disabled={files.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
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
  const [hvacType, setHvacType] = useState(existingData?.hvacType || '');
  const [hvacAge, setHvacAge] = useState(existingData?.hvacAge?.toString() || '');
  const [waterHeaterAge, setWaterHeaterAge] = useState(existingData?.waterHeaterAge?.toString() || '');
  const [roofAge, setRoofAge] = useState(existingData?.roofAge?.toString() || '');
  const [waterType, setWaterType] = useState(existingData?.waterType || '');
  const [sewerType, setSewerType] = useState(existingData?.sewerType || '');
  const [submitting, setSubmitting] = useState(false);

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
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
          >
            {submitting ? 'Saving...' : 'Submit'}
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
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
          >
            {submitting ? 'Saving...' : 'Submit'}
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
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; dueAt: string }) => Promise<void>;
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
            Please create a follow-up task before moving this lead to Long Term Follow Up.
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
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? 'Saving...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

