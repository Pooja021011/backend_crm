import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Upload, X } from "lucide-react";

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await onSubmit(files);
      setFiles([]);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Property Photos Required</DialogTitle>
          <DialogDescription>
            Please upload property photos before marking appointment as complete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 mx-auto mb-2 text-slate-400" />
            <Label htmlFor="photo-upload" className="cursor-pointer text-sm text-slate-600 hover:text-slate-900">
              Click to upload photos
            </Label>
            <Input 
              id="photo-upload"
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={files.length === 0 || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
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
  existingData 
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  existingData?: any;
}) => {
  const [hvacType, setHvacType] = useState(existingData?.hvacType || '');
  const [hvacAge, setHvacAge] = useState(existingData?.hvacAge?.toString() || '');
  const [waterHeaterAge, setWaterHeaterAge] = useState(existingData?.waterHeaterAge?.toString() || '');
  const [roofAge, setRoofAge] = useState(existingData?.roofAge?.toString() || '');
  const [waterType, setWaterType] = useState(existingData?.waterType || '');
  const [sewerType, setSewerType] = useState(existingData?.sewerType || '');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        hvacType,
        hvacAge: parseInt(hvacAge),
        waterHeaterAge: parseInt(waterHeaterAge),
        roofAge: parseInt(roofAge),
        waterType,
        sewerType
      });
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const isValid = hvacType && hvacAge && waterHeaterAge && roofAge && waterType && sewerType;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Property Information Required</DialogTitle>
          <DialogDescription>
            Please provide the following property details to complete due diligence.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <Label>HVAC Type *</Label>
            <Input 
              value={hvacType} 
              onChange={(e) => setHvacType(e.target.value)}
              placeholder="e.g., Central Air, Heat Pump"
            />
          </div>
          <div>
            <Label>HVAC Age (years) *</Label>
            <Input 
              type="number" 
              value={hvacAge} 
              onChange={(e) => setHvacAge(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <Label>Water Heater Age (years) *</Label>
            <Input 
              type="number" 
              value={waterHeaterAge} 
              onChange={(e) => setWaterHeaterAge(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <Label>Roof Age (years) *</Label>
            <Input 
              type="number" 
              value={roofAge} 
              onChange={(e) => setRoofAge(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <Label>Water Type *</Label>
            <Select value={waterType} onValueChange={setWaterType}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="City">City</SelectItem>
                <SelectItem value="Well">Well</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sewer Type *</Label>
            <Select value={sewerType} onValueChange={setSewerType}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="City">City</SelectItem>
                <SelectItem value="Septic">Septic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
            className="flex-1"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </Button>
        </div>
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
  const [maxAllowableOffer, setMaxAllowableOffer] = useState(existingData?.maxAllowableOffer?.toString() || '');
  const [offerMadeResponse, setOfferMadeResponse] = useState(existingData?.offerMadeResponse || '');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        offerMadePrice: parseFloat(offerMadePrice),
        maxAllowableOffer: parseFloat(maxAllowableOffer),
        offerMadeResponse
      });
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const isValid = offerMadePrice && maxAllowableOffer && offerMadeResponse;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Offer Details Required</DialogTitle>
          <DialogDescription>
            Please provide offer details to track this opportunity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Offer Made Price *</Label>
            <Input 
              type="number" 
              value={offerMadePrice} 
              onChange={(e) => setOfferMadePrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <Label>Max Allowable Offer *</Label>
            <Input 
              type="number" 
              value={maxAllowableOffer} 
              onChange={(e) => setMaxAllowableOffer(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <Label>Offer Response *</Label>
            <Select value={offerMadeResponse} onValueChange={setOfferMadeResponse}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Negotiating">Negotiating</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {offerMadeResponse === 'Negotiating' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
              A follow-up task will be created for 6 hours from now.
            </div>
          )}
          {offerMadeResponse === 'Rejected' && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm text-orange-800">
              A re-offer task will be created for 2 weeks from now.
            </div>
          )}
          {offerMadeResponse === 'Accepted' && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
              Congratulations! Contract process will begin.
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || submitting}
            className="flex-1"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

