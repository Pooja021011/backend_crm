import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { API_BASE } from '../config/api';
import { 
  AlertTriangle, 
  Phone, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  MapPin,
  User,
  CheckSquare,
  Filter,
  BarChart3,
  Settings
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface PipelineStage {
  id: string;
  name: string;
  orderIndex: number;
  color: string;
  leadCount: number;
}

interface PipelineLead {
  id: string;
  address: string;
  sellerName: string;
  buyerName: string;
  buyerNames: string[];
  dateCreated: string;
  timeInCurrentStatus: number;
  timeInCurrentStatusText: string;
  priceReduction: boolean;
  clearToClose: boolean;
  sold: boolean;
  totalCalls: number;
  totalBuyers: number;
  contractPrice?: number;
  soldPrice?: number;
  netProfit?: number;
  stage: string;
  stageName: string;
  stageColor: string;
  assignedAgent: string;
  assignedUserId?: string;
  leadType: string;
  needsAttention: boolean;
  attentionReason?: string;
  openTasks: number;
  overdueTasks: number;
}

interface PipelineAccess {
  canViewFull: boolean;
  canViewAssignedOnly: boolean;
  canViewTeam: boolean;
  allowedPipelines: string[];
}

interface EnhancedPipelineProps {
  pipelineKey: string;
  userRole: string;
}

export const EnhancedPipeline: React.FC<EnhancedPipelineProps> = ({ pipelineKey, userRole }) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [access, setAccess] = useState<PipelineAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters and toggles
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>('all');
  const [showTransactionPipeline, setShowTransactionPipeline] = useState(false);
  const [showDispositionsPipeline, setShowDispositionsPipeline] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadPipelineAccess();
    loadPipelineData();
  }, [pipelineKey, userRole]);

  useEffect(() => {
    loadPipelineData();
  }, [needsAttentionOnly, selectedLeadSource, showTransactionPipeline, showDispositionsPipeline]);

  const loadPipelineAccess = async () => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/access`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccess(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pipeline access",
        variant: "destructive"
      });
    }
  };

  const loadPipelineData = async () => {
    try {
      setIsLoading(true);
      
      // Load stages
      const stagesResponse = await fetch(`${API_BASE}/pipeline/${pipelineKey}/stages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      // Load leads with filters
      const params = new URLSearchParams();
      if (needsAttentionOnly) params.append('needsAttention', 'true');
      if (selectedLeadSource !== 'all') params.append('leadSourceId', selectedLeadSource);
      
      const leadsResponse = await fetch(`${API_BASE}/pipeline/${pipelineKey}/enhanced-leads?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (stagesResponse.ok && leadsResponse.ok) {
        const stagesData = await stagesResponse.json();
        const leadsData = await leadsResponse.json();
        
        setStages(stagesData.data);
        setLeads(leadsData.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pipeline data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateNeedsAttention = async () => {
    try {
      await fetch(`${API_BASE}/pipeline/update-attention`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      // Reload data after updating attention status
      await loadPipelineData();
      
      toast({
        title: "Success",
        description: "Needs attention status updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update needs attention status",
        variant: "destructive"
      });
    }
  };

  const moveLeadToStage = async (leadId: string, stageId: string) => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/leads/${leadId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ stageId })
      });

      if (response.ok) {
        await loadPipelineData();
        toast({
          title: "Success",
          description: "Lead moved successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move lead",
        variant: "destructive"
      });
    }
  };

  const toggleLeadCheckbox = async (leadId: string, field: 'priceReduction' | 'clearToClose' | 'sold', value: boolean) => {
    try {
      // This would typically call a lead update API
      const response = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        await loadPipelineData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive"
      });
    }
  };

  const getLeadsForStage = (stageId: string) => {
    return leads.filter(lead => lead.stage === stageId);
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString()}` : 'N/A';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStageColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'blue': 'bg-blue-500',
      'orange': 'bg-orange-500',
      'yellow': 'bg-yellow-500',
      'purple': 'bg-purple-500',
      'indigo': 'bg-indigo-500',
      'pink': 'bg-pink-500',
      'red': 'bg-red-500',
      'green': 'bg-green-500',
      'emerald': 'bg-emerald-500',
      'gray': 'bg-gray-500'
    };
    return colorMap[color] || 'bg-gray-500';
  };

  const renderPipelineControls = () => {
    if (!access) return null;

    return (
      <div className="flex items-center gap-4 mb-6">
        {/* Role-specific toggles */}
        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
          <div className="flex items-center space-x-2">
            <Switch
              id="transaction-pipeline"
              checked={showTransactionPipeline}
              onCheckedChange={setShowTransactionPipeline}
            />
            <label htmlFor="transaction-pipeline" className="text-sm font-medium">
              Transaction Pipeline
            </label>
          </div>
        )}

        {userRole === 'TC' && (
          <div className="flex items-center space-x-2">
            <Switch
              id="dispositions-toggle"
              checked={showDispositionsPipeline}
              onCheckedChange={setShowDispositionsPipeline}
            />
            <label htmlFor="dispositions-toggle" className="text-sm font-medium">
              Dispositions View
            </label>
          </div>
        )}

        {/* Needs Attention Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="needs-attention"
            checked={needsAttentionOnly}
            onCheckedChange={setNeedsAttentionOnly}
          />
          <label htmlFor="needs-attention" className="text-sm font-medium">
            Needs Attention
          </label>
        </div>

        {/* Lead Source Filter for ACQ */}
        {userRole === 'ACQ' && (
          <Select value={selectedLeadSource} onValueChange={setSelectedLeadSource}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="cold-call">Cold Call</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="sm" onClick={updateNeedsAttention}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Refresh Attention
        </Button>
      </div>
    );
  };

  const renderLeadCard = (lead: PipelineLead) => {
    return (
      <Card key={lead.id} className={`mb-3 ${lead.needsAttention ? 'ring-2 ring-red-500' : ''}`}>
        <CardContent className="p-4">
          {/* Address - Always bold at top */}
          <div className="font-bold text-lg mb-2">{lead.address}</div>
          
          {/* Names based on pipeline type */}
          <div className="space-y-1 mb-3">
            {(pipelineKey === 'ACQUISITIONS' || pipelineKey === 'TRANSACTION') && lead.sellerName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Seller: {lead.sellerName}</span>
              </div>
            )}
            
            {(pipelineKey === 'DISPOSITIONS' || pipelineKey === 'TRANSACTION') && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  Buyers: {lead.buyerNames.length > 0 ? lead.buyerNames.join(', ') : 'None assigned'}
                </span>
              </div>
            )}
          </div>

          {/* Date and Time Info */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created: {formatDate(lead.dateCreated)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>In Stage: {lead.timeInCurrentStatusText}</span>
            </div>
          </div>

          {/* Stage-specific checkboxes */}
          <div className="flex items-center gap-4 mb-3">
            {(pipelineKey === 'ACQUISITIONS' || pipelineKey === 'DISPOSITIONS') && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`price-reduction-${lead.id}`}
                  checked={lead.priceReduction}
                  onCheckedChange={(checked) => toggleLeadCheckbox(lead.id, 'priceReduction', !!checked)}
                />
                <label htmlFor={`price-reduction-${lead.id}`} className="text-sm">
                  Price Reduction
                </label>
              </div>
            )}

            {pipelineKey === 'TRANSACTION' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`clear-to-close-${lead.id}`}
                  checked={lead.clearToClose}
                  onCheckedChange={(checked) => toggleLeadCheckbox(lead.id, 'clearToClose', !!checked)}
                />
                <label htmlFor={`clear-to-close-${lead.id}`} className="text-sm">
                  Clear to Close
                </label>
              </div>
            )}

            {pipelineKey === 'DISPOSITIONS' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`sold-${lead.id}`}
                  checked={lead.sold}
                  onCheckedChange={(checked) => toggleLeadCheckbox(lead.id, 'sold', !!checked)}
                />
                <label htmlFor={`sold-${lead.id}`} className="text-sm">
                  Sold
                </label>
              </div>
            )}
          </div>

          {/* Counts and metrics */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            {pipelineKey === 'ACQUISITIONS' && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>Calls: {lead.totalCalls}</span>
              </div>
            )}

            {pipelineKey === 'DISPOSITIONS' && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>Buyers: {lead.totalBuyers}</span>
              </div>
            )}

            {lead.openTasks > 0 && (
              <div className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                <span>Tasks: {lead.openTasks}</span>
                {lead.overdueTasks > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1">
                    {lead.overdueTasks} overdue
                  </Badge>
                )}
              </div>
            )}

            {lead.contractPrice && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(lead.contractPrice)}</span>
              </div>
            )}
          </div>

          {/* Attention indicator */}
          {lead.needsAttention && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{lead.attentionReason}</span>
            </div>
          )}

          {/* Assigned agent */}
          <div className="text-xs text-gray-500 mt-2">
            Assigned: {lead.assignedAgent}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{pipelineKey} Pipeline</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {leads.length} Total Leads
          </Badge>
          <Badge variant="secondary">
            {leads.filter(l => l.needsAttention).length} Need Attention
          </Badge>
        </div>
      </div>

      {/* Pipeline Controls */}
      {renderPipelineControls()}

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stages.map(stage => {
          const stageLeads = getLeadsForStage(stage.id);
          
          return (
            <div key={stage.id} className="space-y-4">
              {/* Stage Header */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStageColor(stage.color)}`} />
                <h3 className="font-semibold">{stage.name}</h3>
                <Badge variant="outline">{stageLeads.length}</Badge>
              </div>

              {/* Stage Leads */}
              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map(lead => renderLeadCard(lead))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
