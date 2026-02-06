import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  Plus,
  X,
  Save,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  CheckSquare,
  Clock,
  Upload,
  Download,
  Trash,
  Trash2,
  DollarSign,
  Wrench,
  Loader2,
  AlertCircle,
  PhoneCall,
  PhoneOff,
  Send,
  RefreshCw,
  Image,
  ClipboardList,
  Check
} from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTwilioContext } from '@/contexts/TwilioContext';
import { usePipelineNav } from '@/contexts/PipelineNavContext';
import { CompsManager } from '@/components/CompsManager';
import { LeadTimeline } from '@/components/LeadTimeline';
import { 
  AppointmentCompletePopup,
  DueDiligencePopup,
  OfferMadePopup,
  DueDiligenceCompleteRequirementsPopup,
  FollowUpTaskRequiredPopup,
  AppointmentSetPopup,
  ArvComparablesPopup,
  RehabBudgetFullPopup,
  TimelineTaxesPopup
} from '@/components/StageTransitionPopups';
import { PropertyInfoCard } from '@/components/PropertyInfoCard';
import { RehabBudgetCalculatorCompact } from '@/components/RehabBudgetCalculatorCompact';
import { UnderwritingCalculator } from '@/components/UnderwritingCalculator';
import { ProjectionsSheet } from '@/components/ProjectionsSheet';
import { UnifiedCommunicationFeed } from '@/components/UnifiedCommunicationFeed';
import { PhoneInput } from '@/components/PhoneInput';
import { normalizeUsPhoneToE164 } from '@/utils/phone';
import { formatUsPhoneForDisplay } from '@/utils/phone';
import { LeadOwnerSection, type LeadOwnerSectionRef } from '@/components/LeadOwnerSection';
import { LeadFileGallery } from '@/components/LeadFileGallery';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

interface LeadParty {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

interface LeadOwner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  order: number;
}

interface LeadData {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  stageEnteredAt?: string;
  lastContactAt?: string;
  leadType?: 'SELLER' | 'BUYER' | 'VENDOR' | string;
  pipelineStageId?: string;
  assignedUserId?: string;
  // Backend schema uses dispAgentId (Disposition agent)
  dispAgentId?: string;
  leadSource?: any;
  leadStatus?: any;
  customFields?: Record<string, any>;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;  // Database uses 'zip' field
    zipCode?: string;  // For backward compatibility
    [key: string]: any;
  };
  seller?: LeadParty;
  buyer?: LeadParty;
  vendor?: LeadParty;
  contacts: Contact[];
  [key: string]: any;
}

const LeadEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: pipelineNavState, getPrevNext } = usePipelineNav();
  const { toast } = useToast();
  // Lead Detail UX: show toasts ONLY for errors (suppress success/info toasts)
  const showSuccessToasts = false;
  const { user } = useAuth();
  const hasPipelineNavContext = !!pipelineNavState?.leadIds?.length;
  const { prevLeadId, nextLeadId } = getPrevNext(id || '');
  const [fallbackNav, setFallbackNav] = useState<{ prevLeadId: string | null; nextLeadId: string | null } | null>(null);

  const effectivePrevLeadId = hasPipelineNavContext ? prevLeadId : (fallbackNav?.prevLeadId ?? null);
  const effectiveNextLeadId = hasPipelineNavContext ? nextLeadId : (fallbackNav?.nextLeadId ?? null);

  // Track which fields have been modified (dirty fields)
  const dirtyFieldsRef = useRef<Set<string>>(new Set());
  const markFieldDirty = useCallback((fieldName: string) => {
    dirtyFieldsRef.current.add(fieldName);
  }, []);

  // Fallback: if LeadEdit is opened via refresh/direct link, fetch prev/next from backend
  useEffect(() => {
    const run = async () => {
      if (!id) return;
      if (hasPipelineNavContext) {
        setFallbackNav(null);
        return;
      }

      try {
        const response = await makeApiCall(`${API_BASE}/pipeline/nav?currentLeadId=${encodeURIComponent(id)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data?.success && data?.data) {
          setFallbackNav({
            prevLeadId: data.data.prevLeadId ?? null,
            nextLeadId: data.data.nextLeadId ?? null,
          });
        }
      } catch {
        // silent fallback: keep buttons disabled if nav can't be computed
      }
    };

    void run();
  }, [id, hasPipelineNavContext]);

  const userRoles = (user?.roles || []) as string[];
  const isAcqOnlyUser =
    userRoles.includes('ACQ') &&
    !userRoles.some((r) => ['ADMIN', 'MANAGER', 'TC', 'EXECUTIVE', 'DISP'].includes(r));
  const canSeeTransactionsTab = !isAcqOnlyUser;
  const canSeeDispositionsTab = !isAcqOnlyUser;
  const tabCount = 2 + (canSeeTransactionsTab ? 1 : 0) + (canSeeDispositionsTab ? 1 : 0);
  const tabsGridColsClass = tabCount === 4 ? 'grid-cols-4' : tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2';
  
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPipelineStatus, setChangingPipelineStatus] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Autosave state (Lead Detail page)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveError, setAutoSaveError] = useState<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef<Promise<void> | null>(null);
  const autoSavePendingRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>('');
  const lastSavedAtRef = useRef<number | null>(null);
  // Prevent "first render / hydration" races from wiping fields via autosave.
  // We only allow autosave (and payload diffs that can clear fields) after we establish a baseline snapshot.
  const autoSaveBaselineReadyRef = useRef(false);
  const suppressNextAutoSaveRef = useRef(true);
  const rehabImmediateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveDraftKey = id ? `lead-edit-draft:${id}` : null;
  // Track current lead ID to prevent stale closure issues and data corruption
  const currentLeadIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState('acquisitions');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const [leadOwners, setLeadOwners] = useState<LeadOwner[]>([]);
  const [showAddOwnerInline, setShowAddOwnerInline] = useState(false);
  const [newOwnerInline, setNewOwnerInline] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState({
    address1: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  // Owner editing state
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [editOwnerForm, setEditOwnerForm] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  } | null>(null);
  const ownerSectionRef = React.useRef<LeadOwnerSectionRef>(null);
  
  // Permission state
  const [canEditLead, setCanEditLead] = useState(false);
  const [canViewLead, setCanViewLead] = useState(false);
  const [hasTaskAccess, setHasTaskAccess] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  
  // Task management state
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueAt: '',
    assignedToId: ''
  });
  const [taskDuePickerOpen, setTaskDuePickerOpen] = useState(false);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [taskDueHour, setTaskDueHour] = useState<string>('');
  const [taskDueMinute, setTaskDueMinute] = useState<string>('');
  const [taskDueAmPm, setTaskDueAmPm] = useState<'AM' | 'PM'>('AM');
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  
  // Editable fields
  const [leadSource, setLeadSource] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [acquisitionsAgent, setAcquisitionsAgent] = useState('');
  const [dispositionsAgent, setDispositionsAgent] = useState('');

  // Keep pipeline stage in-sync with backend automation (calls/SMS) without page reload.
  // Polls the lead record and updates ONLY pipelineStageId-related state (safe for forms).
  const pipelineStatusRef = useRef<string>('');
  const pendingPipelineStatusRef = useRef<string | null>(null);
  const popupOpenRef = useRef<boolean>(false);
  
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
  const [pendingPipelineStatus, setPendingPipelineStatus] = useState<string | null>(null);
  const [previousPipelineStatus, setPreviousPipelineStatus] = useState<string | null>(null); // Store original status before validation
  const [pipelineSelectKey, setPipelineSelectKey] = useState(0); // Force Select re-render
  const [previousLeadStatus, setPreviousLeadStatus] = useState<string | null>(null); // Store original lead status before validation
  const [leadSelectKey, setLeadSelectKey] = useState(0); // Force Lead Status Select re-render
  const [pendingLeadStatus, setPendingLeadStatus] = useState<string | null>(null);
  const [missingDdFields, setMissingDdFields] = useState<string[]>([]);
  const [missingDdCompleteItems, setMissingDdCompleteItems] = useState<string[]>([]);
  
  // Ref to track when we're transitioning between validation popups (prevents premature cleanup)
  const transitioningPopupRef = useRef(false);

  // Refs for polling safety (avoid overwriting user-driven stage changes / active popups)
  useEffect(() => {
    pipelineStatusRef.current = pipelineStatus;
  }, [pipelineStatus]);

  useEffect(() => {
    pendingPipelineStatusRef.current = pendingPipelineStatus;
  }, [pendingPipelineStatus]);

  useEffect(() => {
    const nextPopupOpen =
      !!showAppointmentPopup ||
      !!showAppointmentSetPopup ||
      !!showDueDiligencePopup ||
      !!showOfferMadePopup ||
      !!showDueDiligenceCompletePopup ||
      !!showFollowUpTaskPopup ||
      !!showArvComparablesPopup ||
      !!showRehabBudgetPopup ||
      !!showTimelineTaxesPopup ||
      !!showTaskDialog;

    popupOpenRef.current = nextPopupOpen;

    // IMPORTANT: while stage-validation popups are open (or a stage move is pending),
    // cancel any scheduled autosave so it cannot fire mid-flow and wipe data.
    if ((nextPopupOpen || !!pendingPipelineStatus || !!pendingLeadStatus) && autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [
    showAppointmentPopup,
    showAppointmentSetPopup,
    showDueDiligencePopup,
    showOfferMadePopup,
    showDueDiligenceCompletePopup,
    showFollowUpTaskPopup,
    showArvComparablesPopup,
    showRehabBudgetPopup,
    showTimelineTaxesPopup,
    showTaskDialog,
    pendingPipelineStatus,
    pendingLeadStatus,
  ]);
  
  // Property info
  const [propertyType, setPropertyType] = useState('');
  const [sqft, setSqft] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  
  // Additional property info
  const [roofType, setRoofType] = useState('');
  const [roofAge, setRoofAge] = useState('');
  const [hvacType, setHvacType] = useState('');
  const [hvacAge, setHvacAge] = useState('');
  const [waterHeaterAge, setWaterHeaterAge] = useState('');
  const [waterType, setWaterType] = useState('');
  const [sewerType, setSewerType] = useState('');

  // Collapsible sections (Acquisitions tab)
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  
  // Notes and communications
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [addingNote, setAddingNote] = useState(false);
  
  // Communication features
  const { makeCall: makeBrowserCall, hangUp, callStatus, isInitializing, toggleMute, isMuted } = useTwilioContext();
  const [communications, setCommunications] = useState<any[]>([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  const [makingCall, setMakingCall] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Phone number selector for multiple numbers
  const [showPhoneSelector, setShowPhoneSelector] = useState(false);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState<Array<{
    number: string;
    label: string;
    type: string;
    isPrimary?: boolean;
  }>>([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [selectedSMSPhone, setSelectedSMSPhone] = useState<string>(''); // For SMS phone selection
  const [selectedEmail, setSelectedEmail] = useState<string>(''); // For email selection
  
  // Lead source specific data
  const [leadSourceData, setLeadSourceData] = useState<any>({});
  
  // Valuation fields
  const [estimatedValue, setEstimatedValue] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  
  // Appointment tracking
  const [appointmentDate, setAppointmentDate] = useState('');
  
  // Rehab information
  const [rehabBudget, setRehabBudget] = useState('');
  const [rehabItems, setRehabItems] = useState<any[]>([]);
  const [rehabFinishLevel, setRehabFinishLevel] = useState<'low_end' | 'mid_range' | 'high_end'>('mid_range');
  const [rehabToggledItems, setRehabToggledItems] = useState<any>({});
  const [rehabNumberOfWindows, setRehabNumberOfWindows] = useState(10);
  const [rehabBathrooms, setRehabBathrooms] = useState<number | undefined>(undefined);
  const [rehabCustomValues, setRehabCustomValues] = useState<{ miscLabel?: string; miscValue?: number }>({});
  
  // Comparables
  const [comparables, setComparables] = useState<any[]>([]);
  
  // Underwriting scenarios
  const [underwritingScenarios, setUnderwritingScenarios] = useState<any[]>([]);
  
  // Underwriting values (for passing to Projections)
  const [underwritingArv, setUnderwritingArv] = useState(0);
  // Placeholders only; 0 means "unset" (user must enter real values).
  const [underwritingTaxes, setUnderwritingTaxes] = useState(0);
  const [underwritingTimeline, setUnderwritingTimeline] = useState(0);
  const [underwritingRehabCost, setUnderwritingRehabCost] = useState(0);
  const [finalOffer, setFinalOffer] = useState(0);

  // ARV (top box) - stored in customFields.arv and synced to underwritingArv
  const [arvValue, setArvValue] = useState(0);
  const [arvDisplay, setArvDisplay] = useState('');

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const parseCurrencyInput = useCallback((raw: string): number => {
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }, []);
  
  // Files
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Photos
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const isAdditionalPropertyInfoComplete =
    roofType.trim().length > 0 &&
    hvacType.trim().length > 0 &&
    waterType.trim().length > 0 &&
    sewerType.trim().length > 0 &&
    roofAge.trim().length > 0 &&
    hvacAge.trim().length > 0 &&
    waterHeaterAge.trim().length > 0 &&
    Number.isFinite(Number(roofAge)) &&
    Number.isFinite(Number(hvacAge)) &&
    Number.isFinite(Number(waterHeaterAge));

  const hasPhotos = photos.length > 0;
  
  // Transaction/Deal fields
  const [deal, setDeal] = useState<any>(null);
  const [editingDeal, setEditingDeal] = useState(false);
  const [contractPrice, setContractPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [netProfit, setNetProfit] = useState('');
  const [contractedAt, setContractedAt] = useState('');
  const [closedAt, setClosedAt] = useState('');
  
  // Buyer Offers fields
  const [buyerOffers, setBuyerOffers] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [creatingBuyer, setCreatingBuyer] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerStatus, setOfferStatus] = useState('PENDING');
  const [offerNotes, setOfferNotes] = useState('');
  
  // New buyer form
  const [newBuyerFirstName, setNewBuyerFirstName] = useState('');
  const [newBuyerLastName, setNewBuyerLastName] = useState('');
  const [newBuyerEmail, setNewBuyerEmail] = useState('');
  const [newBuyerPhone, setNewBuyerPhone] = useState('');
  const [newBuyerSegmentation, setNewBuyerSegmentation] = useState('');

  // Countdown timer state
  const [timeInStatus, setTimeInStatus] = useState('0 hours');
  const [showNoContactAlert, setShowNoContactAlert] = useState(false);

  useEffect(() => {
    // Prevent ACQ-only users from accessing restricted tabs (even if URL/state tries to set it)
    if (
      (activeTab === 'transactions' && !canSeeTransactionsTab) ||
      (activeTab === 'dispositions' && !canSeeDispositionsTab)
    ) {
      setActiveTab('acquisitions');
    }
  }, [activeTab, canSeeTransactionsTab, canSeeDispositionsTab]);

  // Calculate time in current status
  const calculateTimeInStatus = () => {
    try {
      if (!lead?.stageEnteredAt && !lead?.updatedAt) {
        return '0 hours';
      }

      const statusDate = new Date(lead.stageEnteredAt || lead.updatedAt);
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

  // Check if lead needs attention (no contact in 72+ hours)
  const checkNoContactAlert = () => {
    try {
      if (!lead?.lastContactAt) {
        return false;
      }

      const lastContact = new Date(lead.lastContactAt);
      const now = new Date();
      const hoursSinceContact = differenceInHours(now, lastContact);
      
      return hoursSinceContact >= 72;
    } catch (error) {
      return false;
    }
  };

  // Update countdown timer every minute
  useEffect(() => {
    if (lead) {
      setTimeInStatus(calculateTimeInStatus());
      setShowNoContactAlert(checkNoContactAlert());

      const interval = setInterval(() => {
        setTimeInStatus(calculateTimeInStatus());
        setShowNoContactAlert(checkNoContactAlert());
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [lead?.stageEnteredAt, lead?.updatedAt, lead?.lastContactAt]);

  const requestStageMove = useCallback(
    async (stageId: string) => {
      if (!id || !canEditLead) return;

      try {
        const stageResponse = await makeApiCall(`${API_BASE}/pipeline/leads/${id}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stageId }),
        });

        if (!stageResponse.ok) {
          const stageError: any = await stageResponse.json().catch(() => ({}));
          // Backend returns { success:false, error, code, requiredFields, stageName } for validation
          const err: any = new Error(stageError?.error || stageError?.message || 'Failed to change pipeline stage');
          err.code = stageError?.code;
          err.requiredFields = stageError?.requiredFields || [];
          err.stageName = stageError?.stageName;
          throw err;
        }

        // ✅ Parse response to get newStageId
        const responseData = await stageResponse.json();
        const newStageId = responseData?.data?.newStageId || stageId;
        const newStageName = responseData?.data?.newStageName;
        
        console.log('✅ Stage move response:', { newStageId, newStageName });

        // ✅ Update UI immediately with response data
        setPipelineStatus(newStageId);
        
        // Stage move is its own persisted action; mark autosave as clean
        setAutoSaveStatus('saved');
        
        // ✅ Return response data for caller to use
        return { newStageId, newStageName };
      } catch (e: any) {
        // Let callers decide whether to show a validation popup (e.g., pictures required)
        throw e;
      }
    },
    [id, canEditLead, toast, lead?.pipelineStageId]
  );

  // Handler for pipeline status changes with validation (popup only when backend requires it)
  const handlePipelineStatusChange = (newStageId: string) => {
    const newStage = pipelineStages.find((s) => s.id === newStageId);
    
    console.log('🔄 Pipeline status change requested:', { 
      from: pipelineStatus, 
      to: newStageId, 
      stageName: newStage?.name 
    });

    // Check if moving to "Appointment Set" - ask for appointment date FIRST
    if (newStage?.name?.toLowerCase() === 'appointment set') {
      console.log('📅 Appointment Set detected - showing date picker');
      setPreviousPipelineStatus(pipelineStatus);
      setPendingPipelineStatus(newStageId);
      setShowAppointmentSetPopup(true);
      return; // Don't proceed with the change yet
    }

    void (async () => {
      try {
        // Set loading state
        setChangingPipelineStatus(true);
        
        // CRITICAL: Block autosave during stage transition to prevent data loss
        popupOpenRef.current = true;
        
        // Save current status before attempting change (for potential rollback)
        setPreviousPipelineStatus(pipelineStatus);
        
        // Save only dirty fields before validation (if any)
        // Backend will use its own database data for validation
        if (dirtyFieldsRef.current.size > 0) {
          await flushAutoSave('manual', { forceAllFields: false });
        }
        
        await requestStageMove(newStageId);
        
        // If successful, clear the previous status and reload lead to get updated timeline dates
        setPreviousPipelineStatus(null);
        await loadLead(); // Reload to get offerMadeAt, underContractAt etc from backend
        
        // CRITICAL: Re-enable autosave after reload completes
        popupOpenRef.current = false;
        
        console.log('✅ Pipeline status changed successfully');
      } catch (e: any) {
        const code = e?.code;
        const requiredFields: string[] = Array.isArray(e?.requiredFields) ? e.requiredFields : [];
        const stageNameLower = (newStage?.name || '').toLowerCase();

        console.log('❌ Pipeline status change failed:', { code, requiredFields, error: e });

        if (code === 'VALIDATION_REQUIRED') {
          console.log('🔍 Validation required - opening popup for first missing item');
          setPendingPipelineStatus(newStageId);

          // Priority order: appointmentDate → propertyInfo → photos → ARV+comps → rehab → timeline+taxes
          
          // STEP 0: Check for appointmentDate FIRST (before all other popups)
          if (requiredFields.includes('appointmentDate')) {
            console.log('📅 Opening Appointment Set popup');
            setShowAppointmentSetPopup(true);
            return;
          }
          
          const propertyInfoFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
          
          if (requiredFields.some((f) => propertyInfoFields.includes(f))) {
            console.log('🏠 Opening property info popup');
            setMissingDdFields(requiredFields.filter((f) => propertyInfoFields.includes(f)));
            setShowDueDiligencePopup(true);
          } else if (requiredFields.includes('photos')) {
            console.log('📸 Opening photo upload popup');
            setShowAppointmentPopup(true);
          } else if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
            console.log('💰 Opening ARV+Comparables popup');
            setShowArvComparablesPopup(true);
          } else if (requiredFields.includes('rehabBudget')) {
            console.log('🔨 Opening Rehab Budget popup');
            setShowRehabBudgetPopup(true);
          } else if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
            console.log('📊 Opening Timeline+Taxes popup');
            setShowTimelineTaxesPopup(true);
          } else if (requiredFields.includes('followUpTask')) {
            console.log('📋 Opening follow-up task popup');
            setShowFollowUpTaskPopup(true);
          } else if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
            console.log('💼 Opening offer made popup');
            setShowOfferMadePopup(true);
          } else {
            console.log('⚠️ No popup matched, showing error toast');
            toast({
              title: 'Stage Change Failed',
              description: e?.message || 'Failed to change pipeline stage',
              variant: 'destructive',
            });
          }
        } else {
          // Non-validation error - show toast
          toast({
            title: 'Stage Change Failed',
            description: e?.message || 'Failed to change pipeline stage',
            variant: 'destructive',
          });
        }
      } finally {
        // Always clear loading state
        setChangingPipelineStatus(false);
      }
    })();
  };

  // Handler for lead status changes with validation
  const handleLeadStatusChange = (newStatusId: string) => {
    const newStatus = leadStatuses.find((s) => s.id === newStatusId);
    const statusName = newStatus?.name?.toLowerCase() || '';
    
    console.log('🔄 Lead status change requested:', { 
      from: leadStatus, 
      to: newStatusId, 
      statusName: newStatus?.name 
    });

    // Check if this is "Follow Up" status which requires a task
    if (statusName === 'follow up') {
      void (async () => {
        try {
          // Save current status before attempting change
          setPreviousLeadStatus(leadStatus);
          
          // Save only dirty fields (if any) before status change
          if (dirtyFieldsRef.current.size > 0) {
            await flushAutoSave('manual', { forceAllFields: false });
          }
          
          // Try to update the lead status
          const updateResponse = await makeApiCall(`${API_BASE}/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadStatusId: newStatusId })
          });

          if (!updateResponse.ok) {
            const errorData: any = await updateResponse.json().catch(() => ({}));
            
            if (errorData.code === 'VALIDATION_REQUIRED' && errorData.requiredFields?.includes('followUpTask')) {
              // Open the full task dialog instead of the simple popup
              console.log('📋 Follow Up status requires task - opening task dialog');
              setPendingLeadStatus(newStatusId);
              openTaskDialog();
              return;
            }
            
            throw new Error(errorData.error || errorData.message || 'Failed to update lead status');
          }

          // Success - update local state
          setLeadStatus(newStatusId);
          setPreviousLeadStatus(null);
          console.log('✅ Lead status changed successfully');
          
        } catch (e: any) {
          console.log('❌ Lead status change failed:', e.message);
          
          // Revert to previous status
          if (previousLeadStatus) {
            console.log('⏪ Reverting lead status to:', previousLeadStatus);
            setLeadStatus(previousLeadStatus);
            setPreviousLeadStatus(null);
          }
          
          // Only show toast if validation popup wasn't shown
          if (!e.message?.includes('task')) {
            toast({
              title: 'Status Change Failed',
              description: e.message || 'Failed to update lead status',
              variant: 'destructive',
            });
          }
        }
      })();
    } else {
      // For other statuses, just update normally (will be auto-saved)
      setLeadStatus(newStatusId);
      scheduleAutoSave();
    }
  };

  useEffect(() => {
    // SAFE: Cancel pending operations when id changes (prevents data corruption)
    // Only cancel pending timers, don't interrupt in-flight saves (preserves data)
    
    // Clear pending timers (safe - these haven't started yet)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    if (rehabImmediateSaveTimerRef.current) {
      clearTimeout(rehabImmediateSaveTimerRef.current);
      rehabImmediateSaveTimerRef.current = null;
    }
    
    // Reset state flags (safe - new lead will set these)
    autoSavePendingRef.current = false;
    dirtyFieldsRef.current.clear();
    lastSavedPayloadRef.current = '';
    autoSaveBaselineReadyRef.current = false;
    suppressNextAutoSaveRef.current = true;
    
    // Update current id ref (prevents stale closures)
    currentLeadIdRef.current = id || null;
    
    // DON'T cancel autoSaveInFlightRef - let it complete if user confirmed save
    // The ID validation in flushAutoSave will prevent wrong saves
    
    // Load new lead data
    loadLead();
    loadAgents();
    loadPipelineStages();
    loadLeadSources();
    loadLeadStatuses();
    loadOwners();
    loadNotes();
    loadComparables();
    loadUnderwritingScenarios();
    loadFiles();
    loadPhotos();
    loadDeal();
    loadBuyerOffers();
    loadBuyers();
    loadTasks();
    loadCommunications();
  }, [id]);

  // Poll backend for pipelineStageId updates (auto-moves from calls/SMS) so UI updates without reload.
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      
      // SAFE: Validate current id matches before proceeding
      const currentId = currentLeadIdRef.current;
      if (!currentId || currentId !== id) {
        console.warn('🚫 Polling cancelled: ID mismatch', { currentId, id });
        return;
      }
      
      // Don't fight with an in-progress user stage move or required popups.
      if (pendingPipelineStatusRef.current) return;
      if (popupOpenRef.current) return;

      try {
        const response = await makeApiCall(`${API_BASE}/leads/${id}`);
        if (!response.ok) return;
        
        // SAFE: Re-validate id before processing response
        if (currentLeadIdRef.current !== id) {
          console.warn('🚫 Polling response ignored: ID changed during API call', {
            pollId: id,
            currentId: currentLeadIdRef.current
          });
          return;
        }
        
        const json = await response.json().catch(() => ({}));
        const leadData = (json as any)?.data || (json as any);

        // SAFE: Final validation before updating state
        if (currentLeadIdRef.current !== id) {
          console.warn('🚫 Polling update cancelled: ID changed after response', {
            pollId: id,
            currentId: currentLeadIdRef.current
          });
          return;
        }

        const serverStageId = String(leadData?.pipelineStageId || '');
        if (!serverStageId) return;

        const localStageId = pipelineStatusRef.current;
        if (serverStageId !== localStageId) {
          // Update ONLY stage-related UI (avoid re-hydrating the full form while user edits).
          setPipelineStatus(serverStageId);
          setLead((prev: any) => {
            // SAFE: Double-check ID before updating
            if (!prev || prev.id !== id || currentLeadIdRef.current !== id) {
              return prev; // Don't update if ID mismatch
            }
            return {
              ...prev,
              pipelineStageId: serverStageId,
              stageEnteredAt: leadData?.stageEnteredAt ?? prev.stageEnteredAt,
              lastContactAt: leadData?.lastContactAt ?? prev.lastContactAt,
              updatedAt: leadData?.updatedAt ?? prev.updatedAt,
            };
          });
        } else {
          // Keep timers fresh if backend updated lastContactAt/stageEnteredAt.
          setLead((prev: any) => {
            // SAFE: Double-check ID before updating
            if (!prev || prev.id !== id || currentLeadIdRef.current !== id) {
              return prev; // Don't update if ID mismatch
            }
            return {
              ...prev,
              stageEnteredAt: leadData?.stageEnteredAt ?? prev.stageEnteredAt,
              lastContactAt: leadData?.lastContactAt ?? prev.lastContactAt,
              updatedAt: leadData?.updatedAt ?? prev.updatedAt,
            };
          });
        }
      } catch {
        // silent
      }
    };

    // initial sync
    void tick();

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void tick();
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, currentLeadIdRef]);

  // Check permissions after lead and tasks are loaded
  useEffect(() => {
    if (lead && !loading && !loadingTasks) {
      checkUserPermissions();
    }
  }, [lead, tasks, user, loading, loadingTasks]);

  // Auto-select email address when leadOwners change
  useEffect(() => {
    const availableEmails = getAllEmailAddresses();
    if (availableEmails.length > 0 && !selectedEmail) {
      // Prefer primary email, otherwise first email
      const primaryEmail = availableEmails.find(e => e.isPrimary);
      const emailToSelect = primaryEmail ? primaryEmail.email : availableEmails[0].email;
      setSelectedEmail(emailToSelect);
    }
  }, [leadOwners]);

  const loadLead = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}`);
      if (response.ok) {
        const data = await response.json();
        const leadData = data.data;
        console.log('Loaded lead data:', leadData);
        console.log('📍 Address from DB:', leadData.address);
        setLead(leadData);
        
        // Set editable fields
        // Lead source dropdown uses name as value
        if (leadData.leadSource) {
          const sourceName = leadData.leadSource.name || leadData.leadSource;
          console.log('Setting lead source:', sourceName);
          setLeadSource(sourceName);
        } else {
          setLeadSource('');
        }
        
        // Lead status dropdown uses id as value
        if (leadData.leadStatus) {
          const statusId = leadData.leadStatus.id || leadData.leadStatusId || '';
          console.log('Setting lead status:', statusId);
          setLeadStatus(statusId);
        } else {
          setLeadStatus('');
        }
        
        console.log('Setting pipeline status:', leadData.pipelineStageId);
        setPipelineStatus(leadData.pipelineStageId || '');
        setAcquisitionsAgent(leadData.assignedUserId || '');
        setDispositionsAgent(leadData.dispAgentId || '');

        // Reset autosave baseline after hydrating the page to prevent immediate autosave
        suppressNextAutoSaveRef.current = true;
        
        // Clear any dirty fields tracking since we just loaded fresh data
        dirtyFieldsRef.current.clear();
        
        // Load property info from customFields
        const customFields = leadData.customFields || {};
        setPropertyType(customFields.propertyType || '');
        setSqft(customFields.sqft?.toString() || '');
        setLotSize(customFields.lotSize || '');
        setBedrooms(customFields.bedrooms?.toString() || '');
        setBathrooms(customFields.bathrooms?.toString() || '');
        setYearBuilt(customFields.yearBuilt?.toString() || '');
        
        // Set additional property info from customFields
        setRoofType(customFields.roofType || '');
        setRoofAge(customFields.roofAge?.toString() || '');
        setHvacType(customFields.hvacType || '');
        setHvacAge(customFields.hvacAge?.toString() || '');
        setWaterHeaterAge(customFields.waterHeaterAge?.toString() || '');
        setWaterType(customFields.waterType || '');
        setSewerType(customFields.sewerType || '');
        
        // Load valuation from customFields
        setEstimatedValue(customFields.estimatedValue?.toString() || '');
        setAskingPrice(customFields.askingPrice?.toString() || '');
        
        // Load appointment date
        setAppointmentDate(customFields.appointmentDate || '');
        
        // Load rehab information from customFields
        setRehabBudget(customFields.rehabBudget?.toString() || '');
        setRehabItems(customFields.rehabItems || []);
        setRehabFinishLevel(customFields.rehabFinishLevel || 'mid_range');
        setRehabToggledItems(customFields.rehabToggledItems || {});
        setRehabNumberOfWindows(customFields.rehabNumberOfWindows ?? 10);
        setRehabBathrooms(customFields.rehabBathrooms !== undefined && customFields.rehabBathrooms !== null ? customFields.rehabBathrooms : undefined);
        setRehabCustomValues(customFields.rehabCustomValues || {});
        setLeadSourceData(customFields.leadSourceData || {});

        // Establish baseline after state hydration completes (best-effort)
        setTimeout(() => {
          try {
            // Baseline snapshot for autosave: omit Lead Owners/contact fields so autosave
            // can never wipe them during hydration or blur/debounce saves.
            lastSavedPayloadRef.current = JSON.stringify(buildLeadPatchPayload({ includeLeadOwners: false }));
            autoSaveBaselineReadyRef.current = true;
            setAutoSaveStatus('idle');
          } catch (e) {
            // ignore
          }
        }, 0);
        
        // Load Underwriting Calculator values from customFields
        console.log('📖 Loading underwriting values from customFields:', {
          underwritingArv: customFields.underwritingArv,
          underwritingTaxes: customFields.underwritingTaxes,
          underwritingTimeline: customFields.underwritingTimeline,
          underwritingRehabCost: customFields.underwritingRehabCost,
          finalOffer: customFields.finalOffer
        });
        
        // Load ARV (top box). Prefer explicit `customFields.arv`, fallback to underwritingArv.
        // Don't default to 0 if no ARV exists - keep it empty
        const loadedArv = customFields.arv ?? customFields.underwritingArv ?? null;
        setArvValue(loadedArv ? Number(loadedArv) : 0);
        setArvDisplay(loadedArv ? formatCurrency(Number(loadedArv)) : '');
        if (loadedArv && !customFields.underwritingArv) {
          setUnderwritingArv(Number(loadedArv) || 0);
        }

        if (customFields.underwritingArv) setUnderwritingArv(customFields.underwritingArv);
        if (customFields.underwritingTaxes) setUnderwritingTaxes(customFields.underwritingTaxes);
        if (customFields.underwritingTimeline) setUnderwritingTimeline(customFields.underwritingTimeline);
        if (customFields.underwritingRehabCost) setUnderwritingRehabCost(customFields.underwritingRehabCost);
        if (customFields.finalOffer) setFinalOffer(customFields.finalOffer);
        
        // Load contacts from customFields first (multiple contacts), then fallback to seller/buyer/vendor
        const initialContacts = [];
        
        // Check if there are saved contacts in customFields
        if (customFields.contacts && Array.isArray(customFields.contacts) && customFields.contacts.length > 0) {
          initialContacts.push(...customFields.contacts);
        } else {
          // Fallback to seller/buyer/vendor if no contacts in customFields
          if (leadData.seller) {
            initialContacts.push({
              name: `${leadData.seller.firstName} ${leadData.seller.lastName}`,
              phone: leadData.seller.phone || '',
              email: leadData.seller.email || ''
            });
          }
          if (leadData.buyer) {
            initialContacts.push({
              name: `${leadData.buyer.firstName} ${leadData.buyer.lastName}`,
              phone: leadData.buyer.phone || '',
              email: leadData.buyer.email || ''
            });
          }
          if (leadData.vendor) {
            initialContacts.push({
              name: `${leadData.vendor.firstName} ${leadData.vendor.lastName}`,
              phone: leadData.vendor.phone || '',
              email: leadData.vendor.email || ''
            });
          }
        }
        // Don't add empty contact - let user add manually if needed
        setContacts(initialContacts);
      }
    } catch (error) {
      console.error('Error loading lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lead details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setNavigating(false); // Reset navigating state when data loads
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
      console.error('Error loading agents:', error);
    }
  };

  const loadPipelineStages = async () => {
    try {
      const roles = (user?.roles as any[]) || [];
      const roleNames = roles.map((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name)).filter(Boolean);

      const isAdminOrManager = roleNames.includes('ADMIN') || roleNames.includes('MANAGER');
      const isExecutive = roleNames.includes('EXECUTIVE');

      const pipelineKeysToLoad = (isAdminOrManager || isExecutive)
        ? ['ACQUISITIONS', 'DISPOSITIONS']
        : ['ACQUISITIONS'];

      const responses = await Promise.all(
        pipelineKeysToLoad.map((key) => makeApiCall(`${API_BASE}/pipeline/${key}/stages`))
      );

      const results = await Promise.all(
        responses.map(async (r) => (r.ok ? (await r.json().catch(() => ({}))) : {}))
      );

      const combinedStages = results
        .flatMap((json, idx) => {
          const pipelineKey = pipelineKeysToLoad[idx];
          const stages = (json as any)?.data || [];
          return stages.map((s: any) => ({ ...s, pipelineKey }));
        })
        // de-dupe by stage id (safe)
        .reduce((acc: any[], s: any) => {
          if (!acc.some((x) => x?.id === s?.id)) acc.push(s);
          return acc;
        }, [])
        .sort((a: any, b: any) => {
          const ak = String(a?.pipelineKey || '');
          const bk = String(b?.pipelineKey || '');
          if (ak !== bk) return ak.localeCompare(bk);
          return (a?.orderIndex ?? 0) - (b?.orderIndex ?? 0);
        });

      setPipelineStages(combinedStages);
    } catch (error) {
      console.error('Error loading pipeline stages:', error);
    }
  };

  const loadOwners = async () => {
    if (!id) return;
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/owners`);
      if (response.ok) {
        const data = await response.json();
        setLeadOwners(data.data || []);
      }
    } catch (error) {
      console.error('Error loading lead owners:', error);
    }
  };

  const handleInlineAddOwner = async () => {
    if (!id) return;
    if (!newOwnerInline.firstName || !newOwnerInline.lastName || !newOwnerInline.phone || !newOwnerInline.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all owner fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOwnerInline),
      });

      if (!response.ok) {
        throw new Error('Failed to add owner');
      }

      // Success toast suppressed on Lead Detail (show only errors)
      setNewOwnerInline({ firstName: '', lastName: '', phone: '', email: '' });
      setShowAddOwnerInline(false);
      await loadOwners();
    } catch (error) {
      console.error('Error adding owner:', error);
      toast({
        title: 'Error',
        description: 'Failed to add owner',
        variant: 'destructive',
      });
    }
  };

  const loadLeadSources = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/settings/lead-sources`);
      if (response.ok) {
        const data = await response.json();
        // Show all active sources from the database
        const apiSources = (data.data || []).filter((s: any) => s?.active !== false);
        setLeadSources(apiSources);
      }
    } catch (error) {
      console.error('Error loading lead sources:', error);
    }
  };

  const loadLeadStatuses = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/lead-statuses`);
      if (response.ok) {
        const data = await response.json();
        // Show all active statuses from the database
        const apiStatuses = (data.data || []).filter((s: any) => s?.active !== false);
        setLeadStatuses(apiStatuses);
      }
    } catch (error) {
      console.error('Error loading lead statuses:', error);
    }
  };

  // Permission Check Function
  const checkUserPermissions = () => {
    if (!lead || !user) {
      setCanViewLead(false);
      setCanEditLead(false);
      setHasTaskAccess(false);
      return;
    }
    
    // Check if user is lead owner/assigned
    const isLeadOwner = lead.assignedUserId === user.id;
    const isLeadCreator = (lead as any).createdById === user.id;
    
    // Check if user has any REAL tasks assigned (exclude auto-generated mention tasks)
    const realTasks = tasks.filter(task => !task.title?.startsWith('Review note on '));
    const hasAssignedTask = realTasks.some(task => task.assignedToId === user.id);
    const assignedTaskTitle = realTasks.find(t => t.assignedToId === user.id)?.title;
    
    // Check if user is admin/manager
    const isAdmin = user.roles?.includes('ADMIN');
    const isManager = user.roles?.includes('MANAGER');
    
    // Determine permissions
    if (isAdmin || isManager) {
      setCanEditLead(true);
      setCanViewLead(true);
      setHasTaskAccess(true);
      setAccessReason('Admin/Manager access');
    } else if (isLeadOwner || isLeadCreator) {
      setCanEditLead(true);
      setCanViewLead(true);
      setHasTaskAccess(true);
      setAccessReason('Lead owner');
    } else if (hasAssignedTask) {
      setCanEditLead(false); // Cannot edit lead details
      setCanViewLead(true);  // Can view lead
      setHasTaskAccess(true); // Can complete tasks
      setAccessReason(`Task assigned: ${assignedTaskTitle || 'View only'}`);
    } else {
      // No access at all - but allow access if they have a mention task
      const hasMentionTask = tasks.some(task => 
        task.assignedToId === user.id && task.title?.startsWith('Review note on ')
      );
      
      if (hasMentionTask) {
        // Allow view-only access for mention tasks without showing the banner
        setCanEditLead(false);
        setCanViewLead(true);
        setHasTaskAccess(true);
        setAccessReason(''); // Empty to hide the banner
      } else {
        setCanEditLead(false);
        setCanViewLead(false);
        setHasTaskAccess(false);
        setAccessReason('No access');
        
        // Redirect to leads page
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this lead",
          variant: "destructive"
        });
        setTimeout(() => navigate('/leads'), 1000);
      }
    }
  };

  // Task Management Functions
  const loadTasks = async () => {
    if (!id) return;
    setLoadingTasks(true);
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/tasks`);
      if (response.ok) {
        const data = await response.json();
        
        // Filter out ALL auto-created tasks (same as Inbox filtering)
        const autoCreatedTaskPrefixes = [
          'Review note on ',              // Auto-mention tasks
          'Underwrite ',                  // Stage transition: Appointment Complete
          'Make Offer on ',               // Stage transition: Due Diligence Complete
          'Follow Up With ',              // Stage transition: Offer Made (negotiating)
          'Contract Sent - Awaiting Signature for ', // DocuSign success
          'URGENT: DocuSign Failed for ', // DocuSign failure
          'Check Voided Contract With ',  // Contract void
        ];
        
        const filteredTasks = (data.data || []).filter((t: any) => {
          const title = t.title || '';
          // Hide all auto-created tasks
          const isAutoCreated = autoCreatedTaskPrefixes.some(prefix => title.startsWith(prefix));
          return !isAutoCreated;
        });
        
        setTasks(filteredTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const formatTaskDueDisplay = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'Select due date & time';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Select due date & time';
    }
  };

  const setTaskDueFromDateTime = (dt: Date) => {
    if (!dt || Number.isNaN(dt.getTime())) return;

    // Use local time for consistency with UI
    const dateOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const hours24 = dt.getHours();
    const ampm: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
    const hour12 = hours24 % 12 || 12;
    const minute = dt.getMinutes();

    setTaskDueDate(dateOnly);
    setTaskDueHour(String(hour12));
    setTaskDueMinute(String(minute).padStart(2, '0'));
    setTaskDueAmPm(ampm);

    setTaskForm((prev) => ({
      ...prev,
      dueAt: dt.toISOString(),
    }));
  };

  const computeTaskDueIso = (date: Date | null, hourStr: string, minuteStr: string, ampm: 'AM' | 'PM') => {
    if (!date) return '';
    const hour12 = parseInt(hourStr || '', 10);
    const minute = parseInt(minuteStr || '', 10);
    if (!hour12 || Number.isNaN(minute)) return '';

    const hour24 = ampm === 'PM' ? ((hour12 % 12) + 12) : (hour12 % 12);
    // Use local time for consistency with UI
    const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minute, 0, 0);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString();
  };

  const openTaskDialog = (task?: any) => {
    // For new tasks: default to 8 AM tomorrow
    // For editing tasks: use existing due date or current time + 1 hour
    let initial: Date;
    
    if (task) {
      // Editing existing task
      const nowPlusOneHour = new Date(Date.now() + 60 * 60 * 1000);
      const baseDate = task?.dueAt ? new Date(task.dueAt) : nowPlusOneHour;
      initial = Number.isNaN(baseDate.getTime()) ? nowPlusOneHour : baseDate;
    } else {
      // Creating new task: default to 8 AM tomorrow (local time)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      initial = tomorrow;
    }

    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        dueAt: initial.toISOString(),
        assignedToId: task.assignedToId || ''
      });
      // For editing, use the normal hydrate function
      setTaskDueFromDateTime(initial);
    } else {
      setEditingTask(null);
      // For new tasks, set form with 8 AM tomorrow
      const dateOnly = new Date(initial.getFullYear(), initial.getMonth(), initial.getDate());
      setTaskForm({
        title: '',
        description: '',
        dueAt: initial.toISOString(),
        assignedToId: ''
      });
      // Manually set the picker values for 8 AM
      setTaskDueDate(dateOnly);
      setTaskDueHour('8');
      setTaskDueMinute('00');
      setTaskDueAmPm('AM');
    }
    
    setTaskDuePickerOpen(false);
    setShowTaskDialog(true);
  };

  const closeTaskDialog = () => {
    console.log('🚪 Task dialog closed');
    
    // If there was a pending lead status change, revert it
    if (pendingLeadStatus && previousLeadStatus) {
      console.log('⏪ Reverting lead status from', leadStatus, 'to', previousLeadStatus);
      setLeadStatus(previousLeadStatus);
      setLeadSelectKey(prev => prev + 1);
      setPendingLeadStatus(null);
      setPreviousLeadStatus(null);
    }
    
    // If there was a pending pipeline status change, revert it
    if (pendingPipelineStatus && previousPipelineStatus) {
      console.log('⏪ Reverting pipeline status from', pipelineStatus, 'to', previousPipelineStatus);
      setPipelineStatus(previousPipelineStatus);
      setPipelineSelectKey(prev => prev + 1);
      setPendingPipelineStatus(null);
      setPreviousPipelineStatus(null);
    }
    
    setShowTaskDialog(false);
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      dueAt: '',
      assignedToId: ''
    });
    setTaskDuePickerOpen(false);
    setTaskDueDate(null);
    setTaskDueHour('');
    setTaskDueMinute('');
    setTaskDueAmPm('AM');
  };

  const handleTaskSubmit = async () => {
    if (!taskForm.title?.trim() || !taskForm.dueAt || !taskForm.assignedToId) {
      toast({
        title: "Validation Error",
        description: "Title, due date, and assignee are required",
        variant: "destructive"
      });
      return;
    }

    setSavingTask(true);
    try {
      const taskData = {
        title: taskForm.title,
        description: taskForm.description || undefined,
        dueAt: new Date(taskForm.dueAt).toISOString(),
        assignedToId: taskForm.assignedToId || undefined
      };

      if (editingTask) {
        // Update existing task
        const response = await makeApiCall(`${API_BASE}/leads/${id}/tasks/${editingTask.id}`, {
          method: 'PATCH',
          body: JSON.stringify(taskData)
        });

        if (response.ok) {
          if (showSuccessToasts) {
            toast({
              title: "Task Updated",
              description: "Task has been updated successfully"
            });
          }
          await loadTasks();
          closeTaskDialog();
        } else {
          throw new Error('Failed to update task');
        }
      } else {
        // Create new task
        const response = await makeApiCall(`${API_BASE}/leads/${id}/tasks`, {
          method: 'POST',
          body: JSON.stringify(taskData)
        });

        if (response.ok) {
          if (showSuccessToasts) {
            toast({
              title: "Task Created",
              description: "New task has been created successfully"
            });
          }
          await loadTasks();
          closeTaskDialog();
          
          // If we have a pending pipeline status (e.g., user tried to move to Long Term Follow Up),
          // retry the stage move now that the task is created
          if (pendingPipelineStatus) {
            await requestStageMove(pendingPipelineStatus);
            setPendingPipelineStatus(null);
            setPreviousPipelineStatus(null); // Clear previous status on success
            await loadLead();
          }
          
          // If we have a pending lead status (e.g., user tried to set Lead Status to "Follow Up"),
          // retry setting it now that the task is created
          if (pendingLeadStatus) {
            try {
              // Directly update via API to ensure it's persisted immediately
              const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadStatusId: pendingLeadStatus })
              });
              
              if (response.ok) {
                // Update local state to reflect the change
                setLeadStatus(pendingLeadStatus);
                setPendingLeadStatus(null);
                setPreviousLeadStatus(null); // Clear previous status on success
                console.log('✅ Lead Status updated to Follow Up after task creation');
                // Reload lead to get fresh data
                await loadLead();
              } else {
                throw new Error('Failed to update Lead Status');
              }
            } catch (error: any) {
              toast({
                title: "Error",
                description: error.message || "Failed to update Lead Status",
                variant: "destructive"
              });
              setPendingLeadStatus(null);
              setPreviousLeadStatus(null); // Clear on error too
            }
          }
        } else {
          throw new Error('Failed to create task');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive"
      });
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setDeletingTaskId(taskId);
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (showSuccessToasts) {
          toast({
            title: "Task Deleted",
            description: "Task has been deleted successfully"
          });
        }
        await loadTasks();
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive"
      });
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'OPEN' ? 'DONE' : 'OPEN';
    
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        if (showSuccessToasts) {
          toast({
            title: newStatus === 'DONE' ? "Task Completed" : "Task Reopened",
            description: `Task marked as ${newStatus.toLowerCase()}`
          });
        }
        await loadTasks();
      } else {
        throw new Error('Failed to update task status');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  // Handle owner editing state changes from LeadOwnerSection
  const handleOwnerEditingChange = (isEditing: boolean, ownerId: string | null, ownerData: { firstName: string; lastName: string; phone: string; email: string } | null) => {
    setEditingOwnerId(ownerId);
    setEditOwnerForm(ownerData);
  };

  const buildPropertyDetails = useCallback((onlyDirtyFields: boolean = true) => {
    const allFields = {
      // ARV is stored separately from underwriting (but we keep underwritingArv in sync).
      // IMPORTANT:
      // - If user clears ARV, we must persist that as NULL (otherwise backend keeps old value).
      // - Only do this when ARV is actually dirty, so we don't send null during initial hydration.
      arv:
        arvValue && arvValue > 0
          ? arvValue
          : dirtyFieldsRef.current.has('arv')
            ? null
            : undefined,
      propertyType: propertyType || null,
      sqft: sqft ? parseInt(sqft) : null,
      lotSize: lotSize || null,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseFloat(bathrooms) : null,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
      roofType: roofType || null,
      roofAge: roofAge ? parseInt(roofAge) : null,
      hvacType: hvacType || null,
      hvacAge: hvacAge ? parseInt(hvacAge) : null,
      waterHeaterAge: waterHeaterAge ? parseInt(waterHeaterAge) : null,
      waterType: waterType || null,
      sewerType: sewerType || null,
      estimatedValue: estimatedValue ? parseInt(estimatedValue) : null,
      askingPrice: askingPrice ? parseInt(askingPrice) : null,
      appointmentDate: appointmentDate || null,
      rehabBudget: rehabBudget ? parseInt(rehabBudget) : null,
      rehabItems: rehabItems || [],
      rehabFinishLevel: rehabFinishLevel || null,
      rehabToggledItems: rehabToggledItems || {},
      rehabNumberOfWindows: rehabNumberOfWindows || null,
      rehabBathrooms: rehabBathrooms !== undefined && rehabBathrooms !== null ? rehabBathrooms : null,
      rehabCustomValues: rehabCustomValues || {},
      leadSourceData: leadSourceData || {},
      // Underwriting Calculator values
      underwritingArv: underwritingArv || null,
      underwritingTaxes: underwritingTaxes !== null && underwritingTaxes !== undefined ? underwritingTaxes : null,
      underwritingTimeline: underwritingTimeline !== null && underwritingTimeline !== undefined ? underwritingTimeline : null,
      underwritingRehabCost: underwritingRehabCost || null,
      finalOffer: finalOffer || null,
    };
    
    // If onlyDirtyFields is true, only return fields that have been modified
    if (onlyDirtyFields && dirtyFieldsRef.current.size > 0) {
      const dirtyFields: any = {};
      dirtyFieldsRef.current.forEach((fieldName) => {
        if (fieldName in allFields) {
          // IMPORTANT: When saving rehabBathrooms, explicitly exclude bathrooms to prevent sync
          if (fieldName === 'rehabBathrooms' && dirtyFieldsRef.current.has('bathrooms')) {
            // Don't include bathrooms if we're saving rehabBathrooms
            // This prevents Property Information bathrooms from being overwritten
          } else {
            dirtyFields[fieldName] = allFields[fieldName as keyof typeof allFields];
          }
        }
      });
      // If rehabBathrooms is dirty but bathrooms is also dirty, exclude bathrooms
      if (dirtyFieldsRef.current.has('rehabBathrooms') && dirtyFieldsRef.current.has('bathrooms')) {
        delete dirtyFields.bathrooms;
      }
      return dirtyFields;
    }
    
    return allFields;
  }, [
    arvValue,
    propertyType,
    sqft,
    lotSize,
    bedrooms,
    bathrooms,
    yearBuilt,
    roofType,
    roofAge,
    hvacType,
    hvacAge,
    waterHeaterAge,
    waterType,
    sewerType,
    estimatedValue,
    askingPrice,
    appointmentDate,
    rehabBudget,
    rehabItems,
    rehabFinishLevel,
    rehabToggledItems,
    rehabNumberOfWindows,
    rehabBathrooms,
    rehabCustomValues,
    leadSourceData,
    underwritingArv,
    underwritingTaxes,
    underwritingTimeline,
    underwritingRehabCost,
    finalOffer,
  ]);

  const buildLeadPatchPayload = useCallback((options?: { includeLeadOwners?: boolean; forceAllFields?: boolean }) => {
    // Note: pipeline stage moves are handled separately via the pipeline move endpoint.
    const updates: any = {};
    const includeLeadOwners = options?.includeLeadOwners === true; // Default FALSE - only include when explicitly requested
    const forceAllFields = options?.forceAllFields || false;

    // Contacts (primary + multi-contact support)
    const filteredContacts = (contacts || []).filter((c) => c?.name || c?.phone || c?.email);
    const primaryContact = filteredContacts[0];

    // IMPORTANT:
    // Do NOT auto-clear contact fields when contacts are empty/unloaded.
    // This page uses autosave and can race with async hydration; sending empty strings wipes existing data.
    // Additionally: autosave must NOT touch Lead Owners/contact data at all.
    if (includeLeadOwners && primaryContact) {
      if (lead?.leadType === 'SELLER') {
        updates.seller = {
          firstName: primaryContact.name?.split(' ')[0] || primaryContact.name || '',
          lastName: primaryContact.name?.split(' ').slice(1).join(' ') || '',
          phone: primaryContact.phone || '',
          email: primaryContact.email || '',
          motivation: lead.seller?.motivation || null,
          notes: lead.seller?.notes || null,
        };
      } else if (lead?.leadType === 'BUYER') {
        updates.buyer = {
          firstName: primaryContact.name?.split(' ')[0] || primaryContact.name || '',
          lastName: primaryContact.name?.split(' ').slice(1).join(' ') || '',
          phone: primaryContact.phone || '',
          email: primaryContact.email || '',
          vip: lead.buyer?.vip || false,
          blacklisted: (lead.buyer as any)?.blacklisted || false,
        };
      } else if (lead?.leadType === 'VENDOR') {
        updates.vendor = {
          firstName: primaryContact.name?.split(' ')[0] || primaryContact.name || '',
          lastName: primaryContact.name?.split(' ').slice(1).join(' ') || '',
          phone: primaryContact.phone || '',
          email: primaryContact.email || '',
          companyName: (lead.vendor as any)?.companyName || null,
          serviceType: (lead.vendor as any)?.serviceType || null,
        };
      }
    }

    // Custom fields: merge to avoid wiping unknown keys
    // IMPORTANT: Only include dirty fields during autosave to prevent data loss
    // Do NOT spread lead?.customFields because it might be stale - let backend merge handle it
    const propertyDetails = buildPropertyDetails(!forceAllFields); // false = all fields, true = only dirty
    
    // Only update customFields if there are actually dirty fields to save OR if forcing all fields
    if (Object.keys(propertyDetails).length > 0 || includeLeadOwners) {
      // Send ONLY the dirty/changed fields - backend will merge with existing data
      updates.customFields = {
        ...propertyDetails,
        ...(includeLeadOwners ? { contacts: filteredContacts } : {}),
      };
    } else if (forceAllFields) {
      // When forcing all fields (rare case), include full customFields
      updates.customFields = {
        ...(lead?.customFields || {}),
        ...propertyDetails,
        ...(includeLeadOwners ? { contacts: filteredContacts } : {}),
      };
    }

    // Address: only send when editing address (so we don't clobber unintentionally)
    if (editingAddress) {
      updates.address = {
        address1: editAddressForm.address1 || '',
        city: editAddressForm.city || '',
        state: editAddressForm.state || '',
        zipCode: editAddressForm.zipCode || '',
      };
    }

    // Assigned agents (allow clearing)
    // Guard: don't let hydration races clear agent assignments before we've established a baseline.
    if (autoSaveBaselineReadyRef.current && (lead?.assignedUserId || '') !== (acquisitionsAgent || '')) {
      updates.assignedUserId = acquisitionsAgent ? acquisitionsAgent : null;
    }
    if (autoSaveBaselineReadyRef.current && ((lead as any)?.dispAgentId || '') !== (dispositionsAgent || '')) {
      updates.dispAgentId = dispositionsAgent ? dispositionsAgent : null;
    }

    // Lead source
    if (leadSource) {
      const source = leadSources.find((s) => s.name === leadSource || s.id === leadSource);
      const nextId = source?.id || null;
      const currentId = (lead as any)?.leadSourceId || (lead as any)?.leadSource?.id || null;
      if (autoSaveBaselineReadyRef.current && nextId !== currentId) {
        updates.leadSourceId = nextId;
      }
    } else if (lead?.leadSource?.id) {
      if (autoSaveBaselineReadyRef.current) {
        updates.leadSourceId = null;
      }
    }

    // Lead status
    if (leadStatus) {
      const status = leadStatuses.find((s) => s.id === leadStatus || s.name === leadStatus);
      const nextId = status?.id || null;
      const currentId = (lead as any)?.leadStatusId || (lead as any)?.leadStatus?.id || null;
      if (autoSaveBaselineReadyRef.current && nextId !== currentId) {
        updates.leadStatusId = nextId;
      }
    } else if (lead?.leadStatus?.id) {
      if (autoSaveBaselineReadyRef.current) {
        updates.leadStatusId = null;
      }
    }

    return updates;
  }, [
    contacts,
    lead,
    buildPropertyDetails,
    editingAddress,
    editAddressForm.address1,
    editAddressForm.city,
    editAddressForm.state,
    editAddressForm.zipCode,
    acquisitionsAgent,
    dispositionsAgent,
    leadSource,
    leadStatus,
    leadSources,
    leadStatuses,
  ]);

  const flushAutoSave = useCallback(
    async (reason: 'debounce' | 'blur' | 'manual' | 'pending' = 'manual', options?: { forceAllFields?: boolean }) => {
      // SAFE: Validate current id matches before proceeding (prevents stale closure issues)
      const currentId = currentLeadIdRef.current;
      if (!currentId || !id || currentId !== id) {
        console.warn('🚫 Auto-save cancelled: ID mismatch or missing', { currentId, id });
        return;
      }
      
      if (!lead || !canEditLead) return;
      
      // SAFE: Double-check lead.id matches current id (prevents data corruption)
      if (lead.id !== currentId) {
        console.warn('🚫 Auto-save cancelled: Lead ID mismatch', { leadId: lead.id, currentId });
        return;
      }

      // Never autosave while stage validation is in progress (popups open / pending stage move).
      // This prevents PATCH requests with incomplete local state from wiping persisted data.
      if (popupOpenRef.current || pendingPipelineStatusRef.current || pendingLeadStatus) return;

      // Coalesce saves: if one is in-flight, request another run once it finishes
      if (autoSaveInFlightRef.current) {
        autoSavePendingRef.current = true;
        return;
      }

      const payload = buildLeadPatchPayload({ 
        includeLeadOwners: false,
        forceAllFields: options?.forceAllFields || false
      });
      
      // If payload is empty (no updates), skip autosave
      if (!payload || Object.keys(payload).length === 0) {
        if (autoSaveStatus === 'dirty') setAutoSaveStatus('idle');
        return;
      }
      
      const payloadStr = JSON.stringify(payload);

      // No actual lead changes → do nothing (prevents flicker from unrelated inputs like task dialogs)
      if (!payloadStr || payloadStr === lastSavedPayloadRef.current) {
        // IMPORTANT: If our computed payload matches the last saved snapshot, the UI should not remain "dirty".
        // Clear dirty fields so downstream callers (e.g., rehab quick-save) don't keep retrying forever.
        if (dirtyFieldsRef.current.size > 0) {
          dirtyFieldsRef.current.clear();
        }
        if (autoSaveStatus === 'dirty') setAutoSaveStatus('idle');
        return;
      }

      // Cancel any pending debounce timer since we're saving now
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      setAutoSaveError('');
      setAutoSaveStatus('saving');

      const run = (async () => {
        // SAFE: Re-validate id before making API call (prevents saving to wrong lead)
        const saveId = currentLeadIdRef.current;
        if (!saveId || saveId !== id || !lead || lead.id !== saveId) {
          console.warn('🚫 Auto-save aborted: ID changed during save', { saveId, id, leadId: lead?.id });
          setAutoSaveStatus('idle');
          return;
        }
        
        try {
          const response = await makeApiCall(`${API_BASE}/leads/${saveId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData?.code === 'VALIDATION_REQUIRED') {
              const requiredFields: string[] = Array.isArray(errorData?.requiredFields) ? errorData.requiredFields : [];
              if (requiredFields.includes('followUpTask')) {
                // Revert UI selection back to server-known lead status
                setLeadStatus(lead?.leadStatus?.id || lead?.leadStatusId || '');

                // IMPORTANT: Stop autosave retry loops.
                // A pending rerun can fire before React state finishes reverting, causing repeated 400s.
                autoSavePendingRef.current = false;
                setAutoSaveError('');
                setAutoSaveStatus('idle');

                // After state settles, refresh the baseline payload and open task dialog
                setTimeout(() => {
                  try {
                    lastSavedPayloadRef.current = JSON.stringify(buildLeadPatchPayload({ includeLeadOwners: false }));
                  } catch {
                    // ignore
                  }
                  
                  // Store the lead status they tried to set, so we can retry after task creation
                  setPendingLeadStatus(payload.leadStatusId);
                  
                  // Open task creation dialog so user can add the required task
                  openTaskDialog();
                }, 100);
                
                return;
              }
            }

            throw new Error(errorData.message || errorData.error || 'Failed to auto-save lead');
          }

          // SAFE: Validate id again after response (before updating state)
          if (currentLeadIdRef.current !== saveId) {
            console.warn('🚫 Auto-save response ignored: ID changed after save', { 
              savedId: saveId, 
              currentId: currentLeadIdRef.current 
            });
            // Don't update state - user navigated away
            return;
          }

          lastSavedPayloadRef.current = payloadStr;
          lastSavedAtRef.current = Date.now();
          
          // Clear dirty fields after successful save
          dirtyFieldsRef.current.clear();
          
          // Show "Saved" status for at least 1 second to prevent blinking
          setAutoSaveStatus('saved');
          setTimeout(() => {
            setAutoSaveStatus((current) => current === 'saved' ? 'idle' : current);
          }, 1000);
          
          if (autoSaveDraftKey) {
            try {
              localStorage.removeItem(autoSaveDraftKey);
            } catch (e) {
              // ignore
            }
          }

          // Track price changes (best-effort; don't block autosave)
          try {
            const oldEstimatedValue = lead?.customFields?.estimatedValue || null;
            const newEstimatedValue = estimatedValue ? parseInt(estimatedValue) : null;
            const oldAskingPrice = lead?.customFields?.askingPrice || null;
            const newAskingPrice = askingPrice ? parseInt(askingPrice) : null;
            const oldRehabBudget = lead?.customFields?.rehabBudget || null;
            const newRehabBudget = rehabBudget ? parseInt(rehabBudget) : null;

            await trackPriceChanges([
              { fieldName: 'estimatedValue', oldValue: oldEstimatedValue, newValue: newEstimatedValue },
              { fieldName: 'askingPrice', oldValue: oldAskingPrice, newValue: newAskingPrice },
              { fieldName: 'rehabBudget', oldValue: oldRehabBudget, newValue: newRehabBudget },
            ]);
          } catch (e) {
            // ignore
          }
        } catch (e: any) {
          // SAFE: Only handle error if still on same lead
          if (currentLeadIdRef.current === saveId) {
            setAutoSaveStatus('error');
            setAutoSaveError(e?.message || 'Auto-save failed');
            if (autoSaveDraftKey) {
              try {
                localStorage.setItem(autoSaveDraftKey, payloadStr);
              } catch (err) {
                // ignore
              }
            }
          }
          // If ID changed, silently ignore error (user navigated away)
        } finally {
          autoSaveInFlightRef.current = null;

          // SAFE: Only trigger pending save if still on same lead
          if (autoSavePendingRef.current) {
            autoSavePendingRef.current = false;
            if (currentLeadIdRef.current === id) {
              // Run again immediately to capture any edits that happened during the in-flight save
              await flushAutoSave('pending');
            }
          }
        }
      })();

      autoSaveInFlightRef.current = run;
      await run;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _reason = reason;
    },
    [
      id,
      lead,
      canEditLead,
      buildLeadPatchPayload,
      autoSaveStatus,
      estimatedValue,
      askingPrice,
      rehabBudget,
      rehabBathrooms,
      trackPriceChanges,
      autoSaveDraftKey,
    ]
  );

  const requestImmediateRehabSave = useCallback(() => {
    // Guard: avoid loops from child components emitting "change" callbacks during initial mount/hydration
    // or when stage validation is running.
    if (!id || !lead || !canEditLead) return;
    if (!autoSaveBaselineReadyRef.current) return;
    if (suppressNextAutoSaveRef.current) return;
    if (popupOpenRef.current || pendingPipelineStatusRef.current || pendingLeadStatus) return;

    // Coalesce rapid rehab edits (toggles, sliders, calculations) into a single quick save.
    if (rehabImmediateSaveTimerRef.current) {
      clearTimeout(rehabImmediateSaveTimerRef.current);
      rehabImmediateSaveTimerRef.current = null;
    }
    rehabImmediateSaveTimerRef.current = setTimeout(() => {
      void flushAutoSave('manual');
    }, 250);
  }, [id, lead, canEditLead, flushAutoSave, pendingLeadStatus]);

  const scheduleAutoSave = useCallback(() => {
    if (!id || !lead || !canEditLead) return;
    // Never autosave while stage validation is in progress (popups open / pending stage move).
    if (popupOpenRef.current || pendingPipelineStatusRef.current) return;

    // Skip the very first run after load/hydrate
    if (suppressNextAutoSaveRef.current) {
      suppressNextAutoSaveRef.current = false;
      lastSavedPayloadRef.current = JSON.stringify(buildLeadPatchPayload({ includeLeadOwners: false }));
      return;
    }

    // NO DEBOUNCE - We rely on blur events to trigger saves
    // This function now just marks that data is dirty
    const payloadStr = JSON.stringify(buildLeadPatchPayload({ includeLeadOwners: false }));
    if (!payloadStr || payloadStr === lastSavedPayloadRef.current) return;

    setAutoSaveStatus('dirty');
  }, [id, lead, canEditLead, buildLeadPatchPayload]);

  // Best-effort: if user navigates away/unmounts quickly, try to persist pending edits.
  useEffect(() => {
    return () => {
      if (rehabImmediateSaveTimerRef.current) {
        clearTimeout(rehabImmediateSaveTimerRef.current);
        rehabImmediateSaveTimerRef.current = null;
      }
      // Fire and forget; SPA navigation won't cancel this in most cases.
      // Guard: don't run autosave until a baseline has been established (prevents wiping on fast navigation).
      if (autoSaveBaselineReadyRef.current) {
        void flushAutoSave('manual');
      }
    };
  }, [flushAutoSave]);

  // Best-effort save on page hide / refresh / close (covers cases where user leaves before debounce fires).
  useEffect(() => {
    if (!id || !lead || !canEditLead) return;

    const bestEffortKeepaliveSave = () => {
      try {
        if (!autoSaveBaselineReadyRef.current) return;
        // Never autosave while stage validation is in progress (popups open / pending stage move).
        if (popupOpenRef.current || pendingPipelineStatusRef.current) return;
      const payload = buildLeadPatchPayload({ includeLeadOwners: false });
        const payloadStr = JSON.stringify(payload);
        if (!payloadStr || payloadStr === lastSavedPayloadRef.current) return;

        const accessToken = localStorage.getItem('accessToken');
        void fetch(`${API_BASE}/leads/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: payloadStr,
          // keepalive allows the request to outlive the page in some browsers
          keepalive: true,
        } as any);
      } catch {
        // ignore
      }
    };

    const onPageHide = () => bestEffortKeepaliveSave();
    const onBeforeUnload = () => bestEffortKeepaliveSave();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') bestEffortKeepaliveSave();
    };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [id, lead, canEditLead, buildLeadPatchPayload]);

  // On mount (and when lead is loaded), if we have a pending draft payload, try to flush it
  useEffect(() => {
    if (!autoSaveDraftKey || !id || !lead || !canEditLead) return;

    try {
      const draft = localStorage.getItem(autoSaveDraftKey);
      if (!draft) return;

      // Mark UI so user knows something is pending
      setAutoSaveStatus('dirty');

      // Best-effort: attempt to persist whatever is currently in state.
      // We don't rehydrate all local UI state from the stored payload; we only ensure it gets saved.
      void flushAutoSave('manual');
    } catch (e) {
      // ignore
    }
  }, [autoSaveDraftKey, id, lead, canEditLead, flushAutoSave]);

  const handleSave = async () => {
    // Validate phone numbers before saving
    const invalidPhones: string[] = [];
    contacts.forEach((contact, index) => {
      if (contact.phone) {
        if (!normalizeUsPhoneToE164(contact.phone)) {
          invalidPhones.push(`Contact ${index + 1}: ${contact.name || 'Unnamed'}`);
        }
      }
    });

    if (invalidPhones.length > 0) {
      toast({
        title: 'Invalid Phone Numbers',
        description: `Please enter a valid 10-digit phone number for: ${invalidPhones.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Prepare property details for customFields
      const propertyDetails = {
        propertyType: propertyType || null,
        sqft: sqft ? parseInt(sqft) : null,
        lotSize: lotSize || null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        roofType: roofType || null,
        roofAge: roofAge ? parseInt(roofAge) : null,
        hvacType: hvacType || null,
        hvacAge: hvacAge ? parseInt(hvacAge) : null,
        waterHeaterAge: waterHeaterAge ? parseInt(waterHeaterAge) : null,
        waterType: waterType || null,
        sewerType: sewerType || null,
        estimatedValue: estimatedValue ? parseInt(estimatedValue) : null,
        askingPrice: askingPrice ? parseInt(askingPrice) : null,
        appointmentDate: appointmentDate || null,
        rehabBudget: rehabBudget ? parseInt(rehabBudget) : null,
        rehabItems: rehabItems || [],
        rehabFinishLevel: rehabFinishLevel || null,
        rehabToggledItems: rehabToggledItems || {},
        rehabNumberOfWindows: rehabNumberOfWindows || null,
        rehabBathrooms: rehabBathrooms !== undefined && rehabBathrooms !== null ? rehabBathrooms : null,
        rehabCustomValues: rehabCustomValues || {},
        leadSourceData: leadSourceData || {},
      // ARV (top box) + Underwriting Calculator values
      arv: arvValue || null,
        underwritingArv: underwritingArv || null,
        underwritingTaxes: underwritingTaxes || null,
        underwritingTimeline: underwritingTimeline || null,
        underwritingRehabCost: underwritingRehabCost || null,
        finalOffer: finalOffer || null
      };

      console.log('💾 Saving customFields:', propertyDetails);
      console.log('💾 Underwriting values:', {
        underwritingArv,
        underwritingTaxes,
        underwritingTimeline,
        underwritingRehabCost,
        finalOffer
      });

      // Prepare lead updates - store property details in customFields
      const updates: any = {
        customFields: propertyDetails
      };

      // Include address if being edited or if it exists (only update if address is populated)
      if (editingAddress && (editAddressForm.address1 || editAddressForm.city || editAddressForm.state || editAddressForm.zipCode)) {
        // Use the form data if currently editing
        updates.address = {
          address1: editAddressForm.address1 || '',
          city: editAddressForm.city || '',
          state: editAddressForm.state || '',
          zipCode: editAddressForm.zipCode || ''
        };
      } else if (lead?.address && (lead.address.address1 || lead.address.city || lead.address.state || lead.address.zip)) {
        // Otherwise use existing lead address data
        updates.address = {
          address1: lead.address.address1 || '',
          city: lead.address.city || '',
          state: lead.address.state || '',
          zipCode: lead.address.zip || lead.address.zipCode || ''
        };
      }

      // Track if pipeline stage changed
      const stageChanged = pipelineStatus && lead?.pipelineStageId !== pipelineStatus;
      
      // Only add these fields if they have values
      if (pipelineStatus) updates.pipelineStageId = pipelineStatus;
      if (acquisitionsAgent && acquisitionsAgent !== 'unassigned') updates.assignedUserId = acquisitionsAgent;
      if (dispositionsAgent && dispositionsAgent !== 'unassigned') updates.dispAgentId = dispositionsAgent;
      
      // Handle lead source
      if (leadSource) {
        const source = leadSources.find(s => s.name === leadSource || s.id === leadSource);
        if (source) {
          updates.leadSourceId = source.id;
        }
      }
      
      // Handle lead status - check if it's an ID or name
      if (leadStatus) {
        const status = leadStatuses.find(s => s.id === leadStatus || s.name === leadStatus);
        if (status) {
          updates.leadStatusId = status.id;
        }
      }

      console.log('Sending updates:', updates);
      
      const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // If stage changed, call the stage change endpoint to trigger backend logic (validation, task creation, etc.)
        if (stageChanged && pipelineStatus) {
          try {
            const stageResponse = await makeApiCall(`${API_BASE}/pipeline/leads/${id}/move`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stageId: pipelineStatus })
            });
            
            if (stageResponse.ok) {
              console.log('✅ Stage changed successfully with backend validation and task creation');
            } else {
              const stageError = await stageResponse.json();
              console.error('Stage change failed:', stageError);
              // Revert UI selection if backend rejected the stage change
              if (stageError?.code === 'VALIDATION_REQUIRED') {
                setPipelineStatus(lead?.pipelineStageId || '');
                toast({
                  title: 'Stage Change Failed',
                  description: stageError?.error || 'Validation required',
                  variant: 'destructive',
                });
              }
              // Don't show error toast since the lead was already updated
            }
          } catch (stageError) {
            console.error('Error changing stage:', stageError);
          }
        }
        
        // Track price changes for valuation and rehab budget
        const oldEstimatedValue = lead?.customFields?.estimatedValue || null;
        const newEstimatedValue = estimatedValue ? parseInt(estimatedValue) : null;
        const oldAskingPrice = lead?.customFields?.askingPrice || null;
        const newAskingPrice = askingPrice ? parseInt(askingPrice) : null;
        const oldRehabBudget = lead?.customFields?.rehabBudget || null;
        const newRehabBudget = rehabBudget ? parseInt(rehabBudget) : null;
        
        await trackPriceChanges([
          { fieldName: 'estimatedValue', oldValue: oldEstimatedValue, newValue: newEstimatedValue },
          { fieldName: 'askingPrice', oldValue: oldAskingPrice, newValue: newAskingPrice },
          { fieldName: 'rehabBudget', oldValue: oldRehabBudget, newValue: newRehabBudget }
        ]);

        // Save contacts if they've been modified
        await saveContacts();
        
        // Save owner if being edited
        if (editingOwnerId && editOwnerForm) {
          await saveOwner();
        }
        
        // Close address editing mode if it was open
        if (editingAddress) {
          setEditingAddress(false);
        }
        
        // Close owner editing mode if it was open
        if (editingOwnerId) {
          ownerSectionRef.current?.cancelEdit();
          setEditingOwnerId(null);
          setEditOwnerForm(null);
        }
        
        // Success toast suppressed on Lead Detail (show only errors)
        
        // Reload lead data to reflect changes
        await loadLead();
        
        // Refresh owner section to show updated data
        ownerSectionRef.current?.refresh();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update lead');
      }
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lead',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const saveOwner = async () => {
    if (!editingOwnerId || !editOwnerForm) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/owners/${editingOwnerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editOwnerForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update owner');
      }
      
      console.log('✅ Owner updated successfully');
    } catch (error) {
      console.error('Error saving owner:', error);
      throw error; // Re-throw to be caught by handleSave
    }
  };

  const saveContacts = async () => {
    try {
      // Get the first contact (primary contact)
      const primaryContact = contacts[0];
      
      // Prepare the update based on lead type
      const contactUpdate: any = {};
      
      if (lead?.leadType === 'SELLER') {
        if (primaryContact && primaryContact.name) {
          // Update seller if primary contact exists
          contactUpdate.seller = {
            firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
            lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
            phone: primaryContact.phone,
            email: primaryContact.email,
            motivation: lead.seller?.motivation || null,
            notes: lead.seller?.notes || null
          };
        } else {
          // If no contacts, clear seller data
          contactUpdate.seller = {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            motivation: lead.seller?.motivation || null,
            notes: lead.seller?.notes || null
          };
        }
      } else if (lead?.leadType === 'BUYER') {
        if (primaryContact && primaryContact.name) {
          contactUpdate.buyer = {
            firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
            lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
            phone: primaryContact.phone,
            email: primaryContact.email,
            vip: lead.buyer?.vip || false,
            blacklisted: lead.buyer?.blacklisted || false
          };
        } else {
          // If no contacts, clear buyer data
          contactUpdate.buyer = {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            vip: lead.buyer?.vip || false,
            blacklisted: lead.buyer?.blacklisted || false
          };
        }
      } else if (lead?.leadType === 'VENDOR') {
        if (primaryContact && primaryContact.name) {
          contactUpdate.vendor = {
            firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
            lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
            phone: primaryContact.phone,
            email: primaryContact.email,
            companyName: lead.vendor?.companyName || null,
            serviceType: lead.vendor?.serviceType || null
          };
        } else {
          // If no contacts, clear vendor data
          contactUpdate.vendor = {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            companyName: lead.vendor?.companyName || null,
            serviceType: lead.vendor?.serviceType || null
          };
        }
      }
      
      // Also save ALL contacts to customFields for multi-contact support
      contactUpdate.customFields = {
        ...lead?.customFields,
        contacts: contacts.filter(c => c.name || c.phone || c.email) // Only save non-empty contacts
      };
      
      if (Object.keys(contactUpdate).length > 0) {
        const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactUpdate)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save contact information');
        }
        
        console.log('✅ Contact information saved successfully');
      }
    } catch (error) {
      console.error('Error saving contacts:', error);
      throw error; // Re-throw to be caught by handleSave
    }
  };

  // Helper function to track price changes
  async function trackPriceChanges(changes: Array<{ fieldName: string; oldValue: number | null; newValue: number | null }>) {
    const validChanges = changes.filter((c) => c.newValue !== null && c.newValue !== c.oldValue);
    if (validChanges.length === 0) return;

    try {
      await makeApiCall(`${API_BASE}/leads/${id}/price-history/track-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: validChanges }),
      });
    } catch (error) {
      console.error('Error tracking price changes:', error);
    }
  }

  const loadNotes = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/communications`);
      if (response.ok) {
        const data = await response.json();
        // Filter for notes only (type: 'NOTE')
        const communications = data.data || [];
        const notesList = communications
          .filter((c: any) => c.type === 'NOTE')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(notesList);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a note',
        variant: 'destructive'
      });
      return;
    }

    setAddingNote(true);
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'NOTE',
          direction: 'OUTBOUND',
          body: noteText.trim(),
          occurredAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Success toast suppressed on Lead Detail (show only errors)
        setNoteText('');
        loadCommunications(); // Reload all communications
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add note');
      }
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add note',
        variant: 'destructive'
      });
    } finally {
      setAddingNote(false);
    }
  };

  // Fetch communication history
  const loadCommunications = async () => {
    setLoadingCommunications(true);
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/communications`);
      if (response.ok) {
        const data = await response.json();
        // Include ALL communication types: CALL, SMS, EMAIL, and NOTE
        // Map createdBy to user for frontend compatibility
        const comms = (data.data || []).map((c: any) => ({
          ...c,
          user: c.createdBy // Map createdBy to user so the component can display author name
        })).sort((a: any, b: any) => 
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() // Sort by timestamp (newest first)
        );
        setCommunications(comms);
        
        // Also set notes for backward compatibility (if needed elsewhere)
        const notesList = comms.filter((c: any) => c.type === 'NOTE');
        setNotes(notesList);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
    } finally {
      setLoadingCommunications(false);
    }
  };

  // Helper to get phone number
  const getLeadPhoneNumber = () => {
    if (!lead) {
      console.log('❌ No lead data available');
      return null;
    }
    
    const contactPhone = lead.contacts?.[0]?.phone?.trim();
    const sellerPhone = lead.seller?.phone?.trim();
    const phoneNumber = contactPhone || sellerPhone || null;
    
    console.log('📞 Phone check:', { 
      contactPhone, 
      sellerPhone, 
      finalPhone: phoneNumber,
      hasContacts: !!lead.contacts?.length,
      hasSeller: !!lead.seller,
      leadData: lead
    });
    
    return phoneNumber;
  };

  // Get all available phone numbers from contacts, owners, and seller
  const getAllPhoneNumbers = () => {
    if (!lead) return [];
    
    const phones: Array<{number: string; label: string; type: string; isPrimary?: boolean}> = [];
    
    // ONLY use lead owners as the single source of truth for contact info
    leadOwners?.forEach((owner: LeadOwner) => {
      if (owner.phone?.trim()) {
        phones.push({
          number: owner.phone.trim(),
          label: `${owner.firstName} ${owner.lastName}${owner.isPrimary ? ' (Primary)' : ''}`,
          type: 'owner',
          isPrimary: owner.isPrimary
        });
      }
    });
    
    return phones;
  };

  // Get all available email addresses from lead owners only
  const getAllEmailAddresses = () => {
    if (!lead) return [];
    
    const emails: Array<{email: string; label: string; type: string; isPrimary?: boolean}> = [];
    
    // ONLY use lead owners as the single source of truth for contact info
    leadOwners?.forEach((owner: LeadOwner) => {
      if (owner.email?.trim() && 
          !owner.email.includes('@unknown.local') && 
          !owner.email.includes('none@none.com')) {
        emails.push({
          email: owner.email.trim(),
          label: `${owner.firstName} ${owner.lastName}${owner.isPrimary ? ' (Primary)' : ''}`,
          type: 'owner',
          isPrimary: owner.isPrimary
        });
      }
    });
    
    return emails;
  };

  const getLeadEmail = () => {
    if (!lead) {
      console.log('❌ No lead data available');
      return null;
    }
    
    const contactEmail = lead.contacts?.[0]?.email?.trim();
    const sellerEmail = lead.seller?.email?.trim();
    const buyerEmail = lead.buyer?.email?.trim();
    const vendorEmail = lead.vendor?.email?.trim();
    const emailAddress = contactEmail || sellerEmail || buyerEmail || vendorEmail || null;
    
    console.log('📧 Email check:', { 
      contactEmail, 
      sellerEmail,
      buyerEmail,
      vendorEmail,
      finalEmail: emailAddress
    });
    
    return emailAddress;
  };

  // Helper to check if phone number is valid
  const hasValidPhone = () => {
    const allPhones = getAllPhoneNumbers();
    return allPhones.length > 0;
  };

  // Make a call
  const handleMakeCall = async () => {
    const allPhones = getAllPhoneNumbers();
    
    // If no phones available
    if (allPhones.length === 0) {
      toast({
        title: 'Error',
        description: 'No phone number found for this lead',
        variant: 'destructive'
      });
      return;
    }
    
    // If multiple phones and none selected, show selector
    if (allPhones.length > 1 && !selectedPhoneNumber) {
      setAvailablePhoneNumbers(allPhones);
      setShowPhoneSelector(true);
      return;
    }
    
    // Use selected number or first available
    const phoneNumber = selectedPhoneNumber || allPhones[0]?.number;
    
    if (!phoneNumber) {
      toast({
        title: 'Error',
        description: 'No phone number found for this lead',
        variant: 'destructive'
      });
      return;
    }

    setMakingCall(true);
    try {
      console.log('🔵 Making browser call to:', phoneNumber, 'leadId:', id);
      
      // Use browser calling
      await makeBrowserCall(phoneNumber);
      
      // Store call in database for history
      try {
        await makeApiCall(`${API_BASE}/calls/log-outbound`, {
          method: 'POST',
          body: JSON.stringify({ 
            to: phoneNumber,
            leadId: id 
          })
        });
      } catch (dbError) {
        console.error('Failed to store call in database:', dbError);
      }
      
      // Refresh communications
      await loadCommunications();
      
      if (showSuccessToasts) {
        toast({
          title: 'Call Started',
          description: 'Call connected successfully'
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error making call:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to make call",
        variant: "destructive",
      });
    } finally {
      setMakingCall(false);
    }
  };

  // Handle phone selection from dialog
  const handlePhoneSelected = async (phoneNumber: string) => {
    setSelectedPhoneNumber(phoneNumber);
    setShowPhoneSelector(false);
    
    // Make the call immediately
    setMakingCall(true);
    try {
      console.log('🔵 Making browser call to:', phoneNumber, 'leadId:', id);
      
      await makeBrowserCall(phoneNumber);
      
      // Store call in database for history
      try {
        await makeApiCall(`${API_BASE}/calls/log-outbound`, {
          method: 'POST',
          body: JSON.stringify({ 
            to: phoneNumber,
            leadId: id 
          })
        });
      } catch (dbError) {
        console.error('Failed to store call in database:', dbError);
      }
      
      await loadCommunications();
      
      if (showSuccessToasts) {
        toast({
          title: 'Call Started',
          description: 'Call connected successfully'
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error making call:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to make call",
        variant: "destructive",
      });
    } finally {
      setMakingCall(false);
    }
  };

  // Send SMS
  const handleSendSMS = async () => {
    if (!smsText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive'
      });
      return;
    }

    const allPhones = getAllPhoneNumbers();
    
    // If no phones available
    if (allPhones.length === 0) {
      toast({
        title: 'Error',
        description: 'No phone number found for this lead',
        variant: 'destructive'
      });
      return;
    }
    
    // Use selected SMS phone or first available
    const phoneNumber = selectedSMSPhone || allPhones[0]?.number;
    
    if (!phoneNumber) {
      toast({
        title: 'Error',
        description: 'No phone number found for this lead',
        variant: 'destructive'
      });
      return;
    }

    setSendingSMS(true);
    try {
      console.log('📤 Sending SMS:', { to: phoneNumber, text: smsText.trim(), leadId: id });
      
      const response = await makeApiCall(`${API_BASE}/sms/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: phoneNumber,
          text: smsText.trim(),  // Backend expects 'text' not 'message'
          leadId: id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        if (showSuccessToasts) {
          toast({
            title: 'SMS Sent',
            description: 'Message sent successfully'
          });
        }
        setSmsText('');
        await loadCommunications();
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send SMS',
        variant: 'destructive'
      });
    } finally {
      setSendingSMS(false);
    }
  };

  // Send Email
  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter subject and message',
        variant: 'destructive'
      });
      return;
    }

    const allEmails = getAllEmailAddresses();
    
    // If no emails available
    if (allEmails.length === 0) {
      toast({
        title: 'Error',
        description: 'No email address found for this lead',
        variant: 'destructive'
      });
      return;
    }
    
    // Use selected email or first available
    const emailAddress = selectedEmail || allEmails[0]?.email;
    
    if (!emailAddress) {
      toast({
        title: 'Error',
        description: 'No email address found for this lead',
        variant: 'destructive'
      });
      return;
    }

    setSendingEmail(true);
    try {
      console.log('📧 Sending Email:', { to: emailAddress, subject: emailSubject, leadId: id });
      
      const response = await makeApiCall(`${API_BASE}/settings/email/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: emailAddress,
          subject: emailSubject.trim(),
          text: emailBody.trim(),
          leadId: id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailSubject('');
        setEmailBody('');
        await loadCommunications();
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('❌ Email send error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send email',
        variant: 'destructive'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', phone: '', email: '' }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: string, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diff = now.getTime() - noteDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return noteDate.toLocaleDateString();
  };

  const loadLeadSourceData = async () => {
    try {
      // Load lead source specific data from customFields
      if (lead?.customFields) {
        setLeadSourceData(lead.customFields.leadSourceData || {});
        setRehabItems(lead.customFields.rehabItems || []);
        setRehabBudget(lead.customFields.rehabBudget || '');
      }
    } catch (error) {
      console.error('Error loading lead source data:', error);
    }
  };

  const loadComparables = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/comps/leads/${id}/comparables`);
      if (response.ok) {
        const data = await response.json();
        setComparables(data.data || []);
      }
    } catch (error) {
      console.error('Error loading comparables:', error);
    }
  };

  const loadUnderwritingScenarios = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/underwriting/leads/${id}/scenarios`);
      if (response.ok) {
        const data = await response.json();
        setUnderwritingScenarios(data.data || []);
      }
    } catch (error) {
      console.error('Error loading underwriting scenarios:', error);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${id}/files`);
      if (response.ok) {
        const data = await response.json();
        // Files tab should NOT include photo-category items. Photos are shown in the Photos section.
        const onlyNonPhotos = (data.data || []).filter((file: any) => {
          const category = (file?.category || '').toString().toLowerCase();
          const isPhotoCategory = category === 'photos' || category === 'photo';
          return !isPhotoCategory;
        });
        setFiles(onlyNonPhotos);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/files/lead/${id}`);
      if (response.ok) {
        const data = await response.json();
        // Photos section is category-driven: only items categorized as photos appear here.
        const photoFiles = (data.data || []).filter((file: any) => {
          const category = (file?.category || '').toString().toLowerCase();
          const isPhotoCategory = category === 'photos' || category === 'photo';
          return isPhotoCategory;
        });
        setPhotos(photoFiles);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const loadDeal = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/deals/${id}`);
      if (response.ok) {
        const data = await response.json();
        const dealData = data.data;
        if (dealData) {
          setDeal(dealData);
          setContractPrice(dealData.contractPrice?.toString() || '');
          setSoldPrice(dealData.soldPrice?.toString() || '');
          setNetProfit(dealData.netProfit?.toString() || '');
          setContractedAt(dealData.contractedAt ? new Date(dealData.contractedAt).toISOString().split('T')[0] : '');
          setClosedAt(dealData.closedAt ? new Date(dealData.closedAt).toISOString().split('T')[0] : '');
        }
      }
    } catch (error) {
      console.error('Error loading deal:', error);
    }
  };

  const saveDeal = async () => {
    try {
      // Store old values for price tracking
      const oldContractPrice = deal?.contractPrice || null;
      const oldSoldPrice = deal?.soldPrice || null;
      const oldNetProfit = deal?.netProfit || null;

      const dealData = {
        contractPrice: contractPrice ? parseFloat(contractPrice) : null,
        soldPrice: soldPrice ? parseFloat(soldPrice) : null,
        netProfit: netProfit ? parseFloat(netProfit) : null,
        contractedAt: contractedAt || null,
        closedAt: closedAt || null
      };

      const response = await makeApiCall(`${API_BASE}/deals/${id}`, {
        method: 'POST',
        body: JSON.stringify(dealData)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Track price changes
        await trackPriceChanges([
          { fieldName: 'contractPrice', oldValue: oldContractPrice, newValue: dealData.contractPrice },
          { fieldName: 'soldPrice', oldValue: oldSoldPrice, newValue: dealData.soldPrice },
          { fieldName: 'netProfit', oldValue: oldNetProfit, newValue: dealData.netProfit }
        ]);

        setDeal(data.data);
        setEditingDeal(false);
        // Success toast removed - show only errors
        console.log('✅ Transaction details saved successfully');
      } else {
        throw new Error('Failed to save deal');
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      toast({
        title: "Error",
        description: "Failed to save transaction details",
        variant: "destructive"
      });
    }
  };

  const cancelDealEdit = () => {
    if (deal) {
      setContractPrice(deal.contractPrice?.toString() || '');
      setSoldPrice(deal.soldPrice?.toString() || '');
      setNetProfit(deal.netProfit?.toString() || '');
      setContractedAt(deal.contractedAt ? new Date(deal.contractedAt).toISOString().split('T')[0] : '');
      setClosedAt(deal.closedAt ? new Date(deal.closedAt).toISOString().split('T')[0] : '');
    } else {
      setContractPrice('');
      setSoldPrice('');
      setNetProfit('');
      setContractedAt('');
      setClosedAt('');
    }
    setEditingDeal(false);
  };

  const loadBuyerOffers = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyer-offers/leads/${id}/offers`);
      if (response.ok) {
        const data = await response.json();
        setBuyerOffers(data || []);
      }
    } catch (error) {
      console.error('Error loading buyer offers:', error);
    }
  };

  const loadBuyers = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyers`);
      if (response.ok) {
        const data = await response.json();
        setBuyers(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading buyers:', error);
    }
  };

  const createBuyerOffer = async () => {
    try {
      if (!selectedBuyer || !offerAmount) {
        toast({
          title: "Error",
          description: "Please select a buyer and enter an offer amount",
          variant: "destructive"
        });
        return;
      }

      const offerData = {
        buyerId: selectedBuyer,
        offerAmount: parseFloat(offerAmount),
        status: offerStatus,
        notes: offerNotes || null
      };

      const response = await makeApiCall(`${API_BASE}/buyer-offers/leads/${id}/offers`, {
        method: 'POST',
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        await loadBuyerOffers();
        setCreatingOffer(false);
        setSelectedBuyer('');
        setOfferAmount('');
        setOfferStatus('PENDING');
        setOfferNotes('');
        // Success toast removed - show only errors
        console.log('✅ Buyer offer created successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create offer');
      }
    } catch (error) {
      console.error('Error creating buyer offer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create buyer offer",
        variant: "destructive"
      });
    }
  };

  const updateOfferStatus = async (offerId: string, newStatus: string) => {
    try {
      const endpoint = newStatus === 'ACCEPTED' 
        ? `${API_BASE}/buyer-offers/offers/${offerId}/accept`
        : newStatus === 'REJECTED'
        ? `${API_BASE}/buyer-offers/offers/${offerId}/reject`
        : `${API_BASE}/buyer-offers/offers/${offerId}`;

      const response = await makeApiCall(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadBuyerOffers();
        // Success toast removed - show only errors
        console.log(`✅ Offer ${newStatus.toLowerCase()} successfully`);
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive"
      });
    }
  };

  const deleteOffer = async (offerId: string) => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyer-offers/offers/${offerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadBuyerOffers();
        // Success toast removed - show only errors
        console.log('✅ Offer deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive"
      });
    }
  };

  const createNewBuyer = async () => {
    try {
      if (!newBuyerFirstName || !newBuyerLastName || !newBuyerEmail || !normalizeUsPhoneToE164(newBuyerPhone)) {
        toast({
          title: "Error",
          description: "All buyer fields are required",
          variant: "destructive"
        });
        return;
      }

      const buyerData = {
        firstName: newBuyerFirstName,
        lastName: newBuyerLastName,
        email: newBuyerEmail,
        phone: newBuyerPhone,
        segmentation: newBuyerSegmentation || null
      };

      const response = await makeApiCall(`${API_BASE}/buyers`, {
        method: 'POST',
        body: JSON.stringify(buyerData)
      });

      if (response.ok) {
        await loadBuyers();
        setCreatingBuyer(false);
        setNewBuyerFirstName('');
        setNewBuyerLastName('');
        setNewBuyerEmail('');
        setNewBuyerPhone('');
        setNewBuyerSegmentation('');
        // Success toast removed - show only errors
        console.log('✅ Buyer created successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create buyer');
      }
    } catch (error) {
      console.error('Error creating buyer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create buyer",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Upload multiple files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          // Files tab uploads should remain in Files, even if the file is an image.
          // Photos section is reserved for items explicitly categorized as 'photos'.
          formData.append('category', 'other');

          const response = await makeApiCall(`${API_BASE}/leads/${id}/files`, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          failCount++;
        }
      }

      // Lead Detail UX: show toasts ONLY for errors
      if (failCount > 0) {
        toast({
          title: 'Error',
          description:
            successCount > 0
              ? `${failCount} file${failCount > 1 ? 's' : ''} failed to upload`
              : `Failed to upload ${failCount} file${failCount > 1 ? 's' : ''}`,
          variant: 'destructive'
        });
      }

      if (successCount > 0) {
        loadFiles();
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload files',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset the input so the same files can be selected again if needed
      event.target.value = '';
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
    
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
      
      // Check both extension and mime type
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      const hasValidMimeType = allowedTypes.includes(fileType);
      
      if (hasValidExtension || hasValidMimeType) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    // Show error if any invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid File Type',
        description: `Only JPEG, PNG, and HEIC images are allowed. Rejected: ${invalidFiles.join(', ')}`,
        variant: 'destructive'
      });
      
      // Reset input
      event.target.value = '';
      
      // If no valid files, return early
      if (validFiles.length === 0) return;
    }

    // Automatically expand the Photos section to show upload progress
    setIsPhotosOpen(true);
    setUploadingPhoto(true);
    
    try {
      // Upload valid photos only
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        const formData = new FormData();
        formData.append('file', file);
        formData.append('leadId', id!);
        formData.append('category', 'photos');
        formData.append('tags', JSON.stringify(['property']));

        const response = await fetch(`${API_BASE}/files/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      console.log(`✅ Photo uploaded: ${validFiles.map(f => f.name).join(', ')}`);
      console.log(`📸 Uploaded ${validFiles.length} of ${files.length} photos`);
      
      // Lead Detail UX: no success toast (show only errors)
      loadPhotos();
      // Reset the input
      event.target.value = '';
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photos',
        variant: 'destructive'
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600">Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-slate-600">Lead not found</p>
        <Button onClick={() => navigate('/leads')} className="mt-4">
          Back to Leads
        </Button>
      </div>
    );
  }

  const primaryOwner = leadOwners.find((o) => o.isPrimary) || leadOwners[0];

  const formatDisplayName = (firstName?: string, lastName?: string) => {
    const fn = (firstName || '').trim();
    const ln = (lastName || '').trim();
    const full = `${fn} ${ln}`.trim();
    return full || 'Unknown Caller';
  };

  const fallbackOwnerName =
    (lead.seller?.firstName || lead.seller?.lastName)
      ? formatDisplayName(lead.seller?.firstName, lead.seller?.lastName)
      : (lead.buyer?.firstName || lead.buyer?.lastName)
        ? formatDisplayName(lead.buyer?.firstName, lead.buyer?.lastName)
        : (lead.vendor?.firstName || lead.vendor?.lastName)
          ? formatDisplayName(lead.vendor?.firstName, lead.vendor?.lastName)
          : 'Unknown Caller';

  const ownerName = primaryOwner
    ? formatDisplayName(primaryOwner.firstName, primaryOwner.lastName)
    : fallbackOwnerName;
  const ownerEmail = primaryOwner?.email || lead.seller?.email || lead.buyer?.email || lead.vendor?.email || '';
  const ownerPhone = primaryOwner?.phone || lead.seller?.phone || lead.buyer?.phone || lead.vendor?.phone || '';
  const ownerContactLine = [ownerEmail, ownerPhone].filter(Boolean).join(' • ');
  const additionalOwners = leadOwners.filter((o) => !primaryOwner || o.id !== primaryOwner.id);

  return (
    <>
      {/* Navigation Loading Overlay */}
      {navigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-3 pointer-events-auto">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-700">Loading lead...</p>
          </div>
        </div>
      )}
      
      <div
        className="space-y-2"
        onChangeCapture={(e) => {
          // Try to extract field name from the input element
          const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if (target && target.name) {
            markFieldDirty(target.name);
          }
          scheduleAutoSave();
        }}
        onBlurCapture={(e) => {
          // On blur, cancel any pending debounce and save immediately
          const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if (target && target.name) {
            markFieldDirty(target.name);
          }
          void flushAutoSave('blur');
        }}
      >
        {/* Header with Back Button and Save */}
        <div className="flex items-center justify-between">
          <Button variant="outline" className="h-5 text-[9px] px-2 py-1 rounded-md inline-flex items-center justify-center" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-2.5 h-2.5 mr-0.5" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {/* Countdown Timer */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 h-5 rounded-md border ${showNoContactAlert ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'}`}>
              <Clock className={`w-2.5 h-2.5 ${showNoContactAlert ? 'text-orange-600' : 'text-slate-600'}`} />
              <span className={`text-[9px] font-medium ${showNoContactAlert ? 'text-orange-700' : 'text-slate-700'}`}>
                {timeInStatus}
              </span>
              {showNoContactAlert && (
                <Badge className="text-[8px] bg-orange-600 text-white px-1 py-0 h-3 leading-none">
                  72h+
                </Badge>
              )}
            </div>
            {/* Auto-save happens silently in background - no status display needed */}
            <Button
              className="h-5 text-[9px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md inline-flex items-center justify-center"
              onClick={() => void flushAutoSave('manual')}
              disabled={saving || !canEditLead}
              title="Save now"
            >
              <Save className="w-2.5 h-2.5 mr-0.5" />
              {saving ? 'Saving...' : 'Save now'}
            </Button>
            {/* Prev / Next lead navigation (from Pipeline view) */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-5 w-6 p-0 rounded-md inline-flex items-center justify-center"
                onClick={async () => {
                  if (effectivePrevLeadId) {
                    // SAFE: Check for unsaved changes (existing behavior preserved)
                    if (autoSaveStatus === 'dirty' || autoSaveStatus === 'saving') {
                      const shouldNavigate = window.confirm('You have unsaved changes. Do you want to save before navigating?');
                      if (shouldNavigate) {
                        // Wait for save to complete
                        await flushAutoSave('manual');
                        // SAFE: Verify save completed before navigating
                        if (autoSaveStatus === 'saving') {
                          // Wait a bit more if still saving
                          await new Promise(resolve => setTimeout(resolve, 500));
                        }
                      } else {
                        // User chose not to save - clear pending operations
                        autoSavePendingRef.current = false;
                        if (autoSaveTimerRef.current) {
                          clearTimeout(autoSaveTimerRef.current);
                          autoSaveTimerRef.current = null;
                        }
                      }
                    }
                    setNavigating(true);
                    navigate(`/leads/${effectivePrevLeadId}/edit`);
                  }
                }}
                disabled={!effectivePrevLeadId || navigating}
                title={effectivePrevLeadId ? 'Previous lead' : 'No previous lead'}
              >
                {navigating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronLeft className="w-3 h-3" />}
              </Button>
              <Button
                variant="outline"
                className="h-5 w-6 p-0 rounded-md inline-flex items-center justify-center"
                onClick={async () => {
                  if (effectiveNextLeadId) {
                    // SAFE: Check for unsaved changes (existing behavior preserved)
                    if (autoSaveStatus === 'dirty' || autoSaveStatus === 'saving') {
                      const shouldNavigate = window.confirm('You have unsaved changes. Do you want to save before navigating?');
                      if (shouldNavigate) {
                        // Wait for save to complete
                        await flushAutoSave('manual');
                        // SAFE: Verify save completed before navigating
                        if (autoSaveStatus === 'saving') {
                          // Wait a bit more if still saving
                          await new Promise(resolve => setTimeout(resolve, 500));
                        }
                      } else {
                        // User chose not to save - clear pending operations
                        autoSavePendingRef.current = false;
                        if (autoSaveTimerRef.current) {
                          clearTimeout(autoSaveTimerRef.current);
                          autoSaveTimerRef.current = null;
                        }
                      }
                    }
                    setNavigating(true);
                    navigate(`/leads/${effectiveNextLeadId}/edit`);
                  }
                }}
                disabled={!effectiveNextLeadId || navigating}
                title={effectiveNextLeadId ? 'Next lead' : 'No next lead'}
              >
                {navigating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Access Information Banner */}
        {canViewLead && !canEditLead && accessReason && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Limited Access - Task Assignment
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {accessReason}. You can view lead details and complete your assigned tasks, but cannot edit lead information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1 - Address + Owner */}
        <div className="border border-slate-200 rounded-lg bg-white p-2 min-h-[96px]">
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Address */}
            <div className="col-span-12 md:col-span-6">
              <div className="flex items-center gap-1 mb-0.5">
                <Home className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase">Address</span>
              </div>
              {!editingAddress ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{lead.address?.address1 || 'No Address'}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {lead.address?.city && lead.address?.state ? `${lead.address.city}, ${lead.address.state} ${lead.address.zip || lead.address.zipCode || ''}` : ''}
                      </p>
                    </div>
                    {canEditLead && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingAddress(true);
                          setEditAddressForm({
                            address1: lead.address?.address1 || '',
                            city: lead.address?.city || '',
                            state: lead.address?.state || '',
                            zipCode: lead.address?.zip || lead.address?.zipCode || ''
                          });
                        }}
                        title="Edit address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2 mt-1">
                  <div>
                    <Input
                      className="h-6 text-xs"
                      value={editAddressForm.address1}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, address1: e.target.value })}
                      placeholder="Street Address"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Input
                      className="h-6 text-xs"
                      value={editAddressForm.city}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      className="h-6 text-xs"
                      value={editAddressForm.state}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, state: e.target.value })}
                      placeholder="State"
                    />
                    <Input
                      className="h-6 text-xs"
                      value={editAddressForm.zipCode}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, zipCode: e.target.value })}
                      placeholder="Zip"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 text-xs px-3"
                      disabled={savingAddress}
                      onClick={async () => {
                        setSavingAddress(true);
                        console.log('💾 Saving address:', editAddressForm);
                        try {
                          const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ address: editAddressForm })
                          });
                          console.log('📡 Address save response status:', response.status);
                          if (response.ok) {
                            const responseData = await response.json();
                            console.log('✅ Address saved successfully:', responseData.data?.address);
                            // Success toast suppressed on Lead Detail (show only errors)
                            setEditingAddress(false);
                            await loadLead();
                          } else {
                            const errorData = await response.json();
                            console.error('❌ Address save error:', errorData);
                            throw new Error(errorData.error || errorData.message || 'Failed to update address');
                          }
                        } catch (error: any) {
                          console.error('❌ Address save exception:', error);
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to update address',
                            variant: 'destructive'
                          });
                        } finally {
                          setSavingAddress(false);
                        }
                      }}
                    >
                      {savingAddress ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-3"
                      onClick={() => {
                        setEditingAddress(false);
                        setEditAddressForm({ address1: '', city: '', state: '', zipCode: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Owner Section - Using LeadOwnerSection Component */}
            <div className="col-span-12 md:col-span-6">
              {id && <LeadOwnerSection ref={ownerSectionRef} leadId={id} readOnly={!canEditLead} onEditingChange={handleOwnerEditingChange} suppressSuccessToasts onOwnerChange={loadOwners} />}
            </div>
          </div>
        </div>

        {/* Section 2 - Lead Details + Timeline (side by side) */}
        <div className="grid grid-cols-12 gap-2 items-stretch">
          {/* Lead Details - Left Side (8 cols) */}
          <div className="col-span-8 border border-slate-200 rounded-lg bg-white p-2 flex flex-col min-h-[96px]">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3 h-3 text-slate-500" />
              <span className="text-[11px] font-medium text-slate-600">Lead Details</span>
            </div>

            <div className="grid grid-cols-5 gap-1 flex-1 content-start">
              <div>
                <Label className="text-[9px] text-slate-500">Source</Label>
                <Select value={leadSource} onValueChange={setLeadSource} disabled={!canEditLead}>
                  <SelectTrigger className="h-5 text-[10px]"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {leadSources.map((source) => (
                      <SelectItem key={source.id} value={source.name}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[9px] text-slate-500">Lead Status</Label>
                <Select 
                  key={leadSelectKey} 
                  value={leadStatus} 
                  onValueChange={handleLeadStatusChange} 
                  disabled={!canEditLead}
                >
                  <SelectTrigger className="h-5 text-[10px]"><SelectValue placeholder="Lead Status" /></SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[9px] text-slate-500">Pipeline Status</Label>
                <Select 
                  key={pipelineSelectKey} 
                  value={pipelineStatus} 
                  onValueChange={handlePipelineStatusChange} 
                  disabled={!canEditLead || changingPipelineStatus}
                >
                  <SelectTrigger className="h-5 px-2 py-0 text-[10px] [&>span]:w-full [&>span]:text-left">
                    {changingPipelineStatus ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Updating...</span>
                      </span>
                    ) : (
                      <SelectValue className="text-left" placeholder="Pipeline Status" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name?.trim?.() || stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[9px] text-slate-500">ACQ Agent</Label>
                <Select
                  value={acquisitionsAgent || 'unassigned'}
                  onValueChange={(value) => {
                    setAcquisitionsAgent(value === 'unassigned' ? '' : value);
                    scheduleAutoSave();
                  }}
                  disabled={!canEditLead}
                >
                  <SelectTrigger className="h-5 text-[10px]"><SelectValue placeholder="ACQ Agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None</SelectItem>
                    {agents
                      .filter((a) => a?.status === 'active')
                      .filter((a) => {
                        const roles = Array.isArray(a.roles) ? a.roles : [];
                        return roles.includes('ACQ') || roles.some((r: any) => r.role?.name === 'ACQ' || r.name === 'ACQ');
                      })
                      .map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[9px] text-slate-500">DISP Agent</Label>
                <Select
                  value={dispositionsAgent || 'unassigned'}
                  onValueChange={(value) => {
                    setDispositionsAgent(value === 'unassigned' ? '' : value);
                    scheduleAutoSave();
                  }}
                  disabled={!canEditLead}
                >
                  <SelectTrigger className="h-5 text-[10px]"><SelectValue placeholder="DISP Agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None</SelectItem>
                    {agents
                      .filter((a) => a?.status === 'active')
                      .filter((a) => {
                        const roles = Array.isArray(a.roles) ? a.roles : [];
                        return roles.includes('DISP') || roles.some((r: any) => r.role?.name === 'DISP' || r.name === 'DISP');
                      })
                      .map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Timeline - Right Side (4 cols) */}
          <div className="col-span-4 border border-slate-200 rounded-lg bg-white p-2 flex flex-col">
            <LeadTimeline
              leadId={id!}
              leadCreatedAt={lead.createdAt}
              deal={deal}
              customFields={{
                ...lead.customFields,
                estimatedValue: estimatedValue ? parseInt(estimatedValue) : lead.customFields?.estimatedValue,
                askingPrice: askingPrice ? parseInt(askingPrice) : lead.customFields?.askingPrice,
                appointmentDate: appointmentDate || lead.customFields?.appointmentDate,
                rehabBudget: rehabBudget ? parseInt(rehabBudget) : lead.customFields?.rehabBudget,
              }}
              lead={{
                pipelineStage: lead.pipelineStage,
                stageEnteredAt: lead.stageEnteredAt
              }}
              onRefresh={() => {
                loadLead();
                loadDeal();
              }}
            />
          </div>
        </div>

        {/* Section 3 - Property Information (full width) */}
        <div className="border border-slate-200 rounded-lg bg-white p-2 min-h-[96px]">
          <div className="flex items-center gap-1.5 mb-1">
            <Home className="w-3 h-3 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-600">Property Information</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
            <div className="flex flex-col">
              <Label className="text-[9px] text-slate-500 h-[14px] leading-[14px] mb-0.5">Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType} disabled={!canEditLead}>
                <SelectTrigger className="h-5 text-[10px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Multi Family">Multi Family</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <Label className="text-[9px] text-slate-500 h-[14px] leading-[14px] mb-0.5">SqFt</Label>
              <Input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="SqFt" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div className="flex flex-col">
              <Label className="text-[9px] text-slate-500 h-[14px] leading-[14px] mb-0.5">Acres</Label>
              <Input type="number" step="0.01" value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="Acres" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div className="flex flex-col">
              <Label className="text-[9px] text-slate-500 h-[14px] leading-[14px] mb-0.5">Beds</Label>
              <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Beds" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div className="flex flex-col">
              <Label className="text-[9px] text-slate-500 h-[14px] leading-[14px] mb-0.5">Baths</Label>
              <Input
                type="number"
                step="0.5"
                value={bathrooms}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Allow empty string
                  if (inputValue === '') {
                    setBathrooms('');
                    return;
                  }
                  const v = Number(inputValue);
                  if (!Number.isFinite(v)) {
                    setBathrooms('');
                    return;
                  }
                  // Round to nearest 0.5
                  setBathrooms(String(Math.max(0, Math.round(v * 2) / 2)));
                }}
                placeholder="Baths"
                className="h-5 text-[10px]"
                disabled={!canEditLead}
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-[9px] text-slate-500 h-[14px] leading-[14px] mb-0.5">Year</Label>
              <Input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="Year" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
          </div>
        </div>

        {/* Contacts box removed (not needed) */}

        {/* Tabs Section */}
        <div className="grid grid-cols-12 gap-2">
          {/* Left side - Tabs (8 columns) */}
          <div className="col-span-8">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if ((value === 'transactions' && !canSeeTransactionsTab) || (value === 'dispositions' && !canSeeDispositionsTab)) {
                  setActiveTab('acquisitions');
                  return;
                }
                setActiveTab(value);
              }}
            >
              <TabsList className={`grid w-full ${tabsGridColsClass} h-7`}>
                <TabsTrigger value="acquisitions" className="w-full h-full justify-center text-xs py-1">Acquisitions</TabsTrigger>
                {canSeeDispositionsTab && <TabsTrigger value="dispositions" className="w-full h-full justify-center text-xs py-1">Dispositions</TabsTrigger>}
                {canSeeTransactionsTab && <TabsTrigger value="transactions" className="w-full h-full justify-center text-xs py-1">Transactions</TabsTrigger>}
                <TabsTrigger value="files" className="w-full h-full justify-center text-xs py-1">Files</TabsTrigger>
              </TabsList>

              {/* Acquisitions Tab */}
              <TabsContent value="acquisitions" className="space-y-2 mt-2">
                {/* 1. Additional Property Information */}
                <Collapsible open={isAdditionalInfoOpen} onOpenChange={setIsAdditionalInfoOpen}>
                  <div className="border border-slate-200 rounded-lg bg-white p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ClipboardList className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-medium text-slate-600">Additional Property Information</span>
                        {isAdditionalPropertyInfoComplete ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          aria-label={isAdditionalInfoOpen ? 'Collapse section' : 'Expand section'}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${isAdditionalInfoOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="mt-2">
                      <div className="grid grid-cols-7 gap-2">
                        <div><Label className="text-[10px] text-slate-500">Roof</Label><Input value={roofType} onChange={(e) => setRoofType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Roof Age</Label><Input type="number" value={roofAge} onChange={(e) => setRoofAge(e.target.value)} placeholder="Yrs" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">HVAC</Label><Input value={hvacType} onChange={(e) => setHvacType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">HVAC Age</Label><Input type="number" value={hvacAge} onChange={(e) => setHvacAge(e.target.value)} placeholder="Yrs" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">WH Age</Label><Input type="number" value={waterHeaterAge} onChange={(e) => setWaterHeaterAge(e.target.value)} placeholder="Yrs" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Water</Label><Input value={waterType} onChange={(e) => setWaterType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Sewer</Label><Input value={sewerType} onChange={(e) => setSewerType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* 2. Photos */}
                <Collapsible open={isPhotosOpen} onOpenChange={setIsPhotosOpen}>
                  <div className="border border-slate-200 rounded-lg bg-white p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-medium text-slate-600">Photos</span>
                        {!hasPhotos ? (
                          <X className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] h-4 px-1.5">
                            {photos.length}
                          </Badge>
                        )}
                        {uploadingPhoto && (
                          <span className="text-[10px] text-blue-600 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0" 
                          disabled={uploadingPhoto}
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          title="Add Photo"
                        >
                          {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            aria-label={isPhotosOpen ? 'Collapse section' : 'Expand section'}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isPhotosOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <input 
                          id="photo-upload" 
                          type="file" 
                          multiple
                          accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
                          className="hidden" 
                          onChange={handlePhotoUpload} 
                          disabled={uploadingPhoto} 
                        />
                      </div>
                    </div>

                    <CollapsibleContent className="mt-2">
                      {uploadingPhoto ? (
                        <div className="flex items-center justify-center py-8 text-slate-500">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-sm">Uploading photos...</span>
                        </div>
                      ) : (
                        <LeadFileGallery
                          files={photos}
                          onDeleteFile={async (file) => {
                            if (confirm('Delete this file?')) {
                              try {
                                await makeApiCall(`${API_BASE}/files/${file.id}`, { method: 'DELETE' });
                                // Success toast suppressed on Lead Detail (show only errors)
                                loadPhotos();
                              } catch (error) {
                                toast({ title: 'Error', description: 'Failed to delete file', variant: 'destructive' });
                              }
                            }
                          }}
                        />
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* 3. Comparable Properties */}
                <CompsManager 
                  leadId={id!} 
                  arv={arvValue}
                  arvDisplay={arvDisplay}
                  onArvDisplayChange={(raw) => {
                    setArvDisplay(raw);
                    const v = parseCurrencyInput(raw);
                    setArvValue(v);
                    // Sync underwriting immediately
                    setUnderwritingArv(v);
                  }}
                  onArvBlur={() => setArvDisplay(arvValue ? formatCurrency(arvValue) : '')}
                  canEditArv={canEditLead}
                  suppressSuccessToasts
                  leadAddress={lead?.address ? {
                    address1: lead.address.address1,
                    city: lead.address.city,
                    state: lead.address.state,
                    zip: lead.address.zip
                  } : undefined}
                />

                {/* 4. Rehab Budget Calculator */}
                <RehabBudgetCalculatorCompact
                  key={`rehab-${id}-${rehabBathrooms}`}
                  leadId={id!}
                  sqft={parseInt(sqft) || 0}
                  // Rehab bathrooms is now independent from Property Information bathrooms
                  bathrooms={rehabBathrooms}
                  readOnly={false}
                  suppressSuccessToasts
                  initialFinishLevel={rehabFinishLevel}
                  initialToggledItems={rehabToggledItems}
                  initialNumberOfWindows={rehabNumberOfWindows}
                  initialCustomValues={rehabCustomValues}
                  onTotalChange={(total) => {
                    const next = total.toString();
                    if (next === (rehabBudget || '')) return;
                    setRehabBudget(next);
                    markFieldDirty('rehabBudget');
                    requestImmediateRehabSave();
                  }}
                  onBathroomsChange={(n) => {
                    const newValue = n !== undefined && n !== null ? n : undefined;
                    if (newValue !== rehabBathrooms) {
                      setRehabBathrooms(newValue);
                      markFieldDirty('rehabBathrooms');
                      requestImmediateRehabSave();
                    }
                  }}
                  onDataChange={(data) => {
                    const nextFinish = data.finishLevel as 'low_end' | 'mid_range' | 'high_end';
                    const nextToggled =
                      data.toggledItems && typeof data.toggledItems === 'object' ? data.toggledItems : {};
                    const nextWindows = data.numberOfWindows;
                    const nextCustomRaw = data.customValues || {};

                    // Only persist when something actually changed (prevents infinite save loops).
                    let changed = false;

                    if (nextFinish !== rehabFinishLevel) {
                      setRehabFinishLevel(nextFinish);
                      markFieldDirty('rehabFinishLevel');
                      changed = true;
                    }

                    // Compare toggled items as object map (the component uses { [key]: boolean })
                    const currentToggled =
                      rehabToggledItems && typeof rehabToggledItems === 'object' ? rehabToggledItems : {};
                    const toggledSame = JSON.stringify(currentToggled) === JSON.stringify(nextToggled);
                    if (!toggledSame) {
                      setRehabToggledItems(nextToggled);
                      markFieldDirty('rehabToggledItems');
                      changed = true;
                    }

                    if ((rehabNumberOfWindows as any) !== nextWindows) {
                      setRehabNumberOfWindows(nextWindows);
                      markFieldDirty('rehabNumberOfWindows');
                      changed = true;
                    }

                    // Normalize & deep-compare customValues so new object/array references don't trigger saves.
                    // RehabBudgetCalculatorCompact always emits miscLines even when empty.
                    const normalizeCustom = (raw: any) => {
                      const line0 = Array.isArray(raw?.miscLines) ? raw.miscLines[0] : undefined;
                      const miscLabel = String(line0?.label ?? raw?.miscLabel ?? '').trim();
                      const miscValue = Number(line0?.value ?? raw?.miscValue ?? 0) || 0;
                      // Treat fully-empty as "unset" to avoid endless churn.
                      if (!miscLabel && miscValue === 0) return {};
                      return {
                        miscLabel,
                        miscValue,
                        miscLines: [{ label: miscLabel, value: miscValue }],
                      };
                    };

                    const nextCustom = normalizeCustom(nextCustomRaw);
                    const currentCustom = normalizeCustom(rehabCustomValues || {});
                    const customSame = JSON.stringify(currentCustom) === JSON.stringify(nextCustom);
                    if (!customSame) {
                      setRehabCustomValues(nextCustom);
                      markFieldDirty('rehabCustomValues');
                      changed = true;
                    }

                    if (changed) {
                      requestImmediateRehabSave();
                    }
                  }}
                />

                {/* 5. Underwriting Calculator - Role-Based (Admin, Manager, ACQ only) */}
                {user?.roles && (user.roles.includes('ADMIN') || user.roles.includes('MANAGER') || user.roles.includes('ACQ')) && (
                  <UnderwritingCalculator
                    leadId={id!}
                    rehabCost={parseInt(rehabBudget) || 0}
                    readOnly={false}
                    suppressSuccessToasts
                    initialArv={underwritingArv}
                    initialTaxes={underwritingTaxes}
                    initialTimeline={underwritingTimeline}
                    onValuesChange={(values) => {
                      // IMPORTANT:
                      // UnderwritingCalculator calls onValuesChange whenever it recalculates (including on mount / prop sync).
                      // We must NOT mark fields as dirty unless the user actually changed inputs.
                      // Otherwise this causes endless autosave loops and can wipe stage dates (offerMadeAt/underContractAt).

                      setUnderwritingArv((prev) => (prev === values.arv ? prev : values.arv));
                      setUnderwritingRehabCost((prev) => (prev === values.rehabCost ? prev : values.rehabCost));
                      setFinalOffer((prev) => (prev === values.finalOffer ? prev : values.finalOffer));

                      // Only taxes/timeline are user-editable here → only mark dirty when they truly change.
                      setUnderwritingTaxes((prev) => {
                        if (prev === values.taxes) return prev;
                        markFieldDirty('underwritingTaxes');
                        return values.taxes;
                      });

                      setUnderwritingTimeline((prev) => {
                        if (prev === values.timeline) return prev;
                        markFieldDirty('underwritingTimeline');
                        return values.timeline;
                      });
                    }}
                    onBlurSave={() => void flushAutoSave('blur')}
                  />
                )}

                {/* 6. Projections Sheet - Visible to ALL users (Read-only) */}
                <ProjectionsSheet
                  leadId={id!}
                  finalOffer={finalOffer}
                  rehabCost={underwritingRehabCost || parseInt(rehabBudget) || 0}
                  arv={underwritingArv}
                  taxes={underwritingTaxes}
                  timeline={underwritingTimeline}
                />
              </TabsContent>

              {/* Transactions Tab */}
              {canSeeTransactionsTab && (
              <TabsContent value="transactions" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2 min-h-[120px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600">Transaction Details</span>
                    {!editingDeal && <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingDeal(true)}><Edit2 className="w-3 h-3 mr-1" />{deal ? 'Edit' : 'Create'}</Button>}
                  </div>
                  {editingDeal ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2">
                        <div><Label className="text-xs text-slate-500">Contract Price</Label><Input type="number" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} placeholder="$" className="h-7 text-xs" /></div>
                        <div><Label className="text-xs text-slate-500">Sold Price</Label><Input type="number" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} placeholder="$" className="h-7 text-xs" /></div>
                        <div><Label className="text-xs text-slate-500">Net Profit</Label><Input type="number" value={netProfit} onChange={(e) => setNetProfit(e.target.value)} placeholder="$" className="h-7 text-xs" /></div>
                        <div><Label className="text-xs text-slate-500">Contracted</Label><Input type="date" value={contractedAt} onChange={(e) => setContractedAt(e.target.value)} className="h-7 text-xs" /></div>
                        <div><Label className="text-xs text-slate-500">Closed</Label><Input type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} className="h-7 text-xs" /></div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={cancelDealEdit}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={saveDeal}><Save className="w-3 h-3 mr-1" />Save
                          </Button>
                        </div>
                      </div>
                    ) : deal ? (
                      <div className="grid grid-cols-5 gap-2 text-[10px]">
                        <div><span className="text-slate-500">Contract:</span> <span className="font-medium">${(deal.contractPrice || 0).toLocaleString()}</span></div>
                        <div><span className="text-slate-500">Sold:</span> <span className="font-medium">${(deal.soldPrice || 0).toLocaleString()}</span></div>
                        <div><span className="text-slate-500">Profit:</span> <span className={`font-medium ${(deal.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${(deal.netProfit || 0).toLocaleString()}</span></div>
                        <div><span className="text-slate-500">Contract:</span> <span className="font-medium">{deal.contractedAt ? new Date(deal.contractedAt).toLocaleDateString() : 'N/A'}</span></div>
                        <div><span className="text-slate-500">Closed:</span> <span className="font-medium">{deal.closedAt ? new Date(deal.closedAt).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    ) : (
                      <div className="min-h-[72px] flex items-center justify-center bg-slate-50 rounded text-xs text-slate-500">
                        No transaction yet
                      </div>
                    )}
                </div>
              </TabsContent>
              )}

              {/* Dispositions Tab */}
              {canSeeDispositionsTab && (
              <TabsContent value="dispositions" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2 min-h-[120px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600">Buyer Offers</span>
                    {!creatingOffer && !creatingBuyer && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setCreatingBuyer(true)}><User className="w-3 h-3 mr-1" />Buyer</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setCreatingOffer(true)}><Plus className="w-3 h-3 mr-1" />Offer</Button>
                      </div>
                    )}
                  </div>
                  {creatingBuyer && (
                    <div className="mb-2 p-2 border border-slate-200 rounded bg-slate-50">
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        <Input placeholder="First" value={newBuyerFirstName} onChange={(e) => setNewBuyerFirstName(e.target.value)} className="h-7 text-xs" />
                        <Input placeholder="Last" value={newBuyerLastName} onChange={(e) => setNewBuyerLastName(e.target.value)} className="h-7 text-xs" />
                        <Input type="email" placeholder="Email" value={newBuyerEmail} onChange={(e) => setNewBuyerEmail(e.target.value)} className="h-7 text-xs" />
                        <div className="flex items-center">
                          <PhoneInput
                            label=""
                            value={newBuyerPhone}
                            onChange={(value) => setNewBuyerPhone(value)}
                            placeholder="Phone"
                            className="w-full"
                            inputClassName="h-7 text-xs"
                          />
                        </div>
                        <Select value={newBuyerSegmentation} onValueChange={setNewBuyerSegmentation}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seg" /></SelectTrigger>
                          <SelectContent><SelectItem value="hot">Hot</SelectItem><SelectItem value="warm">Warm</SelectItem><SelectItem value="cold">Cold</SelectItem><SelectItem value="vip">VIP</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { setCreatingBuyer(false); setNewBuyerFirstName(''); setNewBuyerLastName(''); setNewBuyerEmail(''); setNewBuyerPhone(''); setNewBuyerSegmentation(''); }}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={createNewBuyer}>Create</Button>
                      </div>
                    </div>
                  )}
                  {creatingOffer && (
                    <div className="mb-2 p-2 border border-slate-200 rounded bg-slate-50">
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Buyer" /></SelectTrigger>
                          <SelectContent>{buyers.map((buyer) => (<SelectItem key={buyer.id} value={buyer.id}>{buyer.firstName} {buyer.lastName}</SelectItem>))}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Amount" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} className="h-7 text-xs" />
                        <Select value={offerStatus} onValueChange={setOfferStatus}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="ACCEPTED">Accepted</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem><SelectItem value="COUNTERED">Countered</SelectItem></SelectContent>
                        </Select>
                        <Input placeholder="Notes" value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { setCreatingOffer(false); setSelectedBuyer(''); setOfferAmount(''); setOfferStatus('PENDING'); setOfferNotes(''); }}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={createBuyerOffer}>Create</Button>
                      </div>
                    </div>
                  )}
                  {buyerOffers.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {buyerOffers.map((offer: any) => (
                        <div key={offer.id} className="flex items-center justify-between p-1.5 border border-slate-100 rounded bg-slate-50 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{offer.buyer?.firstName} {offer.buyer?.lastName}</span>
                            <span className="font-semibold text-emerald-600">${(offer.offerAmount || 0).toLocaleString()}</span>
                            <Badge className={`text-[9px] px-1 py-0 ${offer.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : offer.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{offer.status}</Badge>
                          </div>
                          <div className="flex gap-0.5">
                            {offer.status === 'PENDING' && (<><Button size="sm" variant="ghost" className="h-4 px-1 text-[9px] text-emerald-600" onClick={() => updateOfferStatus(offer.id, 'ACCEPTED')}>✓</Button><Button size="sm" variant="ghost" className="h-4 px-1 text-[9px] text-red-600" onClick={() => updateOfferStatus(offer.id, 'REJECTED')}>✗</Button></>)}
                            <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => deleteOffer(offer.id)}><Trash className="w-2.5 h-2.5 text-red-500" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="min-h-[72px] flex items-center justify-center bg-slate-50 rounded text-xs text-slate-500">
                      No offers yet
                    </div>
                  )}
                </div>
              </TabsContent>
              )}

              {/* Files Tab */}
              <TabsContent value="files" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2 min-h-[120px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600">Files</span>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 pointer-events-none" disabled={uploading}>
                        <Upload className="w-3 h-3 mr-1" />
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </label>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} multiple />
                  </div>
                  <LeadFileGallery
                    files={files}
                    className="min-h-[72px]"
                    onDeleteFile={async (file) => {
                      if (confirm('Delete this file?')) {
                        try {
                          await makeApiCall(`${API_BASE}/files/${file.id}`, { method: 'DELETE' });
                          // Success toast suppressed on Lead Detail (show only errors)
                          loadFiles();
                        } catch (error) {
                          toast({ title: 'Error', description: 'Failed to delete file', variant: 'destructive' });
                        }
                      }
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side - Communication Section (4 columns) - TALLER */}
          <div className="col-span-4">
            <div className="sticky top-2 border border-slate-200 rounded-lg bg-white p-1.5 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
              {/* Unified Communication Feed (includes Tasks, Calls, SMS, Emails, Notes) */}
              <UnifiedCommunicationFeed
                leadId={id!}
                communications={communications}
                tasks={tasks}
                loadingCommunications={loadingCommunications}
                suppressSuccessToasts
                currentUser={user ? { id: user.id, roles: user.roles as any } : undefined}
                canEditLead={canEditLead}
                onRefreshCommunications={loadCommunications}
                onRefreshTasks={loadTasks}
                onNoteUpdated={(updated) => {
                  if (!updated?.id) return;
                  setCommunications((prev) => (prev || []).map((c: any) => (c?.id === updated.id ? { ...c, ...updated } : c)));
                  setNotes((prev) => (prev || []).map((n: any) => (n?.id === updated.id ? { ...n, ...updated } : n)));
                }}
                onTaskUpdated={(updated) => {
                  if (!updated?.id) return;
                  setTasks((prev) => (prev || []).map((t: any) => (t?.id === updated.id ? { ...t, ...updated } : t)));
                }}
                smsText={smsText}
                setSmsText={setSmsText}
                sendingSMS={sendingSMS}
                onSendSMS={handleSendSMS}
                availablePhoneNumbers={getAllPhoneNumbers()}
                selectedSMSPhone={selectedSMSPhone}
                onSMSPhoneChange={setSelectedSMSPhone}
                emailSubject={emailSubject}
                setEmailSubject={setEmailSubject}
                emailBody={emailBody}
                setEmailBody={setEmailBody}
                sendingEmail={sendingEmail}
                onSendEmail={handleSendEmail}
                availableEmailAddresses={getAllEmailAddresses()}
                selectedEmail={selectedEmail}
                onEmailChange={setSelectedEmail}
                makingCall={makingCall}
                onMakeCall={handleMakeCall}
                callStatus={callStatus}
                onHangUp={hangUp}
                onToggleMute={toggleMute}
                isMuted={isMuted}
                hasValidPhone={hasValidPhone()}
                noteText={noteText}
                setNoteText={setNoteText}
                onOpenTaskDialog={() => openTaskDialog()}
                addingNote={addingNote}
                onAddNote={handleAddNote}
                lead={lead ? {
                  id: lead.id,
                  assignedUserId: lead.assignedUserId,
                  createdById: (lead as any).createdById,
                  dispAgentId: lead.dispAgentId
                } : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-600" />
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update task details below.' : 'Create a new task for this lead.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="Enter task title..."
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                disabled={savingTask}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Enter task description..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                disabled={savingTask}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date *</Label>
              <Popover open={taskDuePickerOpen} onOpenChange={setTaskDuePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="task-due-date"
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={savingTask}
                  >
                    {taskForm.dueAt ? formatTaskDueDisplay(taskForm.dueAt) : 'Select due date & time'}
                    <Calendar className="w-4 h-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-3">
                    <UiCalendar
                      mode="single"
                      selected={taskDueDate || undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setTaskDueDate(d);
                        const iso = computeTaskDueIso(d, taskDueHour, taskDueMinute, taskDueAmPm);
                        if (iso) setTaskForm((prev) => ({ ...prev, dueAt: iso }));
                      }}
                      initialFocus
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Hour</Label>
                        <Select
                          value={taskDueHour}
                          onValueChange={(v) => {
                            setTaskDueHour(v);
                            const iso = computeTaskDueIso(taskDueDate, v, taskDueMinute, taskDueAmPm);
                            if (iso) setTaskForm((prev) => ({ ...prev, dueAt: iso }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => {
                              const hour = String(i + 1);
                              return (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Minute</Label>
                        <Select
                          value={taskDueMinute}
                          onValueChange={(v) => {
                            setTaskDueMinute(v);
                            const iso = computeTaskDueIso(taskDueDate, taskDueHour, v, taskDueAmPm);
                            if (iso) setTaskForm((prev) => ({ ...prev, dueAt: iso }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }).map((_, i) => {
                              const m = String(i).padStart(2, '0');
                              return (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">AM/PM</Label>
                        <Select
                          value={taskDueAmPm}
                          onValueChange={(v: 'AM' | 'PM') => {
                            setTaskDueAmPm(v);
                            const iso = computeTaskDueIso(taskDueDate, taskDueHour, taskDueMinute, v);
                            if (iso) setTaskForm((prev) => ({ ...prev, dueAt: iso }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setTaskDuePickerOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assign To *</Label>
              <Select
                value={taskForm.assignedToId || undefined}
                onValueChange={(value) => setTaskForm({ ...taskForm, assignedToId: value })}
                disabled={savingTask}
              >
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Select team member (required)..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeTaskDialog}
              disabled={savingTask}
              className="h-8 text-sm px-3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTaskSubmit}
              disabled={
                savingTask || 
                !taskForm.title || 
                taskForm.title.trim() === '' || 
                !taskForm.dueAt || 
                !taskForm.assignedToId
              }
              className="h-8 text-sm bg-purple-600 hover:bg-purple-700 px-3"
            >
              {savingTask ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  {editingTask ? 'Update Task' : 'Create Task'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Stage Transition Validation Popups */}
      <AppointmentCompletePopup
        open={showAppointmentPopup}
        onClose={() => {
          console.log('🚪 Appointment popup onClose called, transitioningPopupRef.current =', transitioningPopupRef.current);
          // Don't clear state if we're transitioning to another validation popup
          if (transitioningPopupRef.current) {
            console.log('⚠️ Skipping cleanup - transitioning to next popup');
            setShowAppointmentPopup(false);
            return;
          }
          
          console.log('🚪 Appointment popup closed');
          setShowAppointmentPopup(false);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          // Force Select component to re-render
          setPipelineSelectKey(prev => prev + 1);
        }}
        leadId={id || ''}
        onSubmit={async (files) => {
          try {
            // Upload photos
            let uploadedCount = 0;
            for (const file of files) {
              const formData = new FormData();
              formData.append('file', file);
              // Must match what the Photos section filters on (`category === 'photos'`)
              formData.append('category', 'photos');
              
              const uploadResponse = await makeApiCall(`${API_BASE}/leads/${id}/files`, {
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

            // Reload photos so the Photos section updates immediately (persisted first)
            await loadPhotos();
            
            // First, move to "Appointment Complete" stage (if not already there)
            const appointmentCompleteStage = pipelineStages.find((s) => 
              s.name?.toLowerCase().includes('appointment') && 
              s.name?.toLowerCase().includes('complete')
            );
            
            if (appointmentCompleteStage && pipelineStatus !== appointmentCompleteStage.id) {
              try {
                console.log('📸 Moving to Appointment Complete stage...');
                await requestStageMove(appointmentCompleteStage.id);
                console.log('✅ Successfully moved to Appointment Complete stage');
                // Update previousPipelineStatus to Appointment Complete so if user cancels next popup, it reverts to Appointment Complete
                setPreviousPipelineStatus(appointmentCompleteStage.id);
                await loadLead();
              } catch (e: any) {
                console.error('❌ Failed to move to Appointment Complete:', e);
                // If moving to Appointment Complete fails, show error
                toast({
                  title: "Error",
                  description: e?.message || "Failed to move to Appointment Complete stage",
                  variant: "destructive"
                });
                return;
              }
            } else if (appointmentCompleteStage && pipelineStatus === appointmentCompleteStage.id) {
              // Already at Appointment Complete, update previousPipelineStatus
              setPreviousPipelineStatus(appointmentCompleteStage.id);
            }
            
            // Now proceed with the target stage change (if different from Appointment Complete)
            if (pendingPipelineStatus && pendingPipelineStatus !== appointmentCompleteStage?.id) {
              try {
                console.log('🔄 Attempting to move to target stage:', pendingPipelineStatus);
                await requestStageMove(pendingPipelineStatus);
                // Success! Stage moved to target
                setShowAppointmentPopup(false);
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
                await loadLead();
              } catch (e: any) {
                if (e?.code === 'VALIDATION_REQUIRED') {
                  const requiredFields: string[] = Array.isArray(e?.requiredFields) ? e.requiredFields : [];
                  const ddFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];

                  if (requiredFields.some((f) => ddFields.includes(f))) {
                    setMissingDdFields(requiredFields.filter((f) => ddFields.includes(f)));
                    setShowAppointmentPopup(false);
                    setShowDueDiligencePopup(true);
                    return;
                  }
                  
                  // Progressive DD Complete popups - show interactive popups one by one
                  if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
                    console.log('🔀 Transitioning from Appointment → ARV popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    console.log('📍 Set transitioningPopupRef.current =', transitioningPopupRef.current);
                    setShowAppointmentPopup(false);
                    setShowArvComparablesPopup(true);
                    setTimeout(() => { 
                      transitioningPopupRef.current = false;
                      console.log('✅ Reset transitioningPopupRef.current =', transitioningPopupRef.current);
                    }, 100); // Reset after state updates
                    // DON'T clear pendingPipelineStatus here - ARV popup needs it!
                    return;
                  }
                  if (requiredFields.includes('rehabBudget')) {
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentPopup(false);
                    setShowRehabBudgetPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100); // Reset after state updates
                    // DON'T clear pendingPipelineStatus here - Rehab popup needs it!
                    return;
                  }
                  if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentPopup(false);
                    setShowTimelineTaxesPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100); // Reset after state updates
                    // DON'T clear pendingPipelineStatus here - Timeline popup needs it!
                    return;
                  }
                  
                  // If any other DD Complete field is missing, show list popup as fallback
                  const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
                  if (requiredFields.some((f) => ddCompleteFields.includes(f))) {
                    setMissingDdCompleteItems(requiredFields.filter((f) => ddCompleteFields.includes(f)));
                    setShowAppointmentPopup(false);
                    setShowDueDiligenceCompletePopup(true);
                    return;
                  }
                  
                  const stageNameLower = (pipelineStages.find((s) => s.id === pendingPipelineStatus)?.name || '').toLowerCase();
                  if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
                    setShowAppointmentPopup(false);
                    setShowOfferMadePopup(true);
                    return;
                  }
                } else {
                  throw e;
                }
              }
            } else {
              // No pending status or already at Appointment Complete - just close popup
              setShowAppointmentPopup(false);
              if (pendingPipelineStatus === appointmentCompleteStage?.id) {
                // We just moved to Appointment Complete, clear pending status
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
              }
              // Reload lead to show updated stage
              await loadLead();
            }
          } catch (error: any) {
            console.error('Error uploading photos:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to upload photos",
              variant: "destructive"
            });
          }
        }}
      />
      
      <AppointmentSetPopup
        open={showAppointmentSetPopup}
        onClose={() => {
          // Don't clear state if we're transitioning to another validation popup
          if (transitioningPopupRef.current) {
            console.log('⚠️ Skipping cleanup - transitioning to next popup');
            setShowAppointmentSetPopup(false);
            return;
          }
          
          console.log('🚪 Appointment Set popup closed');
          setShowAppointmentSetPopup(false);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          // Force Select component to re-render
          setPipelineSelectKey(prev => prev + 1);
        }}
        onSubmit={async (appointmentDate) => {
          try {
            // Save the appointment date to customFields
            const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customFields: {
                  ...lead?.customFields,
                  appointmentDate
                }
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to save appointment date');
            }

            // Reload lead to get updated data
            await loadLead();

            // First, move to "Appointment Set" stage (if not already there)
            const appointmentSetStage = pipelineStages.find((s) => 
              s.name?.toLowerCase() === 'appointment set'
            );
            
            if (appointmentSetStage && pipelineStatus !== appointmentSetStage.id) {
              try {
                console.log('📅 Moving to Appointment Set stage first...');
                await requestStageMove(appointmentSetStage.id);
                console.log('✅ Successfully moved to Appointment Set stage');
                // Update previousPipelineStatus to Appointment Set so if user cancels next popup, it reverts to Appointment Set (not original stage)
                setPreviousPipelineStatus(appointmentSetStage.id);
                await loadLead();
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
            } else if (appointmentSetStage && pipelineStatus === appointmentSetStage.id) {
              // Already at Appointment Set, update previousPipelineStatus
              setPreviousPipelineStatus(appointmentSetStage.id);
            }

            // Now proceed with the target stage change (if different from Appointment Set)
            if (pendingPipelineStatus && pendingPipelineStatus !== appointmentSetStage?.id) {
              try {
                console.log('🔄 Attempting to move to target stage:', pendingPipelineStatus);
                await requestStageMove(pendingPipelineStatus);
                // Success! Stage moved to target
                setShowAppointmentSetPopup(false);
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
                await loadLead();
              } catch (e: any) {
                // If validation still fails, show next required popup
                if (e?.code === 'VALIDATION_REQUIRED') {
                  const requiredFields: string[] = Array.isArray(e?.requiredFields) ? e.requiredFields : [];
                  console.log('📋 Still required after Appointment Set:', requiredFields);
                  
                  // Transition to next popup based on requiredFields
                  const propertyInfoFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];
                  
                  if (requiredFields.some((f) => propertyInfoFields.includes(f))) {
                    console.log('🏠 Opening property info popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setMissingDdFields(requiredFields.filter((f) => propertyInfoFields.includes(f)));
                    setShowAppointmentSetPopup(false);
                    setShowDueDiligencePopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else if (requiredFields.includes('photos')) {
                    console.log('📸 Opening photo upload popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentSetPopup(false);
                    setShowAppointmentPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
                    console.log('💰 Opening ARV+Comparables popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentSetPopup(false);
                    setShowArvComparablesPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else if (requiredFields.includes('rehabBudget')) {
                    console.log('🔨 Opening Rehab Budget popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentSetPopup(false);
                    setShowRehabBudgetPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
                    console.log('📊 Opening Timeline+Taxes popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentSetPopup(false);
                    setShowTimelineTaxesPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else if (requiredFields.includes('followUpTask')) {
                    console.log('📋 Opening follow-up task popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowAppointmentSetPopup(false);
                    setShowFollowUpTaskPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else {
                    // Unknown validation error
                    toast({
                      title: 'Stage Change Failed',
                      description: e?.message || 'Failed to change pipeline stage',
                      variant: 'destructive',
                    });
                  }
                } else {
                  throw e;
                }
              }
            } else {
              // No pending status or already at Appointment Set - just close popup
              setShowAppointmentSetPopup(false);
              if (pendingPipelineStatus === appointmentSetStage?.id) {
                // We just moved to Appointment Set, clear pending status
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
              }
            }
            
            // Success toast removed - Lead Detail UX: show toasts ONLY for errors
          } catch (error: any) {
            console.error('Error setting appointment date:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to set appointment date",
              variant: "destructive"
            });
          }
        }}
      />
      
      <DueDiligencePopup
        open={showDueDiligencePopup}
        onClose={() => {
          // Don't clear state if we're transitioning to another validation popup
          if (transitioningPopupRef.current) {
            console.log('⚠️ Skipping cleanup - transitioning to next popup');
            setShowDueDiligencePopup(false);
            setMissingDdFields([]);
            return;
          }
          
          console.log('🚪 Due Diligence popup closed');
          setShowDueDiligencePopup(false);
          setMissingDdFields([]);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          // Force Select component to re-render
          setPipelineSelectKey(prev => prev + 1);
        }}
        existingData={lead?.customFields}
        missingFields={missingDdFields}
        onSubmit={async (data) => {
          try {
            console.log('📝 DueDiligencePopup - Submitting data:', data);
            
            // Update lead with property info first
            const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customFields: {
                  ...lead?.customFields,
                  ...data
                }
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('❌ Failed to update property info:', errorData);
              throw new Error(errorData.error || 'Failed to update property information');
            }

            console.log('✅ Property info updated successfully');
            console.log('🔍 Current pendingPipelineStatus:', pendingPipelineStatus);

            // Reload lead so "Additional Property Info" section shows persisted values before stage move
            await loadLead();
            console.log('✅ Lead reloaded');
            
            // ✅ CRITICAL: If pendingPipelineStatus is null, we can't proceed - this shouldn't happen
            if (!pendingPipelineStatus) {
              console.error('❌ pendingPipelineStatus is null after property info save! Cannot proceed with stage move.');
              toast({
                title: "Error",
                description: "Unable to proceed with stage change. Please try again.",
                variant: "destructive"
              });
              setShowDueDiligencePopup(false);
              return;
            }
            
            // ✅ CRITICAL FIX: Check photos count directly from API BEFORE attempting stage move
            // This ensures we show photos popup even if backend validation doesn't catch it
            const targetStage = pipelineStages.find(s => s.id === pendingPipelineStatus);
            const appointmentCompleteStage = pipelineStages.find(s => 
              s.name?.toLowerCase().includes('appointment') && 
              s.name?.toLowerCase().includes('complete')
            );
            
            console.log('🔍 Target stage:', targetStage?.name, 'Appointment Complete stage:', appointmentCompleteStage?.name);
            
            // Check if target stage requires photos (Appointment Complete+ stages)
            if (appointmentCompleteStage && targetStage && 
                targetStage.orderIndex >= appointmentCompleteStage.orderIndex) {
              console.log('📸 Target stage requires photos. Checking photo count...');
              // Get photos count directly from API to ensure we have latest data (don't rely on state)
              try {
                const photosResponse = await makeApiCall(`${API_BASE}/files/lead/${id}`);
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
                    transitioningPopupRef.current = true;
                    setShowDueDiligencePopup(false);
                    setShowAppointmentPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                    return;
                  } else {
                    console.log(`✅ Photo count is sufficient (${photoCount} >= 3). Proceeding with stage move.`);
                  }
                }
              } catch (photoError) {
                console.warn('⚠️ Failed to check photos count:', photoError);
                // Continue with stage move attempt if photo check fails
              }
            } else {
              console.log('📸 Target stage does not require photos, or stages not found.');
            }
            
            // Retry stage move; if more is missing, open the next popup automatically
            console.log('🔄 Proceeding with stage move attempt to:', pendingPipelineStatus);
            try {
              console.log('🔄 Attempting stage move to:', pendingPipelineStatus);
              await requestStageMove(pendingPipelineStatus);
              console.log('✅ Stage move successful!');
              
              // All validations passed - close popup
              setShowDueDiligencePopup(false);
              setPendingPipelineStatus(null);
              setPreviousPipelineStatus(null);
            } catch (e: any) {
              console.log('⚠️ Stage move validation error:', e);
              
              if (e?.code === 'VALIDATION_REQUIRED') {
                const requiredFields: string[] = Array.isArray(e?.requiredFields) ? e.requiredFields : [];
                console.log('📋 Still missing fields:', requiredFields);

                if (requiredFields.includes('photos')) {
                  transitioningPopupRef.current = true; // ✅ Mark as transitioning
                  setShowDueDiligencePopup(false);
                  setShowAppointmentPopup(true);
                  setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  return;
                }
                if (requiredFields.includes('followUpTask')) {
                  transitioningPopupRef.current = true; // ✅ Mark as transitioning
                  setShowDueDiligencePopup(false);
                  setShowFollowUpTaskPopup(true);
                  setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  return;
                }
                
                // Progressive DD Complete popups - show interactive popups one by one
                if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
                  transitioningPopupRef.current = true; // ✅ Mark as transitioning
                  setShowDueDiligencePopup(false);
                  setShowArvComparablesPopup(true);
                  setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  return;
                }
                if (requiredFields.includes('rehabBudget')) {
                  transitioningPopupRef.current = true; // ✅ Mark as transitioning
                  setShowDueDiligencePopup(false);
                  setShowRehabBudgetPopup(true);
                  setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  return;
                }
                if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
                  transitioningPopupRef.current = true; // ✅ Mark as transitioning
                  setShowDueDiligencePopup(false);
                  setShowTimelineTaxesPopup(true);
                  setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  return;
                }
                
                // If any other DD Complete field is missing, show list popup as fallback
                const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
                if (requiredFields.some((f) => ddCompleteFields.includes(f))) {
                  setMissingDdCompleteItems(requiredFields.filter((f) => ddCompleteFields.includes(f)));
                  setShowDueDiligencePopup(false);
                  setShowDueDiligenceCompletePopup(true);
                  return;
                }
                
                const stageNameLower = (pipelineStages.find((s) => s.id === pendingPipelineStatus)?.name || '').toLowerCase();
                if (stageNameLower.includes('offer') && stageNameLower.includes('made')) {
                  setShowDueDiligencePopup(false);
                  setShowOfferMadePopup(true);
                  return;
                }
              }
              
              // If error is not recognized, show error toast but don't break flow
              console.error('⚠️ Unrecognized validation error:', e);
              toast({
                title: "Validation Error",
                description: e?.message || "Please check all required fields and try again",
                variant: "destructive"
              });
              return;
            }
            
            console.log('✅ All done, closing popup');
            setShowDueDiligencePopup(false);
            setMissingDdFields([]);
            setPendingPipelineStatus(null);
            setPreviousPipelineStatus(null);
            
            // Reload lead to show updated data
            await loadLead();
          } catch (error: any) {
            console.error('❌ DueDiligencePopup submit error:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to update property information",
              variant: "destructive"
            });
          }
        }}
      />

      <ArvComparablesPopup
        open={showArvComparablesPopup}
        onClose={() => {
          console.log('🚪 ARV popup onClose called, transitioningPopupRef.current =', transitioningPopupRef.current);
          // Don't clear state if we're transitioning to another validation popup
          if (transitioningPopupRef.current) {
            console.log('⚠️ Skipping cleanup - transitioning to next popup');
            setShowArvComparablesPopup(false);
            return;
          }
          
          // Prevent closing if we're in the middle of a stage change
          if (changingPipelineStatus) {
            console.log('⛔ Ignoring close request - stage change in progress');
            return;
          }
          console.log('🚪 ARV+Comparables popup closed');
          setShowArvComparablesPopup(false);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          setPipelineSelectKey(prev => prev + 1);
        }}
        existingData={lead?.customFields}
        onSubmit={async (data) => {
          // ✅ CRITICAL: Capture pending status BEFORE any async operations
          const targetStageId = pendingPipelineStatus;
          console.log('🎯 Captured target stage ID at start:', targetStageId);
          
          try {
            // Set loading state
            setChangingPipelineStatus(true);
            
            console.log('💾 Saving ARV and comparables...', data);
            
            // Update ARV in customFields
            const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customFields: {
                  ...(lead?.customFields || {}),
                  arv: data.arv
                }
              })
            });

            if (!response.ok) {
              throw new Error('Failed to save ARV');
            }

            console.log('✅ ARV saved');

            // Upload comparables PDFs if provided (REQUIRED for DD Complete)
            if (data.comparablesFiles && data.comparablesFiles.length > 0) {
              let uploadedCount = 0;
              let failedCount = 0;
              
              for (const file of data.comparablesFiles) {
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  const uploadResponse = await makeApiCall(`${API_BASE}/comps/leads/${id}/pdfs`, {
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

            // Reload lead data
            console.log('🔄 Reloading lead data...');
            await loadLead();
            await loadComparables(); // Refresh comparables to show uploaded PDFs
            console.log('✅ Lead data reloaded');

            // Try stage move again to check what's still needed
            console.log('📌 Using captured target stage ID:', targetStageId);
            
            if (targetStageId) {
              console.log('🔄 Attempting stage move to:', targetStageId);
              
              try {
                const moveResult = await requestStageMove(targetStageId);
                // Success! Stage moved - UI already updated by requestStageMove
                console.log('✅ Stage moved successfully:', moveResult?.newStageName);
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
                setShowArvComparablesPopup(false);
              } catch (validationError: any) {
                console.log('⚠️ Validation error after ARV+Comparables:', validationError);
                console.log('🔍 Error code:', validationError?.code);
                console.log('🔍 Error message:', validationError?.message);
                console.log('📋 Required fields:', validationError?.requiredFields);
                
                if (validationError?.code === 'VALIDATION_REQUIRED') {
                  // More fields needed - open next popup
                  const stillRequired = validationError?.requiredFields || [];
                  console.log('📋 Still required after ARV+Comparables:', stillRequired);
                  
                  if (stillRequired.includes('rehabBudget')) {
                    console.log('🔨 Opening Rehab Budget popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowArvComparablesPopup(false); // Close current popup
                    setShowRehabBudgetPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                    return;
                  }
                  
                  if (stillRequired.includes('underwritingTaxes') || stillRequired.includes('underwritingTimeline')) {
                    console.log('📊 Opening Timeline+Taxes popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowArvComparablesPopup(false); // Close current popup
                    setShowTimelineTaxesPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                    return;
                  }
                  
                  // If any other DD Complete field is missing, show list popup as fallback
                  const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
                  if (stillRequired.some((f: string) => ddCompleteFields.includes(f))) {
                    console.log('📋 Other DD Complete fields missing, showing list popup');
                    setMissingDdCompleteItems(stillRequired.filter((f: string) => ddCompleteFields.includes(f)));
                    setShowArvComparablesPopup(false); // Close current popup
                    setShowDueDiligenceCompletePopup(true);
                    return;
                  }
                  
                  // Unknown requirement
                  console.error('⚠️ Unrecognized validation fields:', stillRequired);
                  toast({
                    title: "Validation Error",
                    description: `Additional fields required: ${stillRequired.join(', ')}`,
                    variant: "destructive"
                  });
                  setShowArvComparablesPopup(false); // Close current popup
                  return;
                } else {
                  // Real error, not validation - re-throw to outer catch
                  console.error('❌ Non-validation error:', validationError);
                  throw validationError;
                }
              }
            } else {
              // No pending status - this shouldn't happen but close popup
              console.warn('⚠️ No pendingPipelineStatus found, closing popup');
              setShowArvComparablesPopup(false);
            }
          } catch (error: any) {
            console.error('❌ Error in ARV+Comparables flow:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to save ARV and comparables",
              variant: "destructive"
            });
            // Don't close popup on error so user can retry
          } finally {
            // Always clear loading state
            setChangingPipelineStatus(false);
          }
        }}
      />

      <RehabBudgetFullPopup
        open={showRehabBudgetPopup}
        onClose={() => {
          console.log('🚪 Rehab Budget popup onClose called, transitioningPopupRef.current =', transitioningPopupRef.current);
          // Don't clear state if we're transitioning to another validation popup
          if (transitioningPopupRef.current) {
            console.log('⚠️ Skipping cleanup - transitioning to next popup');
            setShowRehabBudgetPopup(false);
            return;
          }
          
          // Prevent closing if we're in the middle of a stage change
          if (changingPipelineStatus) {
            console.log('⛔ Ignoring close request - stage change in progress');
            return;
          }
          console.log('🚪 Rehab Budget popup closed');
          setShowRehabBudgetPopup(false);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          setPipelineSelectKey(prev => prev + 1);
        }}
        existingData={lead?.customFields}
        sqft={lead?.customFields?.sqft}
        onSubmit={async (data) => {
          try {
            // Set loading state
            setChangingPipelineStatus(true);
            
            console.log('💾 Saving rehab budget...', data);
            
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
            
            console.log('📤 Saving to rehab-budget endpoint:', rehabBudgetPayload);
            
            const rehabResponse = await makeApiCall(`${API_BASE}/leads/${id}/rehab-budget`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rehabBudgetPayload)
            });

            if (!rehabResponse.ok) {
              const errorData = await rehabResponse.json();
              console.error('❌ Rehab budget save failed:', errorData);
              throw new Error(errorData.error || 'Failed to save rehab budget');
            }
            
            // Also update customFields for rehabBathrooms, sqft and rehabBudget total (for validation)
            const updatePayload = {
              customFields: {
                ...(lead?.customFields || {}),
                rehabFinishLevel: data.rehabFinishLevel,
                rehabNumberOfWindows: data.rehabNumberOfWindows,
                rehabToggledItems: data.rehabToggledItems,
                rehabCustomValues: data.rehabCustomValues,
                rehabBudget: totalWithCustom, // ✅ CRITICAL: Save total for backend validation
                // Save rehab bathrooms independently (NOT synced with Property Information)
                rehabBathrooms: data.bathrooms !== undefined && data.bathrooms !== null ? data.bathrooms : null,
                // Save SqFt from rehab popup
                sqft: data.sqft !== undefined && data.sqft !== null ? data.sqft : lead?.customFields?.sqft
              }
            };
            
            console.log('📤 Updating customFields:', updatePayload);
            
            const leadResponse = await makeApiCall(`${API_BASE}/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            });

            if (!leadResponse.ok) {
              throw new Error('Failed to update lead custom fields');
            }

            console.log('✅ Rehab budget and custom fields saved');
            setShowRehabBudgetPopup(false);
            await loadLead();
            await loadComparables(); // Refresh comparables to show uploaded PDFs

            // Try stage move again
            if (pendingPipelineStatus) {
              console.log('🔄 Checking if more fields are required...');
              console.log('📌 Pending pipeline status:', pendingPipelineStatus);
              
              try {
                const moveResult = await requestStageMove(pendingPipelineStatus);
                // Success! Stage moved - UI already updated by requestStageMove
                console.log('✅ Stage moved successfully:', moveResult?.newStageName);
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
              } catch (validationError: any) {
                console.log('⚠️ Validation error caught:', validationError);
                console.log('🔍 Error code:', validationError?.code);
                console.log('📋 Required fields:', validationError?.requiredFields);
                
                if (validationError?.code === 'VALIDATION_REQUIRED') {
                  const stillRequired = validationError?.requiredFields || [];
                  console.log('📋 Still required after rehab save:', stillRequired);
                  
                  if (stillRequired.includes('underwritingTaxes') || stillRequired.includes('underwritingTimeline')) {
                    console.log('📊 Opening Timeline+Taxes popup');
                    transitioningPopupRef.current = true; // ✅ Mark as transitioning
                    setShowRehabBudgetPopup(false); // Close current popup
                    setShowTimelineTaxesPopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                  } else {
                    console.log('❓ Unknown requirements, throwing error');
                    throw validationError;
                  }
                } else {
                  console.log('❌ Not a validation error, throwing');
                  throw validationError;
                }
              }
            } else {
              console.log('⚠️ No pendingPipelineStatus, skipping stage move check');
            }
          } catch (error: any) {
            console.error('❌ Error in Rehab Budget flow:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to save rehab budget",
              variant: "destructive"
            });
          } finally {
            // Always clear loading state
            setChangingPipelineStatus(false);
          }
        }}
      />

      <TimelineTaxesPopup
        open={showTimelineTaxesPopup}
        onClose={() => {
          // Prevent closing if we're in the middle of a stage change
          if (changingPipelineStatus) {
            console.log('⛔ Ignoring close request - stage change in progress');
            return;
          }
          console.log('🚪 Timeline+Taxes popup closed');
          setShowTimelineTaxesPopup(false);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          setPipelineSelectKey(prev => prev + 1);
        }}
        existingData={lead?.customFields}
        onSubmit={async (data) => {
          try {
            // Set loading state
            setChangingPipelineStatus(true);
            
            console.log('💾 Saving timeline and taxes...', data);
            console.log('📋 Current customFields:', lead?.customFields);
            
            const updatePayload = {
              customFields: {
                ...(lead?.customFields || {}),
                underwritingTimeline: data.underwritingTimeline,
                underwritingTaxes: data.underwritingTaxes
              }
            };
            
            console.log('📤 Update payload:', updatePayload);
            
            // Update timeline and taxes in customFields
            const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload)
            });

            if (!response.ok) {
              throw new Error('Failed to save timeline and taxes');
            }

            console.log('✅ Timeline and taxes saved successfully');
            
            // ✅ Update local state immediately to reflect in UI
            setUnderwritingTimeline(data.underwritingTimeline);
            setUnderwritingTaxes(data.underwritingTaxes);
            console.log('📊 State updated:', { timeline: data.underwritingTimeline, taxes: data.underwritingTaxes });
            
            // ✅ Also update the lead object's customFields to ensure all components see the new data
            setLead((prevLead) => {
              if (!prevLead) return prevLead;
              return {
                ...prevLead,
                customFields: {
                  ...(prevLead.customFields || {}),
                  underwritingTimeline: data.underwritingTimeline,
                  underwritingTaxes: data.underwritingTaxes
                }
              };
            });
            console.log('💾 Lead object updated with new timeline and taxes');
            
            // Reload lead first to ensure data is saved and reflected
            await loadLead();
            console.log('✅ Lead reloaded with updated timeline and taxes');
            
            // First, move to "Due Diligence Complete" stage (if not already there)
            const dueDiligenceCompleteStage = pipelineStages.find((s) => 
              s.name?.toLowerCase().includes('due diligence') && 
              s.name?.toLowerCase().includes('complete')
            );
            
            if (dueDiligenceCompleteStage && pipelineStatus !== dueDiligenceCompleteStage.id) {
              try {
                console.log('📊 Moving to Due Diligence Complete stage...');
                await requestStageMove(dueDiligenceCompleteStage.id);
                console.log('✅ Successfully moved to Due Diligence Complete stage');
                // Update previousPipelineStatus to Due Diligence Complete so if user cancels next popup, it reverts to Due Diligence Complete
                setPreviousPipelineStatus(dueDiligenceCompleteStage.id);
                await loadLead();
              } catch (e: any) {
                console.error('❌ Failed to move to Due Diligence Complete:', e);
                // If moving to Due Diligence Complete fails, show error
                toast({
                  title: "Error",
                  description: e?.message || "Failed to move to Due Diligence Complete stage",
                  variant: "destructive"
                });
                return;
              }
            } else if (dueDiligenceCompleteStage && pipelineStatus === dueDiligenceCompleteStage.id) {
              // Already at Due Diligence Complete, update previousPipelineStatus
              setPreviousPipelineStatus(dueDiligenceCompleteStage.id);
            }
            
            // Now proceed with the target stage change (if different from Due Diligence Complete)
            if (pendingPipelineStatus && pendingPipelineStatus !== dueDiligenceCompleteStage?.id) {
              console.log('🔄 Attempting to move to target stage:', pendingPipelineStatus);
              
              try {
                const moveResult = await requestStageMove(pendingPipelineStatus);
                // Success! Stage moved to target
                console.log('✅ Stage moved to target:', moveResult?.newStageName);
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
                
                // Reload lead again to show updated stage
                await loadLead();
                
                // ✅ Close popup AFTER successful stage move
                setShowTimelineTaxesPopup(false);
              } catch (validationError: any) {
                console.log('⚠️ Stage move validation error:', validationError);
                console.log('🔍 Error details:', {
                  code: validationError?.code,
                  message: validationError?.message,
                  requiredFields: validationError?.requiredFields,
                  hasCode: !!validationError?.code,
                  codeValue: validationError?.code
                });
                
                // Check for validation error - try multiple ways to detect it
                const isValidationError = 
                  validationError?.code === 'VALIDATION_REQUIRED' ||
                  validationError?.message?.includes('required') ||
                  validationError?.message?.includes('Offer details');
                
                if (isValidationError) {
                  const requiredFields: string[] = Array.isArray(validationError?.requiredFields) 
                    ? validationError.requiredFields 
                    : [];
                  
                  // Also try to extract from error message if requiredFields is empty
                  if (requiredFields.length === 0 && validationError?.message) {
                    const message = validationError.message;
                    if (message.includes('offerMadePrice')) requiredFields.push('offerMadePrice');
                    if (message.includes('offerMadeResponse')) requiredFields.push('offerMadeResponse');
                  }
                  
                  console.log('📋 Still required after Timeline+Taxes:', requiredFields);
                  
                  // Check if Offer Made popup is needed - multiple checks
                  const stageNameLower = (pipelineStages.find((s) => s.id === pendingPipelineStatus)?.name || '').toLowerCase();
                  const isOfferMadeStage = stageNameLower.includes('offer') && stageNameLower.includes('made');
                  const hasOfferFields = requiredFields.includes('offerMadePrice') || requiredFields.includes('offerMadeResponse');
                  const messageHasOffer = validationError?.message?.includes('Offer details') || validationError?.message?.includes('offer');
                  
                  if (isOfferMadeStage || hasOfferFields || messageHasOffer) {
                    console.log('💼 Opening Offer Made popup', { isOfferMadeStage, hasOfferFields, messageHasOffer });
                    transitioningPopupRef.current = true;
                    setShowTimelineTaxesPopup(false);
                    setShowOfferMadePopup(true);
                    setTimeout(() => { transitioningPopupRef.current = false; }, 100);
                    return;
                  }
                  
                  // If other validation errors, show error toast
                  console.error('❌ Unrecognized validation fields:', requiredFields);
                  toast({
                    title: "Validation Error",
                    description: validationError?.message || `Additional fields required: ${requiredFields.join(', ')}`,
                    variant: "destructive"
                  });
                  return;
                }
                
                // Non-validation error - re-throw
                throw validationError;
              }
            } else {
              // No pending status or already at Due Diligence Complete - just close popup
              setShowTimelineTaxesPopup(false);
              if (pendingPipelineStatus === dueDiligenceCompleteStage?.id) {
                // We just moved to Due Diligence Complete, clear pending status
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
              }
              await loadLead();
            }
          } catch (error: any) {
            console.error('❌ Error in Timeline+Taxes flow:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to save timeline and taxes",
              variant: "destructive"
            });
          } finally {
            // Always clear loading state
            setChangingPipelineStatus(false);
          }
        }}
      />

      <DueDiligenceCompleteRequirementsPopup
        open={showDueDiligenceCompletePopup}
        missingItems={missingDdCompleteItems}
        onClose={() => {
          console.log('🚪 Due Diligence Complete popup closed');
          setShowDueDiligenceCompletePopup(false);
          setMissingDdCompleteItems([]);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          // Force Select component to re-render
          setPipelineSelectKey(prev => prev + 1);
        }}
      />
      
      <OfferMadePopup
        open={showOfferMadePopup}
        onClose={() => {
          console.log('🚪 Offer Made popup closed');
          setShowOfferMadePopup(false);
          // Revert to previous status since user cancelled
          if (previousPipelineStatus) {
            console.log('⏪ Reverting status to:', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          // Force Select component to re-render
          setPipelineSelectKey(prev => prev + 1);
        }}
        existingData={lead?.customFields}
        onSubmit={async (data) => {
          try {
            console.log('💰 Saving offer data:', data);
            console.log('💰 Existing customFields:', lead?.customFields);
            
            const updatedCustomFields = {
              ...lead?.customFields,
              ...data
            };
            
            console.log('💰 Updated customFields:', updatedCustomFields);
            
            // Update lead with offer info first
            const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customFields: updatedCustomFields
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('❌ Failed to save offer data:', errorData);
              throw new Error(errorData.error || 'Failed to update offer information');
            }
            
            console.log('✅ Offer data saved successfully');
            
            // Reload lead first to ensure data is saved and reflected
            await loadLead();
            console.log('✅ Lead reloaded with updated offer data');
            
            // First, move to "Offer Made" stage (if not already there)
            const offerMadeStage = pipelineStages.find((s) => 
              s.name?.toLowerCase().includes('offer') && 
              s.name?.toLowerCase().includes('made')
            );
            
            if (offerMadeStage && pipelineStatus !== offerMadeStage.id) {
              try {
                console.log('💰 Moving to Offer Made stage...');
                await requestStageMove(offerMadeStage.id);
                console.log('✅ Successfully moved to Offer Made stage');
                // Update previousPipelineStatus to Offer Made so if user cancels next popup, it reverts to Offer Made
                setPreviousPipelineStatus(offerMadeStage.id);
                await loadLead();
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
            } else if (offerMadeStage && pipelineStatus === offerMadeStage.id) {
              // Already at Offer Made, update previousPipelineStatus
              setPreviousPipelineStatus(offerMadeStage.id);
            }
            
            // Now proceed with the target stage change (if different from Offer Made)
            if (pendingPipelineStatus && pendingPipelineStatus !== offerMadeStage?.id) {
              console.log('🔄 Attempting to move to target stage:', pendingPipelineStatus);
              
              try {
                const moveResult = await requestStageMove(pendingPipelineStatus);
                // Success! Stage moved to target
                console.log('✅ Stage moved to target:', moveResult?.newStageName);
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
                
                // Reload lead again to show updated stage
                await loadLead();
                
                // ✅ Close popup AFTER successful stage move
                setShowOfferMadePopup(false);
                } catch (e: any) {
                  if (e?.code === 'VALIDATION_REQUIRED') {
                    const requiredFields: string[] = Array.isArray(e?.requiredFields) ? e.requiredFields : [];
                    const ddFields = ['hvacType','hvacAge','waterHeaterAge','roofAge','waterType','sewerType'];

                    if (requiredFields.includes('photos')) {
                      setShowOfferMadePopup(false);
                      setShowAppointmentPopup(true);
                      return;
                    }
                    if (requiredFields.includes('followUpTask')) {
                      setShowOfferMadePopup(false);
                      setShowFollowUpTaskPopup(true);
                      return;
                    }
                    if (requiredFields.some((f) => ddFields.includes(f))) {
                      setMissingDdFields(requiredFields.filter((f) => ddFields.includes(f)));
                      setShowOfferMadePopup(false);
                      setShowDueDiligencePopup(true);
                      return;
                    }
                    
                    // Progressive DD Complete popups - show interactive popups one by one
                    if (requiredFields.includes('arv') || requiredFields.includes('comparables')) {
                      setShowOfferMadePopup(false);
                      setShowArvComparablesPopup(true);
                      return;
                    }
                    if (requiredFields.includes('rehabBudget')) {
                      setShowOfferMadePopup(false);
                      setShowRehabBudgetPopup(true);
                      return;
                    }
                    if (requiredFields.includes('underwritingTaxes') || requiredFields.includes('underwritingTimeline')) {
                      setShowOfferMadePopup(false);
                      setShowTimelineTaxesPopup(true);
                      return;
                    }
                    
                    // If any other DD Complete field is missing, show list popup as fallback
                    const ddCompleteFields = ['arv','comparables','rehabBudget','underwritingCalculation','underwritingTaxes','underwritingTimeline'];
                    if (requiredFields.some((f) => ddCompleteFields.includes(f))) {
                      setMissingDdCompleteItems(requiredFields.filter((f) => ddCompleteFields.includes(f)));
                      setShowOfferMadePopup(false);
                      setShowDueDiligenceCompletePopup(true);
                      return;
                    }
                  }
                  throw e;
                }
            } else {
              // No pending status or already at Offer Made - just close popup
              setShowOfferMadePopup(false);
              if (pendingPipelineStatus === offerMadeStage?.id) {
                // We just moved to Offer Made, clear pending status
                setPendingPipelineStatus(null);
                setPreviousPipelineStatus(null);
              }
              await loadLead();
            }
            
            // Success toast removed - only show errors
          } catch (error: any) {
            console.error('Error updating offer info:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to update offer information",
              variant: "destructive"
            });
          }
        }}
      />

      <FollowUpTaskRequiredPopup
        open={showFollowUpTaskPopup}
        message={
          pendingLeadStatus 
            ? 'Please create a follow-up task before changing Lead Status to Follow Up.' 
            : 'Please create a follow-up task before moving this lead to Long Term Follow Up.'
        }
        onClose={() => {
          console.log('🚪 Follow-up task popup closed without creating task');
          console.log('📊 State before close:', { 
            showFollowUpTaskPopup, 
            pipelineStatus, 
            previousPipelineStatus,
            pendingPipelineStatus,
            leadStatus,
            previousLeadStatus,
            pendingLeadStatus
          });
          
          setShowFollowUpTaskPopup(false);
          
          // Revert pipeline status if that's what triggered the popup
          if (previousPipelineStatus) {
            console.log('⏪ Reverting pipeline status from', pipelineStatus, 'to', previousPipelineStatus);
            setPipelineStatus(previousPipelineStatus);
            setPipelineSelectKey(prev => prev + 1);
          }
          setPendingPipelineStatus(null);
          setPreviousPipelineStatus(null);
          
          // Revert lead status if that's what triggered the popup
          if (previousLeadStatus) {
            console.log('⏪ Reverting lead status from', leadStatus, 'to', previousLeadStatus);
            setLeadStatus(previousLeadStatus);
            setLeadSelectKey(prev => prev + 1);
          }
          setPendingLeadStatus(null);
          setPreviousLeadStatus(null);
          
          console.log('✅ Popup cleanup complete, Selects will re-render');
        }}
        onSubmit={async ({ title, dueAt }) => {
          try {
            if (!id) return;
            await makeApiCall(`${API_BASE}/leads/${id}/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title,
                dueAt: new Date(dueAt).toISOString(),
                assignedToId: user?.id || undefined,
              }),
            });

            setShowFollowUpTaskPopup(false);

            // Handle pipeline status change if that's what triggered this
            if (pendingPipelineStatus) {
              await requestStageMove(pendingPipelineStatus);
              setPendingPipelineStatus(null);
              setPreviousPipelineStatus(null);
              await loadLead();
            }
            
            // Handle lead status change if that's what triggered this
            if (pendingLeadStatus) {
              const updateResponse = await makeApiCall(`${API_BASE}/leads/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadStatusId: pendingLeadStatus })
              });
              
              if (updateResponse.ok) {
                setLeadStatus(pendingLeadStatus);
                console.log('✅ Lead status updated to Follow Up after task creation');
              }
              
              setPendingLeadStatus(null);
              setPreviousLeadStatus(null);
              await loadLead();
            }
          } catch (e: any) {
            toast({
              title: 'Error',
              description: e?.message || 'Failed to create follow-up task',
              variant: 'destructive',
            });
          }
        }}
      />
      
      {/* Phone Number Selector Dialog */}
      <Dialog open={showPhoneSelector} onOpenChange={setShowPhoneSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              Select Phone Number
            </DialogTitle>
            <DialogDescription>
              Multiple phone numbers found. Choose which one to call.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            {availablePhoneNumbers.map((phone, index) => (
              <button
                key={index}
                onClick={() => handlePhoneSelected(phone.number)}
                className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{phone.label}</span>
                      {phone.isPrimary && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 font-mono">{formatUsPhoneForDisplay(phone.number)}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{phone.type}</div>
                  </div>
                  <Phone className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPhoneSelector(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Stage Change Loading Overlay */}
      {changingPipelineStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-700">Updating pipeline status...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadEdit;

