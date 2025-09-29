import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Filter, 
  ArrowUpDown, 
  ChevronDown,
  MoreHorizontal,
  Users,
  Building,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Star,
  Archive,
  Download,
  Upload,
  Loader2,
  FileText,
  SortAsc,
  SortDesc
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLeads, type LeadType } from "@/hooks/useLeads";
import { ViewLeadDialog } from "@/components/ViewLeadDialog";
import { useAuth } from "@/contexts/AuthContext";
import { SortableTableHeader, useSortable } from "@/components/SortableTableHeader";
import { ImportCSVDialog } from "@/components/ImportCSVDialog";
import { LeadActions } from "@/components/LeadActions";
import { generateCSVTemplate } from "@/utils/csvUtils";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";

const Leads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    leads, 
    isLoading, 
    error, 
    fetchLeads, 
    deleteLead, 
    getLeadsByType, 
    searchLeads,
    filterLeads,
    importLeadsFromCSV,
    exportLeadsToCSV,
    sortLeads
  } = useLeads();
  
  // Set default tab based on user role
  const getDefaultTab = (): LeadType => {
    const userRoles = user?.roles?.map((r: any) => r.role?.name || r.name) || [];
    const isACQ = userRoles.includes('ACQ');
    const isDisp = userRoles.includes('DISP');
    const isAdmin = userRoles.includes('ADMIN');
    const isExecutive = userRoles.includes('EXECUTIVE');
    const isManager = userRoles.includes('MANAGER');
    const isTC = userRoles.includes('TC');

    // ACQ agents see seller leads only
    if (isACQ && !isAdmin && !isExecutive && !isManager && !isTC) {
      return "SELLER";
    }
    // DISP agents see buyer leads only
    if (isDisp && !isAdmin && !isExecutive && !isManager && !isTC) {
      return "BUYER";
    }
    // Default to SELLER for other roles
    return "SELLER";
  };

  const [activeTab, setActiveTab] = useState<LeadType>(getDefaultTab());
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPipelineStatus, setSelectedPipelineStatus] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("");
  
  // Dynamic filter data
  const [markets, setMarkets] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  // URL parameter handling for direct lead access
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  
  // Role-based access control
  const userRoles = user?.roles || [];
  const isACQ = userRoles.includes('ACQ');
  const isDisp = userRoles.includes('DISP');
  const isTC = userRoles.includes('TC');
  const isAdmin = userRoles.includes('ADMIN');
  const isManager = userRoles.includes('MANAGER');
  const isExecutive = userRoles.includes('EXECUTIVE');

  // Role-based lead type access
  const canViewSellerLeads = isAdmin || isExecutive || isManager || isACQ || isTC;
  const canViewBuyerLeads = isAdmin || isExecutive || isManager || isDisp || isTC;
  const canViewVendorLeads = isAdmin || isExecutive || isManager;
  
  // Sorting functionality
  const { sortConfig, handleSort, resetSort } = useSortable({ key: 'updatedAt', direction: 'desc' });

  // Load all leads and filter data on component mount
  useEffect(() => {
    fetchLeads(); // Fetch all leads without type filter
    loadFilterData(); // Load dynamic filter options
  }, []);

  // Handle leadId parameter from URL to show specific lead
  useEffect(() => {
    const leadIdParam = searchParams.get('leadId');
    console.log('🌐 URL leadId parameter:', leadIdParam);
    console.log('📊 Available leads:', leads.length);
    
    if (leadIdParam && leads.length > 0) {
      console.log('🔍 Looking for lead with ID:', leadIdParam);
      console.log('📋 All lead IDs:', leads.map(l => l.id));
      
      // Find lead by ID (much simpler and more reliable)
      const matchingLead = leads.find(lead => lead.id === leadIdParam);
      console.log(`🔎 Comparing "${leadIdParam}" with lead IDs`);
      console.log(`🎯 Match found:`, !!matchingLead);
      
      if (matchingLead) {
        console.log('✅ Found matching lead:', matchingLead);
        setSelectedLead(matchingLead);
        setShowLeadDetail(true);
        
        // Set the appropriate tab based on lead type
        setActiveTab(matchingLead.leadType);
        
        // Remove the leadId parameter from URL after opening
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('leadId');
          return newParams;
        });
      } else {
        console.log('❌ No matching lead found for ID:', leadIdParam);
      }
    }
  }, [searchParams, leads, setSearchParams]);

  // Load dynamic filter data
  const loadFilterData = async () => {
    setLoadingFilters(true);
    try {
      // Fetch markets
      const marketsResponse = await fetch(`${API_BASE}/settings/markets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (marketsResponse.ok) {
        const marketsData = await marketsResponse.json();
        setMarkets(marketsData.data || []);
      }

      // Fetch all pipeline stages (from all pipelines)
      const allStages: any[] = [];
      const pipelineKeys = ['ACQUISITIONS', 'DISPOSITIONS', 'TRANSACTION'];
      
      for (const pipelineKey of pipelineKeys) {
        try {
          const stagesResponse = await fetch(`${API_BASE}/pipeline/${pipelineKey}/stages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          });
          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            if (stagesData.data) {
              allStages.push(...stagesData.data.map((stage: any) => ({
                ...stage,
                pipelineKey
              })));
            }
          }
        } catch (error) {
          console.error(`Error fetching ${pipelineKey} stages:`, error);
        }
      }
      
      setPipelineStages(allStages);

      // Get unique lead statuses from current leads
      const uniqueStatuses = [...new Set(leads.map(lead => lead.status).filter(Boolean))];
      setLeadStatuses(uniqueStatuses);
      
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Clear selected items and filters when switching tabs
  useEffect(() => {
    setSelectedItems([]);
    setSelectedMarket("");
    setSelectedStatus("");
    setSelectedPipelineStatus("");
    setSelectedDateRange("");
  }, [activeTab]);


  // Get filtered and sorted leads based on search and active tab
  const getCurrentLeads = useMemo(() => {
    let filteredLeads = getLeadsByType(activeTab);
    
    // Apply search filter
    if (searchQuery) {
      filteredLeads = searchLeads(searchQuery).filter(lead => lead.leadType === activeTab);
    }
    
    // Apply additional filters
    if (selectedMarket) {
      filteredLeads = filteredLeads.filter(lead => {
        return lead.marketId === selectedMarket;
      });
    }
    
    if (selectedStatus) {
      filteredLeads = filteredLeads.filter(lead => {
        return lead.status === selectedStatus;
      });
    }
    
    if (selectedPipelineStatus) {
      filteredLeads = filteredLeads.filter(lead => {
        return lead.pipelineStageId === selectedPipelineStatus;
      });
    }
    
    if (selectedDateRange) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedDateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) >= filterDate);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) >= filterDate);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear(), 0, 1);
          filteredLeads = filteredLeads.filter(lead => new Date(lead.createdAt) >= filterDate);
          break;
      }
    }
    
    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      filteredLeads = sortLeads(filteredLeads, sortConfig.key, sortConfig.direction);
    }
    
    return filteredLeads;
  }, [getLeadsByType, activeTab, searchQuery, searchLeads, selectedMarket, selectedStatus, selectedPipelineStatus, selectedDateRange, sortConfig, sortLeads]);

  const getLeadCount = (type: "SELLER" | "BUYER" | "VENDOR") => {
    return getLeadsByType(type).length;
  };

  // Backup sample data (in case API is not available)
  const sampleSellerLeads = [
    {
      id: "1",
      address: "123 Oak Street, Charlotte, NC",
      market: "Charlotte Metro",
      firstName: "Sarah",
      lastName: "Johnson",
      status: "Interested",
      pipelineStatus: "Contact Made",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      dateCreated: "2024-01-15",
      lastContact: "2024-01-20",
      leadSource: "Website",
      assignedAgent: "John Smith",
      propertyValue: "$350,000",
      motivation: "High",
      timeline: "3-6 months"
    },
    {
      id: "2", 
      address: "456 Maple Avenue, Raleigh, NC",
      market: "Raleigh-Durham",
      firstName: "Robert",
      lastName: "Thompson",
      status: "Customer",
      pipelineStatus: "Under Contract",
      phone: "(555) 987-6543",
      email: "r.thompson@email.com",
      dateCreated: "2024-01-10",
      lastContact: "2024-01-25",
      leadSource: "Referral",
      assignedAgent: "Jane Doe",
      propertyValue: "$475,000",
      motivation: "Very High",
      timeline: "ASAP"
    },
    {
      id: "3",
      address: "789 Pine Boulevard, Winston-Salem, NC", 
      market: "Triad",
      firstName: "Emily",
      lastName: "Davis",
      status: "Interested",
      pipelineStatus: "New Lead",
      phone: "(555) 456-7890",
      email: "emily.davis@email.com",
      dateCreated: "2024-01-18",
      lastContact: "2024-01-18",
      leadSource: "Social Media",
      assignedAgent: "Mike Wilson",
      propertyValue: "$285,000",
      motivation: "Medium",
      timeline: "6-12 months"
    },
    {
      id: "4",
      address: "321 Elm Court, Greensboro, NC",
      market: "Triad", 
      firstName: "Michael",
      lastName: "Johnson",
      status: "Qualified",
      pipelineStatus: "Appointment Set",
      phone: "(555) 321-0987",
      email: "m.johnson@email.com",
      dateCreated: "2024-01-12",
      lastContact: "2024-01-22",
      leadSource: "Direct Mail",
      assignedAgent: "Sarah Lee",
      propertyValue: "$425,000",
      motivation: "High",
      timeline: "1-3 months"
    },
    {
      id: "5",
      address: "567 Cedar Drive, Fayetteville, NC",
      market: "Fayetteville",
      firstName: "Lisa",
      lastName: "Rodriguez", 
      status: "Customer",
      pipelineStatus: "Processing",
      phone: "(555) 654-3210",
      email: "lisa.rodriguez@email.com",
      dateCreated: "2024-01-05",
      lastContact: "2024-01-23",
      leadSource: "Cold Call",
      assignedAgent: "Tom Anderson",
      propertyValue: "$395,000",
      motivation: "Very High",
      timeline: "ASAP"
    }
  ];

  const buyerLeads = [
    {
      id: "b1",
      firstName: "Jennifer",
      lastName: "Martinez",
      market: "Charlotte Metro",
      priceRange: "$450K - $650K",
      assetClass: "Single Family",
      propertiesPurchased: 0,
      phone: "(555) 111-2222",
      email: "j.martinez@email.com",
      dateCreated: "2024-01-16",
      lastContact: "2024-01-20",
      leadSource: "Website",
      assignedAgent: "Chris Harris",
      motivation: "High",
      timeline: "3-6 months",
      creditScore: "Excellent",
      preApproved: true
    },
    {
      id: "b2",
      firstName: "David", 
      lastName: "Chen",
      market: "Raleigh-Durham",
      priceRange: "$300K - $500K",
      assetClass: "Condo",
      propertiesPurchased: 2,
      phone: "(555) 333-4444",
      email: "david.chen@email.com",
      dateCreated: "2024-01-14",
      lastContact: "2024-01-24",
      leadSource: "Referral",
      assignedAgent: "John Smith",
      motivation: "Very High",
      timeline: "1-3 months",
      creditScore: "Good",
      preApproved: true
    },
    {
      id: "b3",
      firstName: "Amanda",
      lastName: "Wilson",
      market: "Asheville",
      priceRange: "$200K - $400K", 
      assetClass: "Townhouse",
      propertiesPurchased: 1,
      phone: "(555) 555-6666",
      email: "amanda.wilson@email.com",
      dateCreated: "2024-01-19",
      lastContact: "2024-01-21",
      leadSource: "Social Media",
      assignedAgent: "Jane Doe",
      motivation: "Medium",
      timeline: "6-12 months",
      creditScore: "Fair",
      preApproved: false
    },
    {
      id: "b4",
      firstName: "Carlos",
      lastName: "Rodriguez",
      market: "Charlotte Metro",
      priceRange: "$500K - $800K",
      assetClass: "Single Family",
      propertiesPurchased: 3,
      phone: "(555) 777-8888", 
      email: "carlos.rodriguez@email.com",
      dateCreated: "2024-01-08",
      lastContact: "2024-01-25",
      leadSource: "Networking",
      assignedAgent: "Mike Wilson",
      motivation: "Very High",
      timeline: "ASAP",
      creditScore: "Excellent",
      preApproved: true
    }
  ];

  const vendorLeads = [
    {
      id: "v1",
      firstName: "Wayne",
      lastName: "Enterprises",
      company: "Wayne Enterprises",
      industry: "Construction",
      phone: "(555) 100-0001",
      email: "contact@wayneenterprises.com",
      dateCreated: "2024-01-10",
      lastContact: "2024-01-22",
      leadSource: "Referral",
      assignedAgent: "Chris Harris",
      serviceArea: "Charlotte Metro",
      rating: 5,
      verified: true
    },
    {
      id: "v2",
      firstName: "Bruce",
      lastName: "Company", 
      company: "Bush Company",
      industry: "Legal Services",
      phone: "(555) 200-0002",
      email: "info@bushcompany.com",
      dateCreated: "2024-01-12",
      lastContact: "2024-01-24",
      leadSource: "Website",
      assignedAgent: "John Smith",
      serviceArea: "Statewide",
      rating: 4,
      verified: true
    },
    {
      id: "v3",
      firstName: "Dundee",
      lastName: "Mifflin",
      company: "Dundee Mifflin",
      industry: "Paper Supply",
      phone: "(555) 300-0003",
      email: "sales@dundeemifflin.com",
      dateCreated: "2024-01-14",
      lastContact: "2024-01-20",
      leadSource: "Cold Call",
      assignedAgent: "Jane Doe",
      serviceArea: "Triad",
      rating: 3,
      verified: false
    },
    {
      id: "v4",
      firstName: "Schrute",
      lastName: "Farms",
      company: "Schrute Farms", 
      industry: "Agriculture",
      phone: "(555) 400-0004",
      email: "dwight@schrutefarms.com",
      dateCreated: "2024-01-16",
      lastContact: "2024-01-25",
      leadSource: "Networking",
      assignedAgent: "Sarah Lee",
      serviceArea: "Rural Areas",
      rating: 5,
      verified: true
    }
  ];

  const getFilteredLeads = () => {
    return getCurrentLeads();
  };

  const getFilteredLeadsForTab = (type: LeadType) => {
    if (type === activeTab) {
      return currentLeads;
    }
    let filteredLeads = getLeadsByType(type);
    
    // Apply search filter
    if (searchQuery) {
      filteredLeads = searchLeads(searchQuery).filter(lead => lead.leadType === type);
    }
    
    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      filteredLeads = sortLeads(filteredLeads, sortConfig.key, sortConfig.direction);
    }
    
    return filteredLeads;
  };

  // CSV Import/Export handlers
  const handleImportCSV = async (file: File, leadType: LeadType) => {
    try {
      const result = await importLeadsFromCSV(file, leadType);
      
      if (result.success > 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.success} leads.`,
        });
      }
      
      if (result.errors.length > 0) {
        toast({
          title: "Import Warnings",
          description: `${result.errors.length} errors occurred during import.`,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const handleExportCSV = () => {
    const currentLeads = getCurrentLeads;
    if (currentLeads.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no leads to export for the current tab.",
        variant: "destructive",
      });
      return;
    }
    
    exportLeadsToCSV(currentLeads, activeTab);
    toast({
      title: "Export Successful",
      description: `Exported ${currentLeads.length} ${activeTab.toLowerCase()} leads.`,
    });
  };
  
  const handleDownloadTemplate = () => {
    generateCSVTemplate(activeTab);
    toast({
      title: "Template Downloaded",
      description: `CSV template for ${activeTab.toLowerCase()} leads downloaded.`,
    });
  };

  const handleSelectAll = () => {
    const currentLeads = getCurrentLeads;
    if (selectedItems.length === currentLeads.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentLeads.map(lead => lead.id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (action === 'delete' && selectedItems.length > 0) {
      // Delete selected leads
      for (const leadId of selectedItems) {
        await deleteLead(leadId);
      }
      setSelectedItems([]);
    } else if (action === 'archive') {
      // TODO: Implement archive functionality
      console.log(`Archiving leads:`, selectedItems);
      setSelectedItems([]);
    }
  };

  const currentLeads = getCurrentLeads;
  const allSelected = selectedItems.length === currentLeads.length && currentLeads.length > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < currentLeads.length;

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'interested': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'customer': return 'bg-green-100 text-green-700 border-green-200';
      case 'qualified': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPipelineStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new lead': return 'bg-blue-100 text-blue-700';
      case 'contact made': return 'bg-orange-100 text-orange-700';
      case 'appointment set': return 'bg-purple-100 text-purple-700';
      case 'under contract': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMotivationColor = (motivation: string) => {
    switch (motivation?.toLowerCase()) {
      case 'very high': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Lead Management</h1>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              <div className="text-sm text-gray-600">Chris Harris</div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>


        {/* Collapsible Filters */}
        {showFilters && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Name, phone, email, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              {/* Market Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Market</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="">All Markets</option>
                  {markets.map(market => (
                    <option key={market.id} value={market.id}>
                      {market.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Lead Status</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="">All Statuses</option>
                  {leadStatuses.map(status => (
                    <option key={status} value={status}>
                      {status?.replace('_', ' ') || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pipeline Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pipeline Status</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedPipelineStatus}
                  onChange={(e) => setSelectedPipelineStatus(e.target.value)}
                  disabled={loadingFilters}
                >
                  <option value="">All Stages</option>
                  {pipelineStages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                >
                  <option value="">All Time</option>
                  <option value="today">Today ({new Date().toLocaleDateString()})</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year ({new Date().getFullYear()})</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {currentLeads.length} leads found
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Clear all filters
                    setSearchQuery("");
                    setSelectedMarket("");
                    setSelectedStatus("");
                    setSelectedPipelineStatus("");
                    setSelectedDateRange("");
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

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-12 bg-transparent border-0 p-0 space-x-6">
              {canViewSellerLeads && (
                <TabsTrigger 
                  value="SELLER" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>Seller Leads</span>
                    <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {getLeadCount("SELLER")}
                    </Badge>
                  </div>
                </TabsTrigger>
              )}
              
              {canViewBuyerLeads && (
                <TabsTrigger 
                  value="BUYER" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Buyer Leads</span>
                    <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {getLeadCount("BUYER")}
                    </Badge>
                  </div>
                </TabsTrigger>
              )}
              
              {canViewVendorLeads && (
                <TabsTrigger 
                  value="VENDOR" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Vendor Leads</span>
                    <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {getLeadCount("VENDOR")}
                    </Badge>
                  </div>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Toolbar */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={allSelected}
                    ref={(el) => {
                      if (el && el instanceof HTMLInputElement) el.indeterminate = someSelected;
                    }}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-300"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAll}
                    className="text-sm text-gray-600 hover:text-gray-900 px-2"
                  >
                    Select all
                  </Button>
                </div>
                
                {selectedItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleBulkAction('archive')}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      Archive ({selectedItems.length})
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleBulkAction('delete')}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedItems.length})
                    </Button>
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading leads...
                    </div>
                  ) : (
                    <>
                      {currentLeads.length} leads
                      {searchQuery && ` matching "${searchQuery}"`}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Import Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Import
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      Export All ({getCurrentLeads.length})
                    </DropdownMenuItem>
                    {selectedItems.length > 0 && (
                      <DropdownMenuItem onClick={() => {
                        const selectedLeads = getCurrentLeads.filter(lead => selectedItems.includes(lead.id));
                        exportLeadsToCSV(selectedLeads, activeTab);
                        toast({
                          title: "Export Successful",
                          description: `Exported ${selectedLeads.length} selected leads.`,
                        });
                      }}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Selected ({selectedItems.length})
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {sortConfig.key ? (
                        sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                      Sort
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleSort('name')}>
                      Sort by Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('email')}>
                      Sort by Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('createdAt')}>
                      Sort by Created Date
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('updatedAt')}>
                      Sort by Last Contact
                    </DropdownMenuItem>
                    {activeTab === 'SELLER' && (
                      <DropdownMenuItem onClick={() => handleSort('motivation')}>
                        Sort by Motivation
                      </DropdownMenuItem>
                    )}
                    {activeTab === 'BUYER' && (
                      <>
                        <DropdownMenuItem onClick={() => handleSort('priceRange')}>
                          Sort by Price Range
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('motivation')}>
                          Sort by Motivation
                        </DropdownMenuItem>
                      </>
                    )}
                    {activeTab === 'VENDOR' && (
                      <>
                        <DropdownMenuItem onClick={() => handleSort('company')}>
                          Sort by Company
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('rating')}>
                          Sort by Rating
                        </DropdownMenuItem>
                      </>
                    )}
                    {sortConfig.key && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={resetSort}>
                          Clear Sort
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Filter Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" />
                  {showFilters ? 'Hide' : 'Filter'}
                </Button>
                
                {/* Add Lead Dialog */}
                <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Add Lead
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Lead</DialogTitle>
                      <DialogDescription>
                        Choose the type of lead you want to add.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Button 
                        className="justify-start gap-3 h-12"
                        onClick={() => {
                          setIsAddLeadOpen(false);
                          navigate('/leads/add-seller');
                        }}
                      >
                        <Building className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-medium">Seller Lead</div>
                          <div className="text-xs opacity-80">Property owner looking to sell</div>
                        </div>
                      </Button>
                      <Button 
                        className="justify-start gap-3 h-12"
                        onClick={() => {
                          setIsAddLeadOpen(false);
                          navigate('/leads/add-buyer');
                        }}
                      >
                        <Users className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-medium">Buyer Lead</div>
                          <div className="text-xs opacity-80">Investor looking to purchase</div>
                        </div>
                      </Button>
                      <Button 
                        className="justify-start gap-3 h-12"
                        onClick={() => {
                          setIsAddLeadOpen(false);
                          navigate('/leads/add-vendor');
                        }}
                      >
                        <UserCheck className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-medium">Vendor Lead</div>
                          <div className="text-xs opacity-80">Service provider or contractor</div>
                        </div>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Seller Leads Table */}
            <TabsContent value="SELLER" className="mt-0">
              <div className="bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="w-12 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <Checkbox 
                          checked={currentLeads.length > 0 && selectedItems.length === currentLeads.length}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = selectedItems.length > 0 && selectedItems.length < currentLeads.length;
                          }}
                          onCheckedChange={() => {
                            if (selectedItems.length === currentLeads.length) {
                              setSelectedItems([]);
                            } else {
                              setSelectedItems(currentLeads.map(lead => lead.id));
                            }
                          }}
                        />
                      </TableHead>
                      <SortableTableHeader sortKey="address" sortConfig={sortConfig} onSort={handleSort} className="min-w-[250px]">
                        Property Address
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="name" sortConfig={sortConfig} onSort={handleSort} className="min-w-[180px]">
                        Lead Name
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="email" sortConfig={sortConfig} onSort={handleSort} className="min-w-[200px]">
                        Contact Info
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="market" sortConfig={sortConfig} onSort={handleSort} className="min-w-[120px]">
                        Market
                      </SortableTableHeader>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Property Value</TableHead>
                      <SortableTableHeader sortKey="motivation" sortConfig={sortConfig} onSort={handleSort} className="min-w-[100px]">
                        Motivation
                      </SortableTableHeader>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Timeline</TableHead>
                      <SortableTableHeader sortKey="status" sortConfig={sortConfig} onSort={handleSort} className="min-w-[120px]">
                        Lead Status
                      </SortableTableHeader>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Pipeline Status</TableHead>
                      <SortableTableHeader sortKey="assignedUser" sortConfig={sortConfig} onSort={handleSort} className="min-w-[140px]">
                        Assigned Agent
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="updatedAt" sortConfig={sortConfig} onSort={handleSort} className="min-w-[120px]">
                        Last Contact
                      </SortableTableHeader>
                      <TableHead className="w-12 sticky right-0 bg-white z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <TableCell className="sticky left-0 bg-white z-10 border-r border-gray-200">
                          <div className="flex items-center justify-center h-full">
                            <Checkbox 
                              checked={selectedItems.includes(lead.id)}
                              onCheckedChange={() => handleSelectItem(lead.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {lead.address ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}` : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {lead.seller?.firstName?.[0]}{lead.seller?.lastName?.[0]}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {lead.seller?.firstName} {lead.seller?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {lead.seller?.phone || 'N/A'}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {lead.seller?.email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{lead.market?.name || 'N/A'}</TableCell>
                        <TableCell className="font-medium text-gray-900">N/A</TableCell>
                        <TableCell>
                          <Badge className={`border ${getMotivationColor(lead.seller?.motivation || 'Medium')}`}>
                            {lead.seller?.motivation || 'Medium'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">N/A</TableCell>
                        <TableCell>
                          <Badge className={`border ${getStatusBadgeColor(lead.status || 'New')}`}>
                            {lead.status || 'New'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPipelineStatusColor(lead.pipelineStage?.name || 'New Lead')}>
                            {lead.pipelineStage?.name || 'New Lead'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(lead.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="sticky right-0 bg-white z-10 border-l border-gray-200">
                          <LeadActions 
                            lead={lead} 
                            onLeadUpdated={() => fetchLeads()} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Buyer Leads Table */}
            <TabsContent value="BUYER" className="mt-0">
              <div className="bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="w-12 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <Checkbox 
                          checked={getFilteredLeadsForTab("BUYER").length > 0 && selectedItems.length === getFilteredLeadsForTab("BUYER").length}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = selectedItems.length > 0 && selectedItems.length < getFilteredLeadsForTab("BUYER").length;
                          }}
                          onCheckedChange={() => {
                            const filteredLeads = getFilteredLeadsForTab("BUYER");
                            if (selectedItems.length === filteredLeads.length) {
                              setSelectedItems([]);
                            } else {
                              setSelectedItems(filteredLeads.map(lead => lead.id));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[180px]">Lead Name</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[200px]">Contact Info</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Market</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Price Range</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Asset Class</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Properties Purchased</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Credit Score</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Pre-Approved</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[100px]">Motivation</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Timeline</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Assigned Agent</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Last Contact</TableHead>
                      <TableHead className="w-12 sticky right-0 bg-white z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTab === "BUYER" ? currentLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <TableCell className="sticky left-0 bg-white z-10 border-r border-gray-200">
                          <div className="flex items-center justify-center h-full">
                            <Checkbox 
                              checked={selectedItems.includes(lead.id)}
                              onCheckedChange={() => handleSelectItem(lead.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-green-600">
                                {lead.buyer?.firstName?.[0]}{lead.buyer?.lastName?.[0]}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {lead.buyer?.firstName} {lead.buyer?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {lead.buyer?.phone}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {lead.buyer?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{lead.market}</TableCell>
                        <TableCell className="font-medium text-gray-900">{lead.priceRange}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {lead.assetClass}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{lead.propertiesPurchased}</span>
                            {lead.propertiesPurchased > 0 && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Repeat
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${
                            lead.creditScore === 'Excellent' ? 'bg-green-100 text-green-700' :
                            lead.creditScore === 'Good' ? 'bg-blue-100 text-blue-700' :
                            lead.creditScore === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {lead.creditScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.preApproved ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              ✓ Pre-Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700 text-xs">
                              Not Pre-Approved
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`border ${getMotivationColor(lead.motivation || '')}`}>
                            {lead.motivation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{lead.timeline}</TableCell>
                        <TableCell className="text-gray-600">{lead.assignedAgent}</TableCell>
                        <TableCell className="text-gray-600">{lead.lastContact}</TableCell>
                        <TableCell className="sticky right-0 bg-white z-10 border-l border-gray-200">
                          <LeadActions 
                            lead={lead} 
                            onLeadUpdated={() => fetchLeads()} 
                          />
                        </TableCell>
                      </TableRow>
                    )) : []}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Vendor Leads Table */}
            <TabsContent value="VENDOR" className="mt-0">
              <div className="bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="w-12 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <Checkbox 
                          checked={getFilteredLeadsForTab("VENDOR").length > 0 && selectedItems.length === getFilteredLeadsForTab("VENDOR").length}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = selectedItems.length > 0 && selectedItems.length < getFilteredLeadsForTab("VENDOR").length;
                          }}
                          onCheckedChange={() => {
                            const filteredLeads = getFilteredLeadsForTab("VENDOR");
                            if (selectedItems.length === filteredLeads.length) {
                              setSelectedItems([]);
                            } else {
                              setSelectedItems(filteredLeads.map(lead => lead.id));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[180px]">Lead Name</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[200px]">Company</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[200px]">Contact Info</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Industry</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Service Area</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[100px]">Rating</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[100px]">Verified</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Assigned Agent</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Last Contact</TableHead>
                      <TableHead className="w-12 sticky right-0 bg-white z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTab === "VENDOR" ? currentLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <TableCell className="sticky left-0 bg-white z-10 border-r border-gray-200">
                          <div className="flex items-center justify-center h-full">
                            <Checkbox 
                              checked={selectedItems.includes(lead.id)}
                              onCheckedChange={() => handleSelectItem(lead.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-orange-600">
                                {lead.vendor?.firstName?.[0]}{lead.vendor?.lastName?.[0]}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {lead.vendor?.firstName} {lead.vendor?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{lead.vendor?.company}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {lead.vendor?.phone}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {lead.vendor?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            {lead.industry}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{lead.serviceArea}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getRatingStars(lead.rating)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.verified ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              ✓ Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700 text-xs">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">{lead.assignedAgent}</TableCell>
                        <TableCell className="text-gray-600">{lead.lastContact}</TableCell>
                        <TableCell className="sticky right-0 bg-white z-10 border-l border-gray-200">
                          <LeadActions 
                            lead={lead} 
                            onLeadUpdated={() => fetchLeads()} 
                          />
                        </TableCell>
                      </TableRow>
                    )) : []}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Import CSV Dialog */}
      <ImportCSVDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        leadType={activeTab}
        onImport={handleImportCSV}
      />

      {/* View Lead Dialog - Auto-opened from URL parameter */}
      {selectedLead && (
        <ViewLeadDialog 
          lead={selectedLead}
          open={showLeadDetail}
          onOpenChange={setShowLeadDetail}
        />
      )}
    </DashboardLayout>
  );
};

export default Leads;
