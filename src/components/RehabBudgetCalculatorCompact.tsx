import { useMemo, useState, useEffect, useRef } from 'react';
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
  suppressSuccessToasts?: boolean;
  onTotalChange?: (total: number) => void;
  onBathroomsChange?: (bathrooms: number) => void;
  onDataChange?: (data: { finishLevel: string; toggledItems: ToggledItems; numberOfWindows: number; customValues: any }) => void;
  initialFinishLevel?: 'low_end' | 'mid_range' | 'high_end';
  initialToggledItems?: ToggledItems;
  initialNumberOfWindows?: number;
  initialCustomValues?: { miscLabel?: string; miscValue?: number; miscLines?: Array<{ label?: string; value?: number }> };
}

interface ToggledItems {
  [key: string]: boolean;
}

export function RehabBudgetCalculatorCompact({
  leadId,
  sqft = 0,
  bathrooms,
  readOnly = false,
  suppressSuccessToasts = false,
  onTotalChange,
  onBathroomsChange,
  onDataChange,
  initialFinishLevel = 'mid_range',
  initialToggledItems = {},
  initialNumberOfWindows = 10,
  initialCustomValues,
}: RehabBudgetCalculatorProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  
  const [finishLevel, setFinishLevel] = useState<'low_end' | 'mid_range' | 'high_end'>(initialFinishLevel);
  const [numberOfBathrooms, setNumberOfBathrooms] = useState<number | undefined>(bathrooms);
  const [numberOfWindows, setNumberOfWindows] = useState(initialNumberOfWindows);
  const [propertySquareFeet, setPropertySquareFeet] = useState(sqft);
  
  const [toggledItems, setToggledItems] = useState<ToggledItems>(initialToggledItems);
  const [customMiscLine, setCustomMiscLine] = useState<{ label: string; value: string }>(() => {
    const incoming = initialCustomValues?.miscLines;
    if (Array.isArray(incoming) && incoming.length > 0) {
      const label = String(incoming[0]?.label || initialCustomValues?.miscLabel || '');
      const valueNum = Number(incoming[0]?.value) || Number(initialCustomValues?.miscValue) || 0;
      return {
        // Default blank unless persisted values exist
        label,
        value: valueNum > 0 ? String(valueNum) : '',
      };
    }
    return {
      // Default blank unless persisted values exist
      label: String(initialCustomValues?.miscLabel || ''),
      value: Number(initialCustomValues?.miscValue) > 0 ? String(Number(initialCustomValues?.miscValue) || 0) : '',
    };
  });
  const [customMiscEnabled, setCustomMiscEnabled] = useState<boolean>(() => {
    const incoming = initialCustomValues?.miscLines;
    const initialVal = Array.isArray(incoming) && incoming.length > 0
      ? Number(incoming[0]?.value)
      : Number(initialCustomValues?.miscValue);
    return Number.isFinite(initialVal) && (initialVal || 0) > 0;
  });
  const [calculation, setCalculation] = useState({
    itemizedCosts: {} as { [key: string]: number },
    subtotal: 0,
    contingencyAmount: 0,
    totalCost: 0
  });

  const [loading, setLoading] = useState(false); // Changed to false since we're using props
  const [saving, setSaving] = useState(false);

  // Use refs to track previous prop values to prevent unnecessary updates
  const prevToggledItemsRef = useRef<string>('');
  const prevFinishLevelRef = useRef<string>('');
  const prevNumberOfWindowsRef = useRef<number>(-1);
  const prevCustomValuesRef = useRef<string>('');

  // Sync toggledItems when initialToggledItems prop changes
  useEffect(() => {
    const newValue = JSON.stringify(initialToggledItems || {});
    if (prevToggledItemsRef.current !== newValue) {
      prevToggledItemsRef.current = newValue;
      setToggledItems(initialToggledItems || {});
    }
  }, [initialToggledItems]);

  // Sync finishLevel when initialFinishLevel prop changes
  useEffect(() => {
    const newValue = initialFinishLevel || 'mid_range';
    if (prevFinishLevelRef.current !== newValue) {
      prevFinishLevelRef.current = newValue;
      setFinishLevel(newValue);
    }
  }, [initialFinishLevel]);

  // Sync numberOfWindows when initialNumberOfWindows prop changes
  useEffect(() => {
    const newValue = initialNumberOfWindows ?? 10;
    if (prevNumberOfWindowsRef.current !== newValue) {
      prevNumberOfWindowsRef.current = newValue;
      setNumberOfWindows(newValue);
    }
  }, [initialNumberOfWindows]);

  // Sync customMiscLine when initialCustomValues prop changes
  useEffect(() => {
    const newValue = JSON.stringify(initialCustomValues || {});
    if (prevCustomValuesRef.current !== newValue) {
      prevCustomValuesRef.current = newValue;
      
      const incoming = initialCustomValues?.miscLines;
      let newLabel = '';
      let newValue2 = '';
      let newEnabled = false;
      
      if (Array.isArray(incoming) && incoming.length > 0) {
        const label = String(incoming[0]?.label || initialCustomValues?.miscLabel || '');
        const valueNum = Number(incoming[0]?.value) || Number(initialCustomValues?.miscValue) || 0;
        newLabel = label;
        newValue2 = valueNum > 0 ? String(valueNum) : '';
        newEnabled = Number.isFinite(valueNum) && valueNum > 0;
      } else if (initialCustomValues?.miscLabel || initialCustomValues?.miscValue) {
        const label = String(initialCustomValues?.miscLabel || '');
        const valueNum = Number(initialCustomValues?.miscValue) || 0;
        newLabel = label;
        newValue2 = valueNum > 0 ? String(valueNum) : '';
        newEnabled = Number.isFinite(valueNum) && valueNum > 0;
      }
      
      setCustomMiscLine({ label: newLabel, value: newValue2 });
      setCustomMiscEnabled(newEnabled);
    }
  }, [initialCustomValues]);

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      const miscValueNum = customMiscEnabled ? Math.max(0, Number(customMiscLine.value) || 0) : 0;
      onDataChange({
        finishLevel,
        toggledItems,
        numberOfWindows,
        customValues: {
          // Backwards-compatible keys
          miscLabel: customMiscLine.label || '',
          miscValue: miscValueNum,
          // Keep array form for forwards-compat, but only one line
          miscLines: [{ label: customMiscLine.label || '', value: miscValueNum }],
        }
      });
    }
  }, [finishLevel, toggledItems, numberOfWindows, customMiscLine, customMiscEnabled]); // Removed onDataChange to prevent infinite loop

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

  const handleBathroomsChange = (value: number | string) => {
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setNumberOfBathrooms(undefined);
      onBathroomsChange?.(undefined as any);
      return;
    }
    
    const numValue = Number(value);
    // Round to nearest 0.5 (match Property Information Baths field)
    const next = Number.isFinite(numValue) ? Math.max(0, Math.round(numValue * 2) / 2) : undefined;
    setNumberOfBathrooms(next);
    onBathroomsChange?.(next as any);
  };

  const customMiscTotal = useMemo(
    () => (customMiscEnabled ? Math.max(0, Number(customMiscLine.value) || 0) : 0),
    [customMiscLine.value, customMiscEnabled]
  );
  const subtotalWithCustom = calculation.subtotal + customMiscTotal;
  const contingencyWithCustom = subtotalWithCustom * 0.10;
  const totalWithCustom = subtotalWithCustom + contingencyWithCustom;

  // Notify parent when total changes
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(totalWithCustom);
    }
  }, [totalWithCustom]); // Only trigger when total changes, not when callback reference changes

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
      const miscValueNum = customMiscEnabled ? Math.max(0, Number(customMiscLine.value) || 0) : 0;
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
          customValues: {
            miscLabel: customMiscLine.label || '',
            miscValue: miscValueNum,
            miscLines: [{ label: customMiscLine.label || '', value: miscValueNum }],
          },
          subtotal: subtotalWithCustom,
          contingencyAmount: contingencyWithCustom,
          totalCost: totalWithCustom
        })
      });

      if (response.ok) {
        if (!suppressSuccessToasts) toast({ title: 'Success', description: 'Rehab budget saved' });
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

  const parseCurrencyInput = (raw: string): number => {
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  };

  // Keep the custom misc value visually consistent with the other line items (e.g. "$0")
  const [customMiscValueDisplay, setCustomMiscValueDisplay] = useState<string>(() => {
    const n = Math.max(0, Number(customMiscLine.value) || 0);
    // Default blank (placeholder shows "$0")
    return n > 0 ? formatCurrency(n) : '';
  });

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

  const renderCustomMiscRow = () => {
    const valueNum = Math.max(0, Number(customMiscLine.value) || 0);
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Checkbox
            id="customMiscEnabled"
            checked={customMiscEnabled}
            onCheckedChange={() => setCustomMiscEnabled((p) => !p)}
            disabled={readOnly}
            className="h-3 w-3"
          />
          <Input
            value={customMiscLine.label}
            onChange={(e) =>
              setCustomMiscLine((prev) => ({ ...prev, label: e.target.value }))
            }
            disabled={readOnly}
            placeholder="Miscellaneous"
            style={{ fontSize: '10px', fontWeight: 400 }}
            className="h-6 px-2 w-[16ch] sm:w-[18ch] md:w-[20ch]"
          />
        </div>
        <Input
          type="text"
          inputMode="numeric"
          value={customMiscValueDisplay}
          onChange={(e) => {
            const raw = e.target.value;
            setCustomMiscValueDisplay(raw);
            const next = parseCurrencyInput(raw);
            setCustomMiscLine((prev) => ({ ...prev, value: String(next) }));
          }}
          onBlur={() => {
            // Always show like other items (e.g. "$0")
            if (!customMiscLine.value) {
              setCustomMiscValueDisplay('');
              return;
            }
            setCustomMiscValueDisplay(formatCurrency(valueNum));
          }}
          disabled={readOnly}
          placeholder="$0"
          style={{ fontSize: '10px', fontWeight: 400 }}
          className={`h-6 px-2 tabular-nums text-right w-[10ch] ${customMiscEnabled ? 'text-slate-700' : 'text-slate-400'}`}
        />
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
            Rehab Budget: {formatCurrency(totalWithCustom)}
          </span>
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
                value={propertySquareFeet || 0}
                disabled
                className="h-6 text-xs bg-slate-100 cursor-not-allowed text-slate-400 font-medium"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Bathrooms</Label>
              <Input
                type="number"
                step="0.5"
                value={numberOfBathrooms ?? ''}
                onChange={(e) => handleBathroomsChange(e.target.value)}
                onBlur={(e) => {
                  // Ensure value is normalized and saved on blur/exit
                  const value = e.target.value;
                  handleBathroomsChange(value);
                }}
                disabled={readOnly}
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
                { key: 'cleanup', label: 'Cleanup' },
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="rounded border border-slate-200 bg-white p-2">
                <div className="text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">Miscellaneous</div>
                <div className="space-y-1">
                  {renderLineItem('smartHome', 'Smart Home')}
                  {renderLineItem('landscaping', 'Landscaping')}
                  {/* Custom fillable misc lines (included in totals) */}
                  {renderCustomMiscRow()}
                </div>
              </div>
              {/* Spacer column so Miscellaneous matches the half-width layout (like Kitchen/Bathrooms) */}
              <div className="hidden md:block" />
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-1 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotalWithCustom)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Contingency (10%):</span>
              <span className="font-medium">{formatCurrency(contingencyWithCustom)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-0.5">
              <span>Total:</span>
              <span className="text-emerald-600">{formatCurrency(totalWithCustom)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

