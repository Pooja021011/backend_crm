import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PipelineColumn } from "@/components/PipelineColumn";
import { PipelineCard } from "@/components/PipelineCard";
import { ViewLeadDialog } from "@/components/ViewLeadDialog";
import { 
  AppointmentCompletePopup,
  DueDiligencePopup,
  OfferMadePopup
} from "@/components/StageTransitionPopups";
import { 
  Users, 
  AlertTriangle,
  Workflow,
  Loader2,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { differenceInHours, isToday, addDays } from "date-fns";
import { API_BASE, makeApiCall } from "@/config/api";
import { safeDate } from "@/utils/validation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineNav } from "@/contexts/PipelineNavContext";

const Pipeline = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setFromPipelineView } = usePipelineNav();
  const [needsAttentionView, setNeedsAttentionView] = useState(false);
  const [transactionPipelineView, setTransactionPipelineView] = useState(false);
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>('all');
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pipelineAccess, setPipelineAccess] = useState<any>(null);
  const [currentPipeline, setCurrentPipeline] = useState<string>('ACQUISITIONS');
  
  // API state
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);

  // Admin/Manager filters (applied to pipeline)
  const isAdminOrManager = user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  // Applied filters (used in API calls and useEffect)
  const [appliedCreatedFrom, setAppliedCreatedFrom] = useState<string>('');
  const [appliedCreatedTo, setAppliedCreatedTo] = useState<string>('');
  const [appliedLastTouchedFrom, setAppliedLastTouchedFrom] = useState<string>('');
  const [appliedLastTouchedTo, setAppliedLastTouchedTo] = useState<string>('');
  const [appliedAcqAgentId, setAppliedAcqAgentId] = useState<string>('all');
  const [appliedDispAgentId, setAppliedDispAgentId] = useState<string>('all');

  // Draft filters (temporary, used in dialog before applying)
  const [draftCreatedFrom, setDraftCreatedFrom] = useState<string>('');
  const [draftCreatedTo, setDraftCreatedTo] = useState<string>('');
  const [draftLastTouchedFrom, setDraftLastTouchedFrom] = useState<string>('');
  const [draftLastTouchedTo, setDraftLastTouchedTo] = useState<string>('');
  const [draftAcqAgentId, setDraftAcqAgentId] = useState<string>('all');
  const [draftDispAgentId, setDraftDispAgentId] = useState<string>('all');
  
  // ViewLeadDialog state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Stage transition validation popups
  const [showAppointmentPopup, setShowAppointmentPopup] = useState(false);
  const [showDueDiligencePopup, setShowDueDiligencePopup] = useState(false);
  const [showOfferMadePopup, setShowOfferMadePopup] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<{
    leadId: string;
    newStageId: string;
    stageName: string;
    leadToMove: any;
  } | null>(null);

  // Drag behavior: long-press to drag (so click opens lead reliably)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 4,
      },
    })
  );

  // Sample data - replace with API calls
  const sampleStages = [
    { id: "new-lead", name: "New Lead", color: "blue", orderIndex: 0 },
    { id: "contacted", name: "Contact Made", color: "orange", orderIndex: 1 },
    { id: "appointment", name: "Appointment Set", color: "purple", orderIndex: 2 },
    { id: "under-contract", name: "Under Contract", color: "green", orderIndex: 3 },
    { id: "closed", name: "Closed", color: "gray", orderIndex: 4 }
  ];

  const sampleLeads = [
    {
      id: "1",
      address: "123 Main St, Charlotte, NC",
      sellerName: "John Doe",
      dateCreated: new Date().toISOString(),
      statusChangedDate: new Date().toISOString(),
      lastContactDate: new Date().toISOString(),
      priceReduction: false,
      clearToClose: false,
      originalPrice: 150000,
      currentPrice: 145000,
      stage: "new-lead",
      assignedAgent: "Agent Smith",
      leadType: "SELLER",
      status: "active"
    },
    {
      id: "2", 
      address: "456 Oak Ave, Raleigh, NC",
      sellerName: "Jane Smith",
      dateCreated: new Date().toISOString(),
      statusChangedDate: new Date().toISOString(),
      lastContactDate: new Date().toISOString(),
      priceReduction: true,
      clearToClose: true,
      originalPrice: 200000,
      currentPrice: 185000,
      stage: "contacted",
      assignedAgent: "Agent Johnson",
      leadType: "SELLER", 
      status: "active"
    },
    {
      id: "3",
      address: "789 Pine Rd, Durham, NC",
      sellerName: "Mike Johnson",
      dateCreated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedDate: new Date().toISOString(),
      lastContactDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      priceReduction: false,
      clearToClose: false,
      originalPrice: 180000,
      currentPrice: 180000,
      stage: "appointment",
      assignedAgent: "Agent Davis",
      leadType: "SELLER",
      status: "active"
    },
    {
      id: "4",
      address: "321 Elm St, Greensboro, NC",
      sellerName: "Sarah Wilson",
      dateCreated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastContactDate: new Date().toISOString(),
      priceReduction: false,
      clearToClose: true,
      originalPrice: 220000,
      currentPrice: 210000,
      stage: "under-contract",
      assignedAgent: "Agent Brown",
      leadType: "SELLER",
      status: "active"
    },
    {
      id: "5",
      address: "654 Maple Dr, Winston-Salem, NC",
      sellerName: "Tom Anderson",
      dateCreated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastContactDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      priceReduction: true,
      clearToClose: false,
      originalPrice: 175000,
      currentPrice: 165000,
      stage: "closed",
      assignedAgent: "Agent Smith",
      leadType: "SELLER",
      status: "active"
    },
    {
      id: "6",
      address: "987 Cedar Ln, Asheville, NC",
      sellerName: "Lisa Garcia",
      dateCreated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedDate: new Date().toISOString(),
      lastContactDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      priceReduction: false,
      clearToClose: false,
      originalPrice: 195000,
      currentPrice: 195000,
      stage: "new-lead",
      assignedAgent: "Agent Johnson",
      leadType: "SELLER",
      status: "urgent"
    },
    {
      id: "7",
      address: "147 Birch Ave, Fayetteville, NC",
      sellerName: "David Lee",
      dateCreated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastContactDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      priceReduction: false,
      clearToClose: false,
      originalPrice: 160000,
      currentPrice: 160000,
      stage: "contacted",
      assignedAgent: "Agent Davis",
      leadType: "SELLER",
      status: "active"
    },
    {
      id: "8",
      address: "258 Willow St, Wilmington, NC",
      sellerName: "Jennifer Taylor",
      dateCreated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      statusChangedDate: new Date().toISOString(),
      lastContactDate: new Date().toISOString(),
      priceReduction: true,
      clearToClose: false,
      originalPrice: 240000,
      currentPrice: 225000,
      stage: "appointment",
      assignedAgent: "Agent Brown",
      leadType: "SELLER",
      status: "active"
    }
  ];

  useEffect(() => {
    const initializePipeline = async () => {
      const accessData = await loadPipelineAccess(); // Wait for access to load first
      loadLeadSources();
      if (isAdminOrManager) {
        loadAgents();
      }
      // Pass the pipeline key directly to avoid state timing issues
      if (accessData?.allowedPipelines?.[0]) {
        loadPipelineData(accessData.allowedPipelines[0]);
      }
    };
    initializePipeline();
  }, []);

  useEffect(() => {
    // Only load data if we have pipeline access loaded
    if (pipelineAccess) {
      loadPipelineData();
    }
  }, [transactionPipelineView, needsAttentionView, selectedLeadSource, currentPipeline, pipelineAccess, appliedCreatedFrom, appliedCreatedTo, appliedLastTouchedFrom, appliedLastTouchedTo, appliedAcqAgentId, appliedDispAgentId]);

  // Sync draft values from applied values when dialog opens
  useEffect(() => {
    if (isFilterOpen) {
      setDraftCreatedFrom(appliedCreatedFrom);
      setDraftCreatedTo(appliedCreatedTo);
      setDraftLastTouchedFrom(appliedLastTouchedFrom);
      setDraftLastTouchedTo(appliedLastTouchedTo);
      setDraftAcqAgentId(appliedAcqAgentId);
      setDraftDispAgentId(appliedDispAgentId);
    }
  }, [isFilterOpen, appliedCreatedFrom, appliedCreatedTo, appliedLastTouchedFrom, appliedLastTouchedTo, appliedAcqAgentId, appliedDispAgentId]);

  const loadPipelineAccess = async () => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/access`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const access = data.data;
        console.log('📊 Pipeline Access:', access);
        setPipelineAccess(access);
        
        // Set the current pipeline based on user's role
        if (access?.allowedPipelines && access.allowedPipelines.length > 0) {
          const firstPipeline = access.allowedPipelines[0];
          console.log('📊 Setting current pipeline to:', firstPipeline);
          setCurrentPipeline(firstPipeline);
        }
        
        return access; // Return access data for immediate use
      }
    } catch (error) {
      console.error('Failed to load pipeline access:', error);
    }
    return null;
  };

  const loadLeadSources = async () => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/lead-sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeadSources(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load lead sources:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadPipelineData = async (overridePipeline?: string) => {
    try {
      setLoading(true);
      
      // Real API calls enabled
      
      // Check user permissions first
      if (!user?.roles?.includes('ADMIN') && !user?.roles?.includes('MANAGER') && 
          !user?.roles?.includes('ACQ') && !user?.roles?.includes('DISP') && 
          !user?.roles?.includes('TC')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view the pipeline",
          variant: "destructive"
        });
        return;
      }

      // Determine which pipeline(s) to load based on role
      const isAdminOrManager = user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER');
      const isAcqOnly = user?.roles?.includes('ACQ') && !isAdminOrManager;
      const isDispOnly = user?.roles?.includes('DISP') && !isAdminOrManager;
      
      let pipelineKey = overridePipeline || currentPipeline;
      
      // Transaction pipeline toggle (if available)
      if (transactionPipelineView && pipelineAccess?.allowedPipelines?.includes('TRANSACTION')) {
        pipelineKey = 'TRANSACTION';
      }

      console.log('📊 Loading pipeline for user roles:', user?.roles);
      console.log('📊 isAdminOrManager:', isAdminOrManager, 'isAcqOnly:', isAcqOnly, 'isDispOnly:', isDispOnly);

      // Load pipeline stages based on role
      let allStages: any[] = [];
      
      if (transactionPipelineView && pipelineAccess?.allowedPipelines?.includes('TRANSACTION')) {
        // Load Transaction pipeline
        const stagesResponse = await makeApiCall(`${API_BASE}/pipeline/TRANSACTION/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          allStages = stagesData.data || [];
        }
      } else if (isAdminOrManager) {
        // Admin & Manager: Load both Acquisitions + Dispositions stages
        console.log('📊 Loading combined Acquisitions + Dispositions pipeline');
        
        const [acqResponse, dispResponse] = await Promise.all([
          makeApiCall(`${API_BASE}/pipeline/ACQUISITIONS/stages`),
          makeApiCall(`${API_BASE}/pipeline/DISPOSITIONS/stages`)
        ]);
        
        let acqStages: any[] = [];
        let dispStages: any[] = [];
        
        if (acqResponse.ok) {
          const acqData = await acqResponse.json();
          acqStages = acqData.data || [];
        }
        
        if (dispResponse.ok) {
          const dispData = await dispResponse.json();
          dispStages = dispData.data || [];
        }
        
        // Combine stages with explicit grouping:
        // show ALL Acquisitions stages first (sorted), then append ALL Dispositions stages (sorted)
        const acqSorted = [...acqStages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        const dispSorted = [...dispStages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        allStages = [...acqSorted, ...dispSorted];
        console.log('📊 Combined stages:', allStages.length, 'stages');
      } else if (isAcqOnly) {
        // ACQ users: Only Acquisitions pipeline
        console.log('📊 Loading Acquisitions pipeline only');
        const stagesResponse = await makeApiCall(`${API_BASE}/pipeline/ACQUISITIONS/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          allStages = stagesData.data || [];
        }
      } else if (isDispOnly) {
        // DISP users: Only Dispositions pipeline
        console.log('📊 Loading Dispositions pipeline only');
        const stagesResponse = await makeApiCall(`${API_BASE}/pipeline/DISPOSITIONS/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          allStages = stagesData.data || [];
        }
      }
      
      console.log('📊 Final stages:', allStages.length, 'stages');
      console.log('📊 Stage names:', allStages.map((s: any) => s.name));
      setPipelineStages(allStages.length > 0 ? allStages : sampleStages);

      // Load pipeline leads with role-based filtering
      const filters = new URLSearchParams();
      if (needsAttentionView) filters.append('needsAttention', 'true');
      
      // Apply role-based filtering
      if (pipelineAccess?.canViewAssignedOnly) {
        // ACQ, DISP agents see only their assigned leads
        filters.append('assignedUserId', user?.id || '');
      }
      
      // Apply lead source filter if applicable
      if (selectedLeadSource !== 'all') {
        filters.append('leadSourceId', selectedLeadSource);
      }

      // Admin/Manager filters
      if (isAdminOrManager) {
        if (appliedCreatedFrom) filters.append('createdFrom', appliedCreatedFrom);
        if (appliedCreatedTo) filters.append('createdTo', appliedCreatedTo);
        if (appliedLastTouchedFrom) filters.append('lastTouchedFrom', appliedLastTouchedFrom);
        if (appliedLastTouchedTo) filters.append('lastTouchedTo', appliedLastTouchedTo);
        if (appliedAcqAgentId && appliedAcqAgentId !== 'all') filters.append('assignedUserId', appliedAcqAgentId);
        if (appliedDispAgentId && appliedDispAgentId !== 'all') filters.append('dispAgentId', appliedDispAgentId);
      }

      // Load leads based on role
      let leadsResponse;
      let allLeadsData: any[] = [];
      
      if (transactionPipelineView && pipelineAccess?.allowedPipelines?.includes('TRANSACTION')) {
        // Load Transaction pipeline leads
        leadsResponse = await makeApiCall(`${API_BASE}/pipeline/TRANSACTION/enhanced-leads?${filters}`);
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          allLeadsData = leadsData.data || [];
        }
      } else if (isAdminOrManager) {
        // Admin & Manager: Load leads from both pipelines
        console.log('📊 Loading leads from both Acquisitions + Dispositions');
        
        const [acqLeadsResponse, dispLeadsResponse] = await Promise.all([
          makeApiCall(`${API_BASE}/pipeline/ACQUISITIONS/enhanced-leads?${filters}`),
          makeApiCall(`${API_BASE}/pipeline/DISPOSITIONS/enhanced-leads?${filters}`)
        ]);
        
        let acqLeads: any[] = [];
        let dispLeads: any[] = [];
        
        if (acqLeadsResponse.ok) {
          const acqData = await acqLeadsResponse.json();
          acqLeads = acqData.data || [];
        }
        
        if (dispLeadsResponse.ok) {
          const dispData = await dispLeadsResponse.json();
          dispLeads = dispData.data || [];
        }
        
        allLeadsData = [...acqLeads, ...dispLeads];
        console.log('📊 Combined leads:', allLeadsData.length, 'leads');
      } else if (isAcqOnly) {
        // ACQ users: Only Acquisitions leads
        leadsResponse = await makeApiCall(`${API_BASE}/pipeline/ACQUISITIONS/enhanced-leads?${filters}`);
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          allLeadsData = leadsData.data || [];
        }
      } else if (isDispOnly) {
        // DISP users: Only Dispositions leads
        leadsResponse = await makeApiCall(`${API_BASE}/pipeline/DISPOSITIONS/enhanced-leads?${filters}`);
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          allLeadsData = leadsData.data || [];
        }
      }
      
      // Transform API data to match our component interface
      const transformedLeads = allLeadsData.map((lead: any) => {
          // Handle address - backend returns string, but we need to handle both formats
          let addressDisplay = 'No address';
          if (typeof lead.address === 'string') {
            // Backend returns concatenated string
            addressDisplay = lead.address;
          } else if (lead.address?.address1) {
            // Handle object format
            addressDisplay = lead.address.address1;
          }
          
          // Handle seller/buyer/vendor name
          let ownerName = 'No seller';
          if (lead.sellerName) {
            ownerName = lead.sellerName;
          } else if (lead.seller) {
            ownerName = `${lead.seller.firstName} ${lead.seller.lastName}`;
          } else if (lead.buyerName) {
            ownerName = lead.buyerName;
          } else if (lead.buyer) {
            ownerName = `${lead.buyer.firstName} ${lead.buyer.lastName}`;
          } else if (lead.vendor) {
            ownerName = `${lead.vendor.firstName} ${lead.vendor.lastName}`;
          }
          
          return {
            id: lead.id,
            address: addressDisplay,
            sellerName: ownerName,
            buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : undefined,
            dateCreated: lead.createdAt,
            statusChangedDate: lead.stageEnteredAt || lead.updatedAt,
            lastContactDate: lead.lastContactAt || lead.updatedAt,
            lastTouchedAt: lead.lastTouchedAt || lead.lastContactAt || lead.updatedAt,
            lastActivityAt: lead.lastActivityAt || lead.updatedAt,
            priceReduction: lead.priceReduction || false,
            clearToClose: lead.clearToClose || false,
            originalPrice: lead.deal?.contractPrice || 0,
            currentPrice: lead.deal?.soldPrice || 0,
            // Use the stage field from backend API, fallback to pipelineStage.id
            stage: lead.stage || lead.pipelineStage?.id || 'unknown-stage',
            stageName: lead.stageName || lead.pipelineStage?.name || 'Unknown Stage',
            assignedAgent: lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : undefined,
            leadType: lead.leadType,
            status: lead.needsAttention ? 'urgent' : 'active',
            customFields: lead.customFields // Keep customFields for validation popups
          };
        });
        
        setLeads(transformedLeads);
        setNeedsAttentionCount(transformedLeads.filter((l: any) => l.status === 'urgent').length);

        // Store navigation order + view metadata for LeadEdit next/prev arrows
        setFromPipelineView(
          transformedLeads.map((l: any) => l.id),
          {
            pipelineKey: transactionPipelineView ? 'TRANSACTION' : currentPipeline,
            pipelineKeys: transactionPipelineView
              ? ['TRANSACTION']
              : (pipelineAccess?.allowedPipelines?.includes('ACQUISITIONS') && pipelineAccess?.allowedPipelines?.includes('DISPOSITIONS') && (user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER')))
                ? ['ACQUISITIONS', 'DISPOSITIONS']
                : [currentPipeline],
            transactionPipelineView,
            needsAttentionView,
            leadSourceId: selectedLeadSource !== 'all' ? selectedLeadSource : undefined,
            assignedUserId: pipelineAccess?.canViewAssignedOnly ? (user?.id || undefined) : undefined,
          }
        );
        
        // Fallback to basic leads API if no leads found
        if (transformedLeads.length === 0) {
        const basicLeadsResponse = await makeApiCall(`${API_BASE}/leads`);
        console.log('Basic leads response status:', basicLeadsResponse.status);
        
        if (basicLeadsResponse.ok) {
          const basicLeadsData = await basicLeadsResponse.json();
          console.log('Basic API leads response:', basicLeadsData);
          
          // Filter only leads with pipeline stages
          const leadsWithStages = (basicLeadsData.data || []).filter((lead: any) => lead.pipelineStageId);
          console.log('Leads with stages:', leadsWithStages.length);
          
          // Transform basic leads data
          const transformedLeads = leadsWithStages.map((lead: any) => ({
            id: lead.id,
            address: lead.address?.address1 || `Lead ${lead.id.substring(0, 8)}`,
            sellerName: lead.seller ? `${lead.seller.firstName} ${lead.seller.lastName}` : 'Unknown Seller',
            buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : undefined,
            dateCreated: lead.createdAt,
            statusChangedDate: lead.updatedAt,
            lastContactDate: lead.updatedAt,
            priceReduction: false,
            clearToClose: false,
            originalPrice: 0,
            currentPrice: 0,
            stage: lead.pipelineStageId || 'new-lead',
            stageName: 'Unknown Stage',
            assignedAgent: lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : undefined,
            leadType: lead.leadType,
            status: 'active'
          }));
          
          setLeads(transformedLeads);
          setNeedsAttentionCount(0);
          console.log('Loaded basic leads from database:', transformedLeads.length);
          console.log('Sample basic lead:', transformedLeads[0]);
        } else {
          console.log('Both API calls failed, using sample data');
          setLeads(sampleLeads);
          setNeedsAttentionCount(0);
        }
      }

    } catch (error) {
      console.error('Error loading pipeline data:', error);
      // Use sample data as fallback
      setPipelineStages(sampleStages);
      setLeads(sampleLeads);
      setNeedsAttentionCount(0);
      console.log('Using sample data due to error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Find the lead being moved
    const leadToMove = leads.find(lead => lead.id === leadId);
    if (!leadToMove || leadToMove.stage === newStageId) return;

    const stageName = pipelineStages.find(s => s.id === newStageId)?.name || newStageId;
    
    // NEW: Check if validation popup is needed
    const stageNameLower = stageName.toLowerCase();
    if (stageNameLower.includes('appointment') && stageNameLower.includes('complete')) {
      setPendingStageChange({ leadId, newStageId, stageName, leadToMove });
      setShowAppointmentPopup(true);
      return;
    }
    if (stageNameLower.includes('due diligence') && stageNameLower.includes('complete')) {
      setPendingStageChange({ leadId, newStageId, stageName, leadToMove });
      setShowDueDiligencePopup(true);
      return;
    }
    if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
      setPendingStageChange({ leadId, newStageId, stageName, leadToMove });
      setShowOfferMadePopup(true);
      return;
    }
    
    // EXISTING: Update UI immediately (optimistic update)
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, stage: newStageId, statusChangedDate: new Date().toISOString() }
        : lead
    ));

    try {
      // EXISTING: API call to move lead
      const response = await makeApiCall(`${API_BASE}/pipeline/leads/${leadId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stageId: newStageId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // NEW: Handle validation errors from backend
        if (errorData.error?.code === 'VALIDATION_REQUIRED' || errorData.code === 'VALIDATION_REQUIRED') {
          // Revert optimistic update
          setLeads(prev => prev.map(lead => 
            lead.id === leadId ? leadToMove : lead
          ));
          
          // Show appropriate validation popup
          setPendingStageChange({ leadId, newStageId, stageName, leadToMove });
          if (stageNameLower.includes('appointment') && stageNameLower.includes('complete')) {
            setShowAppointmentPopup(true);
          } else if (stageNameLower.includes('due diligence') && stageNameLower.includes('complete')) {
            setShowDueDiligencePopup(true);
          } else if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
            setShowOfferMadePopup(true);
          }
          return;
        }
        
        throw new Error('Failed to move lead');
      }

      // Success notification removed - only show errors
    } catch (error) {
      console.error('Error moving lead:', error);
      
      // EXISTING: Revert optimistic update on error
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { ...lead, stage: leadToMove.stage, statusChangedDate: leadToMove.statusChangedDate }
          : lead
      ));

      toast({
        title: "Error",
        description: "Failed to move lead. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getLeadsForStage = (stageId: string) => {
    const filteredLeads = leads.filter(lead => {
      // Match by stage ID (UUID from database) or stage name
      const matches = lead.stage === stageId || lead.stageName === stageId;
      return matches;
    });
    
    
    return filteredLeads;
  };

  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;

  const handleLeadClick = (leadId: string) => {
    // Navigate to lead edit page
    navigate(`/leads/${leadId}/edit`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading pipeline...</span>
      </div>
    );
  }

  // Show access denied if user has no pipeline access
  if (pipelineAccess && (!pipelineAccess.allowedPipelines || pipelineAccess.allowedPipelines.length === 0)) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Pipeline Access
        </h3>
        <p className="text-gray-600">
          You don't have permission to view any pipelines. Please contact your administrator.
        </p>
      </Card>
    );
  }

  // Determine which pipeline is currently being viewed
  const getActivePipelineName = () => {
    if (transactionPipelineView && pipelineAccess?.allowedPipelines?.includes('TRANSACTION')) {
      return 'Transaction';
    }
    
    // Check user role to determine pipeline name
    const isAdminOrManager = user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER');
    const isAcqOnly = user?.roles?.includes('ACQ') && !isAdminOrManager;
    const isDispOnly = user?.roles?.includes('DISP') && !isAdminOrManager;
    
    if (isAdminOrManager) {
      return 'Acquisitions + Dispositions';
    } else if (isAcqOnly) {
      return 'Acquisitions';
    } else if (isDispOnly) {
      return 'Dispositions';
    }
    
    return currentPipeline.charAt(0) + currentPipeline.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-3 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <Badge variant="outline" className="flex items-center gap-1">
            <Workflow className="h-3 w-3" />
            {getActivePipelineName()}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {leads.length} Active Leads
          </Badge>
          {pipelineAccess?.canViewAssignedOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              My Leads Only
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Role-based controls */}
          {isAdminOrManager && (
            <>
              <Button
                variant="outline"
                className="h-8"
                onClick={() => setIsFilterOpen(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Pipeline Filters</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Lead created (from)</Label>
                        <Input type="date" value={draftCreatedFrom} onChange={(e) => setDraftCreatedFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Lead created (to)</Label>
                        <Input type="date" value={draftCreatedTo} onChange={(e) => setDraftCreatedTo(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Last touched (from)</Label>
                        <Input type="date" value={draftLastTouchedFrom} onChange={(e) => setDraftLastTouchedFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Last touched (to)</Label>
                        <Input type="date" value={draftLastTouchedTo} onChange={(e) => setDraftLastTouchedTo(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Acquisitions agent</Label>
                        <select
                          value={draftAcqAgentId}
                          onChange={(e) => setDraftAcqAgentId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="all">All</option>
                          {agents.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.firstName} {a.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Dispositions agent</Label>
                        <select
                          value={draftDispAgentId}
                          onChange={(e) => setDraftDispAgentId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="all">All</option>
                          {agents.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.firstName} {a.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Clear draft states
                        setDraftCreatedFrom('');
                        setDraftCreatedTo('');
                        setDraftLastTouchedFrom('');
                        setDraftLastTouchedTo('');
                        setDraftAcqAgentId('all');
                        setDraftDispAgentId('all');
                        
                        // Clear applied states (this will trigger useEffect and reload with no filters)
                        setAppliedCreatedFrom('');
                        setAppliedCreatedTo('');
                        setAppliedLastTouchedFrom('');
                        setAppliedLastTouchedTo('');
                        setAppliedAcqAgentId('all');
                        setAppliedDispAgentId('all');
                      }}
                    >
                      Clear
                    </Button>
                    <Button type="button" onClick={() => {
                      // Copy draft values to applied values (this will trigger useEffect and reload data)
                      setAppliedCreatedFrom(draftCreatedFrom);
                      setAppliedCreatedTo(draftCreatedTo);
                      setAppliedLastTouchedFrom(draftLastTouchedFrom);
                      setAppliedLastTouchedTo(draftLastTouchedTo);
                      setAppliedAcqAgentId(draftAcqAgentId);
                      setAppliedDispAgentId(draftDispAgentId);
                      
                      // Close the dialog
                      setIsFilterOpen(false);
                    }}>
                      Apply
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          {pipelineAccess?.availableToggles?.includes('TRANSACTION_PIPELINE') && (
            <div className="flex items-center space-x-2">
            <Switch
              id="transaction-pipeline"
              checked={transactionPipelineView}
              onCheckedChange={setTransactionPipelineView}
              />
              <Label htmlFor="transaction-pipeline">Transaction Pipeline</Label>
            </div>
          )}

          {pipelineAccess?.availableToggles?.includes('SOURCE_DROPDOWN') && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="lead-source">Source:</Label>
              <select
                id="lead-source"
                value={selectedLeadSource}
                onChange={(e) => setSelectedLeadSource(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Sources</option>
                {leadSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
          </div>
          )}
          
          {pipelineAccess?.availableToggles?.includes('NEEDS_ATTENTION') && (
            <div className="flex items-center space-x-2">
              <Switch
                id="needs-attention"
                checked={needsAttentionView}
                onCheckedChange={setNeedsAttentionView}
              />
              <Label htmlFor="needs-attention">
                Needs Attention {needsAttentionCount > 0 && `(${needsAttentionCount})`}
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Drag and Drop Pipeline */}
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}
        >
        <div className="flex gap-2 overflow-x-auto pb-2 h-[calc(100vh-220px)]">
          {pipelineStages.map(stage => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  leads={getLeadsForStage(stage.id)}
                  onLeadClick={handleLeadClick}
                />
              ))}
          </div>

          <DragOverlay>
          {activeLead && (
              <PipelineCard lead={activeLead} isDragging />
          )}
          </DragOverlay>
        </DndContext>

      {/* View Lead Dialog */}
      {selectedLead && (
        <ViewLeadDialog
          lead={selectedLead}
          open={isViewDialogOpen}
          onOpenChange={(open) => {
            setIsViewDialogOpen(open);
            if (!open) {
              setSelectedLead(null);
            }
          }}
          onUpdate={() => {
            // Reload pipeline data after update
            loadPipelineData();
          }}
        />
      )}

      {/* Needs Attention Info */}
      {needsAttentionView && needsAttentionCount > 0 && (
        <Card className="p-6 border border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900 mb-2">
                {needsAttentionCount} Lead{needsAttentionCount !== 1 ? 's' : ''} Need{needsAttentionCount === 1 ? 's' : ''} Attention
              </h3>
              <div className="text-sm text-orange-700 space-y-1">
                <p>• Leads with no contact in 72+ hours</p>
                <p>• Leads with urgent status</p>
                <p>• Leads requiring immediate follow-up</p>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Stage Transition Validation Popups */}
      {pendingStageChange && (
        <>
          <AppointmentCompletePopup
            open={showAppointmentPopup}
            onClose={() => {
              setShowAppointmentPopup(false);
              setPendingStageChange(null);
            }}
            leadId={pendingStageChange.leadId}
            onSubmit={async (files) => {
              try {
                // Upload photos
                let uploadedCount = 0;
                for (const file of files) {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('category', 'PHOTO');
                  
                  const uploadResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}/files`, {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (uploadResponse.ok) {
                    uploadedCount++;
                    console.log('✅ Photo uploaded:', file.name);
                  } else {
                    const errorData = await uploadResponse.json();
                    console.error('❌ Failed to upload photo:', file.name, errorData);
                    toast({
                      title: "Upload Error",
                      description: `Failed to upload ${file.name}`,
                      variant: "destructive"
                    });
                  }
                }
                
                console.log(`📸 Uploaded ${uploadedCount} of ${files.length} photos`);
                
                // Now proceed with stage change
                setLeads(prev => prev.map(lead => 
                  lead.id === pendingStageChange.leadId 
                    ? { ...lead, stage: pendingStageChange.newStageId, statusChangedDate: new Date().toISOString() }
                    : lead
                ));
                
                const response = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ stageId: pendingStageChange.newStageId })
                });
                
                if (response.ok) {
                  // Success notification removed - only show errors
                } else {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to move lead');
                }
                
                setShowAppointmentPopup(false);
                setPendingStageChange(null);
              } catch (error: any) {
                console.error('Error in appointment complete flow:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to complete appointment",
                  variant: "destructive"
                });
              }
            }}
          />
          
          <DueDiligencePopup
            open={showDueDiligencePopup}
            onClose={() => {
              setShowDueDiligencePopup(false);
              setPendingStageChange(null);
            }}
            existingData={pendingStageChange.leadToMove.customFields}
            onSubmit={async (data) => {
              // Update lead with property info
              await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customFields: {
                    ...pendingStageChange.leadToMove.customFields,
                    ...data
                  }
                })
              });
              
              // Now proceed with stage change
              setLeads(prev => prev.map(lead => 
                lead.id === pendingStageChange.leadId 
                  ? { ...lead, stage: pendingStageChange.newStageId, statusChangedDate: new Date().toISOString() }
                  : lead
              ));
              
              const response = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId: pendingStageChange.newStageId })
              });
              
              if (response.ok) {
                // Success notification removed - only show errors
              }
              
              setShowDueDiligencePopup(false);
              setPendingStageChange(null);
            }}
          />
          
          <OfferMadePopup
            open={showOfferMadePopup}
            onClose={() => {
              setShowOfferMadePopup(false);
              setPendingStageChange(null);
            }}
            existingData={pendingStageChange.leadToMove.customFields}
            onSubmit={async (data) => {
              // Update lead with offer info
              await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customFields: {
                    ...pendingStageChange.leadToMove.customFields,
                    ...data
                  }
                })
              });
              
              // Now proceed with stage change
              setLeads(prev => prev.map(lead => 
                lead.id === pendingStageChange.leadId 
                  ? { ...lead, stage: pendingStageChange.newStageId, statusChangedDate: new Date().toISOString() }
                  : lead
              ));
              
              const response = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId: pendingStageChange.newStageId })
              });
              
              if (response.ok) {
                // Success notification removed - only show errors
              }
              
              setShowOfferMadePopup(false);
              setPendingStageChange(null);
            }}
          />
        </>
      )}

    </div>
  );
};

export default Pipeline;