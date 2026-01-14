import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
} from 'lucide-react';
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

export const LeadTimeline: React.FC<LeadTimelineProps> = ({
  leadId,
  leadCreatedAt,
  deal,
  customFields,
  onRefresh,
}) => {
  // Determine timeline data from props
  const offerAmount = deal?.contractPrice;
  const contractPrice = deal?.contractPrice;
  const estimatedProfit = deal?.netProfit;

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
      date: deal?.contractedAt || null,
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

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1 mb-2">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-medium text-slate-600">Timeline</span>
      </div>
      <div className="flex items-center justify-between relative">
        <div className="absolute top-2.5 left-4 right-4 h-px bg-slate-200 z-0" />
        {timelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex flex-col items-center z-10">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${stage.completed ? stage.color + ' text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Icon className="w-2.5 h-2.5" />
              </div>
              <span className={`text-[10px] mt-0.5 ${stage.completed ? 'text-slate-700' : 'text-slate-400'}`}>{stage.label}</span>
              <span className="text-[9px] text-slate-400">{stage.date ? formatDate(stage.date) : (stage.amount ? formatCurrency(stage.amount) : 'N/A')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeadTimeline;
