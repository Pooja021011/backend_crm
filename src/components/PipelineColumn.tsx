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
  };
  leads: Array<{
    id: string;
    address: string;
    sellerName: string;
    buyerName?: string;
    dateCreated: Date;
    statusChangedDate: Date;
    priceReduction: boolean;
    clearToClose: boolean;
    originalPrice?: number;
    currentPrice?: number;
    stage: string;
  }>;
}

export const PipelineColumn = ({ stage, leads }: PipelineColumnProps) => {
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
    <div className="w-full min-w-[280px]">
      <Card className={`h-fit min-h-[400px] flex flex-col border ${getColumnBorderClass(stage.color)}`}>
        {/* Column Header */}
        <div className="p-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700">
              {stage.name}
            </h3>
            <Badge className={`${getStageColorClass(stage.color)} text-xs px-2 py-1 rounded-full font-bold`}>
              {leads.length}
            </Badge>
          </div>
        </div>

        {/* Column Content */}
        <div 
          ref={setNodeRef}
          className="p-2 flex-1 overflow-y-auto min-h-[300px]"
        >
          <SortableContext 
            items={leads.map(lead => lead.id)} 
            strategy={verticalListSortingStrategy}
          >
            {leads.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                Drop leads here
              </div>
            ) : (
              leads.map((lead) => (
                <PipelineCard 
                  key={lead.id} 
                  lead={lead}
                />
              ))
            )}
          </SortableContext>
        </div>
      </Card>
    </div>
  );
};