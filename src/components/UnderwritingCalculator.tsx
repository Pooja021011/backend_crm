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
import { API_BASE, makeApiCall } from '../config/api';
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
        ['Total Investment:', formatCurrency(Number(outputs?.totalCosts ?? 0))],
        ['Gross Profit:', formatCurrency(Number(outputs?.profit ?? 0))],
        ['Return on Investment (ROI):', `${Number(outputs?.roi ?? 0).toFixed(2)}%`],
        ['Cash-on-Cash Return:', `${Number(outputs?.cashOnCash ?? 0).toFixed(2)}%`],
        ['Profit Margin:', `${Number(outputs?.profitMargin ?? 0).toFixed(2)}%`]
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
      const profit = Number(outputs?.profit ?? 0);
      const profitColor = profit > 0 ? [0, 150, 0] : [200, 0, 0];
      pdf.setTextColor(...profitColor);
      pdf.text(`Expected Profit: ${formatCurrency(profit)}`, margin, yPosition);
      yPosition += 8;

      pdf.setTextColor(0, 0, 0);
      const roi = Number(outputs?.roi ?? 0);
      const roiAssessment = roi > 20 ? 'Excellent' : roi > 15 ? 'Good' : roi > 10 ? 'Fair' : 'Poor';
      pdf.text(`ROI Assessment: ${roiAssessment} (${roi.toFixed(2)}%)`, margin, yPosition);

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
      const response = await makeApiCall(`${API_BASE}/underwriting/leads/${leadId}/scenarios`);

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
      const response = await makeApiCall(`${API_BASE}/underwriting/calculate`, {
        method: 'POST',
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
      const response = await makeApiCall(`${API_BASE}/underwriting/leads/${leadId}/scenarios`, {
        method: 'POST',
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
      const response = await makeApiCall(`${API_BASE}/underwriting/scenarios/${selectedScenario}`, {
        method: 'PUT',
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
      const response = await makeApiCall(`${API_BASE}/underwriting/scenarios/${scenarioId}`, {
        method: 'DELETE'
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
      const response = await makeApiCall(`${API_BASE}/underwriting/scenarios/${scenarioId}/duplicate`, {
        method: 'POST',
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
      const response = await makeApiCall(`${API_BASE}/underwriting/scenarios/${scenarioId}/set-primary`, {
        method: 'PUT'
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
    <Card className="border border-slate-200">
      <CardHeader className="p-3 pb-0">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            Underwriting Calculator
          </div>
          <div className="flex items-center gap-1">
            {selectedScenario && (<Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={exportToPDF}><Download className="h-3 w-3 mr-0.5" />PDF</Button>)}
            <Dialog open={showNewScenarioDialog} onOpenChange={setShowNewScenarioDialog}>
              <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-6 text-xs px-2"><Plus className="h-3 w-3 mr-0.5" />New Scenario</Button></DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle className="text-sm">New Scenario</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <Input value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} placeholder="Scenario name" className="h-7 text-xs" />
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setShowNewScenarioDialog(false)}>Cancel</Button>
                    <Button size="sm" className="h-6 text-xs" onClick={handleCreateNewScenario}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-7">
            <TabsTrigger value="calculator" className="text-xs py-1">Calculator</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs py-1">Scenarios ({scenarios.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator" className="space-y-2 mt-2">
            {scenarios.length > 0 && (
              <Select value={selectedScenario || ''} onValueChange={setSelectedScenario}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select scenario" /></SelectTrigger>
                <SelectContent>{scenarios.map(scenario => (<SelectItem key={scenario.id} value={scenario.id}>{scenario.name} {scenario.isPrimary && '★'}</SelectItem>))}</SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1"><span className="text-xs font-medium text-slate-600">Inputs</span></div>
                <div className="space-y-1">
                  <div><Label className="text-[10px] text-slate-500">Purchase Price</Label><Input type="number" value={inputs.purchasePrice || ''} onChange={(e) => handleInputChange('purchasePrice', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                  <div><Label className="text-[10px] text-slate-500">Repair Costs</Label><Input type="number" value={inputs.repairCosts || ''} onChange={(e) => handleInputChange('repairCosts', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                  <div><Label className="text-[10px] text-slate-500">ARV</Label><Input type="number" value={inputs.arv || ''} onChange={(e) => handleInputChange('arv', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                  <div><Label className="text-[10px] text-slate-500">Holding Costs</Label><Input type="number" value={inputs.holdingCosts || ''} onChange={(e) => handleInputChange('holdingCosts', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                  <div><Label className="text-[10px] text-slate-500">Closing Costs</Label><Input type="number" value={inputs.closingCosts || ''} onChange={(e) => handleInputChange('closingCosts', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                  <div><Label className="text-[10px] text-slate-500">Realtor Fees</Label><Input type="number" value={inputs.realtorFees || ''} onChange={(e) => handleInputChange('realtorFees', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                  <div><Label className="text-[10px] text-slate-500">Other Costs</Label><Input type="number" value={inputs.otherCosts || ''} onChange={(e) => handleInputChange('otherCosts', e.target.value)} placeholder="0" className="h-6 text-xs" /></div>
                </div>
                <Button onClick={calculateScenario} disabled={isCalculating} className="h-5 text-[9px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md inline-flex items-center justify-center mt-2"><TrendingUp className="w-2.5 h-2.5 mr-0.5" />{isCalculating ? '...' : 'Calculate'}</Button>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1"><span className="text-xs font-medium text-slate-600">Results</span></div>
                <div className="space-y-1">
                  <div className="p-1.5 bg-muted rounded"><div className="text-[10px] text-muted-foreground">Total Costs</div><div className="text-sm font-semibold">${Number(outputs?.totalCosts ?? 0).toLocaleString()}</div></div>
                  <div className={`p-1.5 rounded ${Number(outputs?.profit ?? 0) >= 0 ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}><div className="text-[10px] opacity-80">Profit</div><div className="text-sm font-semibold">${Number(outputs?.profit ?? 0).toLocaleString()}</div></div>
                  <div className="p-1.5 bg-muted rounded"><div className="text-[10px] text-muted-foreground">ROI</div><div className="text-sm font-semibold">{Number(outputs?.roi ?? 0).toFixed(2)}%</div></div>
                  <div className="p-1.5 bg-muted rounded"><div className="text-[10px] text-muted-foreground">Cash on Cash</div><div className="text-sm font-semibold">{Number(outputs?.cashOnCash ?? 0).toFixed(2)}%</div></div>
                  <div className="p-1.5 bg-muted rounded"><div className="text-[10px] text-muted-foreground">Profit Margin</div><div className="text-sm font-semibold">{Number(outputs?.profitMargin ?? 0).toFixed(2)}%</div></div>
                </div>
                {selectedScenario ? (<Button onClick={updateScenario} variant="outline" className="h-5 text-[9px] px-2 py-1 rounded-md inline-flex items-center justify-center mt-2">Update</Button>) : (<Button onClick={() => setShowNewScenarioDialog(true)} className="h-5 text-[9px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md inline-flex items-center justify-center mt-2">Save</Button>)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="mt-2">
            {scenarios.length === 0 ? (<div className="text-center py-3 text-[10px] text-muted-foreground">No scenarios yet</div>) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {scenarios.map(scenario => (
                  <div key={scenario.id} className="flex items-center justify-between p-1.5 border rounded bg-slate-50 text-[10px]">
                    <div>
                      <span className="font-medium">{scenario.name}</span>
                      {scenario.isPrimary && <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0">Primary</Badge>}
                      <div className="text-slate-400">{new Date(scenario.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`font-semibold ${Number(scenario.outputs?.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${Number(scenario.outputs?.profit ?? 0).toLocaleString()}</span>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => duplicateScenario(scenario.id)}><Copy className="h-2.5 w-2.5" /></Button>
                      {!scenario.isPrimary && <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1" onClick={() => setPrimary(scenario.id)}>★</Button>}
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => deleteScenario(scenario.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
