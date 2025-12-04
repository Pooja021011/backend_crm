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
  Wrench
} from 'lucide-react';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CompsManager } from '@/components/CompsManager';
import { UnderwritingCalculator } from '@/components/UnderwritingCalculator';
import { LeadTimeline } from '@/components/LeadTimeline';

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
  
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('acquisitions');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  
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
  }, [id]);

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
    // This would need a proper API endpoint to save contacts
    // For now, we'll log it
    console.log('Contacts to save:', contacts);
    // TODO: Implement contact save API call when endpoint is available
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
      <div className="space-y-4">
        {/* Header with Back Button and Save */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Top Section - Address and Owner Name */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-5 h-5 text-slate-600" />
                  <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Property Address</Label>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {lead.address?.address1 || 'No Address'}
                </p>
                <p className="text-slate-500">
                  {lead.address?.city && lead.address?.state 
                    ? `${lead.address.city}, ${lead.address.state} ${lead.address.zipCode || ''}`
                    : 'Address not available'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-slate-600" />
                  <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Owner Name</Label>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {lead.seller?.firstName && lead.seller?.lastName
                    ? `${lead.seller.firstName} ${lead.seller.lastName}`
                    : lead.buyer?.firstName && lead.buyer?.lastName
                    ? `${lead.buyer.firstName} ${lead.buyer.lastName}`
                    : lead.vendor?.firstName && lead.vendor?.lastName
                    ? `${lead.vendor.firstName} ${lead.vendor.lastName}`
                    : 'No Owner'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Information Row */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-5 gap-4">
              {/* Lead Source */}
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Lead Source</Label>
                <Select value={leadSource} onValueChange={setLeadSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.length > 0 ? (
                      leadSources.map((source) => (
                        <SelectItem key={source.id} value={source.name}>
                          {source.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="Mailer">Mailer</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead Status */}
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Lead Status</Label>
                <Select value={leadStatus} onValueChange={setLeadStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.length > 0 ? (
                      leadStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Pipeline">Pipeline</SelectItem>
                        <SelectItem value="Follow Up">Follow Up</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Dead">Dead</SelectItem>
                        <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Pipeline Status */}
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Pipeline Status</Label>
                <Select value={pipelineStatus} onValueChange={setPipelineStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Acquisitions Agent */}
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Acquisitions Agent</Label>
                <Select value={acquisitionsAgent || 'unassigned'} onValueChange={(value) => setAcquisitionsAgent(value === 'unassigned' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None</SelectItem>
                    {agents.filter(a => {
                      const roles = Array.isArray(a.roles) ? a.roles : [];
                      return roles.includes('ACQ') || roles.some((r: any) => r.role?.name === 'ACQ' || r.name === 'ACQ');
                    }).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dispositions Agent */}
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Dispositions Agent</Label>
                <Select value={dispositionsAgent || 'unassigned'} onValueChange={(value) => setDispositionsAgent(value === 'unassigned' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None</SelectItem>
                    {agents.filter(a => {
                      const roles = Array.isArray(a.roles) ? a.roles : [];
                      return roles.includes('DISP') || roles.some((r: any) => r.role?.name === 'DISP' || r.name === 'DISP');
                    }).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
                <User className="w-5 h-5 text-slate-600" />
                Owner Contact Information
              </CardTitle>
              <Button size="sm" onClick={addContact}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600 mb-2">Name</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                      Phone
                      {contact.phone && (
                        <a 
                          href={`tel:${contact.phone.replace(/\D/g, '')}`}
                          className="text-emerald-600 hover:text-emerald-700 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          (click to call)
                        </a>
                      )}
                    </Label>
                    <Input
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                      Email
                      {contact.email && (
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-emerald-600 hover:text-emerald-700 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          (click to email)
                        </a>
                      )}
                    </Label>
                    <Input
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      placeholder="Email address"
                      type="email"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(index)}
                  className="mt-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

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

        {/* Valuation Section */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
              <DollarSign className="w-5 h-5 text-slate-600" />
              Property Valuation & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Est. Value (ARV)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="Enter estimated value"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">After Repair Value</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Asking Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    placeholder="Enter asking price"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Seller's asking price</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Appointment Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Scheduled appointment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Information */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
              <Home className="w-5 h-5 text-slate-600" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Family">Single Family</SelectItem>
                    <SelectItem value="Multi Family">Multi Family</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">SqFt</Label>
                <Input
                  type="number"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="Square feet"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Lot Size</Label>
                <Input
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="e.g., 0.25 acres"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Bedrooms</Label>
                <Input
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="Number of bedrooms"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Bathrooms</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="Number of bathrooms"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2">Year Built</Label>
                <Input
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="Year built"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left side - Tabs (8 columns) */}
          <div className="col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="acquisitions">Acquisitions</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              {/* Acquisitions Tab */}
              <TabsContent value="acquisitions" className="space-y-4">
                {/* Lead Creation Section */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-700">Lead Creation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-600 mb-2">Lead Source</Label>
                          <Badge variant="outline" className="text-sm">{leadSource || 'Not specified'}</Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-600 mb-2">Created Date</Label>
                          <p className="text-sm text-slate-700">{lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>

                      {leadSource === 'Cold Call' && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h4 className="font-semibold text-sm text-slate-700">Cold Call Details</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Condition</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.condition || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Motivation</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.motivation || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Timeline</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.timeline || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Asking Price</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.askingPrice ? `$${parseInt(leadSourceData.askingPrice).toLocaleString()}` : 'Not specified'}</p>
                            </div>
                          </div>
                          {leadSourceData.callRecording && (
                            <div>
                              <Label className="text-xs text-slate-600">Call Recording</Label>
                              <a href={leadSourceData.callRecording} className="text-emerald-600 hover:underline text-sm" target="_blank" rel="noopener noreferrer">
                                Listen to recording
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {leadSource === 'SMS' && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h4 className="font-semibold text-sm text-slate-700">SMS Conversation</h4>
                          {leadSourceData.smsMessages && leadSourceData.smsMessages.length > 0 ? (
                            <div className="space-y-2">
                              {leadSourceData.smsMessages.map((msg: any, idx: number) => (
                                <div key={idx} className={`p-2 rounded ${msg.direction === 'inbound' ? 'bg-slate-200 ml-8' : 'bg-white mr-8 border border-slate-200'}`}>
                                  <p className="text-sm text-slate-900">{msg.text}</p>
                                  <span className="text-xs text-slate-500">{new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">No SMS messages available</p>
                          )}
                        </div>
                      )}

                      {leadSource === 'Online' && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h4 className="font-semibold text-sm text-slate-700">Online Form Submission</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Reason for Selling</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.reasonForSelling || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Timeline</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.timeline || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Asking Price</Label>
                              <p className="text-sm text-slate-900">{leadSourceData.askingPrice ? `$${parseInt(leadSourceData.askingPrice).toLocaleString()}` : 'Not specified'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {leadSource === 'Mailer' && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h4 className="font-semibold text-sm text-slate-700">Mailer Campaign</h4>
                          {leadSourceData.mailerImage ? (
                            <div>
                              <img src={leadSourceData.mailerImage} alt="Mailer" className="max-w-full h-auto rounded border border-slate-200" />
                              <p className="text-sm text-slate-600 mt-2">Offer Price: {leadSourceData.offerPrice ? `$${parseInt(leadSourceData.offerPrice).toLocaleString()}` : 'N/A'}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">No mailer image available</p>
                          )}
                        </div>
                      )}

                      {leadSource === 'Other' && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h4 className="font-semibold text-sm text-slate-700">Lead Origin</h4>
                          <p className="text-sm text-slate-900">{leadSourceData.description || 'No description provided'}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Property Information */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-700">Additional Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">Roof Type</Label>
                        <Input
                          value={roofType}
                          onChange={(e) => setRoofType(e.target.value)}
                          placeholder="e.g., Asphalt Shingles"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">Roof Age (years)</Label>
                        <Input
                          type="number"
                          value={roofAge}
                          onChange={(e) => setRoofAge(e.target.value)}
                          placeholder="Age in years"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">HVAC Type</Label>
                        <Input
                          value={hvacType}
                          onChange={(e) => setHvacType(e.target.value)}
                          placeholder="e.g., Central Air"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">HVAC Age (years)</Label>
                        <Input
                          type="number"
                          value={hvacAge}
                          onChange={(e) => setHvacAge(e.target.value)}
                          placeholder="Age in years"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">Water Heater Age (years)</Label>
                        <Input
                          type="number"
                          value={waterHeaterAge}
                          onChange={(e) => setWaterHeaterAge(e.target.value)}
                          placeholder="Age in years"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">Water Type</Label>
                        <Input
                          value={waterType}
                          onChange={(e) => setWaterType(e.target.value)}
                          placeholder="e.g., City Water"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">Sewer Type</Label>
                        <Input
                          value={sewerType}
                          onChange={(e) => setSewerType(e.target.value)}
                          placeholder="e.g., Public Sewer"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rehab Information */}
                <Card className="border border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
                        <Wrench className="w-5 h-5 text-slate-600" />
                        Rehab Information
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-semibold text-slate-700">
                          Total Budget: ${rehabBudget ? parseInt(rehabBudget).toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600 mb-2">Total Rehab Budget</Label>
                        <Input
                          type="number"
                          value={rehabBudget}
                          onChange={(e) => setRehabBudget(e.target.value)}
                          placeholder="Enter total budget"
                          className="max-w-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-slate-700">Rehab Items</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const name = prompt('Item name (e.g., Roof Repair):');
                              if (!name) return;
                              const cost = prompt('Cost ($):');
                              if (!cost) return;
                              const description = prompt('Description (optional):') || '';
                              
                              const newItems = [...rehabItems, { name, cost: parseInt(cost), description }];
                              setRehabItems(newItems);
                              // Add item cost to existing budget
                              const currentBudget = parseInt(rehabBudget) || 0;
                              const itemCost = parseInt(cost) || 0;
                              setRehabBudget((currentBudget + itemCost).toString());
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Item
                          </Button>
                        </div>

                        {rehabItems.length > 0 ? (
                          <div className="space-y-2">
                            {rehabItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                  {item.description && <p className="text-xs text-slate-600">{item.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">${parseInt(item.cost || 0).toLocaleString()}</p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      const deletedItemCost = parseInt(item.cost) || 0;
                                      const newItems = rehabItems.filter((_, i) => i !== idx);
                                      setRehabItems(newItems);
                                      // Subtract deleted item cost from budget
                                      const currentBudget = parseInt(rehabBudget) || 0;
                                      const newBudget = Math.max(0, currentBudget - deletedItemCost);
                                      setRehabBudget(newBudget.toString());
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-emerald-900">Total Items Cost:</p>
                                <p className="text-lg font-bold text-emerald-900">
                                  ${rehabItems.reduce((sum, item) => sum + (parseInt(item.cost) || 0), 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100">
                            <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm text-slate-600">No rehab items added yet</p>
                            <p className="text-xs text-slate-500 mt-1">Click "Add Item" to track renovation costs</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comp Information */}
                <CompsManager 
                  leadId={id!} 
                  leadAddress={lead?.address ? {
                    address1: lead.address.address1,
                    city: lead.address.city,
                    state: lead.address.state,
                    zip: lead.address.zip
                  } : undefined}
                />

                {/* Underwriting Information */}
                <UnderwritingCalculator leadId={id!} />
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions">
                <Card className="border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-700">Transaction Details</CardTitle>
                    {!editingDeal && (
                      <Button
                        size="sm"
                        onClick={() => setEditingDeal(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {deal ? 'Edit Transaction' : 'Create Transaction'}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingDeal ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Contract Price</Label>
                            <Input
                              type="number"
                              placeholder="Enter contract price"
                              value={contractPrice}
                              onChange={(e) => setContractPrice(e.target.value)}
                              min="0"
                              step="1000"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Sold Price</Label>
                            <Input
                              type="number"
                              placeholder="Enter sold price"
                              value={soldPrice}
                              onChange={(e) => setSoldPrice(e.target.value)}
                              min="0"
                              step="1000"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Net Profit</Label>
                            <Input
                              type="number"
                              placeholder="Enter net profit"
                              value={netProfit}
                              onChange={(e) => setNetProfit(e.target.value)}
                              step="1000"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Contracted Date</Label>
                            <Input
                              type="date"
                              value={contractedAt}
                              onChange={(e) => setContractedAt(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Closed Date</Label>
                            <Input
                              type="date"
                              value={closedAt}
                              onChange={(e) => setClosedAt(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-2 justify-end pt-4">
                          <Button
                            variant="outline"
                            onClick={cancelDealEdit}
                          >
                            Cancel
                          </Button>
                          <Button onClick={saveDeal}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Transaction
                          </Button>
                        </div>
                      </div>
                    ) : deal ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-slate-600">Contract Price</Label>
                            <p className="font-medium text-slate-900">${(deal.contractPrice || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-600">Sold Price</Label>
                            <p className="font-medium text-slate-900">${(deal.soldPrice || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-600">Net Profit</Label>
                            <p className={`font-medium ${(deal.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              ${(deal.netProfit || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-600">Contracted Date</Label>
                            <p className="font-medium text-slate-900">
                              {deal.contractedAt ? new Date(deal.contractedAt).toLocaleDateString() : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-slate-600">Closed Date</Label>
                            <p className="font-medium text-slate-900">
                              {deal.closedAt ? new Date(deal.closedAt).toLocaleDateString() : 'Not set'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-100">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-sm text-slate-600 font-medium">No transaction created yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Create Transaction" to add deal details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dispositions Tab */}
              <TabsContent value="dispositions">
                <Card className="border border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-700">Buyer Offers</CardTitle>
                    <div className="flex gap-2">
                      {!creatingOffer && !creatingBuyer && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCreatingBuyer(true)}
                          >
                            <User className="w-4 h-4 mr-2" />
                            New Buyer
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setCreatingOffer(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Offer
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {creatingBuyer && (
                      <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <h4 className="font-semibold mb-4 text-slate-700">Create New Buyer</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-600">First Name *</Label>
                              <Input
                                placeholder="John"
                                value={newBuyerFirstName}
                                onChange={(e) => setNewBuyerFirstName(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-slate-600">Last Name *</Label>
                              <Input
                                placeholder="Doe"
                                value={newBuyerLastName}
                                onChange={(e) => setNewBuyerLastName(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-600">Email *</Label>
                              <Input
                                type="email"
                                placeholder="john@example.com"
                                value={newBuyerEmail}
                                onChange={(e) => setNewBuyerEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-slate-600">Phone *</Label>
                              <Input
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={newBuyerPhone}
                                onChange={(e) => setNewBuyerPhone(e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Segmentation</Label>
                            <Select value={newBuyerSegmentation} onValueChange={setNewBuyerSegmentation}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select segmentation (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hot">Hot</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="vip">VIP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCreatingBuyer(false);
                                setNewBuyerFirstName('');
                                setNewBuyerLastName('');
                                setNewBuyerEmail('');
                                setNewBuyerPhone('');
                                setNewBuyerSegmentation('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={createNewBuyer}>
                              <Save className="w-4 h-4 mr-2" />
                              Create Buyer
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {creatingOffer && (
                      <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <h4 className="font-semibold mb-4 text-slate-700">Create New Offer</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-slate-600">Buyer</Label>
                              <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select buyer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {buyers.map((buyer) => (
                                    <SelectItem key={buyer.id} value={buyer.id}>
                                      {buyer.firstName} {buyer.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-slate-600">Offer Amount</Label>
                              <Input
                                type="number"
                                placeholder="Enter offer amount"
                                value={offerAmount}
                                onChange={(e) => setOfferAmount(e.target.value)}
                                min="0"
                                step="1000"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-slate-600">Status</Label>
                              <Select value={offerStatus} onValueChange={setOfferStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                  <SelectItem value="REJECTED">Rejected</SelectItem>
                                  <SelectItem value="COUNTERED">Countered</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Notes</Label>
                            <Textarea
                              placeholder="Add any notes about this offer..."
                              value={offerNotes}
                              onChange={(e) => setOfferNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCreatingOffer(false);
                                setSelectedBuyer('');
                                setOfferAmount('');
                                setOfferStatus('PENDING');
                                setOfferNotes('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={createBuyerOffer}>
                              <Save className="w-4 h-4 mr-2" />
                              Create Offer
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {buyerOffers.length > 0 ? (
                      <div className="space-y-4">
                        {buyerOffers.map((offer: any) => (
                          <div key={offer.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-900">{offer.buyer?.firstName} {offer.buyer?.lastName}</h4>
                                <p className="text-xs text-slate-600">{offer.buyer?.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  offer.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                                  offer.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                  offer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                  'bg-slate-100 text-slate-800'
                                }>
                                  {offer.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                              <div>
                                <Label className="text-xs text-slate-600">Offer Amount</Label>
                                <p className="font-medium text-lg text-slate-900">${(offer.offerAmount || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Created</Label>
                                <p className="font-medium text-slate-900">{new Date(offer.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Updated</Label>
                                <p className="font-medium text-slate-900">{new Date(offer.updatedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {offer.notes && (
                              <p className="text-xs text-slate-600 mb-3 p-2 bg-slate-50 rounded border border-slate-100">{offer.notes}</p>
                            )}
                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                              {offer.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-emerald-600 hover:text-emerald-700"
                                    onClick={() => updateOfferStatus(offer.id, 'ACCEPTED')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => updateOfferStatus(offer.id, 'REJECTED')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deleteOffer(offer.id)}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-100">
                        <User className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-sm text-slate-600 font-medium">No buyer offers yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Add Offer" to create a buyer offer</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files">
                <Card className="border border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-700">Documents & Files</CardTitle>
                      <Button size="sm" disabled={uploading}>
                        <Upload className="w-4 h-4 mr-2" />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          {uploading ? 'Uploading...' : 'Upload File'}
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((file: any) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="w-5 h-5 text-slate-600" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{file.file?.name || 'Unnamed file'}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span>{(file.file?.size / 1024).toFixed(2)} KB</span>
                                  <span>•</span>
                                  <span>{file.file?.uploadedAt ? new Date(file.file.uploadedAt).toLocaleDateString() : 'Unknown date'}</span>
                                  {file.file?.uploadedBy && (
                                    <>
                                      <span>•</span>
                                      <span>by {file.file.uploadedBy.firstName} {file.file.uploadedBy.lastName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {file.file?.path && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(`${API_BASE}${file.file.path}`, '_blank')}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this file?')) {
                                    try {
                                      await makeApiCall(`${API_BASE}/files/${file.fileId}`, { method: 'DELETE' });
                                      toast({ title: 'Success', description: 'File deleted successfully' });
                                      loadFiles();
                                    } catch (error) {
                                      toast({ title: 'Error', description: 'Failed to delete file', variant: 'destructive' });
                                    }
                                  }
                                }}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-100">
                        <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-sm text-slate-600 font-medium">No files uploaded yet</p>
                        <p className="text-xs text-slate-500 mt-1">Upload documents related to this lead</p>
                        <Button size="sm" className="mt-4" disabled={uploading}>
                          <label htmlFor="file-upload-empty" className="cursor-pointer flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload Your First File'}
                          </label>
                          <input
                            id="file-upload-empty"
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side - Communication Section (4 columns) */}
          <div className="col-span-4">
            <Card className="sticky top-4 border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
                  <MessageSquare className="w-5 h-5 text-slate-600" />
                  Communications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tasks Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-slate-600" />
                    <h4 className="font-semibold text-sm text-slate-700">Upcoming Tasks</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-600">No upcoming tasks</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Communication Timeline */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <h4 className="font-semibold text-sm text-slate-700">Activity Timeline</h4>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {notes.length > 0 ? (
                      notes.map((note) => (
                        <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-600" />
                              <span className="text-xs font-semibold text-slate-700">
                                {note.user?.firstName} {note.user?.lastName}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500" title={new Date(note.createdAt).toLocaleString()}>
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-600 text-center py-8">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        No communications yet
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Add Note */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2">Add Note</Label>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write a note..."
                    className="min-h-[100px]"
                    disabled={addingNote}
                  />
                  <Button 
                    className="w-full mt-2" 
                    size="sm"
                    onClick={handleAddNote}
                    disabled={addingNote || !noteText.trim()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeadEdit;

