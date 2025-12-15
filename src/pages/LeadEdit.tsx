import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CompsManager } from '@/components/CompsManager';
import { LeadTimeline } from '@/components/LeadTimeline';
import { UnderwritingCalculator } from '@/components/UnderwritingCalculator';
import { LeadOwnerSection } from '@/components/LeadOwnerSection';
import { PropertyInfoCard } from '@/components/PropertyInfoCard';
import { RehabBudgetCalculatorCompact } from '@/components/RehabBudgetCalculatorCompact';
import { UnderwritingSectionCompact } from '@/components/UnderwritingSectionCompact';
import { ProjectionsSection } from '@/components/ProjectionsSection';

interface Contact {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

interface LeadData {
  id: string;
  address: {
    address1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  seller: {
    firstName: string;
    lastName: string;
  };
  leadSource?: string;
  leadStatus?: string;
  pipelineStageId?: string;
  assignedUserId?: string;
  dispositionAgentId?: string;
  contacts: Contact[];
  propertyType?: string;
  sqft?: number;
  lotSize?: string;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  roofType?: string;
  roofAge?: number;
  hvacType?: string;
  hvacAge?: number;
  waterHeaterAge?: number;
  waterType?: string;
  sewerType?: string;
}

const LeadEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('acquisitions');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  
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
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  
  // Editable fields
  const [leadSource, setLeadSource] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [acquisitionsAgent, setAcquisitionsAgent] = useState('');
  const [dispositionsAgent, setDispositionsAgent] = useState('');
  
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
  
  // Notes and communications
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [addingNote, setAddingNote] = useState(false);
  
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
  
  // Comparables
  const [comparables, setComparables] = useState<any[]>([]);
  
  // Underwriting scenarios
  const [underwritingScenarios, setUnderwritingScenarios] = useState<any[]>([]);
  
  // Files
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
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

  useEffect(() => {
    loadLead();
    loadAgents();
    loadPipelineStages();
    loadLeadSources();
    loadLeadStatuses();
    loadNotes();
    loadComparables();
    loadUnderwritingScenarios();
    loadFiles();
    loadDeal();
    loadBuyerOffers();
    loadBuyers();
    loadTasks();
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
        setLeadSourceData(customFields.leadSourceData || {});
        
        // Load contacts from lead
        const initialContacts = [];
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
        if (initialContacts.length === 0) {
          initialContacts.push({ name: '', phone: '', email: '' });
        }
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

  const loadLeadSources = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/leads/sources`);
      if (response.ok) {
        const data = await response.json();
        setLeadSources(data.data || []);
      }
    } catch (error) {
      console.error('Error loading lead sources:', error);
      // Fallback to default sources
      setLeadSources([
        { id: 'cold-call', name: 'Cold Call' },
        { id: 'sms', name: 'SMS' },
        { id: 'mailer', name: 'Mailer' },
        { id: 'online', name: 'Online' },
        { id: 'other', name: 'Other' }
      ]);
    }
  };

  const loadLeadStatuses = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/lead-statuses`);
      if (response.ok) {
        const data = await response.json();
        setLeadStatuses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading lead statuses:', error);
      // Fallback to default statuses
      setLeadStatuses([
        { id: 'pipeline', name: 'Pipeline' },
        { id: 'follow-up', name: 'Follow Up' },
        { id: 'closed', name: 'Closed' },
        { id: 'dead', name: 'Dead' },
        { id: 'wrong-number', name: 'Wrong Number' }
      ]);
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
    
    // Check if user has any tasks assigned for this lead
    const hasAssignedTask = tasks.some(task => task.assignedToId === user.id);
    const assignedTaskTitle = tasks.find(t => t.assignedToId === user.id)?.title;
    
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
      // No access at all
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

  const openTaskDialog = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
        assignedToId: task.assignedToId || ''
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        dueAt: '',
        assignedToId: ''
      });
    }
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

  const handleSave = async () => {
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
        leadSourceData: leadSourceData || {}
      };

      console.log('Saving customFields:', propertyDetails);

      // Prepare lead updates - store property details in customFields
      const updates: any = {
        customFields: propertyDetails
      };

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
        
        toast({
          title: 'Success',
          description: 'Lead updated successfully'
        });
        
        // Reload lead data to reflect changes
        await loadLead();
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

