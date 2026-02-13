import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  TrendingDown,
  CheckCircle2,
  CheckSquare,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { safeDate, safeDateFormat } from "@/utils/validation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

interface PipelineCardProps {
  lead: {
    id: string;
    address: string | { address1?: string; [key: string]: any };
    sellerName: string;
    buyerName?: string;
    dateCreated: Date | string;
    statusChangedDate: Date | string;
    lastContactDate?: Date | string;
    lastTouchedAt?: Date | string;
    lastActivityAt?: Date | string;
    lastAttemptedContactAt?: Date | string | null;
    priceReduction: boolean;
    clearToClose: boolean;
    originalPrice?: number;
    currentPrice?: number;
    stage: string;
    stageName?: string;
    assignedAgent?: string;
    leadType?: string;
    status?: string;
    openTasks?: number;
    openTasksMine?: number;
    stagePipelineKey?: string;
  };
  isDragging?: boolean;
  onViewDetails?: () => void;
  currentPipeline?: string;
  isLastTouchedFilterActive?: boolean;
  isLeadCreatedFilterActive?: boolean;
}

export const PipelineCard = ({ lead, isDragging, onViewDetails, currentPipeline, isLastTouchedFilterActive, isLeadCreatedFilterActive }: PipelineCardProps) => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const canShowTransactionFlags = userRoles.includes('ADMIN') || userRoles.includes('MANAGER') || userRoles.includes('EXECUTIVE') || userRoles.includes('DISP') || userRoles.includes('TC');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ 
    id: lead.id
  });

  const wasDraggingRef = useRef(false);
  useEffect(() => {
    if (isSortableDragging) wasDraggingRef.current = true;
  }, [isSortableDragging]);

  const style = isSortableDragging ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  const getTimeSinceLastActivity = () => {
    try {
      // STRICT: last attempted contact only. If no attempt yet, show 0 Minutes.
      if (!lead.lastAttemptedContactAt) return '0 Seconds';
      const lastAt = safeDate(lead.lastAttemptedContactAt);
      const now = new Date();
      const totalSeconds = Math.max(0, Math.floor((now.getTime() - lastAt.getTime()) / 1000));

      if (totalSeconds < 60) {
        return `${totalSeconds} Second${totalSeconds === 1 ? '' : 's'}`;
      }

      const totalMinutes = Math.floor(totalSeconds / 60);

      const days = Math.floor(totalMinutes / (60 * 24));
      if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours === 0) return `${minutes} Minute${minutes === 1 ? '' : 's'}`;
      if (minutes === 0) return `${hours} Hour${hours === 1 ? '' : 's'}`;
      return `${hours} Hour${hours === 1 ? '' : 's'} ${minutes} Minute${minutes === 1 ? '' : 's'}`;
    } catch (error) {
      console.warn('Error calculating time since last activity:', error);
      return '0 Seconds';
    }
  };

  const getActivityAgingClass = () => {
    try {
      if (!lead.lastAttemptedContactAt) return "text-gray-500";
      const lastAt = safeDate(lead.lastAttemptedContactAt);
      const now = new Date();
      const totalSeconds = Math.max(0, Math.floor((now.getTime() - lastAt.getTime()) / 1000));
      const hours = totalSeconds / 3600;
      if (hours >= 48) return "text-red-600";
      if (hours >= 24) return "text-yellow-600";
      return "text-gray-500";
    } catch {
      return "text-gray-500";
    }
  };

  const getPriceReductionAmount = () => {
    if (!lead.originalPrice || !lead.currentPrice) return null;
    return lead.originalPrice - lead.currentPrice;
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (wasDraggingRef.current) {
          wasDraggingRef.current = false;
          return;
        }
        onViewDetails?.();
      }}
      className={`p-2 mb-1.5 border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-150 cursor-pointer rounded ${
        isSortableDragging ? 'opacity-50 scale-95 rotate-1' : ''
      } ${
        isDragging ? 'rotate-3 scale-105 shadow-xl border-blue-400' : ''
      } ${
        lead.status === 'urgent' ? 'border-red-300 bg-red-50' : ''
      }`}
    >
      <div className="space-y-1">
        {/* Address with View Button */}
        <div className="flex items-start gap-1">
          <MapPin className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <h3 className="font-medium text-[13px] text-gray-900 leading-tight flex-1 line-clamp-1">
            {typeof lead.address === 'string' 
              ? lead.address 
              : lead.address?.address1 || 'No Address'}
          </h3>
        </div>

        {/* Seller + Open Tasks */}
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-green-500 flex-shrink-0" />
          <span className="text-[12px] text-gray-600 flex-1 truncate">{lead.sellerName}</span>
          <Badge className="bg-slate-100 text-slate-700 text-[11px] px-1.5 py-0 rounded flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />
            <span className="tabular-nums">
              {(lead.openTasksMine ?? 0)}/{(lead.openTasks ?? 0)}
            </span>
          </Badge>
        </div>

        {/* Date & Stage Info */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 border-t border-gray-100">
          <div className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            <span>
              {isLeadCreatedFilterActive
                ? (lead.dateCreated ? safeDateFormat(lead.dateCreated, 'MMM dd') : 'N/A')
                : isLastTouchedFilterActive 
                  ? (lead.lastTouchedAt ? safeDateFormat(lead.lastTouchedAt, 'MMM dd') : 'N/A')
                  : safeDateFormat(lead.lastTouchedAt || lead.lastContactDate || lead.dateCreated, 'MMM dd')
              }
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className={`w-2.5 h-2.5 ${getActivityAgingClass()}`} />
            <span className={getActivityAgingClass()}>{getTimeSinceLastActivity()}</span>
          </div>
        </div>

        {/* Status Indicators - show when lead is currently in Dispositions pipeline stages */}
        {canShowTransactionFlags &&
          ((lead.stagePipelineKey || currentPipeline || '').toUpperCase() === 'DISPOSITIONS') && (
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex items-center gap-0.5">
              <Checkbox 
                checked={lead.priceReduction} 
                className="h-3 w-3 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                disabled
              />
              <TrendingDown className="w-2.5 h-2.5 text-yellow-600" />
              <span className="text-[11px] text-yellow-700">Price Cut</span>
            </div>
            
            <div className="flex items-center gap-0.5">
              <Checkbox 
                checked={lead.clearToClose} 
                className="h-3 w-3 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                disabled
              />
              <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
              <span className="text-[11px] text-green-700">Clear to Close</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};