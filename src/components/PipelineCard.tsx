import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  TrendingDown,
  CheckCircle2,
  Eye
} from "lucide-react";
import { differenceInDays, differenceInHours } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { safeDate, safeDateFormat } from "@/utils/validation";

interface PipelineCardProps {
  lead: {
    id: string;
    address: string;
    sellerName: string;
    buyerName?: string;
    dateCreated: Date | string;
    statusChangedDate: Date | string;
    lastContactDate?: Date | string;
    priceReduction: boolean;
    clearToClose: boolean;
    originalPrice?: number;
    currentPrice?: number;
    stage: string;
    stageName?: string;
    assignedAgent?: string;
    leadType?: string;
    status?: string;
  };
  isDragging?: boolean;
  onViewDetails?: () => void;
}

export const PipelineCard = ({ lead, isDragging, onViewDetails }: PipelineCardProps) => {
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

  const style = isSortableDragging ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  const getTimeInStatus = () => {
    try {
      const statusDate = safeDate(lead.statusChangedDate);
      const now = new Date();
      
      const hours = differenceInHours(now, statusDate);
      const days = differenceInDays(now, statusDate);
      
      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}`;
      } else {
        return `${Math.max(0, hours)} hour${hours !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.warn('Error calculating time in status:', error);
      return '0 hours';
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
      className={`p-2 mb-1.5 border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-150 cursor-grab active:cursor-grabbing rounded ${
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
            {lead.address}
          </h3>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-blue-100"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <Eye className="h-3 w-3 text-blue-600" />
            </Button>
          )}
        </div>

        {/* Seller */}
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-green-500 flex-shrink-0" />
          <span className="text-[12px] text-gray-600 flex-1 truncate">{lead.sellerName}</span>
          <Badge className="bg-green-100 text-green-700 text-[11px] px-1.5 py-0 rounded">
            Seller
          </Badge>
        </div>

        {/* Date & Stage Info */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 border-t border-gray-100">
          <div className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            <span>{safeDateFormat(lead.statusChangedDate, 'MMM dd')}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            <span>{getTimeInStatus()}</span>
          </div>
        </div>

        {/* Status Indicators */}
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
      </div>
    </Card>
  );
};