import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Wrench, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface RehabBudgetCalculatorProps {
  leadId: string;
  sqft?: number;
  bathrooms?: number;
  readOnly?: boolean;
  onTotalChange?: (total: number) => void;
}

interface ToggledItems {
  [key: string]: boolean;
}

export function RehabBudgetCalculatorCompact({ leadId, sqft = 0, bathrooms = 1, readOnly = false, onTotalChange }: RehabBudgetCalculatorProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  
  const [finishLevel, setFinishLevel] = useState<'low_end' | 'mid_range' | 'high_end'>('mid_range');
  const [numberOfBathrooms, setNumberOfBathrooms] = useState(bathrooms);
  const [numberOfWindows, setNumberOfWindows] = useState(10);
  const [propertySquareFeet, setPropertySquareFeet] = useState(sqft);
  
  const [toggledItems, setToggledItems] = useState<ToggledItems>({});
  const [calculation, setCalculation] = useState({
    itemizedCosts: {} as { [key: string]: number },
    subtotal: 0,
    contingencyAmount: 0,
    totalCost: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSavedBudget();
  }, [leadId]);

  useEffect(() => {
    if (propertySquareFeet > 0) {
      calculateBudget();
    }
  }, [finishLevel, toggledItems, numberOfBathrooms, numberOfWindows, propertySquareFeet]);

  // Notify parent when total changes
  useEffect(() => {
    if (onTotalChange && calculation.totalCost > 0) {
      onTotalChange(calculation.totalCost);
    }
  }, [calculation.totalCost, onTotalChange]);

  const fetchSavedBudget = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/rehab-budget`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          const budget = data.data;
          if (budget.finishLevel) setFinishLevel(budget.finishLevel);
          if (budget.toggledItems) setToggledItems(budget.toggledItems);
          if (budget.subtotal) {
            setCalculation({
              itemizedCosts: {},
              subtotal: budget.subtotal,
              contingencyAmount: budget.contingencyAmount,
              totalCost: budget.totalCost
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching saved budget:', error);
    } finally {
      setLoading(false);
    }
  };

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
          sqft: propertySquareFeet,
          finishLevel,
          toggledItems,
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/rehab-budget`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          finishLevel,
          toggledItems,
          customValues: {},
          subtotal: calculation.subtotal,
          contingencyAmount: calculation.contingencyAmount,
          totalCost: calculation.totalCost
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Rehab budget saved' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string) => {
    setToggledItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const renderCheckbox = (key: string, label: string) => (
    <div className="flex items-center space-x-1">
      <Checkbox
        id={key}
        checked={toggledItems[key]}
        onCheckedChange={() => handleToggle(key)}
        disabled={readOnly}
        className="h-3 w-3"
      />
      <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  );

  if (loading) return null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Wrench className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Rehab Budget</span>
          <span className="text-xs text-emerald-600 font-semibold ml-2">
            {formatCurrency(calculation.totalCost)}
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
        <div className="space-y-1 mt-2">
          {/* Configuration */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded">
            <div>
              <Label className="text-[10px] text-slate-500">SqFt</Label>
              <Input
                type="number"
                value={propertySquareFeet}
                onChange={(e) => setPropertySquareFeet(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Finish Level</Label>
              <Select value={finishLevel} onValueChange={(value: any) => setFinishLevel(value)} disabled={readOnly}>
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
              <Label className="text-[10px] text-slate-500">Baths</Label>
              <Input
                type="number"
                value={numberOfBathrooms}
                onChange={(e) => setNumberOfBathrooms(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                min={1}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Windows</Label>
              <Input
                type="number"
                value={numberOfWindows}
                onChange={(e) => setNumberOfWindows(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                min={1}
              />
            </div>
          </div>

          {/* Toggleable Items - Compact Grid */}
          <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[10px]">
            {renderCheckbox('permits', 'Permits')}
            {renderCheckbox('demolition', 'Demo')}
            {renderCheckbox('foundation', 'Foundation')}
            {renderCheckbox('roof', 'Roof')}
            {renderCheckbox('framing', 'Framing')}
            {renderCheckbox('hvac', 'HVAC')}
            {renderCheckbox('electrical', 'Electrical')}
            {renderCheckbox('plumbing', 'Plumbing')}
            {renderCheckbox('kitchenCabinets', 'K-Cabinets')}
            {renderCheckbox('kitchenCountertops', 'K-Counters')}
            {renderCheckbox('kitchenAppliances', 'K-Appliances')}
            {renderCheckbox('kitchenSink', 'K-Sink')}
            {renderCheckbox('bathroomVanity', 'B-Vanity')}
            {renderCheckbox('bathroomShower', 'B-Shower')}
            {renderCheckbox('bathroomToilet', 'B-Toilet')}
            {renderCheckbox('bathroomFixtures', 'B-Fixtures')}
            {renderCheckbox('drywall', 'Drywall')}
            {renderCheckbox('flooring', 'Flooring')}
            {renderCheckbox('paintInterior', 'Paint-Int')}
            {renderCheckbox('paintExterior', 'Paint-Ext')}
            {renderCheckbox('windows', 'Windows')}
            {renderCheckbox('entryDoor', 'Entry Door')}
            {renderCheckbox('insulation', 'Insulation')}
            {renderCheckbox('smartHome', 'Smart Home')}
            {renderCheckbox('landscaping', 'Landscaping')}
            {renderCheckbox('miscellaneous', 'Miscellaneous')}
          </div>

          {/* Summary */}
          <div className="border-t pt-1 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(calculation.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Contingency (10%):</span>
              <span className="font-medium">{formatCurrency(calculation.contingencyAmount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-0.5">
              <span>Total:</span>
              <span className="text-emerald-600">{formatCurrency(calculation.totalCost)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

