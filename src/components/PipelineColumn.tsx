import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineCard } from "./PipelineCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface PipelineColumnProps {
  stage: {
    id: string;
    name: string;
    color: string;
    leadCount?: number;
    orderIndex?: number;
  };
  leads: Array<{
    id: string;
    address: string;
    sellerName: string;
    buyerName?: string;
    dateCreated: Date | string;
    statusChangedDate: Date | string;
    lastContactDate?: Date | string;
    lastTouchedAt?: Date | string;
    lastActivityAt?: Date | string;
    priceReduction: boolean;
    clearToClose: boolean;
    originalPrice?: number;
    currentPrice?: number;
    stage: string;
    stageName?: string;
    assignedAgent?: string;
    leadType?: string;
    status?: string;
  }>;
  onLeadClick?: (leadId: string) => void;
}

export const PipelineColumn = ({ stage, leads, onLeadClick }: PipelineColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  const getStageColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500 text-white';
      case 'orange': return 'bg-orange-500 text-white';
      case 'green': return 'bg-green-500 text-white';
      case 'purple': return 'bg-purple-500 text-white';
      case 'red': return 'bg-red-500 text-white';
      case 'gray': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getColumnBorderClass = (color: string) => {
    switch (color) {
      case 'blue': return 'border-blue-200 bg-blue-50';
      case 'orange': return 'border-orange-200 bg-orange-50';
      case 'green': return 'border-green-200 bg-green-50';
      case 'purple': return 'border-purple-200 bg-purple-50';
      case 'red': return 'border-red-200 bg-red-50';
      case 'gray': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="w-56 min-w-[224px] flex-shrink-0 h-full">
      <Card className={`h-full max-h-[calc(100vh-200px)] flex flex-col border ${getColumnBorderClass(stage.color)}`}>
        {/* Column Header */}
        <div className="px-2 py-1.5 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700 truncate">
              {stage.name}
            </h3>
            <Badge className={`${getStageColorClass(stage.color)} text-xs px-1.5 py-0.5 rounded-full font-bold`}>
              {leads.length}
            </Badge>
          </div>
        </div>

        {/* Column Content - Scrollable */}
        <div 
          ref={setNodeRef}
          className="p-1.5 flex-1 overflow-y-auto"
        >
          <SortableContext 
            items={leads.map(lead => lead.id)} 
            strategy={verticalListSortingStrategy}
          >
            {leads.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-gray-400 text-xs border border-dashed border-gray-300 rounded bg-gray-50/50">
                No leads
              </div>
            ) : (
              <div className="space-y-1.5">
                {leads.map((lead) => (
                  <PipelineCard 
                    key={lead.id} 
                    lead={lead}
                    onViewDetails={onLeadClick ? () => onLeadClick(lead.id) : undefined}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </div>
      </Card>
    </div>
  );
};