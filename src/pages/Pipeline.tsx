import { useCallback, useEffect, useRef, useState } from "react";
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
  OfferMadePopup,
  DueDiligenceCompleteRequirementsPopup,
  FollowUpTaskRequiredPopup
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
import { MultiSelect } from "@/components/ui/multi-select";
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
  const didInitialLoadRef = useRef(false);
  
  // API state
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);

  // Admin/Manager filters (applied to pipeline)
  const isAdminOrManager = user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER');
  const [showFilters, setShowFilters] = useState(false);
  const [acqAgents, setAcqAgents] = useState<any[]>([]);
  const [dispAgents, setDispAgents] = useState<any[]>([]);

  // Filter states - Multi-select arrays for agents only
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [lastTouchedFrom, setLastTouchedFrom] = useState<string>('');
  const [lastTouchedTo, setLastTouchedTo] = useState<string>('');
  // Date-range dropdowns (match Leads page Date Created filter UX)
  const [createdDateRange, setCreatedDateRange] = useState<string>('');
  const [createdCustomFrom, setCreatedCustomFrom] = useState<string>('');
  const [createdCustomTo, setCreatedCustomTo] = useState<string>('');
  const [lastTouchedDateRange, setLastTouchedDateRange] = useState<string>('');
  const [lastTouchedCustomFrom, setLastTouchedCustomFrom] = useState<string>('');
  const [lastTouchedCustomTo, setLastTouchedCustomTo] = useState<string>('');
  const [selectedAcqAgents, setSelectedAcqAgents] = useState<string[]>([]);
  const [selectedDispAgents, setSelectedDispAgents] = useState<string[]>([]);
  
  // ViewLeadDialog state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Stage transition validation popups
  const [showAppointmentPopup, setShowAppointmentPopup] = useState(false);
  const [showDueDiligencePopup, setShowDueDiligencePopup] = useState(false);
  const [showOfferMadePopup, setShowOfferMadePopup] = useState(false);
  const [showDueDiligenceCompletePopup, setShowDueDiligenceCompletePopup] = useState(false);
  const [showFollowUpTaskPopup, setShowFollowUpTaskPopup] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<{
    leadId: string;
    newStageId: string;
    stageName: string;
    leadToMove: any;
    allRequiredFields?: string[]; // Track ALL required fields from backend
  } | null>(null);
  const [missingDdFields, setMissingDdFields] = useState<string[]>([]);
  const [missingDdCompleteItems, setMissingDdCompleteItems] = useState<string[]>([]);
  const isTransitioningPopupsRef = useRef(false); // Flag to prevent clearing pendingStageChange during transitions

  // Drag behavior: distance-based activation (more reliable than delay)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
      // Keep original on-load behavior: immediately load pipeline data once we know the first pipeline key.
      // (We still guard the secondary effect to avoid an immediate duplicate fetch.)
      if (accessData?.allowedPipelines?.[0]) {
        didInitialLoadRef.current = true;
        loadPipelineData(accessData.allowedPipelines[0]);
      }
    };
    initializePipeline();
  }, []);

  useEffect(() => {
    // Only load data if we have pipeline access loaded
    if (pipelineAccess) {
      // Avoid double-fetch on initial mount (initializePipeline already loaded once)
      if (didInitialLoadRef.current) {
        didInitialLoadRef.current = false;
        return;
      }
      loadPipelineData();
    }
  }, [transactionPipelineView, needsAttentionView, selectedLeadSource, currentPipeline, pipelineAccess, createdFrom, createdTo, lastTouchedFrom, lastTouchedTo, selectedAcqAgents, selectedDispAgents]);

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
      // Load ACQ agents
      const acqResponse = await makeApiCall(`${API_BASE}/agents`);
      if (acqResponse.ok) {
        const acqData = await acqResponse.json();
        const allAgents = acqData.data || [];
        // Filter to only include users with ACQ role
        // roles can be either string[] or {role: {name: string}}[]
        const acqOnlyAgents = allAgents.filter((a: any) => {
          if (Array.isArray(a.roles)) {
            // Check if it's string array format ['ACQ', 'MANAGER']
            if (typeof a.roles[0] === 'string') {
              return a.roles.includes('ACQ');
            }
            // Check if it's object array format [{role: {name: 'ACQ'}}]
            return a.roles.some((r: any) => r.role?.name === 'ACQ');
          }
          return false;
        });
        setAcqAgents(acqOnlyAgents);
      }

      // Load all users and filter for DISP role
      const usersResponse = await makeApiCall(`${API_BASE}/users`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const users = usersData.data || [];
        // Filter users who have DISP role
        // roles can be either string[] or {role: {name: string}}[]
        const dispUsers = users.filter((u: any) => {
          if (Array.isArray(u.roles)) {
            // Check if it's string array format ['DISP', 'MANAGER']
            if (typeof u.roles[0] === 'string') {
              return u.roles.includes('DISP');
            }
            // Check if it's object array format [{role: {name: 'DISP'}}]
            return u.roles.some((r: any) => r.role?.name === 'DISP');
          }
          return false;
        });
        setDispAgents(dispUsers);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const formatDateInput = (d: Date) => {
    // YYYY-MM-DD for <input type="date">
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyPresetRange = (
    range: string,
    setFrom: (v: string) => void,
    setTo: (v: string) => void
  ) => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);

    switch (range) {
      case 'today':
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      case 'week':
        from.setDate(now.getDate() - 7);
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      case 'quarter':
        from.setMonth(now.getMonth() - 3);
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      case 'year':
        setFrom(`${now.getFullYear()}-01-01`);
        setTo(formatDateInput(to));
        return;
      default:
        // All Time / empty
        setFrom('');
        setTo('');
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
      let stagePipelineKeyById = new Map<string, string>();
      
      if (transactionPipelineView && pipelineAccess?.allowedPipelines?.includes('TRANSACTION')) {
        // Load Transaction pipeline
        const stagesResponse = await makeApiCall(`${API_BASE}/pipeline/TRANSACTION/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          allStages = (stagesData.data || []).map((s: any) => ({ ...s, pipelineKey: 'TRANSACTION' }));
          stagePipelineKeyById = new Map(allStages.map((s: any) => [s.id, 'TRANSACTION']));
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
          acqStages = (acqData.data || []).map((s: any) => ({ ...s, pipelineKey: 'ACQUISITIONS' }));
        }
        
        if (dispResponse.ok) {
          const dispData = await dispResponse.json();
          dispStages = (dispData.data || []).map((s: any) => ({ ...s, pipelineKey: 'DISPOSITIONS' }));
        }
        
        // Combine stages with explicit grouping:
        // show ALL Acquisitions stages first (sorted), then append ALL Dispositions stages (sorted)
        const acqSorted = [...acqStages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        const dispSorted = [...dispStages].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        allStages = [...acqSorted, ...dispSorted];
        stagePipelineKeyById = new Map(allStages.map((s: any) => [s.id, String(s.pipelineKey || '')]));
        console.log('📊 Combined stages:', allStages.length, 'stages');
      } else if (isAcqOnly) {
        // ACQ users: Only Acquisitions pipeline
        console.log('📊 Loading Acquisitions pipeline only');
        const stagesResponse = await makeApiCall(`${API_BASE}/pipeline/ACQUISITIONS/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          allStages = (stagesData.data || []).map((s: any) => ({ ...s, pipelineKey: 'ACQUISITIONS' }));
          stagePipelineKeyById = new Map(allStages.map((s: any) => [s.id, 'ACQUISITIONS']));
        }
      } else if (isDispOnly) {
        // DISP users: Only Dispositions pipeline
        console.log('📊 Loading Dispositions pipeline only');
        const stagesResponse = await makeApiCall(`${API_BASE}/pipeline/DISPOSITIONS/stages`);
        if (stagesResponse.ok) {
          const stagesData = await stagesResponse.json();
          allStages = (stagesData.data || []).map((s: any) => ({ ...s, pipelineKey: 'DISPOSITIONS' }));
          stagePipelineKeyById = new Map(allStages.map((s: any) => [s.id, 'DISPOSITIONS']));
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
        if (createdFrom) filters.append('createdFrom', createdFrom);
        if (createdTo) filters.append('createdTo', createdTo);
        if (lastTouchedFrom) filters.append('lastTouchedFrom', lastTouchedFrom);
        if (lastTouchedTo) filters.append('lastTouchedTo', lastTouchedTo);
        
        // Multi-select agent filters
        if (selectedAcqAgents.length > 0) {
          selectedAcqAgents.forEach(agentId => filters.append('acqAgentIds', agentId));
        }
        if (selectedDispAgents.length > 0) {
          selectedDispAgents.forEach(agentId => filters.append('dispAgentIds', agentId));
        }
      }
      
      console.log('📊 Final filter params:', filters.toString());

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
          // Debug: Log lead data to see what's available
          if (!lead.owners || lead.owners.length === 0) {
            console.log('⚠️ Lead without owners:', {
              id: lead.id,
              address: lead.address,
              hasOwners: !!lead.owners,
              ownerCount: lead.owners?.length || 0,
              seller: lead.seller,
              buyer: lead.buyer,
              vendor: lead.vendor,
              sellerName: lead.sellerName,
              buyerName: lead.buyerName
            });
          }
          
          // Handle address - backend returns string, but we need to handle both formats
          let addressDisplay = 'No address';
          if (typeof lead.address === 'string') {
            // Backend returns concatenated string
            addressDisplay = lead.address;
          } else if (lead.address?.address1) {
            // Handle object format
            addressDisplay = lead.address.address1;
          }
          
          // Handle seller/buyer/vendor name - same logic as Leads page
          let ownerName = 'Unknown Caller';
          
          // Priority 1: Check lead owners first (primary source of truth)
          if (lead.owners && lead.owners.length > 0) {
            const primaryOwner = lead.owners.find((o: any) => o.isPrimary);
            const primaryFn = (primaryOwner?.firstName || '').trim();
            const primaryLn = (primaryOwner?.lastName || '').trim();
            
            if (primaryFn || primaryLn) {
              ownerName = `${primaryFn} ${primaryLn}`.trim();
            } else {
              // If no primary, get first owner with name
              const ownerWithName = lead.owners.find((o: any) => 
                (o.firstName && String(o.firstName).trim()) || 
                (o.lastName && String(o.lastName).trim())
              );
              if (ownerWithName) {
                const fn = (ownerWithName.firstName || '').trim();
                const ln = (ownerWithName.lastName || '').trim();
                ownerName = `${fn} ${ln}`.trim();
              }
            }
          }
          
          // Priority 2: Fallback to existing seller/buyer/vendor logic
          if (ownerName === 'Unknown Caller') {
            if (lead.sellerName && lead.sellerName.trim()) {
              ownerName = lead.sellerName.trim();
            } else if (lead.seller) {
              const sellerFn = (lead.seller.firstName || '').trim();
              const sellerLn = (lead.seller.lastName || '').trim();
              if (sellerFn || sellerLn) {
                ownerName = `${sellerFn} ${sellerLn}`.trim();
              }
            } else if (lead.buyerName && lead.buyerName.trim()) {
              ownerName = lead.buyerName.trim();
            } else if (lead.buyer) {
              const buyerFn = (lead.buyer.firstName || '').trim();
              const buyerLn = (lead.buyer.lastName || '').trim();
              if (buyerFn || buyerLn) {
                ownerName = `${buyerFn} ${buyerLn}`.trim();
              }
            } else if (lead.vendor) {
              const vendorFn = (lead.vendor.firstName || '').trim();
              const vendorLn = (lead.vendor.lastName || '').trim();
              if (vendorFn || vendorLn) {
                ownerName = `${vendorFn} ${vendorLn}`.trim();
              }
            }
          }
          
          // Final check: if ownerName is still empty string or only whitespace, set to "Unknown Caller"
          if (!ownerName || ownerName.trim() === '') {
            ownerName = 'Unknown Caller';
          }
          
          console.log('👤 Final ownerName for lead:', lead.id, '→', ownerName);
          
          const stageId = lead.pipelineStageId || lead.stage || lead.pipelineStage?.id || 'unknown-stage';
          const stagePipelineKey =
            stagePipelineKeyById.get(stageId) ||
            lead?.pipelineStage?.pipeline?.key ||
            (transactionPipelineView ? 'TRANSACTION' : currentPipeline);

          return {
            id: lead.id,
            address: addressDisplay,
            sellerName: ownerName,
            buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : undefined,
            dateCreated: lead.createdAt,
            statusChangedDate: lead.stageEnteredAt || lead.updatedAt,
            lastContactDate: lead.lastContactAt || lead.updatedAt,
            // STRICT "last attempted contact" timer: PipelineCard uses this field.
            lastAttemptedContactAt: lead.lastAttemptedContactAt ?? lead.lastContactAt ?? null,
            lastTouchedAt: lead.lastTouchedAt || lead.lastContactAt || lead.updatedAt,
            lastActivityAt: lead.lastActivityAt || lead.updatedAt,
            priceReduction: lead.priceReduction || false,
            clearToClose: lead.clearToClose || false,
            openTasks: lead.openTasks ?? 0,
            openTasksMine: lead.openTasksMine ?? 0,
            originalPrice: lead.deal?.contractPrice || 0,
            currentPrice: lead.deal?.soldPrice || 0,
            // IMPORTANT: Always prefer UUID ids for matching pipeline columns
            // Some API responses include `pipelineStageId` but not `stage`, especially after filtering.
            stage: stageId,
            stageName: lead.pipelineStage?.name || lead.stageName || 'Unknown Stage',
            stagePipelineKey,
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

  const getStagePipelineKey = useCallback(
    (stageId: string) => {
      const s = pipelineStages.find((x: any) => x?.id === stageId);
      const keyFromStage = s?.pipelineKey || s?.pipeline?.key;
      if (keyFromStage) return String(keyFromStage).toUpperCase();
      return transactionPipelineView && pipelineAccess?.allowedPipelines?.includes('TRANSACTION')
        ? 'TRANSACTION'
        : String(currentPipeline || 'ACQUISITIONS').toUpperCase();
    },
    [pipelineStages, transactionPipelineView, pipelineAccess, currentPipeline]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const leadId = active.id as string;
    // IMPORTANT: When dropping onto a card in a filled column, `over.id` is the lead id (not stage id).
    // Use Sortable containerId when available; fallback to looking up the lead's current stage.
    const overId = over.id as string;
    const containerStageId =
      (over.data?.current as any)?.sortable?.containerId as string | undefined;
    const stageFromOverLead = leads.find(l => l.id === overId)?.stage as string | undefined;
    const newStageId = containerStageId || stageFromOverLead || overId;

    // Find the lead being moved
    const leadToMove = leads.find(lead => lead.id === leadId);
    if (!leadToMove || leadToMove.stage === newStageId) return;

    const stageName = pipelineStages.find(s => s.id === newStageId)?.name || newStageId;
    
    const stageNameLower = stageName.toLowerCase();
    
    // EXISTING: Update UI immediately (optimistic update)
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? {
            ...lead,
            stage: newStageId,
            stagePipelineKey: getStagePipelineKey(newStageId),
            statusChangedDate: new Date().toISOString(),
          }
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
          
          // Show appropriate validation popup (only when backend actually requires it)
          const requiredFields: string[] = Array.isArray(errorData.requiredFields) ? errorData.requiredFields : [];
          
          // Store ALL required fields in pendingStageChange
          setPendingStageChange({ 
            leadId, 
            newStageId, 
            stageName, 
            leadToMove,
            allRequiredFields: requiredFields 
          });

          // Show the FIRST required popup
          // Priority order: photos → followUpTask → DD fields → DD Complete fields → offer
          if (requiredFields.includes('photos')) {
            setShowAppointmentPopup(true);
          } else if (requiredFields.includes('followUpTask')) {
            setShowFollowUpTaskPopup(true);
          } else if (requiredFields.some((f) => ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'].includes(f))) {
            setMissingDdFields(requiredFields.filter((f) => ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'].includes(f)));
            setShowDueDiligencePopup(true);
          } else if (requiredFields.some((f) => ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'].includes(f))) {
            setMissingDdCompleteItems(requiredFields.filter((f) => ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'].includes(f)));
            setShowDueDiligenceCompletePopup(true);
          } else if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
            setShowOfferMadePopup(true);
          }
          return;
        }
        
        throw new Error('Failed to move lead');
      }

      // Fetch updated lead data from backend to get correct leadType
      const updatedLeadResponse = await makeApiCall(`${API_BASE}/leads/${leadId}`);
      if (updatedLeadResponse.ok) {
        const updatedLeadData = await updatedLeadResponse.json();
        const updatedLead = updatedLeadData.data || updatedLeadData;
        
        // Update lead with correct data from backend
        setLeads(prev => prev.map(lead => 
          lead.id === leadId 
            ? { 
                ...lead, 
                stage: newStageId, 
                stagePipelineKey: getStagePipelineKey(newStageId),
                statusChangedDate: new Date().toISOString(),
                leadType: updatedLead.leadType // Update leadType from backend
              }
            : lead
        ));
      }

      // Success notification removed - only show errors
    } catch (error) {
      console.error('Error moving lead:', error);
      
      // EXISTING: Revert optimistic update on error
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? {
              ...lead,
              stage: leadToMove.stage,
              stagePipelineKey: (leadToMove as any)?.stagePipelineKey || getStagePipelineKey(leadToMove.stage),
              statusChangedDate: leadToMove.statusChangedDate,
            }
          : lead
      ));

      toast({
        title: "Error",
        description: "Failed to move lead. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleValidationRequired = (requiredFields: string[], stageNameLower: string) => {
    if (requiredFields.includes('photos')) {
      setShowAppointmentPopup(true);
      return;
    }
    if (requiredFields.includes('followUpTask')) {
      setShowFollowUpTaskPopup(true);
      return;
    }
    const ddFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
    if (requiredFields.some((f) => ddFields.includes(f))) {
      setMissingDdFields(requiredFields.filter((f) => ddFields.includes(f)));
      setShowDueDiligencePopup(true);
      return;
    }
    const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
    if (requiredFields.some((f) => ddCompleteFields.includes(f))) {
      setMissingDdCompleteItems(requiredFields.filter((f) => ddCompleteFields.includes(f)));
      setShowDueDiligenceCompletePopup(true);
      return;
    }
    if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
      setShowOfferMadePopup(true);
      return;
    }
  };

  const retryPendingStageMove = async () => {
    if (!pendingStageChange) return;
    const { leadId, newStageId, stageName, leadToMove } = pendingStageChange;
    const stageNameLower = (stageName || '').toLowerCase();
    
    console.log('🔄 Retrying stage move:', { leadId, newStageId, stageName });
    
    try {
      // optimistic update
      setLeads(prev => prev.map(lead =>
        lead.id === leadId
          ? {
              ...lead,
              stage: newStageId,
              stagePipelineKey: getStagePipelineKey(newStageId),
              statusChangedDate: new Date().toISOString(),
            }
          : lead
      ));

      const response = await makeApiCall(`${API_BASE}/pipeline/leads/${leadId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: newStageId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch((e) => {
          console.error('❌ Failed to parse error response:', e);
          return {};
        });
        console.log('❌ Stage move validation failed:', errorData);
        console.log('🔍 Error code check:', { 
          errorCode: errorData?.error?.code, 
          code: errorData?.code,
          requiredFields: errorData?.requiredFields 
        });
        
        if (errorData?.error?.code === 'VALIDATION_REQUIRED' || errorData?.code === 'VALIDATION_REQUIRED') {
          // revert
          setLeads(prev => prev.map(lead => (lead.id === leadId ? leadToMove : lead)));
          const requiredFields: string[] = Array.isArray(errorData.requiredFields) ? errorData.requiredFields : [];
          console.log('📋 Additional validation required:', requiredFields, 'stageName:', stageNameLower);
          
          // Update pendingStageChange with the NEW required fields (backend re-validated)
          setPendingStageChange({ 
            leadId, 
            newStageId, 
            stageName, 
            leadToMove,
            allRequiredFields: requiredFields 
          });
          
          handleValidationRequired(requiredFields, stageNameLower);
          return;
        }
        throw new Error(errorData?.error?.message || errorData?.error || errorData?.message || 'Failed to move lead');
      }

      console.log('✅ Stage move successful');
      
      // Success: close all popups and clear pending
      setShowAppointmentPopup(false);
      setShowDueDiligencePopup(false);
      setShowDueDiligenceCompletePopup(false);
      setShowOfferMadePopup(false);
      setShowFollowUpTaskPopup(false);
      setMissingDdFields([]);
      setMissingDdCompleteItems([]);
      setPendingStageChange(null);
    } catch (e: any) {
      console.error('❌ Error retrying stage move:', e);
      
      // Revert the optimistic update
      if (pendingStageChange) {
        setLeads(prev => prev.map(lead => 
          lead.id === pendingStageChange.leadId ? pendingStageChange.leadToMove : lead
        ));
      }
      
      // Show error message
      toast({
        title: "Failed to Move Lead",
        description: e?.message || "Could not move the lead. Please try again or complete requirements on the Lead Detail page.",
        variant: "destructive",
      });
      
      // Clear pending state
      setPendingStageChange(null);
    }
  };

  const getLeadsForStage = (stageId: string) => {
    const filteredLeads = leads.filter(lead => {
      // Match by normalized stage UUID (preferred). We do NOT match by name to avoid mismatches.
      return lead.stage === stageId;
    });
    
    
    return filteredLeads;
  };

  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;

  const handleLeadClick = (leadId: string) => {
    // Navigate to lead edit page
    navigate(`/leads/${leadId}/edit`);
  };

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
      {/* Header + Filters (no extra margin between divider and filter panel) */}
      <div className="space-y-0">
        {/* Title (must appear above filter panel) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
            {pipelineAccess?.canViewAssignedOnly && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                My Leads Only
              </Badge>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {isAdminOrManager && showFilters && (
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Acquisitions Agent Filter - Multi-select */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Acquisitions Agent</label>
              <MultiSelect
                options={acqAgents.map((a: any) => ({
                  label: `${a.firstName} ${a.lastName}`,
                  value: a.id
                }))}
                selected={selectedAcqAgents}
                onChange={setSelectedAcqAgents}
                placeholder="All ACQ Agents"
                className="h-8"
              />
            </div>

            {/* Dispositions Agent Filter - Multi-select */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Dispositions Agent</label>
              <MultiSelect
                options={dispAgents.map((a: any) => ({
                  label: `${a.firstName} ${a.lastName}`,
                  value: a.id
                }))}
                selected={selectedDispAgents}
                onChange={setSelectedDispAgents}
                placeholder="All DISP Agents"
                className="h-8"
              />
            </div>

            {/* Lead Created - Date Range (matches Leads page Date Created) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Lead Created</label>
              <select
                className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={createdDateRange}
                onChange={(e) => {
                  const range = e.target.value;
                  setCreatedDateRange(range);
                  if (range === 'custom') {
                    // Keep current custom inputs; actual from/to comes from custom fields below
                    return;
                  }
                  setCreatedCustomFrom('');
                  setCreatedCustomTo('');
                  applyPresetRange(range, setCreatedFrom, setCreatedTo);
                }}
              >
                <option value="">All Time</option>
                <option value="today">Today ({new Date().toLocaleDateString()})</option>
                <option value="week">This Week</option>
                <option value="month">This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year ({new Date().getFullYear()})</option>
                <option value="custom">Custom Range…</option>
              </select>

              {createdDateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-600">From</label>
                    <input
                      type="date"
                      value={createdCustomFrom}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreatedCustomFrom(v);
                        setCreatedFrom(v);
                      }}
                      className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={createdCustomTo}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreatedCustomTo(v);
                        setCreatedTo(v);
                      }}
                      className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Last Touched - Date Range (matches Leads page Date Created) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Last Touched</label>
              <select
                className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={lastTouchedDateRange}
                onChange={(e) => {
                  const range = e.target.value;
                  setLastTouchedDateRange(range);
                  if (range === 'custom') {
                    return;
                  }
                  setLastTouchedCustomFrom('');
                  setLastTouchedCustomTo('');
                  applyPresetRange(range, setLastTouchedFrom, setLastTouchedTo);
                }}
              >
                <option value="">All Time</option>
                <option value="today">Today ({new Date().toLocaleDateString()})</option>
                <option value="week">This Week</option>
                <option value="month">This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year ({new Date().getFullYear()})</option>
                <option value="custom">Custom Range…</option>
              </select>

              {lastTouchedDateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-600">From</label>
                    <input
                      type="date"
                      value={lastTouchedCustomFrom}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLastTouchedCustomFrom(v);
                        setLastTouchedFrom(v);
                      }}
                      className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={lastTouchedCustomTo}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLastTouchedCustomTo(v);
                        setLastTouchedTo(v);
                      }}
                      className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Actions - Same as Leads page */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {leads.length} leads in pipeline
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreatedFrom('');
                  setCreatedTo('');
                  setLastTouchedFrom('');
                  setLastTouchedTo('');
                  setCreatedDateRange('');
                  setCreatedCustomFrom('');
                  setCreatedCustomTo('');
                  setLastTouchedDateRange('');
                  setLastTouchedCustomFrom('');
                  setLastTouchedCustomTo('');
                  setSelectedAcqAgents([]);
                  setSelectedDispAgents([]);
                }}
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowFilters(false);
                }}
              >
                Close Panel
              </Button>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-end flex-wrap gap-4">
        {/* Role-based controls */}
        {/* Filter button before Transaction Pipeline toggle (like before) */}
        {isAdminOrManager && !showFilters && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
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

      {/* Drag and Drop Pipeline */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              Updating…
            </div>
          </div>
        )}
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
                  currentPipeline={currentPipeline}
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
      </div>

      {/* View Lead Dialog */}
      {selectedLead && (
        <ViewLeadDialog
          lead={selectedLead}
          open={isViewDialogOpen}
          onOpenChange={(open) => {
            setIsViewDialogOpen(open);
            if (!open) {
              setSelectedLead(null);
              // Reload pipeline data after closing (lead may have been edited)
              loadPipelineData();
            }
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
      
      {/* Stage Transition Validation Popups - Render independently */}
      <AppointmentCompletePopup
        open={showAppointmentPopup}
        onClose={() => {
          console.log('🚨 AppointmentCompletePopup onClose called!');
          setShowAppointmentPopup(false);
          // DON'T clear pendingStageChange here - the onSubmit handler manages the flow
        }}
        leadId={pendingStageChange?.leadId || ''}
        onSubmit={async (files) => {
          if (!pendingStageChange) return;
          try {
                // Upload pictures/files
                let uploadedCount = 0;
                for (const file of files) {
                  const formData = new FormData();
                  formData.append('file', file);
                  // Must match what Lead Detail Photos section filters on (`category === 'photos'`).
                  // We also keep backend validation generic (any attachment counts), so this is mainly for display grouping.
                  formData.append('category', 'photos');
                  
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
                
                // Check if there are more requirements to fulfill (from the original validation response)
                console.log('🔍 DEBUG: pendingStageChange =', pendingStageChange);
                console.log('🔍 DEBUG: allRequiredFields =', pendingStageChange?.allRequiredFields);

                if (pendingStageChange?.allRequiredFields) {
                  const remaining = pendingStageChange.allRequiredFields.filter(f => f !== 'photos');
                  console.log('🔍 DEBUG: remaining after removing photos =', remaining);
                  
                  if (remaining.length > 0) {
                    console.log('📋 More requirements pending:', remaining);
                    
                    // SET FLAG FIRST before any state changes!
                    isTransitioningPopupsRef.current = true;
                    console.log('🔍 DEBUG: Flag set to TRUE before closing popup');
                    
                    // Show the next required popup without making another API call
                    const ddFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
                    const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
                    
                    console.log('🔍 DEBUG: Checking DD fields...', remaining.some(f => ddFields.includes(f)));
                    console.log('🔍 DEBUG: Checking DD Complete fields...', remaining.some(f => ddCompleteFields.includes(f)));
                    
                    // Close current popup
                    setShowAppointmentPopup(false);
                    
                    // Small delay to ensure dialog closes before opening next one
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (remaining.some(f => ddFields.includes(f))) {
                      const ddFieldsToShow = remaining.filter(f => ddFields.includes(f));
                      console.log('✅ Showing DueDiligencePopup with fields:', ddFieldsToShow);
                      setMissingDdFields(ddFieldsToShow);
                      setShowDueDiligencePopup(true);
                      
                      // Small delay to ensure popup is rendered
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
                      // Now safe to clear flag
                      isTransitioningPopupsRef.current = false;
                    } else if (remaining.some(f => ddCompleteFields.includes(f))) {
                      const ddCompleteFieldsToShow = remaining.filter(f => ddCompleteFields.includes(f));
                      console.log('✅ Showing DueDiligenceCompletePopup with fields:', ddCompleteFieldsToShow);
                      setMissingDdCompleteItems(ddCompleteFieldsToShow);
                      setShowDueDiligenceCompletePopup(true);
                      console.log('✅ After setState - showDueDiligenceCompletePopup should be true');
                      console.log('✅ pendingStageChange still exists:', !!pendingStageChange);
                      
                      // Small delay to ensure popup is rendered
                      await new Promise(resolve => setTimeout(resolve, 50));
                      
                      // Now safe to clear flag
                      isTransitioningPopupsRef.current = false;
                    } else {
                      console.log('⚠️ No matching popup found, calling retryPendingStageMove');
                      isTransitioningPopupsRef.current = false;
                      // No more known requirements, try the move
                      await retryPendingStageMove();
                    }
                  } else {
                    console.log('✅ All requirements fulfilled, calling retryPendingStageMove');
                    setShowAppointmentPopup(false);
                    // All requirements fulfilled, try the move
                    await retryPendingStageMove();
                  }
                } else {
                  console.log('⚠️ No allRequiredFields found, calling retryPendingStageMove');
                  setShowAppointmentPopup(false);
                  // Fallback: retry stage move (will trigger validation again)
                  await retryPendingStageMove();
                }
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
              console.log('🚨 DueDiligencePopup onClose called!');
              setShowDueDiligencePopup(false);
              // DON'T clear pendingStageChange here - the onSubmit handler manages the flow
            }}
            existingData={pendingStageChange?.leadToMove?.customFields || {}}
            missingFields={missingDdFields}
            onSubmit={async (data) => {
              console.log('🎯 Pipeline DueDiligencePopup onSubmit called with data:', data);
              console.log('🎯 pendingStageChange:', pendingStageChange);
              
              if (!pendingStageChange) {
                console.error('❌ pendingStageChange is null! Cannot proceed.');
                return;
              }
              
              try {
              
              // Set flag FIRST to prevent onClose from clearing pendingStageChange
              isTransitioningPopupsRef.current = true;
              
              // Fetch FRESH customFields from API to avoid overwriting existing data
              let freshCustomFields = {};
              try {
                const freshLeadResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                if (freshLeadResponse.ok) {
                  const freshLeadData = await freshLeadResponse.json();
                  freshCustomFields = (freshLeadData.data || freshLeadData).customFields || {};
                  console.log('✅ Fetched fresh customFields:', freshCustomFields);
                }
              } catch (e) {
                console.warn('⚠️ Failed to fetch fresh customFields, using cached data');
                freshCustomFields = pendingStageChange.leadToMove.customFields || {};
              }
              
              // Update lead with property info (merge with fresh data)
              await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customFields: {
                    ...freshCustomFields, // Use fresh data from API
                    ...data // Merge new data
                  }
                })
              });
              
              setShowDueDiligencePopup(false);
              setMissingDdFields([]);

              // Check if there are more requirements (DD Complete fields)
              if (pendingStageChange?.allRequiredFields) {
                const ddFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
                const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
                // Filter out the DD fields we just completed
                const remaining = pendingStageChange.allRequiredFields.filter(f => 
                  !ddFields.includes(f) && f !== 'photos'
                );
                
                if (remaining.length > 0 && remaining.some(f => ddCompleteFields.includes(f))) {
                  console.log('📋 DD Complete requirements pending:', remaining);
                  
                  // Small delay
                  console.log('⏳ Waiting 100ms...');
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  console.log('✅ Setting DD Complete popup state...');
                  setMissingDdCompleteItems(remaining.filter(f => ddCompleteFields.includes(f)));
                  setShowDueDiligenceCompletePopup(true);
                  
                  console.log('✅ DD Complete popup state set, waiting 50ms...');
                  
                  // Small delay to ensure popup is rendered
                  await new Promise(resolve => setTimeout(resolve, 50));
                  
                  console.log('✅ Clearing flag');
                  // Clear flag
                  isTransitioningPopupsRef.current = false;
                } else {
                  console.log('✅ No DD Complete requirements, calling retryPendingStageMove');
                  isTransitioningPopupsRef.current = false;
                  // All requirements fulfilled, try the move
                  await retryPendingStageMove();
                  // Clear pending state after successful move
                  setPendingStageChange(null);
                }
              } else {
                console.log('⚠️ No allRequiredFields, calling retryPendingStageMove');
                isTransitioningPopupsRef.current = false;
                // Fallback: retry stage move
                await retryPendingStageMove();
                // Clear pending state after successful move
                setPendingStageChange(null);
              }
            } catch (e: any) {
              console.error('❌ Error in DueDiligencePopup onSubmit:', e);
              // Clear pending state on error
              setPendingStageChange(null);
              toast({
                title: "Error",
                description: e.message || "Failed to update property information",
                variant: "destructive"
              });
            }
          }}
          />

          <DueDiligenceCompleteRequirementsPopup
            open={showDueDiligenceCompletePopup}
            missingItems={missingDdCompleteItems}
            onClose={() => {
              setShowDueDiligenceCompletePopup(false);
              setMissingDdCompleteItems([]);
              setPendingStageChange(null);
              
              // Show error message with guidance
              toast({
                title: "Requirements Not Met",
                description: "Please complete the required items (ARV, Comparables, Rehab Budget, Underwriting) on the Lead Detail page before moving to Due Diligence Complete.",
                variant: "destructive",
              });
            }}
          />
          
          <OfferMadePopup
            open={showOfferMadePopup}
            onClose={() => {
              setShowOfferMadePopup(false);
              setPendingStageChange(null);
            }}
            existingData={pendingStageChange?.leadToMove?.customFields || {}}
            onSubmit={async (data) => {
              if (!pendingStageChange) return;
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
              setShowOfferMadePopup(false);

              // Retry stage move; if more is missing, open the next popup automatically
              await retryPendingStageMove();
            }}
          />

          <FollowUpTaskRequiredPopup
            open={showFollowUpTaskPopup}
            onClose={() => {
              setShowFollowUpTaskPopup(false);
              setPendingStageChange(null);
            }}
            onSubmit={async ({ title, dueAt }) => {
              if (!pendingStageChange) return;
              // Create follow-up task (no notes)
              await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title,
                  dueAt: new Date(dueAt).toISOString(),
                  assignedToId: user?.id || undefined,
                }),
              });

              setShowFollowUpTaskPopup(false);

              // Retry stage move; if more is missing, open the next popup automatically
              await retryPendingStageMove();
            }}
          />

    </div>
  );
};

export default Pipeline;