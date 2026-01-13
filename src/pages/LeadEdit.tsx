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
  RefreshCw
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
  OfferMadePopup
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
import { LeadPhotoGallery } from '@/components/LeadPhotoGallery';
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
  dispositionAgentId?: string;
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
  const { user } = useAuth();
  const hasPipelineNavContext = !!pipelineNavState?.leadIds?.length;
  const { prevLeadId, nextLeadId } = getPrevNext(id || '');
  const [fallbackNav, setFallbackNav] = useState<{ prevLeadId: string | null; nextLeadId: string | null } | null>(null);

  const effectivePrevLeadId = hasPipelineNavContext ? prevLeadId : (fallbackNav?.prevLeadId ?? null);
  const effectiveNextLeadId = hasPipelineNavContext ? nextLeadId : (fallbackNav?.nextLeadId ?? null);

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

  // Autosave state (Lead Detail page)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveError, setAutoSaveError] = useState<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef<Promise<void> | null>(null);
  const autoSavePendingRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>('');
  const lastSavedAtRef = useRef<number | null>(null);
  const suppressNextAutoSaveRef = useRef(true);
  const autoSaveDraftKey = id ? `lead-edit-draft:${id}` : null;
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
  
  // Stage transition validation popups
  const [showAppointmentPopup, setShowAppointmentPopup] = useState(false);
  const [showDueDiligencePopup, setShowDueDiligencePopup] = useState(false);
  const [showOfferMadePopup, setShowOfferMadePopup] = useState(false);
  const [pendingPipelineStatus, setPendingPipelineStatus] = useState<string | null>(null);
  
  // Property info
  const [propertyType, setPropertyType] = useState('');
  const [sqft, setSqft] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('0');
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
  
  // Comparables
  const [comparables, setComparables] = useState<any[]>([]);
  
  // Underwriting scenarios
  const [underwritingScenarios, setUnderwritingScenarios] = useState<any[]>([]);
  
  // Underwriting values (for passing to Projections)
  const [underwritingArv, setUnderwritingArv] = useState(0);
  const [underwritingTaxes, setUnderwritingTaxes] = useState(1000);
  const [underwritingTimeline, setUnderwritingTimeline] = useState(6);
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
          const stageError = await stageResponse.json().catch(() => ({}));
          throw new Error(stageError.message || 'Failed to change pipeline stage');
        }

        setPipelineStatus(stageId);
        // Stage move is its own persisted action; mark autosave as clean
        setAutoSaveStatus('saved');
      } catch (e: any) {
        toast({
          title: 'Stage Change Failed',
          description: e?.message || 'Failed to change pipeline stage',
          variant: 'destructive',
        });

        // Revert UI selection back to server-known stage
        setPipelineStatus(lead?.pipelineStageId || '');
      }
    },
    [id, canEditLead, toast, lead?.pipelineStageId]
  );

  // Handler for pipeline status changes with validation
  const handlePipelineStatusChange = (newStageId: string) => {
    const newStage = pipelineStages.find((s) => s.id === newStageId);
    if (!newStage) {
      void requestStageMove(newStageId);
      return;
    }

    const stageName = (newStage.name || '').toLowerCase();

    // Check if validation popup is needed
    if (stageName.includes('appointment') && stageName.includes('complete')) {
      setPendingPipelineStatus(newStageId);
      setShowAppointmentPopup(true);
      return;
    }
    if (stageName.includes('due diligence') && stageName.includes('complete')) {
      setPendingPipelineStatus(newStageId);
      setShowDueDiligencePopup(true);
      return;
    }
    if (stageName.includes('offer') && stageName.includes('made')) {
      setPendingPipelineStatus(newStageId);
      setShowOfferMadePopup(true);
      return;
    }

    // No validation needed, move immediately
    void requestStageMove(newStageId);
  };

  useEffect(() => {
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

  // Check permissions after lead and tasks are loaded
  useEffect(() => {
    if (lead && !loading && !loadingTasks) {
      checkUserPermissions();
    }
  }, [lead, tasks, user, loading, loadingTasks]);

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
        setDispositionsAgent(leadData.dispositionAgentId || '');

        // Reset autosave baseline after hydrating the page to prevent immediate autosave
        suppressNextAutoSaveRef.current = true;
        
        // Load property info from customFields
        const customFields = leadData.customFields || {};
        setPropertyType(customFields.propertyType || '');
        setSqft(customFields.sqft?.toString() || '');
        setLotSize(customFields.lotSize || '');
        setBedrooms(customFields.bedrooms?.toString() || '');
        // If baths is unknown/not set, keep it as 0 (rehab can also be 0 and remains synced)
        setBathrooms(customFields.bathrooms?.toString() || '0');
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
        if (customFields.rehabFinishLevel) setRehabFinishLevel(customFields.rehabFinishLevel);
        if (customFields.rehabToggledItems) setRehabToggledItems(customFields.rehabToggledItems);
        if (customFields.rehabNumberOfWindows) setRehabNumberOfWindows(customFields.rehabNumberOfWindows);
        setLeadSourceData(customFields.leadSourceData || {});

        // Establish baseline after state hydration completes (best-effort)
        setTimeout(() => {
          try {
            lastSavedPayloadRef.current = JSON.stringify(buildLeadPatchPayload());
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
        const loadedArv = customFields.arv ?? customFields.underwritingArv ?? 0;
        setArvValue(Number(loadedArv) || 0);
        setArvDisplay(loadedArv ? formatCurrency(Number(loadedArv) || 0) : '');
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
      const response = await makeApiCall(`${API_BASE}/pipeline/ACQUISITIONS/stages`);
      if (response.ok) {
        const data = await response.json();
        setPipelineStages(data.data || []);
      }
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

      toast({ title: 'Success', description: 'Owner added successfully' });
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
        setTasks(data.data || []);
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
    const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minute, 0, 0);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString();
  };

  const openTaskDialog = (task?: any) => {
    const nowPlusOneHour = new Date(Date.now() + 60 * 60 * 1000);
    const baseDate = task?.dueAt ? new Date(task.dueAt) : nowPlusOneHour;
    const initial = Number.isNaN(baseDate.getTime()) ? nowPlusOneHour : baseDate;

    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        dueAt: initial.toISOString(),
        assignedToId: task.assignedToId || ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        dueAt: initial.toISOString(),
        assignedToId: ''
      });
    }

    // hydrate picker UI
    setTaskDueFromDateTime(initial);
    setTaskDuePickerOpen(false);
    setShowTaskDialog(true);
  };

  const closeTaskDialog = () => {
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
    if (!taskForm.title || !taskForm.dueAt) {
      toast({
        title: "Validation Error",
        description: "Title and due date are required",
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
          toast({
            title: "Task Updated",
            description: "Task has been updated successfully"
          });
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
          toast({
            title: "Task Created",
            description: "New task has been created successfully"
          });
          await loadTasks();
          closeTaskDialog();
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
        toast({
          title: "Task Deleted",
          description: "Task has been deleted successfully"
        });
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
        toast({
          title: newStatus === 'DONE' ? "Task Completed" : "Task Reopened",
          description: `Task marked as ${newStatus.toLowerCase()}`
        });
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

  const buildPropertyDetails = useCallback(() => {
    return {
      // ARV is stored separately from underwriting (but we keep underwritingArv in sync).
      arv: arvValue || null,
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
      leadSourceData: leadSourceData || {},
      // Underwriting Calculator values
      underwritingArv: underwritingArv || null,
      underwritingTaxes: underwritingTaxes || null,
      underwritingTimeline: underwritingTimeline || null,
      underwritingRehabCost: underwritingRehabCost || null,
      finalOffer: finalOffer || null,
    };
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
    leadSourceData,
    underwritingArv,
    underwritingTaxes,
    underwritingTimeline,
    underwritingRehabCost,
    finalOffer,
  ]);

  const buildLeadPatchPayload = useCallback(() => {
    // Note: pipeline stage moves are handled separately via the pipeline move endpoint.
    const updates: any = {};

    // Contacts (primary + multi-contact support)
    const filteredContacts = (contacts || []).filter((c) => c?.name || c?.phone || c?.email);
    const primaryContact = filteredContacts[0];

    if (lead?.leadType === 'SELLER') {
      updates.seller = primaryContact?.name
        ? {
            firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
            lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
            phone: primaryContact.phone || '',
            email: primaryContact.email || '',
            motivation: lead.seller?.motivation || null,
            notes: lead.seller?.notes || null,
          }
        : {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            motivation: lead.seller?.motivation || null,
            notes: lead.seller?.notes || null,
          };
    } else if (lead?.leadType === 'BUYER') {
      updates.buyer = primaryContact?.name
        ? {
            firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
            lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
            phone: primaryContact.phone || '',
            email: primaryContact.email || '',
            vip: lead.buyer?.vip || false,
            blacklisted: (lead.buyer as any)?.blacklisted || false,
          }
        : {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            vip: lead.buyer?.vip || false,
            blacklisted: (lead.buyer as any)?.blacklisted || false,
          };
    } else if (lead?.leadType === 'VENDOR') {
      updates.vendor = primaryContact?.name
        ? {
            firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
            lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
            phone: primaryContact.phone || '',
            email: primaryContact.email || '',
            companyName: (lead.vendor as any)?.companyName || null,
            serviceType: (lead.vendor as any)?.serviceType || null,
          }
        : {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            companyName: (lead.vendor as any)?.companyName || null,
            serviceType: (lead.vendor as any)?.serviceType || null,
          };
    }

    // Custom fields: merge to avoid wiping unknown keys
    const propertyDetails = buildPropertyDetails();
    updates.customFields = {
      ...(lead?.customFields || {}),
      ...propertyDetails,
      contacts: filteredContacts,
    };

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
    if ((lead?.assignedUserId || '') !== (acquisitionsAgent || '')) {
      updates.assignedUserId = acquisitionsAgent ? acquisitionsAgent : null;
    }
    if ((lead?.dispositionAgentId || '') !== (dispositionsAgent || '')) {
      updates.dispositionAgentId = dispositionsAgent ? dispositionsAgent : null;
    }

    // Lead source
    if (leadSource) {
      const source = leadSources.find((s) => s.name === leadSource || s.id === leadSource);
      updates.leadSourceId = source?.id || null;
    } else if (lead?.leadSource?.id) {
      updates.leadSourceId = null;
    }

    // Lead status
    if (leadStatus) {
      const status = leadStatuses.find((s) => s.id === leadStatus || s.name === leadStatus);
      updates.leadStatusId = status?.id || null;
    } else if (lead?.leadStatus?.id) {
      updates.leadStatusId = null;
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
    async (reason: 'debounce' | 'blur' | 'manual' | 'pending' = 'manual') => {
      if (!id || !lead || !canEditLead) return;

      // Coalesce saves: if one is in-flight, request another run once it finishes
      if (autoSaveInFlightRef.current) {
        autoSavePendingRef.current = true;
        return;
      }

      const payload = buildLeadPatchPayload();
      const payloadStr = JSON.stringify(payload);

      // No actual lead changes → do nothing (prevents flicker from unrelated inputs like task dialogs)
      if (!payloadStr || payloadStr === lastSavedPayloadRef.current) {
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
        try {
          const response = await makeApiCall(`${API_BASE}/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to auto-save lead');
          }

          lastSavedPayloadRef.current = payloadStr;
          lastSavedAtRef.current = Date.now();
          setAutoSaveStatus('saved');
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
          setAutoSaveStatus('error');
          setAutoSaveError(e?.message || 'Auto-save failed');
          if (autoSaveDraftKey) {
            try {
              localStorage.setItem(autoSaveDraftKey, payloadStr);
            } catch (err) {
              // ignore
            }
          }
        } finally {
          autoSaveInFlightRef.current = null;

          if (autoSavePendingRef.current) {
            autoSavePendingRef.current = false;
            // Run again immediately to capture any edits that happened during the in-flight save
            await flushAutoSave('pending');
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
      trackPriceChanges,
      autoSaveDraftKey,
    ]
  );

  const scheduleAutoSave = useCallback(() => {
    if (!id || !lead || !canEditLead) return;

    // Skip the very first run after load/hydrate
    if (suppressNextAutoSaveRef.current) {
      suppressNextAutoSaveRef.current = false;
      lastSavedPayloadRef.current = JSON.stringify(buildLeadPatchPayload());
      return;
    }

    const payloadStr = JSON.stringify(buildLeadPatchPayload());
    if (!payloadStr || payloadStr === lastSavedPayloadRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus((prev) => (prev === 'saving' ? prev : 'dirty'));

    autoSaveTimerRef.current = setTimeout(() => {
      void flushAutoSave('debounce');
    }, 800);
  }, [id, lead, canEditLead, buildLeadPatchPayload, flushAutoSave]);

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
      if (dispositionsAgent && dispositionsAgent !== 'unassigned') updates.dispositionAgentId = dispositionsAgent;
      
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
        
        toast({
          title: 'Success',
          description: 'Lead updated successfully'
        });
        
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
        toast({
          title: 'Success',
          description: 'Note added successfully'
        });
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
        const comms = (data.data || []).sort((a: any, b: any) => 
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
    
    // First, check contacts from customFields (saved multiple contacts)
    const savedContacts = lead.customFields?.contacts || [];
    if (Array.isArray(savedContacts) && savedContacts.length > 0) {
      savedContacts.forEach((contact: any, index: number) => {
        if (contact.phone?.trim()) {
          phones.push({
            number: contact.phone.trim(),
            label: `${contact.name || `Contact ${index + 1}`} (Contact)`,
            type: 'contact',
            isPrimary: index === 0
          });
        }
      });
    }
    
    // Also check lead.contacts if available (from database)
    lead.contacts?.forEach((contact: any, index: number) => {
      if (contact.phone?.trim()) {
        const firstName = contact.firstName || '';
        const lastName = contact.lastName || '';
        const name = `${firstName} ${lastName}`.trim() || `Contact ${index + 1}`;
        phones.push({
          number: contact.phone.trim(),
          label: `${name} (Contact)`,
          type: 'contact',
          isPrimary: index === 0
        });
      }
    });
    
    // Add all owners
    leadOwners?.forEach((owner: LeadOwner, index: number) => {
      if (owner.phone?.trim()) {
        phones.push({
          number: owner.phone.trim(),
          label: `${owner.firstName} ${owner.lastName} (Owner)`,
          type: 'owner',
          isPrimary: owner.isPrimary
        });
      }
    });
    
    // Add seller
    if (lead.seller?.phone?.trim()) {
      const sellerName = `${lead.seller.firstName || ''} ${lead.seller.lastName || ''}`.trim() || 'Seller';
      phones.push({
        number: lead.seller.phone.trim(),
        label: `${sellerName} (Seller)`,
        type: 'seller'
      });
    }
    
    // Add buyer
    if (lead.buyer?.phone?.trim()) {
      const buyerName = `${lead.buyer.firstName || ''} ${lead.buyer.lastName || ''}`.trim() || 'Buyer';
      phones.push({
        number: lead.buyer.phone.trim(),
        label: `${buyerName} (Buyer)`,
        type: 'buyer'
      });
    }
    
    // Remove duplicates by phone number
    const uniquePhones = phones.filter((phone, index, self) =>
      index === self.findIndex((p) => p.number === phone.number)
    );
    
    return uniquePhones;
  };

  // Get all available email addresses from contacts, owners, seller, buyer, vendor
  const getAllEmailAddresses = () => {
    if (!lead) return [];
    
    const emails: Array<{email: string; label: string; type: string; isPrimary?: boolean}> = [];
    
    // First, check contacts from customFields (saved multiple contacts)
    const savedContacts = lead.customFields?.contacts || [];
    if (Array.isArray(savedContacts) && savedContacts.length > 0) {
      savedContacts.forEach((contact: any, index: number) => {
        if (contact.email?.trim()) {
          emails.push({
            email: contact.email.trim(),
            label: `${contact.name || `Contact ${index + 1}`} (Contact)`,
            type: 'contact',
            isPrimary: index === 0
          });
        }
      });
    }
    
    // Also check lead.contacts if available (from database)
    lead.contacts?.forEach((contact: any, index: number) => {
      if (contact.email?.trim()) {
        const firstName = contact.firstName || '';
        const lastName = contact.lastName || '';
        const name = `${firstName} ${lastName}`.trim() || `Contact ${index + 1}`;
        emails.push({
          email: contact.email.trim(),
          label: `${name} (Contact)`,
          type: 'contact',
          isPrimary: index === 0
        });
      }
    });
    
    // Add all owners
    leadOwners?.forEach((owner: LeadOwner, index: number) => {
      if (owner.email?.trim()) {
        emails.push({
          email: owner.email.trim(),
          label: `${owner.firstName} ${owner.lastName} (Owner)`,
          type: 'owner',
          isPrimary: owner.isPrimary
        });
      }
    });
    
    // Add seller
    if (lead.seller?.email?.trim()) {
      const sellerName = `${lead.seller.firstName || ''} ${lead.seller.lastName || ''}`.trim() || 'Seller';
      emails.push({
        email: lead.seller.email.trim(),
        label: `${sellerName} (Seller)`,
        type: 'seller'
      });
    }
    
    // Add buyer
    if (lead.buyer?.email?.trim()) {
      const buyerName = `${lead.buyer.firstName || ''} ${lead.buyer.lastName || ''}`.trim() || 'Buyer';
      emails.push({
        email: lead.buyer.email.trim(),
        label: `${buyerName} (Buyer)`,
        type: 'buyer'
      });
    }
    
    // Add vendor
    if (lead.vendor?.email?.trim()) {
      const vendorName = `${lead.vendor.firstName || ''} ${lead.vendor.lastName || ''}`.trim() || 'Vendor';
      emails.push({
        email: lead.vendor.email.trim(),
        label: `${vendorName} (Vendor)`,
        type: 'vendor'
      });
    }
    
    // Remove duplicates by email address
    const uniqueEmails = emails.filter((email, index, self) =>
      index === self.findIndex((e) => e.email === email.email)
    );
    
    return uniqueEmails;
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
      
      toast({
        title: 'Call Started',
        description: 'Call connected successfully'
      });
      
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
      
      toast({
        title: 'Call Started',
        description: 'Call connected successfully'
      });
      
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
        toast({
          title: 'SMS Sent',
          description: 'Message sent successfully'
        });
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
        toast({
          title: 'Email Sent',
          description: 'Email sent successfully'
        });
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
        setFiles(data.data || []);
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
        // Filter only photos category
        const photoFiles = (data.data || []).filter((file: any) => file.category === 'photos');
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
        toast({
          title: "Success",
          description: "Transaction details saved successfully"
        });
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
        toast({
          title: "Success",
          description: "Buyer offer created successfully"
        });
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
        toast({
          title: "Success",
          description: `Offer ${newStatus.toLowerCase()} successfully`
        });
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
        toast({
          title: "Success",
          description: "Offer deleted successfully"
        });
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
        toast({
          title: "Success",
          description: "Buyer created successfully"
        });
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
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await makeApiCall(`${API_BASE}/leads/${id}/files`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'File uploaded successfully'
        });
        loadFiles();
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      // Upload multiple photos
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file is an image
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid File',
            description: `${file.name} is not an image file`,
            variant: 'destructive'
          });
          continue;
        }

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

      toast({
        title: 'Success',
        description: `${files.length} photo(s) uploaded successfully`
      });
      
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
  const fallbackOwnerName =
    lead.seller?.firstName && lead.seller?.lastName
      ? `${lead.seller.firstName} ${lead.seller.lastName}`
      : lead.buyer?.firstName && lead.buyer?.lastName
        ? `${lead.buyer.firstName} ${lead.buyer.lastName}`
        : lead.vendor?.firstName && lead.vendor?.lastName
          ? `${lead.vendor.firstName} ${lead.vendor.lastName}`
          : 'No Owner';

  const ownerName = primaryOwner ? `${primaryOwner.firstName} ${primaryOwner.lastName}` : fallbackOwnerName;
  const ownerEmail = primaryOwner?.email || lead.seller?.email || lead.buyer?.email || lead.vendor?.email || '';
  const ownerPhone = primaryOwner?.phone || lead.seller?.phone || lead.buyer?.phone || lead.vendor?.phone || '';
  const ownerContactLine = [ownerEmail, ownerPhone].filter(Boolean).join(' • ');
  const additionalOwners = leadOwners.filter((o) => !primaryOwner || o.id !== primaryOwner.id);

  return (
    <>
      <div
        className="space-y-2"
        onInputCapture={() => scheduleAutoSave()}
        onChangeCapture={() => scheduleAutoSave()}
        onBlurCapture={() => void flushAutoSave('blur')}
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
            {/* Autosave status */}
            {canEditLead && (
              <div className="text-[9px] text-slate-500 min-w-[64px] text-right">
                {autoSaveStatus === 'saving' && 'Saving…'}
                {autoSaveStatus === 'dirty' && 'Not saved'}
                {autoSaveStatus === 'saved' && 'Saved'}
                {autoSaveStatus === 'error' && 'Error'}
              </div>
            )}
            <Button
              className="h-5 text-[9px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md inline-flex items-center justify-center"
              onClick={() => void flushAutoSave('manual')}
              disabled={saving || autoSaveStatus === 'saving' || !canEditLead}
              title={autoSaveError ? autoSaveError : 'Save now'}
            >
              <Save className="w-2.5 h-2.5 mr-0.5" />
              {autoSaveStatus === 'saving' || saving ? 'Saving...' : 'Save now'}
            </Button>
            {/* Prev / Next lead navigation (from Pipeline view) */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-5 w-6 p-0 rounded-md inline-flex items-center justify-center"
                onClick={() => effectivePrevLeadId && navigate(`/leads/${effectivePrevLeadId}/edit`)}
                disabled={!effectivePrevLeadId}
                title={effectivePrevLeadId ? 'Previous lead' : 'No previous lead'}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                className="h-5 w-6 p-0 rounded-md inline-flex items-center justify-center"
                onClick={() => effectiveNextLeadId && navigate(`/leads/${effectiveNextLeadId}/edit`)}
                disabled={!effectiveNextLeadId}
                title={effectiveNextLeadId ? 'Next lead' : 'No next lead'}
              >
                <ChevronRight className="w-3 h-3" />
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
        <div className="border border-slate-200 rounded-lg bg-white p-3">
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
                            toast({
                              title: 'Success',
                              description: 'Address updated successfully'
                            });
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
              {id && <LeadOwnerSection ref={ownerSectionRef} leadId={id} readOnly={!canEditLead} onEditingChange={handleOwnerEditingChange} />}
            </div>
          </div>
        </div>

        {/* Section 2 - Lead Details + Timeline (side by side) */}
        <div className="grid grid-cols-12 gap-2">
          {/* Lead Details - Left Side (6 cols) */}
          <div className="col-span-6 border border-slate-200 rounded-lg bg-white p-2">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3 text-slate-500" />
              <span className="text-[11px] font-medium text-slate-600">Lead Details</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
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
                <Select value={leadStatus} onValueChange={setLeadStatus} disabled={!canEditLead}>
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
                <Select value={pipelineStatus} onValueChange={handlePipelineStatusChange} disabled={!canEditLead}>
                  <SelectTrigger className="h-5 text-[10px]"><SelectValue placeholder="Pipeline Status" /></SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
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

          {/* Timeline - Right Side (6 cols) */}
          <div className="col-span-6 border border-slate-200 rounded-lg bg-white p-2">
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
              onRefresh={() => {
                loadLead();
                loadDeal();
              }}
            />
          </div>
        </div>

        {/* Section 3 - Property Information (full width) */}
        <div className="border border-slate-200 rounded-lg bg-white p-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Home className="w-3 h-3 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-600">Property Information</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
            <div>
              <Label className="text-[9px] text-slate-500">Type</Label>
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
            <div>
              <Label className="text-[9px] text-slate-500">SqFt</Label>
              <Input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="SqFt" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div>
              <Label className="text-[9px] text-slate-500">Lot</Label>
              <Input value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="Acres" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div>
              <Label className="text-[9px] text-slate-500">Beds</Label>
              <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Beds" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div>
              <Label className="text-[9px] text-slate-500">Baths</Label>
              <Input type="number" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="Baths" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
            <div>
              <Label className="text-[9px] text-slate-500">Year</Label>
              <Input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="Year" className="h-5 text-[10px]" disabled={!canEditLead} />
            </div>
          </div>
        </div>

        {/* Contacts box removed (not needed) */}

        {/* Offer Information - Show if offer data exists */}
        {(lead?.customFields?.offerMadePrice || lead?.customFields?.maxAllowableOffer || lead?.customFields?.offerMadeResponse) && (
          <div className="grid grid-cols-1 gap-3">
            {/* Offer Information */}
            <div className="border border-slate-200 rounded-lg bg-white p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-slate-600">Offer Information</span>
                {lead?.customFields?.offerMadeResponse && (
                  <Badge 
                    className={`text-[10px] ml-auto ${
                      lead.customFields.offerMadeResponse === 'Accepted' ? 'bg-green-100 text-green-700' :
                      lead.customFields.offerMadeResponse === 'Negotiating' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {lead.customFields.offerMadeResponse}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500">Offer Made Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input 
                      type="number" 
                      value={lead?.customFields?.offerMadePrice || ''} 
                      readOnly
                      className="h-6 text-xs pl-6 bg-slate-50" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Max Allowable Offer</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input 
                      type="number" 
                      value={lead?.customFields?.maxAllowableOffer || ''} 
                      readOnly
                      className="h-6 text-xs pl-6 bg-slate-50" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Response Status</Label>
                  <Input 
                    value={lead?.customFields?.offerMadeResponse || 'N/A'} 
                    readOnly
                    className="h-6 text-xs bg-slate-50 font-medium" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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
                <TabsTrigger value="acquisitions" className="text-xs py-1">Acquisitions</TabsTrigger>
                {canSeeTransactionsTab && <TabsTrigger value="transactions" className="text-xs py-1">Transactions</TabsTrigger>}
                {canSeeDispositionsTab && <TabsTrigger value="dispositions" className="text-xs py-1">Dispositions</TabsTrigger>}
                <TabsTrigger value="files" className="text-xs py-1">Files</TabsTrigger>
              </TabsList>

              {/* Acquisitions Tab */}
              <TabsContent value="acquisitions" className="space-y-2 mt-2">
                {/* 1. Additional Property Information */}
                <Collapsible open={isAdditionalInfoOpen} onOpenChange={setIsAdditionalInfoOpen}>
                  <div className="border border-slate-200 rounded-lg bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Additional Property Information</span>
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
                      <span className="text-xs font-medium text-slate-600">Photos</span>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-xs px-2" 
                          disabled={uploadingPhoto}
                          onClick={() => document.getElementById('photo-upload')?.click()}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {uploadingPhoto ? 'Uploading...' : 'Add'}
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
                          accept="image/*" 
                          multiple
                          className="hidden" 
                          onChange={handlePhotoUpload} 
                          disabled={uploadingPhoto} 
                        />
                      </div>
                    </div>

                    <CollapsibleContent className="mt-2">
                      <LeadPhotoGallery
                        photos={photos}
                        onDeletePhoto={async (photo) => {
                          if (confirm('Delete this photo?')) {
                            try {
                              await makeApiCall(`${API_BASE}/files/${photo.id}`, { method: 'DELETE' });
                              toast({ title: 'Success', description: 'Photo deleted' });
                              loadPhotos();
                            } catch (error) {
                              toast({ title: 'Error', description: 'Failed to delete photo', variant: 'destructive' });
                            }
                          }
                        }}
                      />
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
                  leadAddress={lead?.address ? {
                    address1: lead.address.address1,
                    city: lead.address.city,
                    state: lead.address.state,
                    zip: lead.address.zip
                  } : undefined}
                />

                {/* 4. Rehab Budget Calculator */}
                <RehabBudgetCalculatorCompact
                  leadId={id!}
                  sqft={parseInt(sqft) || 0}
                  bathrooms={Math.max(0, Math.ceil(parseFloat(bathrooms) || 0))}
                  readOnly={false}
                  initialFinishLevel={rehabFinishLevel}
                  initialToggledItems={rehabToggledItems}
                  initialNumberOfWindows={rehabNumberOfWindows}
                  onTotalChange={(total) => setRehabBudget(total.toString())}
                  onBathroomsChange={(n) => setBathrooms(String(n))}
                  onDataChange={(data) => {
                    setRehabFinishLevel(data.finishLevel as 'low_end' | 'mid_range' | 'high_end');
                    setRehabToggledItems(data.toggledItems);
                    setRehabNumberOfWindows(data.numberOfWindows);
                  }}
                />

                {/* 5. Underwriting Calculator - Role-Based (Admin, Manager, ACQ only) */}
                {user?.roles && (user.roles.includes('ADMIN') || user.roles.includes('MANAGER') || user.roles.includes('ACQ')) && (
                  <UnderwritingCalculator
                    leadId={id!}
                    rehabCost={parseInt(rehabBudget) || 0}
                    readOnly={false}
                    initialArv={underwritingArv}
                    initialTaxes={underwritingTaxes}
                    initialTimeline={underwritingTimeline}
                    onValuesChange={(values) => {
                      setUnderwritingArv(values.arv);
                      setUnderwritingTaxes(values.taxes);
                      setUnderwritingTimeline(values.timeline);
                      setUnderwritingRehabCost(values.rehabCost);
                      setFinalOffer(values.finalOffer);
                    }}
                    key={`underwriting-${rehabBudget}`}
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
                <div className="border border-slate-200 rounded-lg bg-white p-2">
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
                      <div className="text-center py-3 bg-slate-50 rounded text-[10px] text-slate-500">No transaction yet</div>
                    )}
                </div>
              </TabsContent>
              )}

              {/* Dispositions Tab */}
              {canSeeDispositionsTab && (
              <TabsContent value="dispositions" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2">
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
                  ) : (<div className="text-center py-2 bg-slate-50 rounded text-[10px] text-slate-500">No offers yet</div>)}
                </div>
              </TabsContent>
              )}

              {/* Files Tab */}
              <TabsContent value="files" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600">Files</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" disabled={uploading}>
                      <Upload className="w-3 h-3 mr-1" />
                      <label htmlFor="file-upload" className="cursor-pointer">{uploading ? 'Uploading...' : 'Upload'}</label>
                      <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} multiple />
                    </Button>
                  </div>
                  <LeadFileGallery
                    files={files}
                    onDeleteFile={async (file) => {
                      if (confirm('Delete this file?')) {
                        try {
                          await makeApiCall(`${API_BASE}/files/${file.id}`, { method: 'DELETE' });
                          toast({ title: 'Success', description: 'File deleted' });
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
              <Label htmlFor="task-assignee">Assign To</Label>
              <Select
                value={taskForm.assignedToId || undefined}
                onValueChange={(value) => setTaskForm({ ...taskForm, assignedToId: value })}
                disabled={savingTask}
              >
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Select team member (optional)..." />
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
              disabled={savingTask || !taskForm.title || !taskForm.dueAt}
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
          setShowAppointmentPopup(false);
          setPendingPipelineStatus(null);
        }}
        leadId={id || ''}
        onSubmit={async (files) => {
          try {
            // Upload photos
            let uploadedCount = 0;
            for (const file of files) {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('category', 'PHOTO');
              
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
            
            // Now move the lead to the new stage using the backend API
            if (pendingPipelineStatus) {
              await requestStageMove(pendingPipelineStatus);
            }
            
            setShowAppointmentPopup(false);
            setPendingPipelineStatus(null);
            
            // Reload files to show new photos
            await loadFiles();
            
            // Reload lead to show updated stage
            await loadLead();
            
            toast({
              title: "Success",
              description: `${uploadedCount} photo(s) uploaded and stage updated`,
            });
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
      
      <DueDiligencePopup
        open={showDueDiligencePopup}
        onClose={() => {
          setShowDueDiligencePopup(false);
          setPendingPipelineStatus(null);
        }}
        existingData={lead?.customFields}
        onSubmit={async (data) => {
          try {
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
              throw new Error(errorData.error || 'Failed to update property information');
            }
            
            // Now move the lead to the new stage using the backend API
            if (pendingPipelineStatus) {
              await requestStageMove(pendingPipelineStatus);
            }
            
            setShowDueDiligencePopup(false);
            setPendingPipelineStatus(null);
            
            // Reload lead to show updated data
            await loadLead();
            
            toast({
              title: "Success",
              description: "Property information updated and stage changed",
            });
          } catch (error: any) {
            console.error('Error updating property info:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to update property information",
              variant: "destructive"
            });
          }
        }}
      />
      
      <OfferMadePopup
        open={showOfferMadePopup}
        onClose={() => {
          setShowOfferMadePopup(false);
          setPendingPipelineStatus(null);
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
            
            // Now move the lead to the new stage using the backend API
            if (pendingPipelineStatus) {
              await requestStageMove(pendingPipelineStatus);
            }
            
            setShowOfferMadePopup(false);
            setPendingPipelineStatus(null);
            
            // Reload lead to show updated data
            await loadLead();
            
            toast({
              title: "Success",
              description: "Offer information updated and stage changed",
            });
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
    </>
  );
};

export default LeadEdit;

