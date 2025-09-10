import { useState } from "react";
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
  Plus
} from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { differenceInHours, isToday, addDays } from "date-fns";

const Pipeline = () => {
  const [needsAttentionView, setNeedsAttentionView] = useState(false);
  const [transactionPipelineView, setTransactionPipelineView] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Pipeline stages configuration - exactly as specified
  const pipelineStages = [
    { id: 'new-lead', name: 'New Lead', color: 'blue' },
    { id: 'no-contact', name: 'No Contact Made', color: 'gray' },
    { id: 'contact-made', name: 'Contact Made', color: 'orange' },
    { id: 'appointment-set', name: 'Appointment Set', color: 'purple' },
    { id: 'appointment-complete', name: 'Appointment Complete', color: 'blue' },
    { id: 'due-diligence', name: 'Due Diligence Complete', color: 'orange' },
    { id: 'offer-made', name: 'Offer Made', color: 'purple' },
    { id: 'contract-sent', name: 'Contract Sent', color: 'orange' },
    { id: 'under-contract', name: 'Under Contract', color: 'green' },
    { id: 'processing', name: 'Processing', color: 'blue' },
    { id: 'for-sale', name: 'For Sale', color: 'purple' },
    { id: 'under-contract-sale', name: 'Under Contract (Sale)', color: 'green' },
    { id: 'closed', name: 'Closed', color: 'green' }
  ];

  // Sample leads data with proper dates and contact tracking
  const [leads, setLeads] = useState([
    {
      id: '1',
      address: '789 Pine Boulevard, Winston-Salem, NC',
      sellerName: 'Emily Davis',
      buyerName: '',
      dateCreated: new Date('2024-01-12'),
      statusChangedDate: new Date('2024-01-12'),
      lastContactDate: new Date('2024-01-12'),
      priceReduction: false,
      clearToClose: false,
      originalPrice: 275000,
      currentPrice: 275000,
      stage: 'new-lead',
      dueDiligenceEndDate: addDays(new Date(), 1),
      closingDate: null,
      assignedAgent: 'Mike Wilson'
    },
    {
      id: '2',
      address: '123 Oak Street, Charlotte, NC',
      sellerName: 'Sarah Johnson',
      buyerName: '',
      dateCreated: new Date('2024-01-15'),
      statusChangedDate: new Date('2024-01-20'),
      lastContactDate: new Date('2024-01-18'),
      priceReduction: true,
      clearToClose: false,
      originalPrice: 350000,
      currentPrice: 325000,
      stage: 'contact-made',
      dueDiligenceEndDate: addDays(new Date(), 2),
      closingDate: null,
      assignedAgent: 'John Smith'
    },
    {
      id: '3',
      address: '321 Elm Court, Greensboro, NC',
      sellerName: 'Michael Johnson',
      buyerName: '',
      dateCreated: new Date('2024-01-08'),
      statusChangedDate: new Date('2024-01-22'),
      lastContactDate: new Date('2024-01-20'),
      priceReduction: false,
      clearToClose: false,
      originalPrice: 425000,
      currentPrice: 425000,
      stage: 'appointment-set',
      dueDiligenceEndDate: addDays(new Date(), 10),
      closingDate: null,
      assignedAgent: 'Sarah Lee'
    },
    {
      id: '4',
      address: '456 Maple Avenue, Raleigh, NC',
      sellerName: 'Robert Thompson',
      buyerName: 'Jennifer Martinez',
      dateCreated: new Date('2024-01-10'),
      statusChangedDate: new Date('2024-01-25'),
      lastContactDate: new Date('2024-01-24'),
      priceReduction: false,
      clearToClose: true,
      originalPrice: 475000,
      currentPrice: 475000,
      stage: 'under-contract',
      dueDiligenceEndDate: new Date('2024-01-28'),
      closingDate: new Date(),
      assignedAgent: 'Jane Doe'
    },
    {
      id: '5',
      address: '567 Cedar Drive, Fayetteville, NC',
      sellerName: 'Lisa Rodriguez',
      buyerName: 'David Chen',
      dateCreated: new Date('2024-01-05'),
      statusChangedDate: new Date('2024-01-23'),
      lastContactDate: new Date('2024-01-23'),
      priceReduction: true,
      clearToClose: true,
      originalPrice: 395000,
      currentPrice: 385000,
      stage: 'processing',
      dueDiligenceEndDate: new Date('2024-01-20'),
      closingDate: addDays(new Date(), 5),
      assignedAgent: 'Tom Anderson'
    }
  ]);

  // Filter leads based on "Needs Attention" criteria
  const getNeedsAttentionLeads = () => {
    return leads.filter(lead => {
      const hoursSinceLastContact = differenceInHours(new Date(), lead.lastContactDate);
      const dueDiligenceDaysLeft = lead.dueDiligenceEndDate ? 
        Math.ceil((lead.dueDiligenceEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
        999;
      const isClosingToday = lead.closingDate && isToday(lead.closingDate);

      return (
        hoursSinceLastContact >= 72 || // No contact in 72 hours
        dueDiligenceDaysLeft <= 1 || // 1 day or less due diligence left
        isClosingToday // Closing today
      );
    });
  };

  const getLeadsForStage = (stageId: string) => {
    const currentLeads = needsAttentionView ? getNeedsAttentionLeads() : leads;
    return currentLeads.filter(lead => lead.stage === stageId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;

    setLeads(currentLeads => 
      currentLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, stage: newStage, statusChangedDate: new Date() }
          : lead
      )
    );
    
    setActiveId(null);
  };

  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;
  const needsAttentionCount = getNeedsAttentionLeads().length;

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

      {/* Pipeline Board - Horizontal Scrolling Grid */}
      {transactionPipelineView && (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
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
      {needsAttentionView && needsAttentionCount > 0 && (
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
                <p>• Leads with 1 day or less due diligence remaining</p>
                <p>• Leads closing today</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Pipeline;