  const saveContacts = async () => {
    if (contacts.length === 0) return;
    
    try {
      // Get the first contact (primary contact)
      const primaryContact = contacts[0];
      if (!primaryContact) return;
      
      // Prepare the update based on lead type
      const contactUpdate: any = {};
      
      if (lead?.leadType === 'SELLER' && lead?.seller) {
        contactUpdate.seller = {
          firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
          lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
          phone: primaryContact.phone,
          email: primaryContact.email,
          motivation: lead.seller.motivation,
          notes: lead.seller.notes
        };
      } else if (lead?.leadType === 'BUYER' && lead?.buyer) {
        contactUpdate.buyer = {
          firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
          lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
          phone: primaryContact.phone,
          email: primaryContact.email,
          vip: lead.buyer.vip,
          blacklisted: lead.buyer.blacklisted
        };
      } else if (lead?.leadType === 'VENDOR' && lead?.vendor) {
        contactUpdate.vendor = {
          firstName: primaryContact.name.split(' ')[0] || primaryContact.name,
          lastName: primaryContact.name.split(' ').slice(1).join(' ') || '',
          phone: primaryContact.phone,
          email: primaryContact.email,
          companyName: lead.vendor.companyName,
          serviceType: lead.vendor.serviceType
        };
      }
      
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
  const trackPriceChanges = async (changes: Array<{ fieldName: string; oldValue: number | null; newValue: number | null }>) => {
    const validChanges = changes.filter(c => c.newValue !== null && c.newValue !== c.oldValue);
    if (validChanges.length === 0) return;

    try {
      await makeApiCall(`${API_BASE}/leads/${id}/price-history/track-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: validChanges })
      });
    } catch (error) {
      console.error('Error tracking price changes:', error);
    }
  };

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
        loadNotes(); // Reload notes
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
      if (!newBuyerFirstName || !newBuyerLastName || !newBuyerEmail || !newBuyerPhone) {
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-slate-600">Loading lead details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-lg text-slate-600">Lead not found</p>
          <Button onClick={() => navigate('/leads')} className="mt-4">
            Back to Leads
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-2">
        {/* Header with Back Button and Save */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !canEditLead}>
            <Save className="w-3 h-3 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Access Information Banner */}
        {canViewLead && !canEditLead && (
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

        {/* Top Section - Address, Owner, and Lead Info Combined */}
        <div className="border border-slate-200 rounded-lg bg-white p-3">
          <div className="grid grid-cols-12 gap-4 items-center">
            {/* Address */}
            <div className="col-span-3">
              <div className="flex items-center gap-1 mb-0.5">
                <Home className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase">Address</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate">{lead.address?.address1 || 'No Address'}</p>
              <p className="text-[10px] text-slate-500">{lead.address?.city && lead.address?.state ? `${lead.address.city}, ${lead.address.state} ${lead.address.zipCode || ''}` : ''}</p>
            </div>
            {/* Owner */}
            <div className="col-span-2">
              <div className="flex items-center gap-1 mb-0.5">
                <User className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase">Owner</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {lead.seller?.firstName && lead.seller?.lastName ? `${lead.seller.firstName} ${lead.seller.lastName}` : lead.buyer?.firstName && lead.buyer?.lastName ? `${lead.buyer.firstName} ${lead.buyer.lastName}` : lead.vendor?.firstName && lead.vendor?.lastName ? `${lead.vendor.firstName} ${lead.vendor.lastName}` : 'No Owner'}
              </p>
            </div>
            {/* Lead Source */}
            <div className="col-span-1">
              <Label className="text-[10px] text-slate-500">Source</Label>
              <Select value={leadSource} onValueChange={setLeadSource} disabled={!canEditLead}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {leadSources.length > 0 ? leadSources.map((source) => (<SelectItem key={source.id} value={source.name}>{source.name}</SelectItem>)) : (<><SelectItem value="Cold Call">Cold Call</SelectItem><SelectItem value="SMS">SMS</SelectItem><SelectItem value="Mailer">Mailer</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Other">Other</SelectItem></>)}
                </SelectContent>
              </Select>
            </div>
            {/* Lead Status */}
            <div className="col-span-2">
              <Label className="text-[10px] text-slate-500">Status</Label>
              <Select value={leadStatus} onValueChange={setLeadStatus} disabled={!canEditLead}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {leadStatuses.length > 0 ? leadStatuses.map((status) => (<SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>)) : (<><SelectItem value="Pipeline">Pipeline</SelectItem><SelectItem value="Follow Up">Follow Up</SelectItem><SelectItem value="Closed">Closed</SelectItem><SelectItem value="Dead">Dead</SelectItem></>)}
                </SelectContent>
              </Select>
            </div>
            {/* Pipeline Status */}
            <div className="col-span-2">
              <Label className="text-[10px] text-slate-500">Pipeline</Label>
              <Select value={pipelineStatus} onValueChange={setPipelineStatus} disabled={!canEditLead}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>{pipelineStages.map((stage) => (<SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {/* Agents */}
            <div className="col-span-2">
              <Label className="text-[10px] text-slate-500">ACQ / DISP Agent</Label>
              <div className="flex gap-1">
                <Select value={acquisitionsAgent || 'unassigned'} onValueChange={(value) => setAcquisitionsAgent(value === 'unassigned' ? '' : value)} disabled={!canEditLead}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="ACQ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None</SelectItem>
                    {agents.filter(a => { const roles = Array.isArray(a.roles) ? a.roles : []; return roles.includes('ACQ') || roles.some((r: any) => r.role?.name === 'ACQ' || r.name === 'ACQ'); }).map((agent) => (<SelectItem key={agent.id} value={agent.id}>{agent.firstName}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={dispositionsAgent || 'unassigned'} onValueChange={(value) => setDispositionsAgent(value === 'unassigned' ? '' : value)} disabled={!canEditLead}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="DISP" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None</SelectItem>
                    {agents.filter(a => { const roles = Array.isArray(a.roles) ? a.roles : []; return roles.includes('DISP') || roles.some((r: any) => r.role?.name === 'DISP' || r.name === 'DISP'); }).map((agent) => (<SelectItem key={agent.id} value={agent.id}>{agent.firstName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information - Compact */}
        <div className="border border-slate-200 rounded-lg bg-white p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Contacts</span>
            </div>
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={addContact}><Plus className="w-2.5 h-2.5 mr-0.5" />Add</Button>
          </div>
          <div className="space-y-1">
            {contacts.map((contact, index) => (
              <div key={index} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-100">
                <Input value={contact.name} onChange={(e) => updateContact(index, 'name', e.target.value)} placeholder="Name" className="h-6 text-xs flex-1" />
                <Input value={contact.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} placeholder="Phone" className="h-6 text-xs flex-1" />
                <Input value={contact.email} onChange={(e) => updateContact(index, 'email', e.target.value)} placeholder="Email" type="email" className="h-6 text-xs flex-1" />
                {contact.phone && <a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="text-emerald-600 hover:text-emerald-700"><Phone className="w-3 h-3" /></a>}
                {contact.email && <a href={`mailto:${contact.email}`} className="text-emerald-600 hover:text-emerald-700"><Mail className="w-3 h-3" /></a>}
                <Button variant="ghost" size="sm" onClick={() => removeContact(index)} className="h-5 w-5 p-0"><X className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Timeline Section */}
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

        {/* Valuation & Property Info - Combined Compact Section */}
        <div className="grid grid-cols-2 gap-3">
          {/* Valuation Section */}
          <div className="border border-slate-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Valuation & Schedule</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">Est. Value (ARV)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="ARV" className="h-7 text-xs pl-6" />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Asking Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input type="number" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="Price" className="h-7 text-xs pl-6" />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Appointment</Label>
                <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="h-7 text-xs" />
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="border border-slate-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Property Information</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Family">Single Family</SelectItem>
                    <SelectItem value="Multi Family">Multi Family</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">SqFt</Label>
                <Input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="SqFt" className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Lot</Label>
                <Input value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="Acres" className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Beds</Label>
                <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Beds" className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Baths</Label>
                <Input type="number" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="Baths" className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Year</Label>
                <Input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="Year" className="h-7 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="grid grid-cols-12 gap-2">
          {/* Left side - Tabs (8 columns) */}
          <div className="col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 h-7">
                <TabsTrigger value="acquisitions" className="text-xs py-1">Acquisitions</TabsTrigger>
                <TabsTrigger value="transactions" className="text-xs py-1">Transactions</TabsTrigger>
                <TabsTrigger value="dispositions" className="text-xs py-1">Dispositions</TabsTrigger>
                <TabsTrigger value="files" className="text-xs py-1">Files</TabsTrigger>
              </TabsList>

              {/* Acquisitions Tab */}
              <TabsContent value="acquisitions" className="space-y-2 mt-2">
                {/* Lead Creation Section - Compact */}
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">Lead Source: <Badge variant="outline" className="text-[10px] ml-1">{leadSource || 'N/A'}</Badge></span>
                    <span className="text-[10px] text-slate-500">Created: {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {leadSource === 'Cold Call' && (
                    <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-50 rounded text-[10px]">
                      <div><span className="text-slate-500">Condition:</span> <span className="text-slate-800">{leadSourceData.condition || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Motivation:</span> <span className="text-slate-800">{leadSourceData.motivation || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Timeline:</span> <span className="text-slate-800">{leadSourceData.timeline || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Asking:</span> <span className="text-slate-800">{leadSourceData.askingPrice ? `$${parseInt(leadSourceData.askingPrice).toLocaleString()}` : 'N/A'}</span></div>
                    </div>
                  )}
                  {leadSource === 'SMS' && leadSourceData.smsMessages?.length > 0 && (
                    <div className="max-h-20 overflow-y-auto p-1.5 bg-slate-50 rounded space-y-1">
                      {leadSourceData.smsMessages.map((msg: any, idx: number) => (
                        <div key={idx} className={`p-1 rounded text-[10px] ${msg.direction === 'inbound' ? 'bg-slate-200 ml-4' : 'bg-white mr-4 border'}`}>
                          <p className="text-slate-900">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Property Info - Compact */}
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <span className="text-xs font-medium text-slate-600 block mb-1">Additional Property Info</span>
                  <div className="grid grid-cols-7 gap-1">
                    <div><Label className="text-[10px] text-slate-500">Roof</Label><Input value={roofType} onChange={(e) => setRoofType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                    <div><Label className="text-[10px] text-slate-500">Roof Age</Label><Input type="number" value={roofAge} onChange={(e) => setRoofAge(e.target.value)} placeholder="Yrs" className="h-6 text-xs" /></div>
                    <div><Label className="text-[10px] text-slate-500">HVAC</Label><Input value={hvacType} onChange={(e) => setHvacType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                    <div><Label className="text-[10px] text-slate-500">HVAC Age</Label><Input type="number" value={hvacAge} onChange={(e) => setHvacAge(e.target.value)} placeholder="Yrs" className="h-6 text-xs" /></div>
                    <div><Label className="text-[10px] text-slate-500">WH Age</Label><Input type="number" value={waterHeaterAge} onChange={(e) => setWaterHeaterAge(e.target.value)} placeholder="Yrs" className="h-6 text-xs" /></div>
                    <div><Label className="text-[10px] text-slate-500">Water</Label><Input value={waterType} onChange={(e) => setWaterType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                    <div><Label className="text-[10px] text-slate-500">Sewer</Label><Input value={sewerType} onChange={(e) => setSewerType(e.target.value)} placeholder="Type" className="h-6 text-xs" /></div>
                  </div>
                </div>

                {/* Rehab Information - Compact */}
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">Rehab</span>
                      <span className="text-xs text-emerald-600 font-semibold ml-2">${rehabBudget ? parseInt(rehabBudget).toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input type="number" value={rehabBudget} onChange={(e) => setRehabBudget(e.target.value)} placeholder="Budget" className="h-6 text-xs w-24" />
                      <Button type="button" size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => {
                        const name = prompt('Item name:'); if (!name) return;
                        const cost = prompt('Cost ($):'); if (!cost) return;
                        const newItems = [...rehabItems, { name, cost: parseInt(cost), description: '' }];
                        setRehabItems(newItems);
                        setRehabBudget(((parseInt(rehabBudget) || 0) + (parseInt(cost) || 0)).toString());
                      }}><Plus className="w-2.5 h-2.5" /></Button>
                    </div>
                  </div>
                  {rehabItems.length > 0 && (
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {rehabItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-1 bg-slate-50 rounded text-[10px] group">
                          <span className="text-slate-800">{item.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">${parseInt(item.cost || 0).toLocaleString()}</span>
                            <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100" onClick={() => {
                              const newItems = rehabItems.filter((_, i) => i !== idx);
                              setRehabItems(newItems);
                              setRehabBudget(Math.max(0, (parseInt(rehabBudget) || 0) - (parseInt(item.cost) || 0)).toString());
                            }}><X className="w-2.5 h-2.5 text-red-500" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Underwriting Information - ORIGINAL (Keep visible) */}
                <UnderwritingCalculator leadId={id!} />

                {/* ========== NEW FEATURES - HIDDEN (Uncomment to enable) ========== */}
                
                {/* Lead Owners Section - NEW */}
                {/* <LeadOwnerSection leadId={id!} readOnly={false} /> */}

                {/* Property Information Card - NEW */}
                {/* <PropertyInfoCard 
                  property={{
                    address: lead?.address?.address1,
                    city: lead?.address?.city,
                    state: lead?.address?.state,
                    zipCode: lead?.address?.zipCode,
                    propertyType: propertyType,
                    sqft: parseInt(sqft) || undefined,
                    bedrooms: parseInt(bedrooms) || undefined,
                    bathrooms: parseFloat(bathrooms) || undefined,
                    yearBuilt: parseInt(yearBuilt) || undefined,
                    lotSize: lotSize ? parseFloat(lotSize) : undefined,
                    estimatedValue: parseInt(estimatedValue) || undefined,
                    purchasePrice: parseInt(askingPrice) || undefined
                  }}
                /> */}

                {/* Rehab Budget Calculator - NEW */}
                {/* <RehabBudgetCalculatorCompact 
                  leadId={id!}
                  sqft={parseInt(sqft) || 0}
                  bathrooms={parseInt(bathrooms) || 1}
                  readOnly={false}
                /> */}

                {/* Underwriting Section - NEW */}
                {/* <UnderwritingSectionCompact 
                  leadId={id!}
                  rehabCost={0}
                  readOnly={false}
                /> */}

                {/* Projections Section - NEW */}
                {/* <ProjectionsSection 
                  leadId={id!}
                  purchasePrice={parseInt(askingPrice) || 0}
                  rehabCost={0}
                  arv={parseInt(estimatedValue) || 0}
                  readOnly={false}
                /> */}

                {/* Comp Information - ORIGINAL (Keep visible) */}
                <CompsManager 
                  leadId={id!} 
                  leadAddress={lead?.address ? {
                    address1: lead.address.address1,
                    city: lead.address.city,
                    state: lead.address.state,
                    zip: lead.address.zip
                  } : undefined}
                />
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">Transaction Details</span>
                    {!editingDeal && <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => setEditingDeal(true)}><Edit2 className="w-2.5 h-2.5 mr-0.5" />{deal ? 'Edit' : 'Create'}</Button>}
                  </div>
                  {editingDeal ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2">
                        <div><Label className="text-[10px] text-slate-500">Contract Price</Label><Input type="number" value={contractPrice} onChange={(e) => setContractPrice(e.target.value)} placeholder="$" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Sold Price</Label><Input type="number" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} placeholder="$" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Net Profit</Label><Input type="number" value={netProfit} onChange={(e) => setNetProfit(e.target.value)} placeholder="$" className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Contracted</Label><Input type="date" value={contractedAt} onChange={(e) => setContractedAt(e.target.value)} className="h-6 text-xs" /></div>
                        <div><Label className="text-[10px] text-slate-500">Closed</Label><Input type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} className="h-6 text-xs" /></div>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={cancelDealEdit}>Cancel</Button>
                        <Button size="sm" className="h-6 text-xs px-2" onClick={saveDeal}><Save className="w-2.5 h-2.5 mr-0.5" />Save
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

              {/* Dispositions Tab */}
              <TabsContent value="dispositions" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">Buyer Offers</span>
                    {!creatingOffer && !creatingBuyer && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => setCreatingBuyer(true)}><User className="w-2.5 h-2.5 mr-0.5" />Buyer</Button>
                        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => setCreatingOffer(true)}><Plus className="w-2.5 h-2.5 mr-0.5" />Offer</Button>
                      </div>
                    )}
                  </div>
                  {creatingBuyer && (
                    <div className="mb-2 p-2 border border-slate-200 rounded bg-slate-50">
                      <div className="grid grid-cols-5 gap-1 mb-1">
                        <Input placeholder="First" value={newBuyerFirstName} onChange={(e) => setNewBuyerFirstName(e.target.value)} className="h-6 text-xs" />
                        <Input placeholder="Last" value={newBuyerLastName} onChange={(e) => setNewBuyerLastName(e.target.value)} className="h-6 text-xs" />
                        <Input type="email" placeholder="Email" value={newBuyerEmail} onChange={(e) => setNewBuyerEmail(e.target.value)} className="h-6 text-xs" />
                        <Input type="tel" placeholder="Phone" value={newBuyerPhone} onChange={(e) => setNewBuyerPhone(e.target.value)} className="h-6 text-xs" />
                        <Select value={newBuyerSegmentation} onValueChange={setNewBuyerSegmentation}>
                          <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Seg" /></SelectTrigger>
                          <SelectContent><SelectItem value="hot">Hot</SelectItem><SelectItem value="warm">Warm</SelectItem><SelectItem value="cold">Cold</SelectItem><SelectItem value="vip">VIP</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="h-5 text-[10px] px-2" onClick={() => { setCreatingBuyer(false); setNewBuyerFirstName(''); setNewBuyerLastName(''); setNewBuyerEmail(''); setNewBuyerPhone(''); setNewBuyerSegmentation(''); }}>Cancel</Button>
                        <Button size="sm" className="h-5 text-[10px] px-2" onClick={createNewBuyer}>Create</Button>
                      </div>
                    </div>
                  )}
                  {creatingOffer && (
                    <div className="mb-2 p-2 border border-slate-200 rounded bg-slate-50">
                      <div className="grid grid-cols-4 gap-1 mb-1">
                        <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                          <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Buyer" /></SelectTrigger>
                          <SelectContent>{buyers.map((buyer) => (<SelectItem key={buyer.id} value={buyer.id}>{buyer.firstName} {buyer.lastName}</SelectItem>))}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Amount" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} className="h-6 text-xs" />
                        <Select value={offerStatus} onValueChange={setOfferStatus}>
                          <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="ACCEPTED">Accepted</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem><SelectItem value="COUNTERED">Countered</SelectItem></SelectContent>
                        </Select>
                        <Input placeholder="Notes" value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} className="h-6 text-xs" />
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="h-5 text-[10px] px-2" onClick={() => { setCreatingOffer(false); setSelectedBuyer(''); setOfferAmount(''); setOfferStatus('PENDING'); setOfferNotes(''); }}>Cancel</Button>
                        <Button size="sm" className="h-5 text-[10px] px-2" onClick={createBuyerOffer}>Create</Button>
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

              {/* Files Tab */}
              <TabsContent value="files" className="mt-2">
                <div className="border border-slate-200 rounded-lg bg-white p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">Files</span>
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" disabled={uploading}>
                      <Upload className="w-2.5 h-2.5 mr-0.5" />
                      <label htmlFor="file-upload" className="cursor-pointer">{uploading ? '...' : 'Upload'}</label>
                      <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </Button>
                  </div>
                  {files.length > 0 ? (
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {files.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-1 border border-slate-100 rounded bg-slate-50 text-[10px]">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{file.file?.name || 'File'}</span>
                            <span className="text-slate-400">{(file.file?.size / 1024).toFixed(0)}KB</span>
                          </div>
                          <div className="flex gap-0.5">
                            {file.file?.path && (<Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => window.open(`${API_BASE}${file.file.path}`, '_blank')}><Download className="w-2.5 h-2.5" /></Button>)}
                            <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={async () => {
                              if (confirm('Delete file?')) {
                                try {
                                  await makeApiCall(`${API_BASE}/files/${file.fileId}`, { method: 'DELETE' });
                                  toast({ title: 'Success', description: 'File deleted' });
                                  loadFiles();
                                } catch (error) {
                                  toast({ title: 'Error', description: 'Failed', variant: 'destructive' });
                                }
                              }
                            }}><Trash className="w-2.5 h-2.5 text-red-500" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<div className="text-center py-2 bg-slate-50 rounded text-[10px] text-slate-500">No files yet</div>)}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side - Communication Section (4 columns) */}
          <div className="col-span-4">
            <div className="sticky top-2 border border-slate-200 rounded-lg bg-white p-2">
              <div className="flex items-center gap-1 mb-2">
                <MessageSquare className="w-3 h-3 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Communications</span>
              </div>
              {/* Tasks */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <CheckSquare className="w-2.5 h-2.5 text-slate-500" />
                    <span className="text-[10px] font-medium text-slate-600">Tasks ({tasks.length})</span>
                  </div>
                  {/* Only show Add Task if can edit lead OR is admin/manager */}
                  {(canEditLead || user?.roles?.includes('ADMIN') || user?.roles?.includes('MANAGER')) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openTaskDialog()}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {loadingTasks ? (
                  <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Loading...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500">
                    No tasks yet
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {tasks.map((task) => {
                      const isOverdue = new Date(task.dueAt) < new Date() && task.status === 'OPEN';
                      const assignedUser = agents.find(a => a.id === task.assignedToId);
                      const isMyTask = task.assignedToId === user?.id;
                      const canToggleTask = hasTaskAccess && (isMyTask || canEditLead);
                      const canEditTask = canEditLead || isMyTask;
                      
                      return (
                        <div
                          key={task.id}
                          className={`p-1.5 rounded text-[10px] border ${
                            task.status === 'DONE'
                              ? 'bg-green-50 border-green-200'
                              : isOverdue
                              ? 'bg-red-50 border-red-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <div className="flex items-start gap-1 flex-1 min-w-0">
                              <button
                                onClick={() => handleToggleTaskStatus(task)}
                                disabled={!canToggleTask}
                                className={`flex-shrink-0 mt-0.5 ${!canToggleTask ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={!canToggleTask ? 'Only task assignee or lead owner can toggle status' : ''}
                              >
                                {task.status === 'DONE' ? (
                                  <CheckSquare className="w-3 h-3 text-green-600 fill-green-600" />
                                ) : (
                                  <CheckSquare className="w-3 h-3 text-slate-400" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium break-words ${
                                  task.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-700'
                                }`}>
                                  {task.title}
                                  {isMyTask && <span className="ml-1 text-[8px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">Your Task</span>}
                                </p>
                                {task.description && (
                                  <p className="text-slate-600 line-clamp-2 mt-0.5">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500">
                                  <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                    <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                                    {new Date(task.dueAt).toLocaleDateString()}
                                  </span>
                                  {assignedUser && (
                                    <span>
                                      <User className="w-2.5 h-2.5 inline mr-0.5" />
                                      {assignedUser.firstName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Show edit/delete only if can edit lead or is task assignee */}
                            {canEditTask && (
                              <div className="flex gap-0.5 flex-shrink-0">
                                <button
                                  onClick={() => openTaskDialog(task)}
                                  className="p-0.5 hover:bg-slate-200 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-2.5 h-2.5 text-slate-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={deletingTaskId === task.id}
                                  className="p-0.5 hover:bg-red-100 rounded"
                                  title="Delete"
                                >
                                  {deletingTaskId === task.id ? (
                                    <Loader2 className="w-2.5 h-2.5 text-red-500 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-2.5 h-2.5 text-red-500" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Timeline */}
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span className="text-[10px] font-medium text-slate-600">Activity</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {notes.length > 0 ? notes.map((note) => (
                    <div key={note.id} className="p-1.5 bg-slate-50 rounded text-[10px]">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-medium text-slate-700">{note.user?.firstName}</span>
                        <span className="text-slate-400">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-slate-600 line-clamp-2">{note.body}</p>
                    </div>
                  )) : (<div className="text-[10px] text-slate-500 text-center py-2">No activity</div>)}
                </div>
              </div>
              {/* Add Note */}
              <div>
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add note..." className="min-h-[50px] text-xs" disabled={addingNote} />
                <Button className="w-full mt-1 h-6 text-xs" size="sm" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
                  <Plus className="w-2.5 h-2.5 mr-0.5" />{addingNote ? '...' : 'Add'}
                </Button>
              </div>
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
              <Input
                id="task-due-date"
                type="datetime-local"
                value={taskForm.dueAt}
                onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })}
                disabled={savingTask}
              />
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleTaskSubmit}
              disabled={savingTask || !taskForm.title || !taskForm.dueAt}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {savingTask ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingTask ? 'Update Task' : 'Create Task'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LeadEdit;

