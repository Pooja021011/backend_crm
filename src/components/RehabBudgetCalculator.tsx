import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Calculator, Save, RefreshCw } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface RehabBudgetCalculatorProps {
  leadId: string;
  sqft?: number;
  bathrooms?: number;
  readOnly?: boolean;
}

interface ToggledItems {
  [key: string]: boolean;
}

export function RehabBudgetCalculator({ leadId, sqft = 0, bathrooms = 1, readOnly = false }: RehabBudgetCalculatorProps) {
  const { toast } = useToast();
  
  const [finishLevel, setFinishLevel] = useState<'low_end' | 'mid_range' | 'high_end'>('mid_range');
  const [numberOfBathrooms, setNumberOfBathrooms] = useState(bathrooms);
  const [numberOfWindows, setNumberOfWindows] = useState(10);
  const [propertySquareFeet, setPropertySquareFeet] = useState(sqft);
  
  const [toggledItems, setToggledItems] = useState<ToggledItems>({
    permits: false,
    demolition: false,
    foundation: false,
    roof: false,
    framing: false,
    hvac: false,
    electrical: false,
    plumbing: false,
    kitchenCabinets: false,
    kitchenCountertops: false,
    kitchenAppliances: false,
    kitchenSink: false,
    kitchenLighting: false,
    bathroomVanity: false,
    bathroomShower: false,
    bathroomToilet: false,
    bathroomFixtures: false,
    bathroomFlooring: false,
    bathroomLighting: false,
    flooring: false,
    paintInterior: false,
    paintExterior: false,
    windows: false,
    entryDoor: false,
    insulation: false,
    smartHome: false,
    landscaping: false
  });

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

  const fetchSavedBudget = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/rehab-budget`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        toast({
          title: 'Success',
          description: 'Rehab budget saved successfully'
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save rehab budget',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string) => {
    setToggledItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const renderCheckboxItem = (key: string, label: string) => (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={key}
        checked={toggledItems[key]}
        onCheckedChange={() => handleToggle(key)}
        disabled={readOnly}
      />
      <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  );

  if (loading) {
    return <div className="text-center py-4">Loading budget calculator...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Rehab Budget Calculator
        </CardTitle>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={calculateBudget}
              disabled={propertySquareFeet === 0}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Recalculate
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || propertySquareFeet === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-accent/20 rounded-lg">
          <div>
            <Label htmlFor="sqft">Square Feet *</Label>
            <Input
              id="sqft"
              type="number"
              value={propertySquareFeet}
              onChange={(e) => setPropertySquareFeet(Number(e.target.value))}
              disabled={readOnly}
              placeholder="Enter sqft"
            />
          </div>
          <div>
            <Label htmlFor="bathrooms">Number of Bathrooms</Label>
            <Input
              id="bathrooms"
              type="number"
              value={numberOfBathrooms}
              onChange={(e) => setNumberOfBathrooms(Number(e.target.value))}
              disabled={readOnly}
              min={1}
            />
          </div>
          <div>
            <Label htmlFor="windows">Number of Windows</Label>
            <Input
              id="windows"
              type="number"
              value={numberOfWindows}
              onChange={(e) => setNumberOfWindows(Number(e.target.value))}
              disabled={readOnly}
              min={1}
            />
          </div>
        </div>

        {/* Finish Level */}
        <div>
          <Label htmlFor="finishLevel">Finish Level</Label>
          <Select
            value={finishLevel}
            onValueChange={(value: any) => setFinishLevel(value)}
            disabled={readOnly}
          >
            <SelectTrigger id="finishLevel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low_end">Low End Finishes</SelectItem>
              <SelectItem value="mid_range">Mid Range Finishes</SelectItem>
              <SelectItem value="high_end">High End Finishes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggleable Items */}
        <div className="space-y-4">
          {/* Permits & Prep */}
          <div>
            <h4 className="font-semibold mb-2">Permits & Preparation</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('permits', 'Permits ($1,000)')}
              {renderCheckboxItem('demolition', 'Demolition & Cleanup ($1.50/sqft)')}
            </div>
          </div>

          {/* Structural */}
          <div>
            <h4 className="font-semibold mb-2">Structural Work</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('foundation', 'Foundation Repair ($7/sqft)')}
              {renderCheckboxItem('roof', 'Roof Replacement ($4/sqft)')}
              {renderCheckboxItem('framing', 'Framing ($2/sqft)')}
            </div>
          </div>

          {/* Mechanical */}
          <div>
            <h4 className="font-semibold mb-2">Mechanical Systems</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('hvac', 'HVAC ($5/sqft)')}
              {renderCheckboxItem('electrical', 'Electrical ($3.50/sqft)')}
              {renderCheckboxItem('plumbing', 'Plumbing ($2/sqft)')}
            </div>
          </div>

          {/* Kitchen */}
          <div>
            <h4 className="font-semibold mb-2">Kitchen Renovation</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('kitchenCabinets', 'Cabinets')}
              {renderCheckboxItem('kitchenCountertops', 'Countertops')}
              {renderCheckboxItem('kitchenAppliances', 'Appliances')}
              {renderCheckboxItem('kitchenSink', 'Sink & Faucet')}
              {renderCheckboxItem('kitchenLighting', 'Lighting')}
            </div>
          </div>

          {/* Bathroom */}
          <div>
            <h4 className="font-semibold mb-2">Bathroom Renovation (per bathroom)</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('bathroomVanity', 'Vanity')}
              {renderCheckboxItem('bathroomShower', 'Shower/Tub')}
              {renderCheckboxItem('bathroomToilet', 'Toilet')}
              {renderCheckboxItem('bathroomFixtures', 'Fixtures')}
              {renderCheckboxItem('bathroomFlooring', 'Flooring')}
              {renderCheckboxItem('bathroomLighting', 'Lighting')}
            </div>
          </div>

          {/* Finishes */}
          <div>
            <h4 className="font-semibold mb-2">Finishes</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('flooring', 'Flooring')}
              {renderCheckboxItem('paintInterior', 'Interior Paint')}
              {renderCheckboxItem('paintExterior', 'Exterior Paint')}
              {renderCheckboxItem('windows', 'Windows ($500 each)')}
              {renderCheckboxItem('entryDoor', 'Entry Door')}
              {renderCheckboxItem('insulation', 'Insulation ($4/sqft)')}
            </div>
          </div>

          {/* Miscellaneous */}
          <div>
            <h4 className="font-semibold mb-2">Miscellaneous</h4>
            <div className="grid grid-cols-2 gap-2">
              {renderCheckboxItem('smartHome', 'Smart Home System ($2,000)')}
              {renderCheckboxItem('landscaping', 'Landscaping ($3,000)')}
            </div>
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-lg">
            <span className="font-medium">Subtotal:</span>
            <span className="font-semibold">{formatCurrency(calculation.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Contingency (10%):</span>
            <span>{formatCurrency(calculation.contingencyAmount)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t pt-2">
            <span>Total Rehab Cost:</span>
            <span className="text-primary">{formatCurrency(calculation.totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

