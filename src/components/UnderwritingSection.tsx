import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calculator, Save, History, TrendingUp } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface UnderwritingCalculation {
  id: string;
  arv: number;
  rehabCost: number;
  taxes: number;
  timeline: number;
  finalOffer: number;
  notes?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface UnderwritingSectionProps {
  leadId: string;
  rehabCost?: number;
  readOnly?: boolean;
}

export function UnderwritingSection({ leadId, rehabCost = 0, readOnly = false }: UnderwritingSectionProps) {
  const { toast } = useToast();
  
  const [arv, setArv] = useState(0);
  const [rehabCostValue, setRehabCostValue] = useState(rehabCost);
  const [taxes, setTaxes] = useState(1000);
  const [timeline, setTimeline] = useState(6);
  const [notes, setNotes] = useState('');
  const [finalOffer, setFinalOffer] = useState(0);
  
  const [calculations, setCalculations] = useState<UnderwritingCalculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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
      calculateFinalOffer();
    }
  }, [arv, rehabCostValue]);

  const fetchCalculations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/underwriting`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCalculations(data.data || []);
        
        // Load latest calculation
        if (data.data && data.data.length > 0) {
          const latest = data.data[0];
          setArv(latest.arv);
          setRehabCostValue(latest.rehabCost);
          setTaxes(latest.taxes);
          setTimeline(latest.timeline);
          setNotes(latest.notes || '');
          setFinalOffer(latest.finalOffer);
        }
      }
    } catch (error) {
      console.error('Error fetching calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalOffer = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/underwriting/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          arv,
          rehabCost: rehabCostValue
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFinalOffer(data.data.finalOffer);
      }
    } catch (error) {
      console.error('Error calculating final offer:', error);
    }
  };

  const handleSave = async () => {
    if (arv === 0 || rehabCostValue === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter ARV and Rehab Cost',
        variant: 'destructive'
      });
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
          taxes,
          timeline,
          notes
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Underwriting calculation saved successfully'
        });
        fetchCalculations();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save calculation',
        variant: 'destructive'
      });
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-4">Loading underwriting...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Underwriting Calculator
          </CardTitle>
          <div className="flex gap-2">
            {calculations.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
            )}
            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || arv === 0 || rehabCostValue === 0}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formula Display */}
          <div className="p-4 bg-accent/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Formula:</span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Final Offer = (ARV × 72%) - Rehab Cost - $25,000
            </p>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="arv">After Repair Value (ARV) *</Label>
              <Input
                id="arv"
                type="number"
                value={arv || ''}
                onChange={(e) => setArv(Number(e.target.value))}
                disabled={readOnly}
                placeholder="Enter ARV"
              />
            </div>
            <div>
              <Label htmlFor="rehabCost">Rehab Cost *</Label>
              <Input
                id="rehabCost"
                type="number"
                value={rehabCostValue || ''}
                onChange={(e) => setRehabCostValue(Number(e.target.value))}
                disabled={readOnly}
                placeholder="Enter rehab cost"
              />
            </div>
            <div>
              <Label htmlFor="taxes">Taxes (Optional)</Label>
              <Input
                id="taxes"
                type="number"
                value={taxes}
                onChange={(e) => setTaxes(Number(e.target.value))}
                disabled={readOnly}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="timeline">Timeline (Months)</Label>
              <Input
                id="timeline"
                type="number"
                value={timeline}
                onChange={(e) => setTimeline(Number(e.target.value))}
                disabled={readOnly}
                placeholder="6"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly}
              placeholder="Add any notes about this calculation..."
              rows={3}
            />
          </div>

          {/* Calculation Result */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
              <span className="text-lg font-semibold">Final Offer:</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(finalOffer)}
              </span>
            </div>
          </div>

          {/* Breakdown */}
          {arv > 0 && rehabCostValue > 0 && (
            <div className="text-sm text-muted-foreground space-y-1">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {showHistory && calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Calculation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calculations.map((calc) => (
                <div
                  key={calc.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg">{formatCurrency(calc.finalOffer)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(calc.createdAt)}
                        {calc.user && ` by ${calc.user.firstName} ${calc.user.lastName}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">ARV:</span>{' '}
                      <span className="font-medium">{formatCurrency(calc.arv)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rehab:</span>{' '}
                      <span className="font-medium">{formatCurrency(calc.rehabCost)}</span>
                    </div>
                  </div>
                  {calc.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{calc.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

