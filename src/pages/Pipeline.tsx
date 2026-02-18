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
  AppointmentSetPopup,
  DueDiligencePopup,
  OfferMadePopup,
  DueDiligenceCompleteRequirementsPopup,
  FollowUpTaskRequiredPopup,
  ArvComparablesPopup,
  RehabBudgetFullPopup,
  TimelineTaxesPopup
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
  const [changingPipelineStatus, setChangingPipelineStatus] = useState(false);
  const [submittingPopup, setSubmittingPopup] = useState(false); // For popup submissions only

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
  const [showAppointmentSetPopup, setShowAppointmentSetPopup] = useState(false);
  const [showDueDiligencePopup, setShowDueDiligencePopup] = useState(false);
  const [showOfferMadePopup, setShowOfferMadePopup] = useState(false);
  const [showDueDiligenceCompletePopup, setShowDueDiligenceCompletePopup] = useState(false);
  const [showFollowUpTaskPopup, setShowFollowUpTaskPopup] = useState(false);
  const [showArvComparablesPopup, setShowArvComparablesPopup] = useState(false);
  const [showRehabBudgetPopup, setShowRehabBudgetPopup] = useState(false);
  const [showTimelineTaxesPopup, setShowTimelineTaxesPopup] = useState(false);
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
    // Use UTC to avoid timezone issues
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get UTC date at start of day (00:00:00.000 UTC)
  const getUTCStartOfDay = (year: number, month: number, day: number): Date => {
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  };

  // Helper to get UTC date at end of day (23:59:59.999 UTC)
  const getUTCEndOfDay = (year: number, month: number, day: number): Date => {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  };

  const applyPresetRange = (
    range: string,
    setFrom: (v: string) => void,
    setTo: (v: string) => void
  ) => {
    const now = new Date();
    // Get current date in UTC
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const utcDayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    let from: Date;
    let to: Date;

    switch (range) {
      case 'today': {
        // Today: 12:00:00 AM to 11:59:59 PM UTC
        from = getUTCStartOfDay(utcYear, utcMonth, utcDate);
        to = getUTCEndOfDay(utcYear, utcMonth, utcDate);
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      }
      case 'week': {
        // This Week: Sunday 12:00:00 AM to Saturday 11:59:59 PM UTC
        const daysToSunday = utcDayOfWeek; // Days to go back to Sunday
        const sundayDate = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysToSunday));
        const saturdayDate = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysToSunday + 6));
        
        from = getUTCStartOfDay(sundayDate.getUTCFullYear(), sundayDate.getUTCMonth(), sundayDate.getUTCDate());
        to = getUTCEndOfDay(saturdayDate.getUTCFullYear(), saturdayDate.getUTCMonth(), saturdayDate.getUTCDate());
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      }
      case 'month': {
        // This Month: 1st day 12:00:00 AM to last day 11:59:59 PM UTC
        const firstDay = getUTCStartOfDay(utcYear, utcMonth, 1);
        // Get last day of month
        const lastDayOfMonth = new Date(Date.UTC(utcYear, utcMonth + 1, 0));
        const lastDay = getUTCEndOfDay(lastDayOfMonth.getUTCFullYear(), lastDayOfMonth.getUTCMonth(), lastDayOfMonth.getUTCDate());
        
        from = firstDay;
        to = lastDay;
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      }
      case 'quarter': {
        // This Quarter: 1st day of quarter 12:00:00 AM to last day 11:59:59 PM UTC
        const currentQuarter = Math.floor(utcMonth / 3);
        const quarterStartMonth = currentQuarter * 3;
        const quarterEndMonth = quarterStartMonth + 3;
        
        const firstDay = getUTCStartOfDay(utcYear, quarterStartMonth, 1);
        // Get last day of quarter
        const lastDayOfQuarter = new Date(Date.UTC(utcYear, quarterEndMonth, 0));
        const lastDay = getUTCEndOfDay(lastDayOfQuarter.getUTCFullYear(), lastDayOfQuarter.getUTCMonth(), lastDayOfQuarter.getUTCDate());
        
        from = firstDay;
        to = lastDay;
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      }
      case 'year': {
        // This Year: Jan 1 12:00:00 AM to Dec 31 11:59:59 PM UTC
        from = getUTCStartOfDay(utcYear, 0, 1);
        to = getUTCEndOfDay(utcYear, 11, 31);
        setFrom(formatDateInput(from));
        setTo(formatDateInput(to));
        return;
      }
      default:
        // All Time / empty
        setFrom('');
        setTo('');
    }
  };

  // Helper function to format a single lead (same logic as in loadPipelineData)
  const formatLeadForDisplay = (lead: any, stageId?: string, stagePipelineKey?: string) => {
    // Handle address - backend returns string, but we need to handle both formats
    // Use same simple logic as initial loadPipelineData - use whatever API returns
    let addressDisplay = 'No address';
    console.log('📍 Formatting address for lead:', lead.id, 'address type:', typeof lead.address, 'address value:', lead.address);
    
    if (typeof lead.address === 'string') {
      // Backend returns concatenated string
      addressDisplay = lead.address;
    } else if (lead.address?.address1) {
      // Handle object format - use address1 like initial load does
      addressDisplay = lead.address.address1;
    }
    
    console.log('📍 Final addressDisplay:', addressDisplay);
    
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
    
    if (!ownerName || ownerName.trim() === '') {
      ownerName = 'Unknown Caller';
    }
    
    const finalStageId = stageId || lead.pipelineStageId || lead.stage || 'unknown-stage';
    const finalStagePipelineKey = stagePipelineKey || getStagePipelineKey(finalStageId);
    
    return {
      id: lead.id,
      address: addressDisplay,
      sellerName: ownerName,
      buyerName: lead.buyer ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : undefined,
      dateCreated: lead.createdAt,
      statusChangedDate: lead.stageEnteredAt || lead.updatedAt,
      lastContactDate: lead.lastContactAt || lead.updatedAt,
      lastAttemptedContactAt: lead.lastAttemptedContactAt ?? lead.lastContactAt ?? null,
      lastTouchedAt: lead.lastTouchedAt || lead.lastContactAt || lead.updatedAt,
      lastActivityAt: lead.lastActivityAt || lead.updatedAt,
      priceReduction: lead.priceReduction || false,
      clearToClose: lead.clearToClose || false,
      openTasks: lead.openTasks ?? 0,
      openTasksMine: lead.openTasksMine ?? 0,
      originalPrice: lead.deal?.contractPrice || 0,
      currentPrice: lead.deal?.soldPrice || 0,
      stage: finalStageId,
      stageName: lead.pipelineStage?.name || lead.stageName || 'Unknown Stage',
      stagePipelineKey: finalStagePipelineKey,
      assignedAgent: lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : undefined,
      leadType: lead.leadType,
      status: lead.needsAttention ? 'urgent' : 'active',
      customFields: lead.customFields,
      owners: lead.owners,
      seller: lead.seller,
      buyer: lead.buyer
    };
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
    
    // Check if moving to "Appointment Set" - ask for appointment date FIRST
    if (stageNameLower === 'appointment set') {
      console.log('📅 Appointment Set detected - showing date picker');
      setPendingStageChange({ 
        leadId, 
        newStageId, 
        stageName, 
        leadToMove 
      });
      setShowAppointmentSetPopup(true);
      return; // Don't proceed with the change yet
    }
    
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
      // Set loading state
      setChangingPipelineStatus(true);
      
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
          // NEW Priority order: appointmentDate → propertyInfo → photos → ARV+comps → rehab → timeline+taxes → offer
          // Priority order: appointmentDate → propertyInfo → photos → ARV+comps → rehab → timeline+taxes → followUpTask → offerMade
          // STEP 0: Check for appointmentDate FIRST (before all other popups)
          if (requiredFields.includes('appointmentDate')) {
            console.log('📅 Opening Appointment Set popup');
            setShowAppointmentSetPopup(true);
          } else {
            const propertyInfoFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
            
            // STEP 1: Property Info (hvacType, hvacAge, waterHeaterAge, roofAge, waterType, sewerType)
            if (requiredFields.some((f) => propertyInfoFields.includes(f))) {
              console.log('🏠 Opening property info popup');
              setMissingDdFields(requiredFields.filter((f) => propertyInfoFields.includes(f)));
              setShowDueDiligencePopup(true);
            } 
            // STEP 2: Photos
            else if (requiredFields.includes('photos')) {
              console.log('📸 Opening photo upload popup');
              setShowAppointmentPopup(true);
            } 
            // STEP 3: ARV + Comparables
            else if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
              console.log('💰 Opening ARV+Comparables popup');
              setShowArvComparablesPopup(true);
            } 
            // STEP 4: Rehab Budget
            else if (requiredFields.includes('rehabBudget')) {
              console.log('🔨 Opening Rehab Budget popup');
              setShowRehabBudgetPopup(true);
            } 
            // STEP 5: Timeline + Taxes
            else if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
              console.log('📊 Opening Timeline+Taxes popup');
              setShowTimelineTaxesPopup(true);
            } 
            // STEP 6: Follow-up Task
            else if (requiredFields.includes('followUpTask')) {
              console.log('📋 Opening follow-up task popup');
              setShowFollowUpTaskPopup(true);
            } 
            // STEP 7: Offer Made
            else if (requiredFields.includes('offerMadePrice') || requiredFields.includes('offerMadeResponse') || 
                     (stageNameLower.includes('offer') && stageNameLower.includes('made'))) {
              console.log('💼 Opening Offer Made popup');
              setShowOfferMadePopup(true);
            }
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
    } finally {
      // Always clear loading state
      setChangingPipelineStatus(false);
    }
  };

  const handleValidationRequired = (requiredFields: string[], stageNameLower: string) => {
    // Set flag when transitioning to next popup
    isTransitioningPopupsRef.current = true;
    console.log('🔄 handleValidationRequired called with fields:', requiredFields);
    
    // Priority order: appointmentDate → propertyInfo → photos → ARV+comps → rehab → timeline+taxes → followUpTask → offerMade
    // STEP 0: Check for appointmentDate FIRST (before all other popups)
    if (requiredFields.includes('appointmentDate')) {
      console.log('📅 Opening Appointment Set popup');
      setShowAppointmentSetPopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 1: Property Info (hvacType, hvacAge, waterHeaterAge, roofAge, waterType, sewerType)
    const propertyInfoFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
    const hasPropertyInfo = requiredFields.some((f) => propertyInfoFields.includes(f));
    console.log('🔍 Checking property info fields:', { hasPropertyInfo, propertyInfoFields, requiredFields });
    
    if (hasPropertyInfo) {
      console.log('🏠 Opening property info popup');
      setMissingDdFields(requiredFields.filter((f) => propertyInfoFields.includes(f)));
      setShowDueDiligencePopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 2: Photos
    if (requiredFields.includes('photos')) {
      console.log('📸 Opening photo upload popup');
      setShowAppointmentPopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 3: ARV+Comparables
    if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
      console.log('💰 Opening ARV+Comparables popup');
      setShowArvComparablesPopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 4: Rehab Budget
    if (requiredFields.includes('rehabBudget')) {
      console.log('🔨 Opening Rehab Budget popup');
      setShowRehabBudgetPopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 5: Timeline+Taxes
    if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
      console.log('📊 Opening Timeline+Taxes popup');
      setShowTimelineTaxesPopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 6: Follow-up Task
    if (requiredFields.includes('followUpTask')) {
      console.log('📋 Opening follow-up task popup');
      setShowFollowUpTaskPopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // STEP 7: Offer Made
    if (requiredFields.includes('offerMadePrice') || requiredFields.includes('offerMadeResponse') || 
        (stageNameLower.includes('offer') && stageNameLower.includes('made'))) {
      console.log('💼 Opening Offer Made popup');
      setShowOfferMadePopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // Fallback: Show requirements popup only for other DD Complete fields
    const ddCompleteFields = ['underwritingCalculation'];
    if (requiredFields.some((f) => ddCompleteFields.includes(f))) {
      setMissingDdCompleteItems(requiredFields.filter((f) => ddCompleteFields.includes(f)));
      setShowDueDiligenceCompletePopup(true);
      setTimeout(() => { isTransitioningPopupsRef.current = false; }, 300);
      return;
    }
    
    // If no popup was opened, reset flag
    console.log('⚠️ No popup matched in handleValidationRequired');
    isTransitioningPopupsRef.current = false;
  };

  const retryPendingStageMove = async () => {
    if (!pendingStageChange) return;
    const { leadId, newStageId, stageName, leadToMove } = pendingStageChange;
    const stageNameLower = (stageName || '').toLowerCase();
    
    console.log('🔄 Retrying stage move:', { leadId, newStageId, stageName });
    
    try {
      // Set loading state
      setChangingPipelineStatus(true);
      
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
          console.log('🔍 Required fields breakdown:', {
            hasAppointmentDate: requiredFields.includes('appointmentDate'),
            hasPropertyInfo: requiredFields.some(f => ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'].includes(f)),
            hasPhotos: requiredFields.includes('photos'),
            hasArv: requiredFields.includes('arv') || requiredFields.includes('comparables'),
            allFields: requiredFields
          });
          
          // ✅ Refresh lead data from backend before updating pendingStageChange
          let refreshedLead = leadToMove;
          try {
            const refreshResponse = await makeApiCall(`${API_BASE}/leads/${leadId}`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              refreshedLead = refreshData.data || refreshData;
              console.log('✅ Refreshed lead data before showing next popup:', refreshedLead);
            }
          } catch (e) {
            console.warn('⚠️ Failed to refresh lead data:', e);
          }
          
          // Update pendingStageChange with the NEW required fields (backend re-validated) and fresh lead data
          setPendingStageChange({ 
            leadId, 
            newStageId, 
            stageName, 
            leadToMove: refreshedLead,
            allRequiredFields: requiredFields 
          });
          
          handleValidationRequired(requiredFields, stageNameLower);
          return;
        }
        throw new Error(errorData?.error?.message || errorData?.error || errorData?.message || 'Failed to move lead');
      }

      console.log('✅ Stage move successful');
      
      // Fetch updated lead data from backend to get correct leadType
      try {
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
                  leadType: updatedLead.leadType, // Update leadType from backend
                  customFields: updatedLead.customFields // Update customFields from backend
                }
              : lead
          ));
        }
      } catch (e) {
        console.warn('⚠️ Failed to fetch updated lead data:', e);
      }
      
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
    } finally {
      // Always clear loading state
      setChangingPipelineStatus(false);
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
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
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
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
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
        
        {/* Popup Submission Loading Overlay - Only for popup submissions */}
        {submittingPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-sm font-medium">Saving data...</div>
              <div className="text-xs text-gray-500">Please wait</div>
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
          {pipelineStages.map(stage => {
            // Check if filters are active
            const isLastTouchedFilterActive = !!(lastTouchedFrom || lastTouchedTo);
            const isLeadCreatedFilterActive = !!(createdFrom || createdTo);
            
            return (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={getLeadsForStage(stage.id)}
                currentPipeline={currentPipeline}
                onLeadClick={handleLeadClick}
                isLastTouchedFilterActive={isLastTouchedFilterActive}
                isLeadCreatedFilterActive={isLeadCreatedFilterActive}
              />
            );
          })}
          </div>

          <DragOverlay>
          {activeLead && (() => {
            const isLastTouchedFilterActive = !!(lastTouchedFrom || lastTouchedTo);
            const isLeadCreatedFilterActive = !!(createdFrom || createdTo);
            return (
              <PipelineCard 
                lead={activeLead} 
                isDragging 
                isLastTouchedFilterActive={isLastTouchedFilterActive}
                isLeadCreatedFilterActive={isLeadCreatedFilterActive}
              />
            );
          })()}
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
          // Only clear pending state if NOT transitioning between popups
          if (!isTransitioningPopupsRef.current) {
            console.log('✅ Clearing pendingStageChange (user cancelled)');
            setPendingStageChange(null);
          } else {
            console.log('⏩ Keeping pendingStageChange (transitioning to next popup)');
          }
        }}
        leadId={pendingStageChange?.leadId || ''}
        onSubmit={async (files) => {
          if (!pendingStageChange) return;
          try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
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
                
                // ✅ STEP 3: After photos uploaded, move to Appointment Complete stage
                const appointmentCompleteStage = pipelineStages.find((s) => 
                  s.name?.toLowerCase().includes('appointment') && 
                  s.name?.toLowerCase().includes('complete')
                );
                
                if (appointmentCompleteStage && uploadedCount >= 3) {
                  try {
                    console.log('📸 Moving to Appointment Complete stage...');
                    const moveResponse = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stageId: appointmentCompleteStage.id })
                    });
                    
                    if (moveResponse.ok) {
                      console.log('✅ Successfully moved to Appointment Complete stage');
                      
                      // Update lead in state
                      setLeads(prev => prev.map(lead => 
                        lead.id === pendingStageChange.leadId 
                          ? { 
                              ...lead, 
                              stage: appointmentCompleteStage.id, 
                              stagePipelineKey: getStagePipelineKey(appointmentCompleteStage.id),
                              statusChangedDate: new Date().toISOString()
                            }
                          : lead
                      ));
                      
                      // Refresh lead data and update leads state
                      try {
                        const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                        if (refreshResponse.ok) {
                          const refreshData = await refreshResponse.json();
                          const refreshedLead = refreshData.data || refreshData;
                          
                          // Get existing lead to preserve any fields not in refreshed data
                          const existingLead = leads.find(l => l.id === pendingStageChange.leadId);
                          
                          // Merge refreshed data with existing lead data
                          // Use whatever address comes from API - no preservation, use actual data
                          const mergedLead = {
                            ...refreshedLead,
                            // Preserve existing formatted fields if refreshed data doesn't have them
                            openTasks: refreshedLead.openTasks ?? existingLead?.openTasks ?? 0,
                            openTasksMine: refreshedLead.openTasksMine ?? existingLead?.openTasksMine ?? 0,
                            priceReduction: refreshedLead.priceReduction ?? existingLead?.priceReduction ?? false,
                            clearToClose: refreshedLead.clearToClose ?? existingLead?.clearToClose ?? false,
                            originalPrice: refreshedLead.deal?.contractPrice ?? existingLead?.originalPrice ?? 0,
                            currentPrice: refreshedLead.deal?.soldPrice ?? existingLead?.currentPrice ?? 0,
                            needsAttention: refreshedLead.needsAttention ?? existingLead?.status === 'urgent',
                            lastAttemptedContactAt: refreshedLead.lastAttemptedContactAt ?? existingLead?.lastAttemptedContactAt ?? null
                          };
                          
                          // Format and update leads state with refreshed data
                          // Pass the refreshed lead data directly - formatLeadForDisplay will handle address formatting
                          const formattedLead = formatLeadForDisplay(
                            mergedLead, 
                            appointmentCompleteStage.id, 
                            getStagePipelineKey(appointmentCompleteStage.id)
                          );
                          formattedLead.statusChangedDate = new Date().toISOString();
                          
                          setLeads(prev => prev.map(lead => 
                            lead.id === pendingStageChange.leadId ? formattedLead : lead
                          ));
                          
                          setPendingStageChange(prev => prev ? {
                            ...prev,
                            leadToMove: refreshedLead
                          } : null);
                        }
                      } catch (e) {
                        console.warn('⚠️ Failed to refresh lead data after Appointment Complete move:', e);
                      }
                    } else {
                      console.warn('⚠️ Failed to move to Appointment Complete stage, continuing...');
                    }
                  } catch (e) {
                    console.warn('⚠️ Error moving to Appointment Complete stage:', e);
                  }
                }
                
                // Refresh lead data to get latest customFields for next popup
                let updatedLeadData = null;
                try {
                  const freshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshResponse.ok) {
                    const freshData = await freshResponse.json();
                    updatedLeadData = freshData.data || freshData;
                    console.log('✅ Refreshed lead data after Photos upload:', updatedLeadData);
                    
                    // Update pendingStageChange with fresh data for next popup
                    setPendingStageChange(prev => prev ? {
                      ...prev,
                      leadToMove: {
                        ...prev.leadToMove,
                        customFields: updatedLeadData.customFields
                      }
                    } : null);
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to refresh lead data:', e);
                }
                
                // Check if there are more requirements to fulfill (from the original validation response)
                if (pendingStageChange?.allRequiredFields) {
                  const remaining = pendingStageChange.allRequiredFields.filter(f => f !== 'photos');
                  console.log('📋 Remaining requirements after photos:', remaining);
                  
                  // UPDATE pendingStageChange to remove completed 'photos' field
                  setPendingStageChange(prev => prev ? {
                    ...prev,
                    allRequiredFields: remaining
                  } : null);
                  
                  if (remaining.length > 0) {
                    console.log('📋 More requirements pending:', remaining);
                    
                    // SET FLAG FIRST before any state changes!
                    isTransitioningPopupsRef.current = true;
                    
                    // Close current popup
                    setShowAppointmentPopup(false);
                    
                    // Small delay to ensure dialog closes before opening next one
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Check next requirement in priority order: arv+comps → rehab → timeline+taxes → offerMade
                    if (remaining.includes('arv') || remaining.includes('comparables')) {
                      console.log('💰 Opening ARV+Comparables popup');
                      setShowArvComparablesPopup(true);
                    } else if (remaining.includes('rehabBudget')) {
                      console.log('🔨 Opening Rehab Budget popup');
                      setShowRehabBudgetPopup(true);
                    } else if (remaining.includes('underwritingTaxes') || remaining.includes('underwritingTimeline')) {
                      console.log('📊 Opening Timeline+Taxes popup');
                      setShowTimelineTaxesPopup(true);
                    } else if (remaining.includes('offerMadePrice') || remaining.includes('offerMadeResponse')) {
                      console.log('💼 Opening Offer Made popup');
                      setShowOfferMadePopup(true);
                    } else {
                      console.log('⚠️ No matching popup found, calling retryPendingStageMove');
                      isTransitioningPopupsRef.current = false;
                      await retryPendingStageMove();
                    }
                    
                    // ✅ DON'T reset flag here - let the next popup's onSubmit reset it
                    console.log('⏩ Flag remains TRUE - waiting for next popup action');
                  } else {
                    console.log('✅ All requirements fulfilled, calling retryPendingStageMove');
                    isTransitioningPopupsRef.current = false;
                    await retryPendingStageMove();
                    setShowAppointmentPopup(false);
                  }
                } else {
                  console.log('⚠️ No allRequiredFields found, calling retryPendingStageMove');
                  isTransitioningPopupsRef.current = false;
                  await retryPendingStageMove();
                  setShowAppointmentPopup(false);
                }
              } catch (error: any) {
                console.error('Error in appointment complete flow:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to complete appointment",
                  variant: "destructive"
                });
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
              }
            }}
          />
          
          <AppointmentSetPopup
            open={showAppointmentSetPopup}
            onClose={() => {
              // Don't clear state if we're transitioning to another validation popup
              if (isTransitioningPopupsRef.current) {
                console.log('⚠️ Skipping cleanup - transitioning to next popup');
                setShowAppointmentSetPopup(false);
                return;
              }
              
              console.log('🚪 Appointment Set popup closed');
              setShowAppointmentSetPopup(false);
              setPendingStageChange(null);
            }}
            onSubmit={async (appointmentDate) => {
              if (!pendingStageChange) return;
              try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
                // Save the appointment date to customFields
                const response = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customFields: {
                      ...(pendingStageChange.leadToMove.customFields || {}),
                      appointmentDate
                    }
                  })
                });

                if (!response.ok) {
                  throw new Error('Failed to save appointment date');
                }

                console.log('✅ Appointment date saved successfully');
                
                // ✅ Refresh lead data before moving to Appointment Set stage
                let updatedLeadData = null;
                try {
                  const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    updatedLeadData = refreshData.data || refreshData;
                    console.log('✅ Refreshed lead data after Appointment date save:', updatedLeadData);
                    
                    // Update pendingStageChange with fresh data
                    setPendingStageChange(prev => prev ? {
                      ...prev,
                      leadToMove: {
                        ...prev.leadToMove,
                        customFields: updatedLeadData.customFields
                      }
                    } : null);
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to refresh lead data:', e);
                }

                // First, move to "Appointment Set" stage (if not already there)
                const appointmentSetStage = pipelineStages.find((s) => 
                  s.name?.toLowerCase() === 'appointment set'
                );
                
                const currentLead = leads.find(l => l.id === pendingStageChange.leadId);
                const currentStageId = currentLead?.stage;
                
                if (appointmentSetStage && currentStageId !== appointmentSetStage.id) {
                  try {
                    console.log('📅 Moving to Appointment Set stage first...');
                    const moveResponse = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stageId: appointmentSetStage.id })
                    });
                    
                    if (!moveResponse.ok) {
                      const errorData = await moveResponse.json().catch(() => ({}));
                      if (errorData?.error?.code !== 'VALIDATION_REQUIRED' && errorData?.code !== 'VALIDATION_REQUIRED') {
                        throw new Error(errorData?.error?.message || errorData?.error || errorData?.message || 'Failed to move to Appointment Set stage');
                      }
                      // If validation required, continue to retryPendingStageMove which will handle it
                    } else {
                      console.log('✅ Successfully moved to Appointment Set stage');
                      
                      // Update lead in state
                      setLeads(prev => prev.map(lead => 
                        lead.id === pendingStageChange.leadId 
                          ? { 
                              ...lead, 
                              stage: appointmentSetStage.id, 
                              stagePipelineKey: getStagePipelineKey(appointmentSetStage.id),
                              statusChangedDate: new Date().toISOString(),
                              customFields: {
                                ...(lead.customFields || {}),
                                appointmentDate
                              }
                            }
                          : lead
                      ));
                      
                      // Refresh lead data
                      try {
                        const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                        if (refreshResponse.ok) {
                          const refreshData = await refreshResponse.json();
                          const refreshedLead = refreshData.data || refreshData;
                          setPendingStageChange(prev => prev ? {
                            ...prev,
                            leadToMove: refreshedLead
                          } : null);
                        }
                      } catch (e) {
                        console.warn('⚠️ Failed to refresh lead data after Appointment Set move:', e);
                      }
                    }
                  } catch (e: any) {
                    console.error('❌ Failed to move to Appointment Set:', e);
                    // If moving to Appointment Set fails, show error
                    toast({
                      title: "Error",
                      description: e?.message || "Failed to move to Appointment Set stage",
                      variant: "destructive"
                    });
                    return;
                  }
                }
                
                // Now proceed with the target stage change (if different from Appointment Set)
                if (pendingStageChange && pendingStageChange.newStageId !== appointmentSetStage?.id) {
                  console.log('🔄 Proceeding with target stage move:', pendingStageChange.newStageId);
                  // Set flag BEFORE closing popup to prevent onClose from clearing pendingStageChange
                  isTransitioningPopupsRef.current = true;
                  // Close Appointment Set popup before retrying (retryPendingStageMove will open next popup if needed)
                  setShowAppointmentSetPopup(false);
                  // Retry stage move; if more is missing, open the next popup automatically
                  await retryPendingStageMove();
                } else {
                  // Already at Appointment Set or target is Appointment Set - just close popup
                  setShowAppointmentSetPopup(false);
                  if (pendingStageChange && pendingStageChange.newStageId === appointmentSetStage?.id) {
                    // We just moved to Appointment Set, clear pending status
                    setPendingStageChange(null);
                  }
                }
              } catch (error: any) {
                console.error('Error setting appointment date:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to set appointment date",
                  variant: "destructive"
                });
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
              }
            }}
          />
          
          <DueDiligencePopup
            open={showDueDiligencePopup}
            onClose={() => {
              console.log('🚨 DueDiligencePopup onClose called!');
              setShowDueDiligencePopup(false);
              // Only clear pending state if NOT transitioning between popups
              if (!isTransitioningPopupsRef.current) {
                console.log('✅ Clearing pendingStageChange (user cancelled)');
                setPendingStageChange(null);
              } else {
                console.log('⏩ Keeping pendingStageChange (transitioning to next popup)');
              }
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
              // Set loading state for popup submission
              setSubmittingPopup(true);
              
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

              // Refresh lead data to get latest customFields for next popup
              let updatedLeadData = null;
              try {
                const freshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                if (freshResponse.ok) {
                  const freshData = await freshResponse.json();
                  updatedLeadData = freshData.data || freshData;
                  console.log('✅ Refreshed lead data after Property Info save:', updatedLeadData);
                  
                  // Update pendingStageChange with fresh data for next popup
                  setPendingStageChange(prev => prev ? {
                    ...prev,
                    leadToMove: {
                      ...prev.leadToMove,
                      customFields: updatedLeadData.customFields
                    }
                  } : null);
                }
              } catch (e) {
                console.warn('⚠️ Failed to refresh lead data:', e);
              }

              // Check what's next in the validation chain
              if (pendingStageChange?.allRequiredFields) {
                const propertyInfoFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
                // Filter out the property info fields we just completed
                const remaining = pendingStageChange.allRequiredFields.filter(f => 
                  !propertyInfoFields.includes(f)
                );
                
                console.log('📋 Remaining requirements after property info:', remaining);
                
                // UPDATE pendingStageChange to remove completed fields
                setPendingStageChange(prev => prev ? {
                  ...prev,
                  allRequiredFields: remaining
                } : null);
                
                if (remaining.length > 0) {
                  // Small delay to ensure dialog closes before opening next one
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  // Check next requirement in priority order: photos → arv+comps → rehab → timeline+taxes → followUpTask → offerMade
                  if (remaining.includes('photos')) {
                    console.log('📸 Opening photo upload popup');
                    setShowAppointmentPopup(true);
                  } else if (remaining.includes('arv') || remaining.includes('comparables')) {
                    console.log('💰 Opening ARV+Comparables popup');
                    setShowArvComparablesPopup(true);
                  } else if (remaining.includes('rehabBudget')) {
                    console.log('🔨 Opening Rehab Budget popup');
                    setShowRehabBudgetPopup(true);
                  } else if (remaining.includes('underwritingTaxes') || remaining.includes('underwritingTimeline')) {
                    console.log('📊 Opening Timeline+Taxes popup');
                    setShowTimelineTaxesPopup(true);
                  } else if (remaining.includes('followUpTask')) {
                    console.log('📋 Opening follow-up task popup');
                    setShowFollowUpTaskPopup(true);
                  } else if (remaining.includes('offerMadePrice') || remaining.includes('offerMadeResponse')) {
                    console.log('💼 Opening Offer Made popup');
                    setShowOfferMadePopup(true);
                  } else {
                    console.log('✅ All requirements fulfilled, retrying stage move');
                    isTransitioningPopupsRef.current = false;
                    await retryPendingStageMove();
                  }
                  
                  // ✅ DON'T reset flag here - let the next popup's onSubmit reset it
                  console.log('⏩ Flag remains TRUE - waiting for next popup action');
                } else {
                  console.log('✅ No more requirements, checking photos before stage move...');
                  
                  // Check if target stage requires photos (similar to LeadEdit)
                  if (pendingStageChange?.newStageId) {
                    const targetStage = pipelineStages.find(s => s.id === pendingStageChange.newStageId);
                    const appointmentCompleteStage = pipelineStages.find(s => 
                      s.name?.toLowerCase() === 'appointment complete'
                    );
                    
                    if (targetStage && appointmentCompleteStage && targetStage.id === appointmentCompleteStage.id) {
                      console.log('🔍 Target stage: Appointment Complete - checking photos...');
                      try {
                        const photosResponse = await makeApiCall(`${API_BASE}/files/lead/${pendingStageChange.leadId}`);
                        if (photosResponse.ok) {
                          const photosData = await photosResponse.json();
                          const photoFiles = (photosData.data || []).filter((file: any) => {
                            const category = (file?.category || '').toString().toLowerCase();
                            return category === 'photos' || category === 'photo';
                          });
                          const photoCount = photoFiles.length;
                          
                          console.log(`📸 Current photo count: ${photoCount}`);
                          
                          if (photoCount < 3) {
                            console.log(`📸 Only ${photoCount} photos found, need 3. Opening photos popup BEFORE stage move.`);
                            isTransitioningPopupsRef.current = true;
                            setShowDueDiligencePopup(false);
                            setShowAppointmentPopup(true);
                            setTimeout(() => { isTransitioningPopupsRef.current = false; }, 100);
                            return;
                          } else {
                            console.log(`✅ Photo count is sufficient (${photoCount} >= 3). Proceeding with stage move.`);
                          }
                        }
                      } catch (photoError) {
                        console.warn('⚠️ Failed to check photos count:', photoError);
                        // Continue with stage move attempt if photo check fails
                      }
                    }
                  }
                  
                  isTransitioningPopupsRef.current = false;
                  // All requirements fulfilled, try the move
                  await retryPendingStageMove();
                  // Clear pending state after successful move
                  setPendingStageChange(null);
                }
              } else {
                console.log('⚠️ No allRequiredFields, checking photos before retry...');
                
                // Check if target stage requires photos (similar to LeadEdit)
                if (pendingStageChange?.newStageId) {
                  const targetStage = pipelineStages.find(s => s.id === pendingStageChange.newStageId);
                  const appointmentCompleteStage = pipelineStages.find(s => 
                    s.name?.toLowerCase() === 'appointment complete'
                  );
                  
                  if (targetStage && appointmentCompleteStage && targetStage.id === appointmentCompleteStage.id) {
                    console.log('🔍 Target stage: Appointment Complete - checking photos...');
                    try {
                      const photosResponse = await makeApiCall(`${API_BASE}/files/lead/${pendingStageChange.leadId}`);
                      if (photosResponse.ok) {
                        const photosData = await photosResponse.json();
                        const photoFiles = (photosData.data || []).filter((file: any) => {
                          const category = (file?.category || '').toString().toLowerCase();
                          return category === 'photos' || category === 'photo';
                        });
                        const photoCount = photoFiles.length;
                        
                        console.log(`📸 Current photo count: ${photoCount}`);
                        
                        if (photoCount < 3) {
                          console.log(`📸 Only ${photoCount} photos found, need 3. Opening photos popup BEFORE stage move.`);
                          isTransitioningPopupsRef.current = true;
                          setShowDueDiligencePopup(false);
                          setShowAppointmentPopup(true);
                          setTimeout(() => { isTransitioningPopupsRef.current = false; }, 100);
                          return;
                        } else {
                          console.log(`✅ Photo count is sufficient (${photoCount} >= 3). Proceeding with stage move.`);
                        }
                      }
                    } catch (photoError) {
                      console.warn('⚠️ Failed to check photos count:', photoError);
                      // Continue with stage move attempt if photo check fails
                    }
                  }
                }
                
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
            } finally {
              // Always clear loading state
              setSubmittingPopup(false);
            }
          }}
          />

          <ArvComparablesPopup
            open={showArvComparablesPopup}
            onClose={() => {
              console.log('🚪 ARV+Comparables popup closed');
              setShowArvComparablesPopup(false);
              // Only clear pending state if NOT transitioning between popups
              if (!isTransitioningPopupsRef.current) {
                console.log('✅ Clearing pendingStageChange (user cancelled)');
                setPendingStageChange(null);
              } else {
                console.log('⏩ Keeping pendingStageChange (transitioning to next popup)');
              }
            }}
            existingData={pendingStageChange?.leadToMove?.customFields}
            onSubmit={async (data) => {
              console.log('🎯 ArvComparablesPopup onSubmit called');
              console.log('🎯 pendingStageChange:', pendingStageChange);
              
              if (!pendingStageChange) {
                console.error('❌ pendingStageChange is null! Cannot proceed.');
                return;
              }
              
              try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
                // ✅ Reset flag at start of submit - this popup is now "active"
                isTransitioningPopupsRef.current = false;
                console.log('🔄 Reset flag to FALSE - popup is now handling submit');
                
                // Now set it again for next transition
                isTransitioningPopupsRef.current = true;
                
                console.log('📤 Starting ARV+Comparables save...');
                
                // Fetch fresh customFields
                let freshCustomFields = {};
                try {
                  const freshLeadResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshLeadResponse.ok) {
                    const freshLeadData = await freshLeadResponse.json();
                    freshCustomFields = (freshLeadData.data || freshLeadData).customFields || {};
                  }
                } catch (e) {
                  freshCustomFields = pendingStageChange.leadToMove.customFields || {};
                }
                
                // Update ARV in customFields
                await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customFields: {
                      ...freshCustomFields,
                      arv: data.arv
                    }
                  })
                });
                
                // Upload comparables PDFs if provided
                if (data.comparablesFiles && data.comparablesFiles.length > 0) {
                  let uploadedCount = 0;
                  let failedCount = 0;
                  
                  for (const file of data.comparablesFiles) {
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      const uploadResponse = await makeApiCall(`${API_BASE}/comps/leads/${pendingStageChange.leadId}/pdfs`, {
                        method: 'POST',
                        body: formData
                      });

                      if (uploadResponse.ok) {
                        uploadedCount++;
                        console.log('✅ Comparables PDF uploaded:', file.name);
                      } else {
                        failedCount++;
                        console.error('❌ Failed to upload comparables PDF:', file.name);
                        toast({
                          title: "Upload Error",
                          description: `Failed to upload ${file.name}`,
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      failedCount++;
                      console.error('❌ Error uploading comparables PDF:', file.name, error);
                      toast({
                        title: "Upload Error",
                        description: `Failed to upload ${file.name}`,
                        variant: "destructive"
                      });
                    }
                  }
                  
                  console.log(`📄 Uploaded ${uploadedCount} of ${data.comparablesFiles.length} comparables PDFs`);
                  if (failedCount > 0 && uploadedCount > 0) {
                    toast({
                      title: "Partial Upload",
                      description: `Uploaded ${uploadedCount} of ${data.comparablesFiles.length} files. ${failedCount} failed.`,
                      variant: "destructive"
                    });
                  } else if (failedCount === data.comparablesFiles.length) {
                    throw new Error('Failed to upload all comparables PDFs');
                  }
                }
                
                setShowArvComparablesPopup(false);
                
                // Refresh lead data to get latest customFields for next popup
                let updatedLeadData = null;
                try {
                  const freshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshResponse.ok) {
                    const freshData = await freshResponse.json();
                    updatedLeadData = freshData.data || freshData;
                    console.log('✅ Refreshed lead data after ARV save:', updatedLeadData);
                    
                    // Update pendingStageChange with fresh data for next popup
                    setPendingStageChange(prev => prev ? {
                      ...prev,
                      leadToMove: {
                        ...prev.leadToMove,
                        customFields: updatedLeadData.customFields
                      }
                    } : null);
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to refresh lead data:', e);
                }
                
                // Check what's next
                if (pendingStageChange?.allRequiredFields) {
                  const remaining = pendingStageChange.allRequiredFields.filter(f => 
                    f !== 'arv' && f !== 'comparables'
                  );
                  
                  // UPDATE pendingStageChange to remove completed fields
                  setPendingStageChange(prev => prev ? {
                    ...prev,
                    allRequiredFields: remaining
                  } : null);
                  
                  if (remaining.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (remaining.includes('rehabBudget')) {
                      setShowRehabBudgetPopup(true);
                    } else if (remaining.includes('underwritingTaxes') || remaining.includes('underwritingTimeline')) {
                      setShowTimelineTaxesPopup(true);
                    } else {
                      isTransitioningPopupsRef.current = false;
                      await retryPendingStageMove();
                    }
                    
                    // ✅ DON'T reset flag here - let the next popup's onSubmit reset it
                    console.log('⏩ Flag remains TRUE - waiting for next popup action');
                  } else {
                    isTransitioningPopupsRef.current = false;
                    await retryPendingStageMove();
                  }
                } else {
                  isTransitioningPopupsRef.current = false;
                  await retryPendingStageMove();
                }
              } catch (error: any) {
                console.error('Error in ARV+Comparables flow:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to save ARV and comparables",
                  variant: "destructive"
                });
                isTransitioningPopupsRef.current = false;
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
              }
            }}
          />

          <RehabBudgetFullPopup
            open={showRehabBudgetPopup}
            onClose={() => {
              console.log('🚪 Rehab Budget popup closed');
              setShowRehabBudgetPopup(false);
              // Only clear pending state if NOT transitioning between popups
              if (!isTransitioningPopupsRef.current) {
                console.log('✅ Clearing pendingStageChange (user cancelled)');
                setPendingStageChange(null);
              } else {
                console.log('⏩ Keeping pendingStageChange (transitioning to next popup)');
              }
            }}
            existingData={pendingStageChange?.leadToMove?.customFields}
            sqft={pendingStageChange?.leadToMove?.customFields?.sqft}
            onSubmit={async (data) => {
              console.log('🎯 RehabBudgetFullPopup onSubmit called');
              console.log('🎯 pendingStageChange:', pendingStageChange);
              
              if (!pendingStageChange) {
                console.error('❌ pendingStageChange is null! Cannot proceed.');
                return;
              }
              
              try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
                // ✅ Reset flag at start of submit - this popup is now "active"
                isTransitioningPopupsRef.current = false;
                console.log('🔄 Reset flag to FALSE - popup is now handling submit');
                
                // Now set it again for next transition
                isTransitioningPopupsRef.current = true;
                
                console.log('📤 Starting rehab budget save...');
                
                // Fetch fresh customFields
                let freshCustomFields = {};
                try {
                  const freshLeadResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshLeadResponse.ok) {
                    const freshLeadData = await freshLeadResponse.json();
                    freshCustomFields = (freshLeadData.data || freshLeadData).customFields || {};
                  }
                } catch (e) {
                  freshCustomFields = pendingStageChange.leadToMove.customFields || {};
                }
                
                // Calculate custom misc total
                const miscValueNum = data.rehabCustomValues?.miscValue || 0;
                const subtotalWithCustom = (data.calculation?.subtotal || 0) + miscValueNum;
                const contingencyWithCustom = subtotalWithCustom * 0.10;
                const totalWithCustom = subtotalWithCustom + contingencyWithCustom;
                
                // Save to rehab-budget endpoint (matches RehabBudgetCalculatorCompact)
                const rehabBudgetPayload = {
                  finishLevel: data.rehabFinishLevel,
                  toggledItems: data.rehabToggledItems,
                  customValues: {
                    miscLabel: data.rehabCustomValues?.miscLabel || '',
                    miscValue: miscValueNum,
                    miscLines: [{ 
                      label: data.rehabCustomValues?.miscLabel || '', 
                      value: miscValueNum 
                    }],
                  },
                  subtotal: subtotalWithCustom,
                  contingencyAmount: contingencyWithCustom,
                  totalCost: totalWithCustom
                };
                
                const rehabResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}/rehab-budget`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(rehabBudgetPayload)
                });

                if (!rehabResponse.ok) {
                  const errorData = await rehabResponse.json();
                  console.error('❌ Rehab budget save failed:', errorData);
                  throw new Error(errorData.error || 'Failed to save rehab budget');
                }
                
                // Also update customFields for bathrooms, sqft, and rehabBudget total (for validation)
                await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customFields: {
                      ...freshCustomFields,
                      rehabFinishLevel: data.rehabFinishLevel,
                      rehabNumberOfWindows: data.rehabNumberOfWindows,
                      rehabToggledItems: data.rehabToggledItems,
                      rehabCustomValues: data.rehabCustomValues,
                      rehabBudget: totalWithCustom, // ✅ CRITICAL: Save total for backend validation
                      // Save rehab bathrooms independently (NOT synced with Property Information)
                      ...(data.bathrooms !== undefined && data.bathrooms !== null ? { rehabBathrooms: data.bathrooms } : {}),
                      // Sync sqft with Property Information
                      ...(data.sqft !== undefined ? { sqft: data.sqft } : {})
                    }
                  })
                });
                
                setShowRehabBudgetPopup(false);
                
                // Refresh lead data to get latest customFields for next popup
                let updatedLeadData = null;
                try {
                  const freshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshResponse.ok) {
                    const freshData = await freshResponse.json();
                    updatedLeadData = freshData.data || freshData;
                    console.log('✅ Refreshed lead data after Rehab Budget save:', updatedLeadData);
                    
                    // Update pendingStageChange with fresh data for next popup
                    setPendingStageChange(prev => prev ? {
                      ...prev,
                      leadToMove: {
                        ...prev.leadToMove,
                        customFields: updatedLeadData.customFields
                      }
                    } : null);
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to refresh lead data:', e);
                }
                
                // Check what's next
                if (pendingStageChange?.allRequiredFields) {
                  const remaining = pendingStageChange.allRequiredFields.filter(f => 
                    f !== 'rehabBudget'
                  );
                  
                  // UPDATE pendingStageChange to remove completed fields
                  setPendingStageChange(prev => prev ? {
                    ...prev,
                    allRequiredFields: remaining
                  } : null);
                  
                  if (remaining.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (remaining.includes('underwritingTaxes') || remaining.includes('underwritingTimeline')) {
                      setShowTimelineTaxesPopup(true);
                    } else {
                      isTransitioningPopupsRef.current = false;
                      await retryPendingStageMove();
                    }
                    
                    // ✅ DON'T reset flag here - let the next popup's onSubmit reset it
                    console.log('⏩ Flag remains TRUE - waiting for next popup action');
                  } else {
                    isTransitioningPopupsRef.current = false;
                    await retryPendingStageMove();
                  }
                } else {
                  isTransitioningPopupsRef.current = false;
                  await retryPendingStageMove();
                }
              } catch (error: any) {
                console.error('Error in Rehab Budget flow:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to save rehab budget",
                  variant: "destructive"
                });
                isTransitioningPopupsRef.current = false;
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
              }
            }}
          />

          <TimelineTaxesPopup
            open={showTimelineTaxesPopup}
            onClose={() => {
              console.log('🚪 Timeline+Taxes popup closed');
              setShowTimelineTaxesPopup(false);
              // Only clear pending state if NOT transitioning between popups
              if (!isTransitioningPopupsRef.current) {
                console.log('✅ Clearing pendingStageChange (user cancelled)');
                setPendingStageChange(null);
              } else {
                console.log('⏩ Keeping pendingStageChange (transitioning to next popup)');
              }
            }}
            existingData={pendingStageChange?.leadToMove?.customFields}
            onSubmit={async (data) => {
              console.log('🎯 TimelineTaxesPopup onSubmit called');
              console.log('🎯 pendingStageChange:', pendingStageChange);
              
              if (!pendingStageChange) {
                console.error('❌ pendingStageChange is null! Cannot proceed.');
                return;
              }
              
              try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
                // ✅ Reset flag at start of submit - this popup is now "active"
                isTransitioningPopupsRef.current = false;
                console.log('🔄 Reset flag to FALSE - popup is now handling submit');
                
                // Now set it again for next transition
                isTransitioningPopupsRef.current = true;
                
                console.log('📤 Starting Timeline+Taxes save...');
                
                // Fetch fresh customFields
                let freshCustomFields = {};
                try {
                  const freshLeadResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshLeadResponse.ok) {
                    const freshLeadData = await freshLeadResponse.json();
                    freshCustomFields = (freshLeadData.data || freshLeadData).customFields || {};
                  }
                } catch (e) {
                  freshCustomFields = pendingStageChange.leadToMove.customFields || {};
                }
                
                // Update timeline and taxes in customFields
                await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customFields: {
                      ...freshCustomFields,
                      underwritingTimeline: data.underwritingTimeline,
                      underwritingTaxes: data.underwritingTaxes
                    }
                  })
                });
                
                setShowTimelineTaxesPopup(false);
                
                // ✅ STEP 6: After Timeline+Taxes saved, move to Due Diligence Complete stage
                const dueDiligenceCompleteStage = pipelineStages.find((s) => 
                  s.name?.toLowerCase().includes('due diligence') && 
                  s.name?.toLowerCase().includes('complete')
                );
                
                if (dueDiligenceCompleteStage) {
                  try {
                    console.log('📊 Moving to Due Diligence Complete stage...');
                    const moveResponse = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stageId: dueDiligenceCompleteStage.id })
                    });
                    
                    if (moveResponse.ok) {
                      console.log('✅ Successfully moved to Due Diligence Complete stage');
                      
                      // Refresh lead data and update leads state
                      try {
                        const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                        if (refreshResponse.ok) {
                          const refreshData = await refreshResponse.json();
                          const refreshedLead = refreshData.data || refreshData;
                          console.log('🔄 Refreshed lead data after Due Diligence Complete:', {
                            id: refreshedLead.id,
                            address: refreshedLead.address,
                            addressType: typeof refreshedLead.address
                          });
                          
                          // Get existing lead to preserve any fields not in refreshed data
                          const existingLead = leads.find(l => l.id === pendingStageChange.leadId);
                          
                          // Merge refreshed data with existing lead data
                          // Use whatever address comes from API - no preservation, use actual data
                          const mergedLead = {
                            ...refreshedLead,
                            // Preserve existing formatted fields if refreshed data doesn't have them
                            openTasks: refreshedLead.openTasks ?? existingLead?.openTasks ?? 0,
                            openTasksMine: refreshedLead.openTasksMine ?? existingLead?.openTasksMine ?? 0,
                            priceReduction: refreshedLead.priceReduction ?? existingLead?.priceReduction ?? false,
                            clearToClose: refreshedLead.clearToClose ?? existingLead?.clearToClose ?? false,
                            originalPrice: refreshedLead.deal?.contractPrice ?? existingLead?.originalPrice ?? 0,
                            currentPrice: refreshedLead.deal?.soldPrice ?? existingLead?.currentPrice ?? 0,
                            needsAttention: refreshedLead.needsAttention ?? existingLead?.status === 'urgent',
                            lastAttemptedContactAt: refreshedLead.lastAttemptedContactAt ?? existingLead?.lastAttemptedContactAt ?? null
                          };
                          
                          // Format and update leads state with refreshed data
                          const formattedLead = formatLeadForDisplay(
                            mergedLead, 
                            dueDiligenceCompleteStage.id, 
                            getStagePipelineKey(dueDiligenceCompleteStage.id)
                          );
                          formattedLead.statusChangedDate = new Date().toISOString();
                          console.log('✅ Formatted lead after Due Diligence Complete:', {
                            id: formattedLead.id,
                            address: formattedLead.address
                          });
                          
                          setLeads(prev => prev.map(lead => 
                            lead.id === pendingStageChange.leadId ? formattedLead : lead
                          ));
                          
                          setPendingStageChange(prev => prev ? {
                            ...prev,
                            leadToMove: refreshedLead
                          } : null);
                        }
                      } catch (e) {
                        console.warn('⚠️ Failed to refresh lead data after Due Diligence Complete move:', e);
                      }
                    } else {
                      console.warn('⚠️ Failed to move to Due Diligence Complete stage, continuing...');
                    }
                  } catch (e) {
                    console.warn('⚠️ Error moving to Due Diligence Complete stage:', e);
                  }
                }
                
                // ✅ Refresh lead data before checking next requirements
                let updatedLeadData = null;
                try {
                  const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    updatedLeadData = refreshData.data || refreshData;
                    console.log('✅ Refreshed lead data after Timeline+Taxes save:', updatedLeadData);
                    
                    // Update pendingStageChange with fresh data
                    setPendingStageChange(prev => prev ? {
                      ...prev,
                      leadToMove: {
                        ...prev.leadToMove,
                        customFields: updatedLeadData.customFields
                      }
                    } : null);
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to refresh lead data:', e);
                }
                
                // ✅ STEP 7: After Due Diligence Complete, try to move to target stage (Offer Made)
                // This will trigger validation and show Offer Made popup if needed
                console.log('🔍 Checking if we need to move to target stage after Due Diligence Complete');
                console.log('🔍 pendingStageChange:', pendingStageChange);
                console.log('🔍 newStageId:', pendingStageChange?.newStageId);
                
                if (pendingStageChange?.newStageId) {
                  const targetStage = pipelineStages.find(s => s.id === pendingStageChange.newStageId);
                  const dueDiligenceCompleteStage = pipelineStages.find(s => 
                    s.name?.toLowerCase().includes('due diligence') && 
                    s.name?.toLowerCase().includes('complete')
                  );
                  
                  console.log('🔍 targetStage:', targetStage?.name);
                  console.log('🔍 dueDiligenceCompleteStage:', dueDiligenceCompleteStage?.name);
                  console.log('🔍 Are they different?', targetStage?.id !== dueDiligenceCompleteStage?.id);
                  
                  // Only try to move to target if it's different from Due Diligence Complete
                  if (targetStage && dueDiligenceCompleteStage && targetStage.id !== dueDiligenceCompleteStage.id) {
                    console.log('🔄 Attempting to move to target stage after Due Diligence Complete:', targetStage.name);
                    isTransitioningPopupsRef.current = true;
                    setShowTimelineTaxesPopup(false);
                    
                    // Small delay to ensure popup closes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Try to move to target stage - this will trigger validation and show Offer Made popup
                    await retryPendingStageMove();
                    return;
                  } else {
                    console.log('⚠️ Cannot move to target stage - conditions not met');
                    console.log('⚠️ targetStage exists:', !!targetStage);
                    console.log('⚠️ dueDiligenceCompleteStage exists:', !!dueDiligenceCompleteStage);
                    console.log('⚠️ IDs are different:', targetStage?.id !== dueDiligenceCompleteStage?.id);
                  }
                } else {
                  console.log('⚠️ No pendingStageChange or newStageId');
                }
                
                // No more requirements, clear pending state
                console.log('✅ Clearing pending state - no more requirements');
                isTransitioningPopupsRef.current = false;
                setPendingStageChange(null);
                setShowTimelineTaxesPopup(false);
              } catch (error: any) {
                console.error('Error in Timeline+Taxes flow:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to save timeline and taxes",
                  variant: "destructive"
                });
                isTransitioningPopupsRef.current = false;
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
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
              try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
                // ✅ Fetch fresh customFields first
                let freshCustomFields = {};
                try {
                  const freshLeadResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (freshLeadResponse.ok) {
                    const freshLeadData = await freshLeadResponse.json();
                    freshCustomFields = (freshLeadData.data || freshLeadData).customFields || {};
                  }
                } catch (e) {
                  freshCustomFields = pendingStageChange.leadToMove.customFields || {};
                }
                
                // Update lead with offer info (merge with fresh data)
                await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customFields: {
                      ...freshCustomFields,
                      ...data
                    }
                  })
                });
                
                console.log('✅ Offer data saved successfully');
                
                // ✅ Refresh lead data before moving to Offer Made stage
                let updatedLeadData = null;
                try {
                  const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                  if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    updatedLeadData = refreshData.data || refreshData;
                    console.log('✅ Refreshed lead data after Offer save:', updatedLeadData);
                    
                    // Update pendingStageChange with fresh data
                    setPendingStageChange(prev => prev ? {
                      ...prev,
                      leadToMove: {
                        ...prev.leadToMove,
                        customFields: updatedLeadData.customFields
                      }
                    } : null);
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to refresh lead data:', e);
                }

                // First, move to "Offer Made" stage (if not already there)
                const offerMadeStage = pipelineStages.find((s) => 
                  s.name?.toLowerCase().includes('offer') && 
                  s.name?.toLowerCase().includes('made')
                );
                
                const currentLead = leads.find(l => l.id === pendingStageChange.leadId);
                const currentStageId = currentLead?.stage;
                
                if (offerMadeStage && currentStageId !== offerMadeStage.id) {
                  try {
                    console.log('💰 Moving to Offer Made stage...');
                    const moveResponse = await makeApiCall(`${API_BASE}/pipeline/leads/${pendingStageChange.leadId}/move`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stageId: offerMadeStage.id })
                    });
                    
                    if (!moveResponse.ok) {
                      const errorData = await moveResponse.json().catch(() => ({}));
                      if (errorData?.error?.code !== 'VALIDATION_REQUIRED' && errorData?.code !== 'VALIDATION_REQUIRED') {
                        throw new Error(errorData?.error?.message || errorData?.error || errorData?.message || 'Failed to move to Offer Made stage');
                      }
                      // If validation required, continue to retryPendingStageMove which will handle it
                    } else {
                      console.log('✅ Successfully moved to Offer Made stage');
                      
                      // Update lead in state
                      setLeads(prev => prev.map(lead => 
                        lead.id === pendingStageChange.leadId 
                          ? { 
                              ...lead, 
                              stage: offerMadeStage.id, 
                              stagePipelineKey: getStagePipelineKey(offerMadeStage.id),
                              statusChangedDate: new Date().toISOString()
                            }
                          : lead
                      ));
                      
                      // Refresh lead data and update leads state
                      try {
                        const refreshResponse = await makeApiCall(`${API_BASE}/leads/${pendingStageChange.leadId}`);
                        if (refreshResponse.ok) {
                          const refreshData = await refreshResponse.json();
                          const refreshedLead = refreshData.data || refreshData;
                          console.log('🔄 Refreshed lead data after Offer Made:', {
                            id: refreshedLead.id,
                            address: refreshedLead.address,
                            addressType: typeof refreshedLead.address
                          });
                          
                          // Update leads state with refreshed data
                          // Get existing lead to preserve any fields not in refreshed data
                          const existingLead = leads.find(l => l.id === pendingStageChange.leadId);
                          
                          // Merge refreshed data with existing lead data
                          // Use whatever address comes from API - no preservation, use actual data
                          const mergedLead = {
                            ...refreshedLead,
                            // Preserve existing formatted fields if refreshed data doesn't have them
                            openTasks: refreshedLead.openTasks ?? existingLead?.openTasks ?? 0,
                            openTasksMine: refreshedLead.openTasksMine ?? existingLead?.openTasksMine ?? 0,
                            priceReduction: refreshedLead.priceReduction ?? existingLead?.priceReduction ?? false,
                            clearToClose: refreshedLead.clearToClose ?? existingLead?.clearToClose ?? false,
                            originalPrice: refreshedLead.deal?.contractPrice ?? existingLead?.originalPrice ?? 0,
                            currentPrice: refreshedLead.deal?.soldPrice ?? existingLead?.currentPrice ?? 0,
                            needsAttention: refreshedLead.needsAttention ?? existingLead?.status === 'urgent',
                            lastAttemptedContactAt: refreshedLead.lastAttemptedContactAt ?? existingLead?.lastAttemptedContactAt ?? null
                          };
                          
                          // Format and update leads state with refreshed data
                          const formattedLead = formatLeadForDisplay(
                            mergedLead, 
                            offerMadeStage.id, 
                            getStagePipelineKey(offerMadeStage.id)
                          );
                          formattedLead.statusChangedDate = new Date().toISOString();
                          console.log('✅ Formatted lead after Offer Made:', {
                            id: formattedLead.id,
                            address: formattedLead.address
                          });
                          
                          setLeads(prev => prev.map(lead => 
                            lead.id === pendingStageChange.leadId ? formattedLead : lead
                          ));
                          
                          setPendingStageChange(prev => prev ? {
                            ...prev,
                            leadToMove: refreshedLead
                          } : null);
                        }
                      } catch (e) {
                        console.warn('⚠️ Failed to refresh lead data after Offer Made move:', e);
                      }
                    }
                  } catch (e: any) {
                    console.error('❌ Failed to move to Offer Made:', e);
                    // If moving to Offer Made fails, show error
                    toast({
                      title: "Error",
                      description: e?.message || "Failed to move to Offer Made stage",
                      variant: "destructive"
                    });
                    return;
                  }
                }
                
                // Now proceed with the target stage change (if different from Offer Made)
                if (pendingStageChange && pendingStageChange.newStageId !== offerMadeStage?.id) {
                  console.log('🔄 Proceeding with target stage move:', pendingStageChange.newStageId);
                  // Close Offer Made popup before retrying (retryPendingStageMove will open next popup if needed)
                  setShowOfferMadePopup(false);
                  // Retry stage move; if more is missing, open the next popup automatically
                  await retryPendingStageMove();
                } else {
                  // Already at Offer Made or target is Offer Made - just close popup
                  setShowOfferMadePopup(false);
                  if (pendingStageChange && pendingStageChange.newStageId === offerMadeStage?.id) {
                    // We just moved to Offer Made, clear pending status
                    setPendingStageChange(null);
                  }
                }
              } catch (error: any) {
                console.error('Error in Offer Made flow:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to save offer",
                  variant: "destructive"
                });
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
              }
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
              try {
                // Set loading state for popup submission
                setSubmittingPopup(true);
                
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
              } catch (error: any) {
                console.error('Error creating follow-up task:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to create follow-up task",
                  variant: "destructive"
                });
              } finally {
                // Always clear loading state
                setSubmittingPopup(false);
              }
            }}
          />

    </div>
  );
};

export default Pipeline;