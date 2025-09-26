import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Calculator, Plus, Copy, Trash2, FileText, TrendingUp, Download } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface UnderwritingInputs {
  purchasePrice?: number;
  repairCosts?: number;
  arv?: number;
  holdingCosts?: number;
  closingCosts?: number;
  realtorFees?: number;
  otherCosts?: number;
}

interface UnderwritingOutputs {
  totalCosts: number;
  profit: number;
  roi: number;
  cashOnCash: number;
  profitMargin: number;
}

interface UnderwritingScenario {
  id: string;
  leadId: string;
  name: string;
  isPrimary: boolean;
  inputs: UnderwritingInputs;
  outputs: UnderwritingOutputs;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface UnderwritingCalculatorProps {
  leadId: string;
}

export const UnderwritingCalculator: React.FC<UnderwritingCalculatorProps> = ({ leadId }) => {
  const [scenarios, setScenarios] = useState<UnderwritingScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  
  // Form inputs
  const [inputs, setInputs] = useState<UnderwritingInputs>({
    purchasePrice: 0,
    repairCosts: 0,
    arv: 0,
    holdingCosts: 0,
    closingCosts: 0,
    realtorFees: 0,
    otherCosts: 0
  });
  const [outputs, setOutputs] = useState<UnderwritingOutputs>({
    totalCosts: 0,
    profit: 0,
    roi: 0,
    cashOnCash: 0,
    profitMargin: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    loadScenarios();
  }, [leadId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const exportToPDF = async () => {
    if (!selectedScenario) {
      toast({
        title: "Error",
        description: "Please select a scenario to export",
        variant: "destructive"
      });
      return;
    }

    const scenario = scenarios.find(s => s.id === selectedScenario);
    if (!scenario) return;

    try {
      const pdf = new jsPDF();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Underwriting Analysis", margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Scenario: ${scenario.name}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Lead ID: ${leadId}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 20;

      // Inputs Section
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Investment Inputs", margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const inputData = [
        ['Purchase Price:', formatCurrency(inputs.purchasePrice || 0)],
        ['Repair Costs:', formatCurrency(inputs.repairCosts || 0)],
        ['After Repair Value (ARV):', formatCurrency(inputs.arv || 0)],
        ['Holding Costs:', formatCurrency(inputs.holdingCosts || 0)],
        ['Closing Costs:', formatCurrency(inputs.closingCosts || 0)],
        ['Realtor Fees:', formatCurrency(inputs.realtorFees || 0)],
        ['Other Costs:', formatCurrency(inputs.otherCosts || 0)]
      ];

      inputData.forEach(([label, value]) => {
        pdf.text(label, margin, yPosition);
        pdf.text(value, margin + 120, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Outputs Section
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Analysis Results", margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const outputData = [
        ['Total Investment:', formatCurrency(outputs.totalCosts)],
        ['Gross Profit:', formatCurrency(outputs.profit)],
        ['Return on Investment (ROI):', `${outputs.roi.toFixed(2)}%`],
        ['Cash-on-Cash Return:', `${outputs.cashOnCash.toFixed(2)}%`],
        ['Profit Margin:', `${outputs.profitMargin.toFixed(2)}%`]
      ];

      outputData.forEach(([label, value]) => {
        pdf.text(label, margin, yPosition);
        pdf.text(value, margin + 120, yPosition);
        yPosition += 8;
      });

      // Investment Summary
      yPosition += 15;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Investment Summary", margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const profitColor = outputs.profit > 0 ? [0, 150, 0] : [200, 0, 0];
      pdf.setTextColor(...profitColor);
      pdf.text(`Expected Profit: ${formatCurrency(outputs.profit)}`, margin, yPosition);
      yPosition += 8;

      pdf.setTextColor(0, 0, 0);
      const roiAssessment = outputs.roi > 20 ? 'Excellent' : outputs.roi > 15 ? 'Good' : outputs.roi > 10 ? 'Fair' : 'Poor';
      pdf.text(`ROI Assessment: ${roiAssessment} (${outputs.roi.toFixed(2)}%)`, margin, yPosition);

      // Save the PDF
      const fileName = `underwriting-${scenario.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: "Underwriting analysis exported to PDF",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (selectedScenario) {
      const scenario = scenarios.find(s => s.id === selectedScenario);
      if (scenario) {
        setInputs(scenario.inputs);
        setOutputs(scenario.outputs);
      }
    }
  }, [selectedScenario, scenarios]);

  const loadScenarios = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/underwriting/leads/${leadId}/scenarios`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
        
        // Select the primary scenario or the first one
        const primaryScenario = data.find((s: UnderwritingScenario) => s.isPrimary);
        const firstScenario = data[0];
        if (primaryScenario) {
          setSelectedScenario(primaryScenario.id);
        } else if (firstScenario) {
          setSelectedScenario(firstScenario.id);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load underwriting scenarios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScenario = async () => {
    try {
      setIsCalculating(true);
      const response = await fetch('/api/v1/underwriting/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(inputs)
      });

      if (response.ok) {
        const data = await response.json();
        setOutputs(data.outputs);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calculate scenario",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const saveScenario = async (name: string, isPrimary: boolean = false) => {
    try {
      const response = await fetch(`/api/v1/underwriting/leads/${leadId}/scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          isPrimary,
          inputs
        })
      });

      if (response.ok) {
        const newScenario = await response.json();
        setScenarios(prev => [...prev, newScenario]);
        setSelectedScenario(newScenario.id);
        toast({
          title: "Success",
          description: "Scenario saved successfully"
        });
        return true;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save scenario",
        variant: "destructive"
      });
    }
    return false;
  };

  const updateScenario = async () => {
    if (!selectedScenario) return;

    try {
      const response = await fetch(`/api/v1/underwriting/scenarios/${selectedScenario}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ inputs })
      });

      if (response.ok) {
        const updatedScenario = await response.json();
        setScenarios(prev => prev.map(s => s.id === selectedScenario ? updatedScenario : s));
        toast({
          title: "Success",
          description: "Scenario updated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update scenario",
        variant: "destructive"
      });
    }
  };

  const deleteScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/v1/underwriting/scenarios/${scenarioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setScenarios(prev => prev.filter(s => s.id !== scenarioId));
        if (selectedScenario === scenarioId) {
          setSelectedScenario(scenarios[0]?.id || null);
        }
        toast({
          title: "Success",
          description: "Scenario deleted successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete scenario",
        variant: "destructive"
      });
    }
  };

  const duplicateScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/v1/underwriting/scenarios/${scenarioId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: `Copy of ${scenarios.find(s => s.id === scenarioId)?.name}` })
      });

      if (response.ok) {
        const duplicatedScenario = await response.json();
        setScenarios(prev => [...prev, duplicatedScenario]);
        toast({
          title: "Success",
          description: "Scenario duplicated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate scenario",
        variant: "destructive"
      });
    }
  };

  const setPrimary = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/v1/underwriting/scenarios/${scenarioId}/set-primary`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadScenarios(); // Reload to update primary status
        toast({
          title: "Success",
          description: "Primary scenario updated"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set primary scenario",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof UnderwritingInputs, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  const handleCreateNewScenario = async () => {
    if (!newScenarioName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a scenario name",
        variant: "destructive"
      });
      return;
    }

    const success = await saveScenario(newScenarioName.trim());
    if (success) {
      setShowNewScenarioDialog(false);
      setNewScenarioName('');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Underwriting Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading scenarios...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Underwriting Calculator
          </div>
          <div className="flex items-center gap-2">
            {selectedScenario && (
              <Button size="sm" variant="outline" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
            )}
            <Dialog open={showNewScenarioDialog} onOpenChange={setShowNewScenarioDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  New Scenario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Scenario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scenario-name">Scenario Name</Label>
                    <Input
                      id="scenario-name"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="e.g. Conservative Estimate"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewScenarioDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateNewScenario}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios ({scenarios.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator" className="space-y-6">
            {scenarios.length > 0 && (
              <div>
                <Label htmlFor="scenario-select">Current Scenario</Label>
                <Select value={selectedScenario || ''} onValueChange={setSelectedScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map(scenario => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name} {scenario.isPrimary && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Inputs</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="purchase-price">Purchase Price</Label>
                    <Input
                      id="purchase-price"
                      type="number"
                      value={inputs.purchasePrice || ''}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="repair-costs">Repair Costs</Label>
                    <Input
                      id="repair-costs"
                      type="number"
                      value={inputs.repairCosts || ''}
                      onChange={(e) => handleInputChange('repairCosts', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="arv">After Repair Value (ARV)</Label>
                    <Input
                      id="arv"
                      type="number"
                      value={inputs.arv || ''}
                      onChange={(e) => handleInputChange('arv', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="holding-costs">Holding Costs</Label>
                    <Input
                      id="holding-costs"
                      type="number"
                      value={inputs.holdingCosts || ''}
                      onChange={(e) => handleInputChange('holdingCosts', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="closing-costs">Closing Costs</Label>
                    <Input
                      id="closing-costs"
                      type="number"
                      value={inputs.closingCosts || ''}
                      onChange={(e) => handleInputChange('closingCosts', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="realtor-fees">Realtor Fees</Label>
                    <Input
                      id="realtor-fees"
                      type="number"
                      value={inputs.realtorFees || ''}
                      onChange={(e) => handleInputChange('realtorFees', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="other-costs">Other Costs</Label>
                    <Input
                      id="other-costs"
                      type="number"
                      value={inputs.otherCosts || ''}
                      onChange={(e) => handleInputChange('otherCosts', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <Button 
                  onClick={calculateScenario} 
                  disabled={isCalculating}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {isCalculating ? 'Calculating...' : 'Calculate'}
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Results</h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Costs</div>
                    <div className="text-xl font-semibold">${outputs.totalCosts.toLocaleString()}</div>
                  </div>

                  <div className={`p-3 rounded-lg ${outputs.profit >= 0 ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                    <div className="text-sm opacity-80">Profit</div>
                    <div className="text-xl font-semibold">${outputs.profit.toLocaleString()}</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">ROI</div>
                    <div className="text-xl font-semibold">{outputs.roi.toFixed(2)}%</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Cash on Cash</div>
                    <div className="text-xl font-semibold">{outputs.cashOnCash.toFixed(2)}%</div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Profit Margin</div>
                    <div className="text-xl font-semibold">{outputs.profitMargin.toFixed(2)}%</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {selectedScenario ? (
                    <Button onClick={updateScenario} variant="outline" className="w-full">
                      Update Scenario
                    </Button>
                  ) : (
                    <Button onClick={() => setShowNewScenarioDialog(true)} className="w-full">
                      Save as New Scenario
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4">
            {scenarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scenarios saved yet. Create your first scenario using the calculator.
              </div>
            ) : (
              <div className="space-y-3">
                {scenarios.map(scenario => (
                  <Card key={scenario.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {scenario.name}
                              {scenario.isPrimary && <Badge variant="secondary">Primary</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Created {new Date(scenario.createdAt).toLocaleDateString()}
                              {scenario.createdBy && ` by ${scenario.createdBy.firstName} ${scenario.createdBy.lastName}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="text-right mr-4">
                            <div className="text-sm text-muted-foreground">Profit</div>
                            <div className={`font-semibold ${scenario.outputs.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${scenario.outputs.profit.toLocaleString()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateScenario(scenario.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!scenario.isPrimary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPrimary(scenario.id)}
                            >
                              Set Primary
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteScenario(scenario.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
