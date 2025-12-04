import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  History,
} from 'lucide-react';
import { API_BASE, makeApiCall } from '@/config/api';

interface PriceHistoryEntry {
  id: string;
  fieldName: string;
  oldValue: number | null;
  newValue: number;
  changedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  note?: string;
}

interface LeadTimelineProps {
  leadId: string;
  leadCreatedAt?: string;
  deal?: {
    contractPrice?: number;
    soldPrice?: number;
    netProfit?: number;
    contractedAt?: string;
    closedAt?: string;
  };
  customFields?: {
    rehabBudget?: number;
    askingPrice?: number;
    estimatedValue?: number;
    appointmentDate?: string;
  };
  onRefresh?: () => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: string | null | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRelativeDate = (date: string): string => {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
};

const PriceChangeIndicator: React.FC<{ oldValue: number | null; newValue: number }> = ({
  oldValue,
  newValue,
}) => {
  if (oldValue === null) return null;
  
  const change = newValue - oldValue;
  const percentChange = oldValue > 0 ? ((change / oldValue) * 100).toFixed(1) : 0;
  const isIncrease = change > 0;

  return (
    <span className={`flex items-center gap-1 text-xs ${isIncrease ? 'text-emerald-600' : 'text-red-600'}`}>
      {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isIncrease ? '+' : ''}{formatCurrency(change)} ({percentChange}%)
    </span>
  );
};

export const LeadTimeline: React.FC<LeadTimelineProps> = ({
  leadId,
  leadCreatedAt,
  deal,
  customFields,
  onRefresh,
}) => {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    loadPriceHistory();
  }, [leadId]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await makeApiCall(`${API_BASE}/leads/${leadId}/price-history`);
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHistoryForField = (fieldName: string): PriceHistoryEntry[] => {
    return priceHistory.filter((h) => h.fieldName === fieldName);
  };

  const getLatestValueForField = (fieldName: string): number | null => {
    const history = getHistoryForField(fieldName);
    return history.length > 0 ? history[0].newValue : null;
  };

  // Determine timeline data from props and price history
  const offerAmount = deal?.contractPrice || getLatestValueForField('offerAmount') || getLatestValueForField('contractPrice');
  const contractPrice = deal?.contractPrice || getLatestValueForField('contractPrice');
  const estimatedProfit = deal?.netProfit || getLatestValueForField('netProfit');

  const timelineStages = [
    {
      id: 'leadCreated',
      label: 'Lead created',
      icon: FileText,
      date: leadCreatedAt,
      completed: true,
      color: 'bg-blue-500',
    },
    {
      id: 'appointment',
      label: 'Appointment',
      icon: Calendar,
      date: customFields?.appointmentDate || null,
      completed: !!customFields?.appointmentDate,
      color: 'bg-purple-500',
    },
    {
      id: 'offerMade',
      label: 'Offer made',
      icon: DollarSign,
      date: priceHistory.find((h) => h.fieldName === 'offerAmount' || h.fieldName === 'contractPrice')?.createdAt,
      amount: offerAmount,
      completed: !!offerAmount,
      color: 'bg-amber-500',
    },
    {
      id: 'underContract',
      label: 'Under contract',
      icon: CheckCircle2,
      date: deal?.contractedAt,
      amount: contractPrice,
      completed: !!deal?.contractedAt,
      color: 'bg-emerald-500',
    },
    {
      id: 'expectedProfit',
      label: 'Expected Profit',
      icon: TrendingUp,
      amount: estimatedProfit,
      completed: !!estimatedProfit,
      color: 'bg-green-600',
    },
  ];

  const fieldLabels: Record<string, string> = {
    estimatedValue: 'Estimated Value (ARV)',
    askingPrice: 'Asking Price',
    offerAmount: 'Offer Amount',
    contractPrice: 'Contract Price',
    soldPrice: 'Sold Price',
    rehabBudget: 'Rehab Budget',
    netProfit: 'Net Profit',
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
          <Clock className="w-5 h-5 text-slate-600" />
          Lead Timeline & Price History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Horizontal Timeline Stages */}
        <div className="relative mb-6">
          {/* Horizontal line connecting stages */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
          
          <div className="grid grid-cols-5 gap-2 relative z-10">
            {timelineStages.map((stage, index) => {
              const Icon = stage.icon;
              
              return (
                <div key={stage.id} className="flex flex-col items-center text-center">
                  {/* Stage marker */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 
                      ${stage.completed 
                        ? stage.color + ' text-white shadow-md' 
                        : 'bg-slate-200 text-slate-400'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Stage label */}
                  <span className={`text-xs font-medium ${stage.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                    {stage.label}
                  </span>
                  
                  {/* Date */}
                  <span className="text-xs text-slate-500 mt-0.5">
                    {stage.date ? formatDate(stage.date) : (stage.id !== 'expectedProfit' ? 'N/A' : '')}
                  </span>
                  
                  {/* Amount badge */}
                  {stage.amount !== undefined && (
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs ${
                        stage.amount
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {formatCurrency(stage.amount)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Values Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-slate-50 rounded-lg mb-4 border border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Est. Value (ARV)</p>
            <p className="font-semibold text-sm text-slate-900">{formatCurrency(customFields?.estimatedValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Asking Price</p>
            <p className="font-semibold text-sm text-slate-900">{formatCurrency(customFields?.askingPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Rehab Budget</p>
            <p className="font-semibold text-sm text-slate-900">{formatCurrency(customFields?.rehabBudget)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Contract Price</p>
            <p className="font-semibold text-sm text-slate-900">{formatCurrency(deal?.contractPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Sold Price</p>
            <p className="font-semibold text-sm text-slate-900">{formatCurrency(deal?.soldPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Net Profit</p>
            <p className={`font-semibold text-sm ${deal?.netProfit && deal.netProfit >= 0 ? 'text-emerald-600' : deal?.netProfit ? 'text-red-600' : 'text-slate-900'}`}>
              {formatCurrency(deal?.netProfit)}
            </p>
          </div>
        </div>

        {/* Price History Section */}
        <Collapsible open={showAllHistory} onOpenChange={setShowAllHistory}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Price Change History</span>
                {priceHistory.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {priceHistory.length} changes
                  </Badge>
                )}
              </div>
              {showAllHistory ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-3">
              {priceHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {priceHistory.slice(0, showAllHistory ? undefined : 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">
                          {fieldLabels[entry.fieldName] || entry.fieldName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatRelativeDate(entry.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(entry.newValue)}
                        </span>
                        {entry.oldValue !== null && (
                          <PriceChangeIndicator
                            oldValue={entry.oldValue}
                            newValue={entry.newValue}
                          />
                        )}
                      </div>
                      {entry.changedBy && (
                        <p className="text-xs text-slate-400 mt-1">
                          by {entry.changedBy.firstName} {entry.changedBy.lastName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No price history recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Price changes will appear here automatically</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default LeadTimeline;
