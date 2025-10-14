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
      className={`p-3 mb-3 border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-grab active:cursor-grabbing rounded-lg ${
        isSortableDragging ? 'opacity-50 scale-95 rotate-2' : ''
      } ${
        isDragging ? 'rotate-6 scale-110 shadow-2xl border-blue-400' : ''
      } ${
        lead.status === 'urgent' ? 'border-red-300 bg-red-50' : ''
      }`}
    >
      <div className="space-y-2">
        {/* Address with View Button */}
        <div className="flex items-start gap-2">
          <MapPin className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <h3 className="font-medium text-sm text-gray-900 leading-tight flex-1">
            {lead.address}
          </h3>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-blue-100"
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
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-green-500 flex-shrink-0" />
          <span className="text-xs text-gray-700 flex-1">{lead.sellerName}</span>
          <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
            Seller
          </Badge>
        </div>

        {/* Buyer (if exists) */}
        {lead.buyerName && (
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-purple-500 flex-shrink-0" />
            <span className="text-xs text-gray-700 flex-1">{lead.buyerName}</span>
            <Badge className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
              Buyer
            </Badge>
          </div>
        )}

        {/* Date Info Row */}
        <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Created</span>
            <span className="font-medium">{safeDateFormat(lead.dateCreated, 'MMM dd')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>In Stage</span>
            <span className="font-medium">{getTimeInStatus()}</span>
          </div>
        </div>

        {/* Status Checkboxes Row */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Checkbox 
              checked={lead.priceReduction} 
              className="h-3 w-3 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
              disabled
            />
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-medium">Price Cut</span>
              {lead.priceReduction && getPriceReductionAmount() && (
                <span className="text-xs text-yellow-800 font-bold">
                  -${getPriceReductionAmount()?.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Checkbox 
              checked={lead.clearToClose} 
              className="h-3 w-3 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              disabled
            />
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Clear to Close</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};