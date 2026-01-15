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
  onValuesChange?: (values: { arv: number; taxes: number; timeline: number; finalOffer: number; rehabCost: number }) => void;
  // Initial values from customFields
  initialArv?: number;
  initialTaxes?: number;
  initialTimeline?: number;
}

export function UnderwritingCalculator({ 
  leadId, 
  rehabCost,
  readOnly = false,
  onValuesChange,
  initialArv = 0,
  initialTaxes = 1000,
  initialTimeline = 6
}: UnderwritingCalculatorProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  
  // Helper functions defined first
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const parseCurrencyInput = (raw: string): number => {
    // Keep digits only; treat empty as 0
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };
  
  // EDITABLE FIELDS
  const [arv, setArv] = useState(initialArv);
  const [rehabCostValue, setRehabCostValue] = useState(rehabCost);
  const [taxes, setTaxes] = useState(initialTaxes);
  const [timeline, setTimeline] = useState(initialTimeline); // months
  const [taxesDisplay, setTaxesDisplay] = useState(initialTaxes ? formatCurrency(initialTaxes) : '');

  // CALCULATED OUTPUT
  const [finalOffer, setFinalOffer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // No longer fetching from API - using initial values from props
    setLoading(false);
  }, [leadId]);

  // Sync ARV value when parent updates initialArv (from Comparable Properties)
  useEffect(() => {
    setArv(initialArv || 0);
  }, [initialArv]);

  // Update rehabCostValue when rehabCost prop changes
  useEffect(() => {
    setRehabCostValue(rehabCost);
  }, [rehabCost]);

  // Calculate Final Offer when inputs change
  useEffect(() => {
    calculateFinalOffer();
  }, [arv, rehabCostValue]);

  const calculateFinalOffer = () => {
    if (arv === 0) {
      setFinalOffer(0);
      if (onValuesChange) {
        onValuesChange({ arv: 0, taxes, timeline, finalOffer: 0, rehabCost: rehabCostValue });
      }
      return;
    }

    // FORMULA: (ARV × 72%) - Rehab Cost - $25,000 (matches Google Sheet 'Final Offer' tab)
    const calculatedOffer = (arv * 0.72) - rehabCostValue - 25000;
    const finalOfferValue = Math.max(0, Math.round(calculatedOffer));
    setFinalOffer(finalOfferValue);
    
    // Notify parent of value changes (including rehabCost)
    if (onValuesChange) {
      onValuesChange({ arv, taxes, timeline, finalOffer: finalOfferValue, rehabCost: rehabCostValue });
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
          rehabCost: rehabCostValue, // Save the editable value
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

  if (loading) return null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Calculator className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Underwriting Calculator</span>
          {!expanded && (
            <span className="text-xs text-emerald-600 font-semibold ml-2">
              Final Offer: {formatCurrency(finalOffer)}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2 mt-2">
          {/* Configuration Section */}
          <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 rounded">
            {/* ARV - READ-ONLY (auto-filled from Comparable Properties) */}
            <div>
              <Label className="text-[10px] text-slate-500">ARV</Label>
              <Input
                type="text"
                value={arv ? `$${arv.toLocaleString()}` : '$0'}
                disabled={true}
                className="h-6 text-xs bg-slate-100 cursor-not-allowed text-slate-400 font-medium"
                readOnly
              />
            </div>

            {/* REHAB COST - READ-ONLY (auto-filled from Rehab Calculator) */}
            <div>
              <Label className="text-[10px] text-slate-500">Rehab Cost</Label>
              <Input
                type="text"
                value={rehabCostValue ? `$${rehabCostValue.toLocaleString()}` : '$0'}
                disabled={true}
                className="h-6 text-xs bg-slate-100 cursor-not-allowed text-slate-400 font-medium"
                readOnly
              />
            </div>

            {/* TAXES - EDITABLE */}
            <div>
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
                onBlur={() => setTaxesDisplay(taxes ? formatCurrency(taxes) : '')}
                disabled={readOnly}
                className="h-6 text-xs"
                placeholder="1000"
              />
            </div>

            {/* TIMELINE - EDITABLE */}
            <div>
              <Label className="text-[10px] text-slate-500">Timeline (Months)</Label>
              <Input
                type="number"
                value={timeline || ''}
                onChange={(e) => setTimeline(Number(e.target.value) || 0)}
                disabled={readOnly}
                className="h-6 text-xs"
                placeholder="6"
                min={1}
              />
            </div>
          </div>

          {/* FINAL OFFER CALCULATION */}
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-emerald-700">Final Offer</span>
              <span className="text-[12px] font-bold text-emerald-700 tabular-nums">{formatCurrency(finalOffer)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
