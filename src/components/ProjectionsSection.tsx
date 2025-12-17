import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { TrendingUp, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface ProjectionsSectionProps {
  leadId: string;
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  readOnly?: boolean;
}

export function ProjectionsSection({ 
  leadId, 
  purchasePrice = 0, 
  rehabCost = 0, 
  arv = 0,
  readOnly = false 
}: ProjectionsSectionProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  // Input values
  const [purchasePriceValue, setPurchasePriceValue] = useState(purchasePrice);
  const [rehabCostValue, setRehabCostValue] = useState(rehabCost);
  const [arvValue, setArvValue] = useState(arv);
  const [taxes, setTaxes] = useState(1000);
  const [timeline, setTimeline] = useState(6);
  const [transferTaxRate, setTransferTaxRate] = useState(0.002); // 0.20%
  const [splitTransfer, setSplitTransfer] = useState(true);
  const [exitSplitTransfer, setExitSplitTransfer] = useState(true);
  const [isLender, setIsLender] = useState(true);
  const [loanPercentage, setLoanPercentage] = useState(80); // 80%
  const [loanInterest, setLoanInterest] = useState(10.99); // 10.99%
  const [originationFee, setOriginationFee] = useState(1.99); // 1.99%

  // Additional costs - Use ARV as sale price
  const [salePrice, setSalePrice] = useState(arv || 0);
  const [utilities, setUtilities] = useState(1800);
  const [insurance, setInsurance] = useState(294);
  const [agentCommission, setAgentCommission] = useState(10000);
  const [titleCost, setTitleCost] = useState(2000);
  const [transferTaxCost, setTransferTaxCost] = useState(200);
  const [miscClosing, setMiscClosing] = useState(500);

  // Calculated values
  const [calculations, setCalculations] = useState({
    // Purchase costs
    totalPurchaseCost: 0,
    transferTax: 0,
    titleInsurance: 0,
    recordingFees: 0,
    miscClosingCost: 0,
    totalClosingCost: 0,
    
    // Exit costs
    totalExitCost: 0,
    
    // Financing
    loanAmount: 0,
    loanPayments: 0,
    originationPoints: 0,
    underwritingFee: 0,
    appraisalFee: 0,
    totalFinancingCost: 0,
    
    // Holding costs
    totalHoldingCost: 0,
    
    // Out of pocket
    purchaseOOP: 0,
    closingOOP: 0,
    financeOOP: 0,
    holdingOOP: 0,
    exitCostOOP: 0,
    totalOOP: 0,
    
    // Acquisitions cost
    acquisitionsCost: 0,
    
    // Outlook
    totalIncome: 0,
    allIn: 0,
    profit: 0,
    spread: 0,
    roi: 0
  });

  useEffect(() => {
    setPurchasePriceValue(purchasePrice);
    setRehabCostValue(rehabCost);
    setArvValue(arv);
    // Use ARV as sale price if provided
    if (arv > 0) {
      setSalePrice(arv);
    }
  }, [purchasePrice, rehabCost, arv]);

  useEffect(() => {
    calculateProjections();
  }, [
    purchasePriceValue, rehabCostValue, arvValue, taxes, timeline,
    transferTaxRate, splitTransfer, exitSplitTransfer, isLender,
    loanPercentage, loanInterest, originationFee,
    salePrice, utilities, insurance, agentCommission, titleCost,
    transferTaxCost, miscClosing
  ]);

  const calculateProjections = () => {
    // Purchase costs
    // Transfer Tax: If split, divide rate by 2
    const transferTax = splitTransfer ? (purchasePriceValue * (transferTaxRate / 2)) : (purchasePriceValue * transferTaxRate);
    const titleInsurance = 1000;
    const recordingFees = 300;
    const miscClosingCost = 500;
    const totalClosingCost = transferTax + titleInsurance + recordingFees + miscClosingCost;
    const totalPurchaseCost = purchasePriceValue + rehabCostValue;

    // Holding costs: (Taxes/12) × Timeline + utilities + insurance
    const holdingTaxes = (taxes / 12) * timeline;
    const totalHoldingCost = holdingTaxes + utilities + insurance;

    // Exit costs
    // Exit Transfer Tax: If split, divide rate by 2
    const exitTransferTax = exitSplitTransfer ? (salePrice * (transferTaxRate / 2)) : (salePrice * transferTaxRate);
    const totalExitCost = agentCommission + titleCost + exitTransferTax + miscClosing;

    // Financing (if lender)
    let loanAmount = 0;
    let loanPayments = 0;
    let originationPoints = 0;
    let totalFinancingCost = 0;

    if (isLender) {
      // Loan Amount = (Purchase Price × Loan %) + Rehab Cost
      loanAmount = (purchasePriceValue * (loanPercentage / 100)) + rehabCostValue;
      // Loan Payments = ((Purchase + Rehab) × Loan %) × Interest × Timeline / 12
      loanPayments = ((purchasePriceValue + rehabCostValue) * (loanPercentage / 100)) * (loanInterest / 100) * timeline / 12;
      originationPoints = loanAmount * (originationFee / 100);
      const underwritingFee = 0;
      const appraisalFee = 0;
      totalFinancingCost = loanPayments + originationPoints + underwritingFee + appraisalFee;
    }

    // Out of pocket
    // Purchase OOP = (Purchase + Rehab) - Loan Amount
    const purchaseOOP = (purchasePriceValue + rehabCostValue) - loanAmount;
    const closingOOP = totalClosingCost || 0;
    const financeOOP = totalFinancingCost || 0; // Use total financing cost, not just origination
    const holdingOOP = totalHoldingCost || 0;
    const exitCostOOP = totalExitCost || 0;
    // Total OOP = Purchase + Closing + Finance + Holding (Exit Cost NOT included per Google Sheet)
    const totalOOP = (purchaseOOP || 0) + closingOOP + financeOOP + holdingOOP;

    // Acquisitions cost (Purchase + Rehab only, closing is separate)
    const acquisitionsCost = totalPurchaseCost;

    // All In = Acquisitions + Closing + Financing + Holding + Exit
    const allIn = acquisitionsCost + totalClosingCost + totalFinancingCost + totalHoldingCost + totalExitCost;

    // Outlook
    const totalIncome = salePrice || 0;
    const profit = totalIncome - allIn;
    // Spread = (Purchase Price + Rehab Cost) / ARV × 100 (70% Rule)
    const spread = arvValue > 0 ? (((purchasePriceValue + rehabCostValue) / arvValue) * 100) : 0;
    // ROI = Profit / All In × 100 (per Google Sheet formula =M22/M17)
    const roi = allIn > 0 ? ((profit / allIn) * 100) : 0;

    setCalculations({
      totalPurchaseCost,
      transferTax,
      titleInsurance,
      recordingFees,
      miscClosingCost,
      totalClosingCost,
      totalExitCost,
      loanAmount,
      loanPayments,
      originationPoints,
      underwritingFee: 0,
      appraisalFee: 0,
      totalFinancingCost,
      totalHoldingCost,
      purchaseOOP,
      closingOOP,
      financeOOP,
      holdingOOP,
      exitCostOOP,
      totalOOP,
      acquisitionsCost,
      totalIncome,
      allIn,
      profit,
      spread,
      roi
    });
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Projections</span>
          <span className="text-xs text-emerald-600 font-semibold ml-2">
            Profit: {formatCurrency(calculations.profit)} | ROI: {formatPercent(calculations.roi)}
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
        <div className="space-y-2 mt-2">
          {/* Input Section */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-50 rounded">
            <div>
              <Label className="text-[10px] text-slate-500">Purchase Price</Label>
              <Input
                type="number"
                value={purchasePriceValue || ''}
                onChange={(e) => setPurchasePriceValue(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                min={0}
                step={1000}
                placeholder="e.g., 150000"
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
                min={0}
                step={1000}
                placeholder="e.g., 30000"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">ARV (Sale Price)</Label>
              <Input
                type="number"
                value={arvValue || ''}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setArvValue(value);
                  setSalePrice(value);
                }}
                disabled={readOnly}
                className="h-6 text-xs"
                min={0}
                step={1000}
                placeholder="e.g., 200000"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Taxes</Label>
              <Input
                type="number"
                value={taxes}
                onChange={(e) => setTaxes(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                min={0}
                step={100}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Timeline (months)</Label>
              <Input
                type="number"
                value={timeline}
                onChange={(e) => setTimeline(Number(e.target.value))}
                disabled={readOnly}
                className="h-6 text-xs"
                min={1}
                max={24}
                step={1}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded text-[10px]">
            <div className="flex items-center space-x-1">
              <Checkbox
                checked={splitTransfer}
                onCheckedChange={(checked) => setSplitTransfer(checked as boolean)}
                disabled={readOnly}
                className="h-3 w-3"
              />
              <Label className="text-[10px]">Split Transfer?</Label>
            </div>
            <div className="flex items-center space-x-1">
              <Checkbox
                checked={exitSplitTransfer}
                onCheckedChange={(checked) => setExitSplitTransfer(checked as boolean)}
                disabled={readOnly}
                className="h-3 w-3"
              />
              <Label className="text-[10px]">Exit Split Transfer?</Label>
            </div>
            <div className="flex items-center space-x-1">
              <Checkbox
                checked={isLender}
                onCheckedChange={(checked) => setIsLender(checked as boolean)}
                disabled={readOnly}
                className="h-3 w-3"
              />
              <Label className="text-[10px]">Lender?</Label>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Transfer Tax %</Label>
              <Input
                type="number"
                step="0.001"
                value={transferTaxRate * 100}
                onChange={(e) => setTransferTaxRate(Number(e.target.value) / 100)}
                disabled={readOnly}
                className="h-6 text-xs"
              />
            </div>
          </div>

          {/* Loan Settings */}
          {isLender && (
            <div className="grid grid-cols-3 gap-1 p-1 bg-blue-50 rounded">
              <div>
                <Label className="text-[10px] text-slate-500">Loan %</Label>
                <Input
                  type="number"
                  value={loanPercentage}
                  onChange={(e) => setLoanPercentage(Number(e.target.value))}
                  disabled={readOnly}
                  className="h-6 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Interest %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={loanInterest}
                  onChange={(e) => setLoanInterest(Number(e.target.value))}
                  disabled={readOnly}
                  className="h-6 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Origination %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={originationFee}
                  onChange={(e) => setOriginationFee(Number(e.target.value))}
                  disabled={readOnly}
                  className="h-6 text-xs"
                />
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {/* Column 1: Purchase & Closing */}
            <div className="space-y-1 p-1 bg-slate-50 rounded">
              <div className="font-medium text-slate-700 border-b pb-0.5">Purchase & Closing</div>
              <div className="flex justify-between">
                <span>Purchase Price:</span>
                <span className="font-medium">{formatCurrency(purchasePriceValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rehab Cost:</span>
                <span className="font-medium">{formatCurrency(rehabCostValue)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-0.5">
                <span>Total Cost:</span>
                <span>{formatCurrency(calculations.totalPurchaseCost)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Transfer Tax:</span>
                <span>{formatCurrency(calculations.transferTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Title Insurance:</span>
                <span>{formatCurrency(calculations.titleInsurance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Recording Fees:</span>
                <span>{formatCurrency(calculations.recordingFees)}</span>
              </div>
              <div className="flex justify-between">
                <span>Misc. Closing:</span>
                <span>{formatCurrency(calculations.miscClosingCost)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-0.5">
                <span>Total Closing:</span>
                <span>{formatCurrency(calculations.totalClosingCost)}</span>
              </div>
            </div>

            {/* Column 2: Holding & Exit */}
            <div className="space-y-1 p-1 bg-slate-50 rounded">
              <div className="font-medium text-slate-700 border-b pb-0.5">Holding & Exit</div>
              <div className="flex justify-between">
                <span>Taxes ({timeline}mo):</span>
                <span>{formatCurrency((taxes / 12) * timeline)}</span>
              </div>
              <div className="flex justify-between">
                <span>Utilities:</span>
                <span>{formatCurrency(utilities)}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance:</span>
                <span>{formatCurrency(insurance)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-0.5">
                <span>Total Holding:</span>
                <span>{formatCurrency(calculations.totalHoldingCost)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Agent Commission:</span>
                <span>{formatCurrency(agentCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span>Title:</span>
                <span>{formatCurrency(titleCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transfer Tax:</span>
                <span>{formatCurrency(transferTaxCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Misc. Closing:</span>
                <span>{formatCurrency(miscClosing)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-0.5">
                <span>Total Exit:</span>
                <span>{formatCurrency(calculations.totalExitCost)}</span>
              </div>
            </div>

            {/* Column 3: Financing & Outlook */}
            <div className="space-y-1 p-1 bg-slate-50 rounded">
              {isLender && (
                <>
                  <div className="font-medium text-slate-700 border-b pb-0.5">Financing</div>
                  <div className="flex justify-between">
                    <span>Loan Amount:</span>
                    <span>{formatCurrency(calculations.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loan Payments:</span>
                    <span>{formatCurrency(calculations.loanPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Origination Points:</span>
                    <span>{formatCurrency(calculations.originationPoints)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-0.5">
                    <span>Total Financing:</span>
                    <span>{formatCurrency(calculations.totalFinancingCost)}</span>
                  </div>
                </>
              )}
              <div className="font-medium text-slate-700 border-b pb-0.5 mt-2">Outlook</div>
              <div className="flex justify-between">
                <span>Sale Price:</span>
                <span>{formatCurrency(salePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Income:</span>
                <span>{formatCurrency(calculations.totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span>All In:</span>
                <span>{formatCurrency(calculations.allIn)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600 border-t pt-0.5">
                <span>Profit:</span>
                <span>{formatCurrency(calculations.profit)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Spread:</span>
                <span>{formatPercent(calculations.spread)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>ROI:</span>
                <span>{formatPercent(calculations.roi)}</span>
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="p-1 bg-amber-50 rounded text-[10px] border border-amber-200">
            <div className="font-medium text-slate-700 mb-1">Cost Breakdown</div>
            <div className="grid grid-cols-6 gap-2">
              <div>
                <span className="text-slate-600">Acquisitions:</span>
                <div className="font-medium">{formatCurrency(calculations.acquisitionsCost)}</div>
              </div>
              <div>
                <span className="text-slate-600">Closing:</span>
                <div className="font-medium">{formatCurrency(calculations.totalClosingCost)}</div>
              </div>
              <div>
                <span className="text-slate-600">Financing:</span>
                <div className="font-medium">{formatCurrency(calculations.totalFinancingCost)}</div>
              </div>
              <div>
                <span className="text-slate-600">Holding:</span>
                <div className="font-medium">{formatCurrency(calculations.totalHoldingCost)}</div>
              </div>
              <div>
                <span className="text-slate-600">Exit:</span>
                <div className="font-medium">{formatCurrency(calculations.totalExitCost)}</div>
              </div>
              <div>
                <span className="text-slate-600 font-semibold">All In:</span>
                <div className="font-bold text-amber-700">{formatCurrency(calculations.allIn)}</div>
              </div>
            </div>
          </div>

          {/* Out of Pocket Summary */}
          <div className="p-1 bg-blue-50 rounded text-[10px] border border-blue-200">
            <div className="font-medium text-slate-700 mb-1">Out of Pocket</div>
            <div className="grid grid-cols-6 gap-2">
              <div>
                <span className="text-slate-600">Purchase:</span>
                <div className="font-medium">{formatCurrency(calculations.purchaseOOP)}</div>
              </div>
              <div>
                <span className="text-slate-600">Closing:</span>
                <div className="font-medium">{formatCurrency(calculations.closingOOP)}</div>
              </div>
              <div>
                <span className="text-slate-600">Finance:</span>
                <div className="font-medium">{formatCurrency(calculations.financeOOP)}</div>
              </div>
              <div>
                <span className="text-slate-600">Holding:</span>
                <div className="font-medium">{formatCurrency(calculations.holdingOOP)}</div>
              </div>
              <div>
                <span className="text-slate-600">Exit:</span>
                <div className="font-medium">{formatCurrency(calculations.exitCostOOP)}</div>
              </div>
              <div>
                <span className="text-slate-600 font-semibold">Total OOP:</span>
                <div className="font-bold text-blue-600">{formatCurrency(calculations.totalOOP)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

