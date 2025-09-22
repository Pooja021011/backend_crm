import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PipelineColumn } from "@/components/PipelineColumn";
import { PipelineCard } from "@/components/PipelineCard";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText,
  AlertTriangle,
  Workflow,
  Filter,
  Plus,
  Loader2
} from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { differenceInHours, isToday, addDays } from "date-fns";
import { API_BASE, makeApiCall } from "@/config/api";
import { useToast } from "@/hooks/use-toast";

const Pipeline = () => {
  const { toast } = useToast();
  const [needsAttentionView, setNeedsAttentionView] = useState(false);
  const [transactionPipelineView, setTransactionPipelineView] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // API state
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingLead, setMovingLead] = useState(false);
  
  // Pipeline configuration - using ACQUISITIONS pipeline by default
  const currentPipeline = 'ACQUISITIONS';

  // API functions
  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      
      // Fetch pipeline stages and leads in parallel
      const [stagesResponse, leadsResponse] = await Promise.all([
        makeApiCall(`${API_BASE}/pipeline/${currentPipeline}/stages`),
        makeApiCall(`${API_BASE}/pipeline/${currentPipeline}/leads${needsAttentionView ? '?needsAttention=true' : ''}`)
      ]);

      if (stagesResponse.ok && leadsResponse.ok) {
        const stagesData = await stagesResponse.json();
        const leadsData = await leadsResponse.json();

        if (stagesData.success && leadsData.success) {
          // Map stages to include colors for UI
          const stagesWithColors = stagesData.data.map((stage: any, index: number) => ({
            ...stage,
            color: getStageColor(stage.name, index)
          }));

          setPipelineStages(stagesWithColors);
          setLeads(leadsData.data);
        } else {
          throw new Error('Failed to fetch pipeline data');
        }
      } else {
        throw new Error('Failed to fetch pipeline data');
      }
    } catch (error: any) {
      console.error('Error fetching pipeline data:', error);
      toast({
        title: "Error",
        description: "Failed to load pipeline data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to assign colors to stages
  const getStageColor = (stageName: string, index: number) => {
    const colors = ['blue', 'gray', 'orange', 'purple', 'blue', 'orange', 'purple', 'orange', 'green'];
    if (stageName.toLowerCase().includes('closed') || stageName.toLowerCase().includes('complete')) {
      return 'green';
    }
    if (stageName.toLowerCase().includes('contract') || stageName.toLowerCase().includes('under')) {
      return 'green';
    }
    if (stageName.toLowerCase().includes('contact') || stageName.toLowerCase().includes('made')) {
      return 'orange';
    }
    if (stageName.toLowerCase().includes('appointment') || stageName.toLowerCase().includes('set')) {
      return 'purple';
    }
    return colors[index % colors.length];
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchPipelineData();
  }, [needsAttentionView]);

  const getLeadsForStage = (stageId: string) => {
    return leads.filter(lead => lead.stage === stageId);
  };

  const getNeedsAttentionCount = () => {
    return leads.filter(lead => {
      const hoursSinceLastContact = differenceInHours(new Date(), new Date(lead.lastContactDate));
      return hoursSinceLastContact >= 72 || lead.status === 'urgent';
    }).length;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || movingLead) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Find the lead and check if it's actually moving to a different stage
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStageId) {
      setActiveId(null);
      return;
    }

    try {
      setMovingLead(true);

      // Optimistically update the UI
      setLeads(currentLeads => 
        currentLeads.map(l => 
          l.id === leadId 
            ? { ...l, stage: newStageId, statusChangedDate: new Date() }
            : l
        )
      );

      // Make API call to move the lead
      const response = await makeApiCall(`${API_BASE}/pipeline/leads/${leadId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ stageId: newStageId })
      });

      if (!response.ok) {
        throw new Error('Failed to move lead');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to move lead');
      }

      toast({
        title: "Lead Moved",
        description: `Lead successfully moved to ${result.data.newStageName}`,
      });

    } catch (error: any) {
      console.error('Error moving lead:', error);
      
      // Revert the optimistic update
      setLeads(currentLeads => 
        currentLeads.map(l => 
          l.id === leadId 
            ? { ...l, stage: lead.stage, statusChangedDate: lead.statusChangedDate }
            : l
        )
      );

      toast({
        title: "Error",
        description: error.message || "Failed to move lead. Please try again.",
        variant: "destructive"
      });
    } finally {
      setMovingLead(false);
      setActiveId(null);
    }
  };

  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;
  const needsAttentionCount = getNeedsAttentionCount();

  return (
    <div className="space-y-6">
      {/* Header matching reference design */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-sm text-gray-600">Track and manage deals through your sales pipeline</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Needs Attention Toggle */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <Label htmlFor="needs-attention" className="text-sm font-medium text-gray-700">
              Needs Attention
            </Label>
            <Switch
              id="needs-attention"
              checked={needsAttentionView}
              onCheckedChange={setNeedsAttentionView}
              className="data-[state=checked]:bg-orange-500"
            />
            {needsAttentionCount > 0 && (
              <Badge className="bg-orange-500 text-white text-xs">
                {needsAttentionCount}
              </Badge>
            )}
          </div>

          {/* Transaction Pipeline Toggle */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <Workflow className="w-4 h-4 text-blue-500" />
            <Label htmlFor="transaction-pipeline" className="text-sm font-medium text-gray-700">
              Transaction Pipeline
            </Label>
            <Switch
              id="transaction-pipeline"
              checked={transactionPipelineView}
              onCheckedChange={setTransactionPipelineView}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" />
              Add Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center border border-gray-200 bg-gray-50">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Loading Pipeline Data
          </h3>
          <p className="text-gray-600">
            Fetching leads and pipeline stages...
          </p>
        </Card>
      )}

      {/* Pipeline Board - Horizontal Scrolling Grid */}
      {!loading && transactionPipelineView && (
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[snapCenterToCursor]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="pipeline-container overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {pipelineStages.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  leads={getLeadsForStage(stage.id)}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeLead ? (
              <PipelineCard lead={activeLead} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Alternative view when transaction pipeline is off */}
      {!transactionPipelineView && (
        <Card className="p-12 text-center border border-gray-200 bg-gray-50">
          <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Transaction Pipeline View Disabled
          </h3>
          <p className="text-gray-600">
            Enable "Transaction Pipeline" toggle to view the kanban board
          </p>
        </Card>
      )}

      {/* Needs Attention Summary */}
      {!loading && needsAttentionView && needsAttentionCount > 0 && (
        <Card className="p-6 bg-orange-50 border border-orange-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                {needsAttentionCount} Lead{needsAttentionCount > 1 ? 's' : ''} Need Immediate Attention
              </h3>
              <div className="text-sm text-orange-800 space-y-1">
                <p>• Leads with no contact in 72+ hours</p>
                <p>• Leads with urgent status</p>
                <p>• Leads requiring immediate follow-up</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state when no leads need attention */}
      {!loading && needsAttentionView && needsAttentionCount === 0 && (
        <Card className="p-12 text-center border border-green-200 bg-green-50">
          <AlertTriangle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-green-700">
            No leads currently need immediate attention.
          </p>
        </Card>
      )}
    </div>
  );
};

export default Pipeline;