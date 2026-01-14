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
  onBathroomsChange?: (bathrooms: number) => void;
  onDataChange?: (data: { finishLevel: string; toggledItems: ToggledItems; numberOfWindows: number }) => void;
  initialFinishLevel?: 'low_end' | 'mid_range' | 'high_end';
  initialToggledItems?: ToggledItems;
  initialNumberOfWindows?: number;
}

interface ToggledItems {
  [key: string]: boolean;
}

export function RehabBudgetCalculatorCompact({
  leadId,
  sqft = 0,
  bathrooms = 0,
  readOnly = false,
  onTotalChange,
  onBathroomsChange,
  onDataChange,
  initialFinishLevel = 'mid_range',
  initialToggledItems = {},
  initialNumberOfWindows = 10,
}: RehabBudgetCalculatorProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  
  const [finishLevel, setFinishLevel] = useState<'low_end' | 'mid_range' | 'high_end'>(initialFinishLevel);
  const [numberOfBathrooms, setNumberOfBathrooms] = useState(bathrooms);
  const [numberOfWindows, setNumberOfWindows] = useState(initialNumberOfWindows);
  const [propertySquareFeet, setPropertySquareFeet] = useState(sqft);
  
  const [toggledItems, setToggledItems] = useState<ToggledItems>(initialToggledItems);
  const [calculation, setCalculation] = useState({
    itemizedCosts: {} as { [key: string]: number },
    subtotal: 0,
    contingencyAmount: 0,
    totalCost: 0
  });

  const [loading, setLoading] = useState(false); // Changed to false since we're using props
  const [saving, setSaving] = useState(false);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        finishLevel,
        toggledItems,
        numberOfWindows
      });
    }
  }, [finishLevel, toggledItems, numberOfWindows, onDataChange]);

  // Update property values when props change
  useEffect(() => {
    setPropertySquareFeet(sqft);
    setNumberOfBathrooms(bathrooms);
  }, [sqft, bathrooms]);

  useEffect(() => {
    if (propertySquareFeet > 0) {
      calculateBudget();
    }
  }, [finishLevel, toggledItems, numberOfBathrooms, numberOfWindows, propertySquareFeet]);

  const handleBathroomsChange = (value: number) => {
    const next = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    setNumberOfBathrooms(next);
    onBathroomsChange?.(next);
  };

  // Notify parent when total changes
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(calculation.totalCost);
    }
  }, [calculation.totalCost, onTotalChange]);

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

  const getItemCost = (key: string): number => {
    return (calculation.itemizedCosts && calculation.itemizedCosts[key]) ? calculation.itemizedCosts[key] : 0;
  };

  const renderLineItem = (key: string, label: string) => {
    const checked = !!toggledItems[key];
    const cost = getItemCost(key);
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Checkbox
            id={key}
            checked={checked}
            onCheckedChange={() => handleToggle(key)}
            disabled={readOnly}
            className="h-3 w-3"
          />
          <Label htmlFor={key} className="text-[10px] font-normal cursor-pointer truncate">
            {label}
          </Label>
        </div>
        <span className={`text-[10px] font-medium tabular-nums ${checked ? 'text-slate-700' : 'text-slate-400'}`}>
          {formatCurrency(cost)}
        </span>
      </div>
    );
  };

  const renderGroup = (title: string, items: Array<{ key: string; label: string }>) => (
    <div className="rounded border border-slate-200 bg-white p-2">
      <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">{title}</div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.key}>
            {renderLineItem(it.key, it.label)}
          </div>
        ))}
      </div>
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
            Rehab Budget: {formatCurrency(calculation.totalCost)}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 text-[10px] px-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-1 mt-2">
          {/* Configuration */}
          <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 rounded">
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
              <Label className="text-[10px] text-slate-500">SqFt</Label>
              <Input
                type="number"
                value={propertySquareFeet || ''}
                disabled
                className="h-6 text-xs bg-white"
                placeholder="N/A"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Bathrooms</Label>
              <Input
                type="number"
                value={numberOfBathrooms}
                onChange={(e) => handleBathroomsChange(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                min={0}
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

          {/* Item Layout - 4 Rows */}
          <div className="space-y-2">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {renderGroup('Planning', [
                { key: 'permits', label: 'Permits' },
                { key: 'demolition', label: 'Demo' },
              ])}
              {renderGroup('Structure', [
                { key: 'foundation', label: 'Foundation' },
                { key: 'roof', label: 'Roof' },
                { key: 'framing', label: 'Framing' },
                { key: 'windows', label: 'Windows' },
                { key: 'entryDoor', label: 'Entry Door' },
              ])}
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {renderGroup('Mechanicals', [
                { key: 'hvac', label: 'HVAC' },
                { key: 'electrical', label: 'Electrical' },
                { key: 'plumbing', label: 'Plumbing' },
              ])}
              {renderGroup('Interior', [
                { key: 'drywall', label: 'Drywall' },
                { key: 'insulation', label: 'Insulation' },
                { key: 'paintInterior', label: 'Paint - Interior' },
                { key: 'paintExterior', label: 'Paint - Exterior' },
                { key: 'flooring', label: 'Flooring' },
              ])}
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {renderGroup('Kitchen', [
                { key: 'kitchenCabinets', label: 'Cabinets' },
                { key: 'kitchenCountertops', label: 'Counters' },
                { key: 'kitchenAppliances', label: 'Appliances' },
                { key: 'kitchenSink', label: 'Sink' },
              ])}
              {renderGroup('Bathrooms', [
                { key: 'bathroomVanity', label: 'Vanity' },
                { key: 'bathroomShower', label: 'Shower' },
                { key: 'bathroomToilet', label: 'Toilet' },
                { key: 'bathroomFixtures', label: 'Fixtures' },
              ])}
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1">
              {renderGroup('Miscellaneous', [
                { key: 'smartHome', label: 'Smart Home' },
                { key: 'landscaping', label: 'Landscaping' },
                { key: 'miscellaneous', label: 'Miscellaneous' },
              ])}
            </div>
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

