import { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";

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
    searchLeads 
  } = useLeads();
  
  const [activeTab, setActiveTab] = useState<"SELLER" | "BUYER" | "VENDOR">("SELLER");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load all leads on component mount
  useEffect(() => {
    fetchLeads(); // Fetch all leads without type filter
  }, []);

  // Clear selected items when switching tabs
  useEffect(() => {
    setSelectedItems([]);
  }, [activeTab]);

  // Get filtered leads based on search and active tab
  const getCurrentLeads = () => {
    const typeLeads = getLeadsByType(activeTab);
    return searchQuery ? searchLeads(searchQuery).filter(lead => lead.leadType === activeTab) : typeLeads;
  };

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

  const getFilteredLeadsForTab = (type: "SELLER" | "BUYER" | "VENDOR") => {
    const typeLeads = getLeadsByType(type);
    return searchQuery ? searchLeads(searchQuery).filter(lead => lead.leadType === type) : typeLeads;
  };

  const handleSelectAll = () => {
    const currentLeads = getFilteredLeads();
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

  const currentLeads = getFilteredLeads();
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

        {/* Search Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search leads by name, phone, email, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-12 bg-transparent border-0 p-0 space-x-6">
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
                      {getFilteredLeads().length} of {getCurrentLeads().length} leads
                      {searchQuery && ` matching "${searchQuery}"`}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
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
                          checked={getFilteredLeadsForTab("SELLER").length > 0 && selectedItems.length === getFilteredLeadsForTab("SELLER").length}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = selectedItems.length > 0 && selectedItems.length < getFilteredLeadsForTab("SELLER").length;
                          }}
                          onCheckedChange={() => {
                            const filteredLeads = getFilteredLeadsForTab("SELLER");
                            if (selectedItems.length === filteredLeads.length) {
                              setSelectedItems([]);
                            } else {
                              setSelectedItems(filteredLeads.map(lead => lead.id));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[250px]">Property Address</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[180px]">Lead Name</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[200px]">Contact Info</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Market</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Property Value</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[100px]">Motivation</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Timeline</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Lead Status</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Pipeline Status</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[140px]">Assigned Agent</TableHead>
                      <TableHead className="text-gray-600 font-medium min-w-[120px]">Last Contact</TableHead>
                      <TableHead className="w-12 sticky right-0 bg-white z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredLeadsForTab("SELLER").map((lead) => (
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Phone className="w-4 h-4 mr-2" />
                                Call Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Meeting
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                            if (el) (el as any).indeterminate = selectedItems.length > 0 && selectedItems.length < getFilteredLeadsForTab(buyerLeads).length;
                          }}
                          onCheckedChange={() => {
                            const filteredLeads = getFilteredLeadsForTab(buyerLeads);
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
                    {getFilteredLeadsForTab("BUYER").map((lead) => (
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
                                {lead.firstName[0]}{lead.lastName[0]}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {lead.firstName} {lead.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {lead.email}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Phone className="w-4 h-4 mr-2" />
                                Call Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Meeting
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
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
                          checked={getFilteredLeadsForTab(vendorLeads).length > 0 && selectedItems.length === getFilteredLeadsForTab(vendorLeads).length}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = selectedItems.length > 0 && selectedItems.length < getFilteredLeadsForTab(vendorLeads).length;
                          }}
                          onCheckedChange={() => {
                            const filteredLeads = getFilteredLeadsForTab(vendorLeads);
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
                    {getFilteredLeadsForTab("VENDOR").map((lead) => (
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
                                {lead.firstName[0]}{lead.lastName[0]}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {lead.firstName} {lead.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{lead.company}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {lead.email}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Phone className="w-4 h-4 mr-2" />
                                Call Vendor
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Meeting
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Leads;