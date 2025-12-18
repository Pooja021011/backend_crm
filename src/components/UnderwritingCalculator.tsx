import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calculator, ChevronDown, ChevronUp, Save, Lock } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface UnderwritingCalculatorProps {
  leadId: string;
  rehabCost: number; // Auto-filled from Rehab Calculator
  readOnly?: boolean;
  onValuesChange?: (values: { arv: number; taxes: number; timeline: number; finalOffer: number }) => void;
}

export function UnderwritingCalculator({ 
  leadId, 
  rehabCost,
  readOnly = false,
  onValuesChange
}: UnderwritingCalculatorProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  
  // ONLY 3 EDITABLE FIELDS
  const [arv, setArv] = useState(0);
  const [taxes, setTaxes] = useState(1000);
  const [timeline, setTimeline] = useState(6); // months

  // CALCULATED OUTPUT
  const [finalOffer, setFinalOffer] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSavedData();
  }, [leadId]);

  // Calculate Final Offer when inputs change
  useEffect(() => {
    calculateFinalOffer();
  }, [arv, rehabCost]);

  const fetchSavedData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/underwriting`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const latest = data.data[0];
          setArv(latest.arv || 0);
          setTaxes(latest.taxes || 1000);
          setTimeline(latest.timeline || 6);
        }
      }
    } catch (error) {
      console.error('Error fetching saved data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalOffer = () => {
    if (arv === 0) {
      setFinalOffer(0);
      if (onValuesChange) {
        onValuesChange({ arv: 0, taxes, timeline, finalOffer: 0 });
      }
      return;
    }

    // FORMULA: (ARV × 72%) - Rehab Cost - $25,000
    const calculatedOffer = (arv * 0.72) - rehabCost - 25000;
    const finalOfferValue = Math.max(0, Math.round(calculatedOffer));
    setFinalOffer(finalOfferValue);
    
    // Notify parent of value changes
    if (onValuesChange) {
      onValuesChange({ arv, taxes, timeline, finalOffer: finalOfferValue });
    }
  };

  const handleSave = async () => {
    if (arv === 0) {
      toast({ title: 'Error', description: 'Please enter ARV', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/underwriting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          arv,
          rehabCost, // Save for reference, but it's auto-filled
          taxes,
          timeline
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Underwriting saved' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) return null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Calculator className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Underwriting Calculator</span>
          <span className="text-xs text-emerald-600 font-semibold ml-2">
            Final Offer: {formatCurrency(finalOffer)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 text-[10px] px-1"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-2.5 h-2.5 mr-0.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-5 text-[10px] px-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 mt-2">
          {/* INPUTS */}
          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
            <Label className="text-[10px] font-semibold text-blue-700 mb-1 block">INPUTS</Label>
            <div className="grid grid-cols-4 gap-2">
              {/* ARV - EDITABLE */}
              <div className="flex flex-col">
                <Label className="text-[10px] text-slate-600 mb-1 h-4">ARV *</Label>
                <Input
                  type="number"
                  value={arv || ''}
                  onChange={(e) => setArv(Number(e.target.value) || 0)}
                  disabled={readOnly}
                  className="h-7 text-xs"
                  placeholder="Enter ARV"
                />
              </div>

              {/* REHAB COST - READ-ONLY (from Rehab Calculator) */}
              <div className="flex flex-col">
                <Label className="text-[10px] text-slate-600 mb-1 h-4 flex items-center gap-1">
                  Rehab Cost <Lock className="w-2.5 h-2.5 text-slate-400" />
                </Label>
                <Input
                  type="text"
                  value={rehabCost ? `$${rehabCost.toLocaleString()}` : '$0'}
                  disabled={true}
                  className="h-7 text-xs bg-slate-100 cursor-not-allowed text-slate-600 font-medium"
                  readOnly
                />
              </div>

              {/* TAXES - EDITABLE */}
              <div className="flex flex-col">
                <Label className="text-[10px] text-slate-600 mb-1 h-4">Annual Taxes *</Label>
                <Input
                  type="number"
                  value={taxes || ''}
                  onChange={(e) => setTaxes(Number(e.target.value) || 0)}
                  disabled={readOnly}
                  className="h-7 text-xs"
                  placeholder="1000"
                />
              </div>

              {/* TIMELINE - EDITABLE */}
              <div className="flex flex-col">
                <Label className="text-[10px] text-slate-600 mb-1 h-4">Timeline (months) *</Label>
                <Input
                  type="number"
                  value={timeline || ''}
                  onChange={(e) => setTimeline(Number(e.target.value) || 0)}
                  disabled={readOnly}
                  className="h-7 text-xs"
                  placeholder="6"
                  min={1}
                />
              </div>
            </div>
          </div>

          {/* FINAL OFFER CALCULATION */}
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
            <Label className="text-[10px] font-semibold text-emerald-700 mb-1 block">FINAL OFFER CALCULATION</Label>
            <div className="text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-600">ARV × 72%:</span>
                <span className="font-medium">{formatCurrency(arv * 0.72)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">- Rehab Cost:</span>
                <span className="font-medium">-{formatCurrency(rehabCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">- Fixed Cost:</span>
                <span className="font-medium">-{formatCurrency(25000)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                <span className="text-emerald-700">FINAL OFFER:</span>
                <span className="text-emerald-700">{formatCurrency(finalOffer)}</span>
              </div>
            </div>
          </div>

          {/* INFO NOTE */}
          <div className="text-[9px] text-slate-500 italic p-1 bg-slate-50 rounded">
            💡 This calculator is visible only to Admin, Manager, and Acquisitions roles.
          </div>
        </div>
      )}
    </div>
  );
}
