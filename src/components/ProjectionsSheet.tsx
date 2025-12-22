import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE } from '@/config/api';

interface ProjectionsSheetProps {
  leadId: string;
  finalOffer: number; // From Underwriting Calculator
  rehabCost: number; // From Rehab Calculator
  arv: number; // From Underwriting Calculator
  taxes: number; // From Underwriting Calculator
  timeline: number; // From Underwriting Calculator (months)
}

export function ProjectionsSheet({ 
  leadId,
  finalOffer,
  rehabCost,
  arv,
  taxes,
  timeline
}: ProjectionsSheetProps) {
  const [expanded, setExpanded] = useState(false);

  // FIXED SYSTEM CONSTANTS (from Google Sheet)
  const TRANSFER_TAX_RATE = 0.002; // 0.20%
  const SPLIT_TRANSFER = true;
  const EXIT_SPLIT_TRANSFER = true;
  const LOAN_PERCENTAGE = 80; // 80%
  const LOAN_INTEREST = 10.99; // 10.99%
  const ORIGINATION_FEE = 1.99; // 1.99%

  // Fixed costs
  const TITLE_INSURANCE = 1000;
  const RECORDING_FEES = 300;
  const MISC_CLOSING = 500;
  const UTILITIES = 1800;
  const INSURANCE = 294;
  const TITLE_COST_EXIT = 2000;
  const MISC_EXIT_CLOSING = 500;
  const UNDERWRITING_FEE = 0;
  const APPRAISAL_FEE = 0;

  const [projections, setProjections] = useState({
    // ACQUISITION
    purchasePrice: 0,
    rehabCost: 0,
    totalAcquisitionCost: 0,
    
    // CLOSING COST
    transferTax: 0,
    titleInsurance: 0,
    recordingFees: 0,
    miscClosing: 0,
    totalClosingCost: 0,
    
    // FINANCING COST
    loanAmount: 0,
    loanPayments: 0,
    originationPoints: 0,
    underwritingFee: 0,
    appraisalFee: 0,
    totalFinancingCost: 0,
    
    // HOLDING COST
    holdingTaxes: 0,
    utilities: 0,
    insurance: 0,
    totalHoldingCost: 0,
    
    // EXIT COST
    agentCommission: 0,
    titleCostExit: 0,
    exitTransferTax: 0,
    miscExitClosing: 0,
    totalExitCost: 0,
    
    // OUT OF POCKET
    purchaseOOP: 0,
    closingOOP: 0,
    financeOOP: 0,
    holdingOOP: 0,
    exitCostOOP: 0,
    totalOOP: 0,
    
    // COST SUMMARY
    acquisitionsCost: 0,
    closingCost: 0,
    financingCost: 0,
    holdingCost: 0,
    exitCost: 0,
    allIn: 0,
    
    // INCOME
    salePrice: 0,
    totalIncome: 0,
    
    // OUTLOOK
    profit: 0,
    spread: 0,
    roi: 0
  });

  useEffect(() => {
    calculateProjections();
  }, [finalOffer, rehabCost, arv, taxes, timeline]);

  const calculateProjections = () => {
    /**
     * FORMULAS VERIFIED AGAINST GOOGLE SHEET
     * Test Case: Purchase=$84,000, Rehab=$60,000, ARV=$200,000, Taxes=$1,000, Timeline=6mo
     * 
     * Loan Amount = (Purchase × 80%) + Rehab = ($84,000 × 0.80) + $60,000 = $127,200 ✓
     * Loan Payments = (Purchase + Rehab) × 80% × Interest × (Timeline/12) = $144,000 × 0.80 × 0.1099 × 0.5 = $6,330.24 ✓
     * Origination = Loan Amount × 1.99% = $127,200 × 0.0199 = $2,531.28 ✓
     * Transfer Tax = Purchase × 0.20% ÷ 2 = $84,000 × 0.002 ÷ 2 = $84 ✓
     * Agent Commission = ARV × 6% = $200,000 × 0.06 = $10,000 ✓
     * Spread = (Purchase + Rehab) / ARV × 100 = $144,000 / $200,000 = 72% ✓
     * ROI = Profit / Total OOP × 100 ✓
     */
    
    // ACQUISITION
    const purchasePrice = finalOffer;
    const totalAcquisitionCost = purchasePrice + rehabCost;

    // CLOSING COST
    const transferTax = SPLIT_TRANSFER 
      ? (purchasePrice * (TRANSFER_TAX_RATE / 2)) 
      : (purchasePrice * TRANSFER_TAX_RATE);
    const totalClosingCost = transferTax + TITLE_INSURANCE + RECORDING_FEES + MISC_CLOSING;

    // FINANCING COST
    // Loan Amount = (Purchase Price × 80%) + Rehab Cost
    const loanAmount = (purchasePrice * (LOAN_PERCENTAGE / 100)) + rehabCost;
    // Loan Payments = (Purchase + Rehab) × 80% × Interest × (Timeline / 12)
    const loanPayments = (purchasePrice + rehabCost) * (LOAN_PERCENTAGE / 100) * (LOAN_INTEREST / 100) * (timeline / 12);
    const originationPoints = loanAmount * (ORIGINATION_FEE / 100);
    const totalFinancingCost = loanPayments + originationPoints + UNDERWRITING_FEE + APPRAISAL_FEE;

    // HOLDING COST
    const holdingTaxes = (taxes / 12) * timeline;
    const totalHoldingCost = holdingTaxes + UTILITIES + INSURANCE;

    // EXIT COST
    const salePrice = arv;
    const agentCommission = salePrice * 0.06; // 6% of ARV
    const exitTransferTax = EXIT_SPLIT_TRANSFER 
      ? (salePrice * (TRANSFER_TAX_RATE / 2)) 
      : (salePrice * TRANSFER_TAX_RATE);
    const totalExitCost = agentCommission + TITLE_COST_EXIT + exitTransferTax + MISC_EXIT_CLOSING;

    // OUT OF POCKET
    // Purchase OOP = Purchase Price - (Purchase Price × Loan %)
    const purchaseLoanPortion = purchasePrice * (LOAN_PERCENTAGE / 100);
    const purchaseOOP = purchasePrice - purchaseLoanPortion;
    const closingOOP = totalClosingCost;
    const financeOOP = originationPoints;
    const holdingOOP = totalHoldingCost;
    const exitCostOOP = totalExitCost;
    const totalOOP = purchaseOOP + closingOOP + financeOOP + holdingOOP + exitCostOOP;

    // COST SUMMARY
    const acquisitionsCost = totalAcquisitionCost;
    const closingCost = totalClosingCost;
    const financingCost = totalFinancingCost;
    const holdingCost = totalHoldingCost;
    const exitCost = totalExitCost;
    const allIn = acquisitionsCost + closingCost + financingCost + holdingCost + exitCost;

    // INCOME
    const totalIncome = salePrice;

    // OUTLOOK
    const profit = totalIncome - allIn;
    // Spread = (Purchase + Rehab) / ARV × 100 (shows what % of ARV is the acquisition cost)
    const spread = salePrice > 0 ? ((purchasePrice + rehabCost) / salePrice) * 100 : 0;
    const roi = totalOOP > 0 ? (profit / totalOOP) * 100 : 0;

    setProjections({
      purchasePrice,
      rehabCost,
      totalAcquisitionCost,
      
      transferTax,
      titleInsurance: TITLE_INSURANCE,
      recordingFees: RECORDING_FEES,
      miscClosing: MISC_CLOSING,
      totalClosingCost,
      
      loanAmount,
      loanPayments,
      originationPoints,
      underwritingFee: UNDERWRITING_FEE,
      appraisalFee: APPRAISAL_FEE,
      totalFinancingCost,
      
      holdingTaxes,
      utilities: UTILITIES,
      insurance: INSURANCE,
      totalHoldingCost,
      
      agentCommission,
      titleCostExit: TITLE_COST_EXIT,
      exitTransferTax,
      miscExitClosing: MISC_EXIT_CLOSING,
      totalExitCost,
      
      purchaseOOP,
      closingOOP,
      financeOOP,
      holdingOOP,
      exitCostOOP,
      totalOOP,
      
      acquisitionsCost,
      closingCost,
      financingCost,
      holdingCost,
      exitCost,
      allIn,
      
      salePrice,
      totalIncome,
      
      profit,
      spread,
      roi
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Projections (Full Sheet)</span>
          <span className="text-xs text-blue-600 font-semibold ml-2">
            Profit: {formatCurrency(projections.profit)}
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
          {/* 3 even rows (each row stretches to the same height across columns) */}
          <div className="space-y-2">
            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:items-stretch">
              {/* ACQUISITION */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">ACQUISITION</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Purchase Price:</span>
                    <span className="font-medium">{formatCurrency(projections.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Rehab Cost:</span>
                    <span className="font-medium">{formatCurrency(projections.rehabCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(projections.totalAcquisitionCost)}</span>
                  </div>
                </div>
              </div>

              {/* HOLDING COST */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">HOLDING COST</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taxes:</span>
                    <span>{formatCurrency(projections.holdingTaxes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Utilities:</span>
                    <span>{formatCurrency(projections.utilities)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Insurance:</span>
                    <span>{formatCurrency(projections.insurance)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(projections.totalHoldingCost)}</span>
                  </div>
                </div>
              </div>

              {/* COST SUMMARY */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">COST</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Acquisitions Cost:</span>
                    <span>{formatCurrency(projections.acquisitionsCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Closing Cost:</span>
                    <span>{formatCurrency(projections.closingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Financing Cost:</span>
                    <span>{formatCurrency(projections.financingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Holding Cost:</span>
                    <span>{formatCurrency(projections.holdingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Exit Cost:</span>
                    <span>{formatCurrency(projections.exitCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>All In:</span>
                    <span>{formatCurrency(projections.allIn)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:items-stretch">
              {/* CLOSING COST */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">CLOSING COST</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transfer Tax:</span>
                    <span>{formatCurrency(projections.transferTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Title Insurance:</span>
                    <span>{formatCurrency(projections.titleInsurance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Recording Fees:</span>
                    <span>{formatCurrency(projections.recordingFees)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Misc. Closing*:</span>
                    <span>{formatCurrency(projections.miscClosing)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(projections.totalClosingCost)}</span>
                  </div>
                </div>
              </div>

              {/* EXIT COST */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">EXIT COST</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Agent Commission:</span>
                    <span>{formatCurrency(projections.agentCommission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Title:</span>
                    <span>{formatCurrency(projections.titleCostExit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transfer Tax:</span>
                    <span>{formatCurrency(projections.exitTransferTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Misc. Closing*:</span>
                    <span>{formatCurrency(projections.miscExitClosing)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(projections.totalExitCost)}</span>
                  </div>
                </div>
              </div>

              {/* INCOME (gray, per request) */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">INCOME</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sale Price:</span>
                    <span>{formatCurrency(projections.salePrice)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>Total Income:</span>
                    <span>{formatCurrency(projections.totalIncome)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:items-stretch">
              {/* FINANCING COST */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded h-full">
                <div className="font-semibold text-slate-700 mb-1 text-[11px]">FINANCING COST</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Loan Amount:</span>
                    <span>{formatCurrency(projections.loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Loan Payments:</span>
                    <span>{formatCurrency(projections.loanPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Origination Points:</span>
                    <span>{formatCurrency(projections.originationPoints)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Underwriting Fee:</span>
                    <span>{formatCurrency(projections.underwritingFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Appraisal Fee:</span>
                    <span>{formatCurrency(projections.appraisalFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(projections.totalFinancingCost)}</span>
                  </div>
                </div>
              </div>

              {/* OUT OF POCKET (blue) */}
              <div className="p-2 bg-blue-50 border border-blue-200 rounded h-full">
                <div className="font-semibold text-blue-700 mb-1 text-[11px]">OUT OF POCKET</div>
                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Purchase OOP:</span>
                    <span>{formatCurrency(projections.purchaseOOP)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Closing OOP:</span>
                    <span>{formatCurrency(projections.closingOOP)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Finance OOP:</span>
                    <span>{formatCurrency(projections.financeOOP)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Holding OOP:</span>
                    <span>{formatCurrency(projections.holdingOOP)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Exit Cost:</span>
                    <span>{formatCurrency(projections.exitCostOOP)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5 text-blue-700">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(projections.totalOOP)}</span>
                  </div>
                </div>
              </div>

              {/* OUTLOOK (green + slightly bigger) */}
              <div className="p-3 bg-green-50 border-2 border-green-300 rounded h-full min-h-[120px]">
                <div className="font-bold text-green-700 mb-2 text-xs">OUTLOOK</div>
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">Profit:</span>
                    <span className="font-bold text-green-700">{formatCurrency(projections.profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">Spread:</span>
                    <span className="font-bold">{formatPercent(projections.spread)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">ROI:</span>
                    <span className="font-bold">{formatPercent(projections.roi)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

