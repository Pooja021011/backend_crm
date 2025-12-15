import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calculator, ChevronDown, ChevronUp, Save, History } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface UnderwritingCalculation {
  id: string;
  arv: number;
  rehabCost: number;
  finalOffer: number;
  createdAt: string;
}

interface UnderwritingSectionProps {
  leadId: string;
  rehabCost?: number;
  readOnly?: boolean;
}

export function UnderwritingSectionCompact({ leadId, rehabCost = 0, readOnly = false }: UnderwritingSectionProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [arv, setArv] = useState(0);
  const [rehabCostValue, setRehabCostValue] = useState(rehabCost);
  const [finalOffer, setFinalOffer] = useState(0);
  
  const [calculations, setCalculations] = useState<UnderwritingCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCalculations();
  }, [leadId]);

  useEffect(() => {
    setRehabCostValue(rehabCost);
  }, [rehabCost]);

  useEffect(() => {
    if (arv > 0 && rehabCostValue > 0) {
      const calculated = (arv * 0.72) - rehabCostValue - 25000;
      setFinalOffer(Math.round(calculated * 100) / 100);
    }
  }, [arv, rehabCostValue]);

  const fetchCalculations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/underwriting`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCalculations(data.data || []);
        
        if (data.data && data.data.length > 0) {
          const latest = data.data[0];
          setArv(latest.arv);
          setRehabCostValue(latest.rehabCost);
          setFinalOffer(latest.finalOffer);
        }
      }
    } catch (error) {
      console.error('Error fetching calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (arv === 0 || rehabCostValue === 0) {
      toast({ title: 'Error', description: 'Enter ARV and Rehab Cost', variant: 'destructive' });
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
          rehabCost: rehabCostValue,
          taxes: 1000,
          timeline: 6
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Calculation saved' });
        fetchCalculations();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Calculator className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Underwriting</span>
          <span className="text-xs text-emerald-600 font-semibold ml-2">
            {formatCurrency(finalOffer)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {calculations.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 text-[10px] px-1"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-2.5 h-2.5" />
            </Button>
          )}
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
        <div className="space-y-1 mt-2">
          {/* Formula */}
          <div className="p-1 bg-slate-50 rounded text-[10px] text-slate-600">
            Formula: (ARV × 72%) - Rehab - $25,000
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-1">
            <div>
              <Label className="text-[10px] text-slate-500">ARV</Label>
              <Input
                type="number"
                value={arv || ''}
                onChange={(e) => setArv(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                placeholder="After Repair Value"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Rehab Cost</Label>
              <Input
                type="number"
                value={rehabCostValue || ''}
                onChange={(e) => setRehabCostValue(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                placeholder="Rehab Cost"
              />
            </div>
          </div>

          {/* Breakdown */}
          {arv > 0 && rehabCostValue > 0 && (
            <div className="space-y-0.5 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>ARV × 72%:</span>
                <span>{formatCurrency(arv * 0.72)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rehab Cost:</span>
                <span>- {formatCurrency(rehabCostValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Buffer:</span>
                <span>- $25,000</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-0.5">
                <span>Final Offer:</span>
                <span className="text-emerald-600">{formatCurrency(finalOffer)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {showHistory && calculations.length > 0 && (
        <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
          {calculations.map((calc) => (
            <div key={calc.id} className="p-1 bg-slate-50 rounded text-[10px] flex justify-between">
              <span className="text-slate-600">{formatDate(calc.createdAt)}</span>
              <span className="font-medium text-emerald-600">{formatCurrency(calc.finalOffer)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

