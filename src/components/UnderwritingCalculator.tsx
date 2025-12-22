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
  const [arvDisplay, setArvDisplay] = useState('');
  const [taxesDisplay, setTaxesDisplay] = useState('');

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
          const loadedArv = latest.arv || 0;
          const loadedTaxes = latest.taxes || 0;
          setArv(loadedArv);
          setTaxes(loadedTaxes);
          setArvDisplay(loadedArv ? formatCurrency(loadedArv) : '');
          setTaxesDisplay(loadedTaxes ? formatCurrency(loadedTaxes) : '');
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

    // FORMULA: (ARV × 72%) - Rehab Cost (matches Google Sheet 'Final Offer' tab)
    const calculatedOffer = (arv * 0.72) - rehabCost;
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

  const parseCurrencyInput = (raw: string): number => {
    // Keep digits only; treat empty as 0
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
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
              <div>
                <Label className="text-[10px] text-slate-600">ARV *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={arvDisplay}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setArvDisplay(raw);
                    setArv(parseCurrencyInput(raw));
                  }}
                  onBlur={() => setArvDisplay(arv ? formatCurrency(arv) : '')}
                  disabled={readOnly}
                  className="h-6 text-xs"
                  placeholder="Enter ARV"
                />
              </div>

              {/* REHAB COST - READ-ONLY (from Rehab Calculator) */}
              <div>
                <Label className="text-[10px] text-slate-600">Rehab Cost</Label>
                <Input
                  type="text"
                  value={rehabCost ? `$${rehabCost.toLocaleString()}` : '$0'}
                  disabled={true}
                  className="h-6 text-xs bg-slate-100 cursor-not-allowed text-slate-600 font-medium"
                  readOnly
                />
              </div>

              {/* TAXES - EDITABLE */}
              <div>
                <Label className="text-[10px] text-slate-600">Annual Taxes *</Label>
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
                <Label className="text-[10px] text-slate-600">Timeline (months) *</Label>
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
