import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  getUTCDateRangeFromPeriod,
  getUTCStartOfDay,
  getUTCEndOfDay,
  isDateInUTCRange,
  parseDateUTC,
} from "@/utils/dateUtils";
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
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLeads, type LeadType } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineNav } from "@/contexts/PipelineNavContext";
import { SortableTableHeader, useSortable } from "@/components/SortableTableHeader";
import { ImportCSVDialog } from "@/components/ImportCSVDialog";
import { LeadActions } from "@/components/LeadActions";
import { normalizeDateString } from "@/utils/validation";
import { generateCSVTemplate } from "@/utils/csvUtils";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { useSettings } from "@/hooks/useSettings";
import { formatUsPhoneForDisplay } from "@/utils/phone";

const Leads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setFromPipelineView } = usePipelineNav();
  const { 
    leads, 
    isLoading, 
    error, 
    fetchLeads, 
    updateLead,
    deleteLead, 
    getLeadsByType, 
    searchLeads,
    filterLeads,
    importLeadsFromCSV,
    exportLeadsToCSV,
    sortLeads 
  } = useLeads();
  
  const { markets, priceRanges, assetClasses } = useSettings();
  
  // Helper functions to get names from IDs
  const getMarketNames = (marketIds?: string[]) => {
    if (!marketIds || marketIds.length === 0) return '-';
    const names = marketIds.map(id => markets.find(m => m.id === id)?.name || id).join(', ');
    return names || '-';
  };
  
  const getPriceRangeNames = (priceRangeIds?: string[]) => {
    if (!priceRangeIds || priceRangeIds.length === 0) return '-';
    const names = priceRangeIds.map(id => priceRanges.find(p => p.id === id)?.label || id).join(', ');
    return names || '-';
  };
  
  const getAssetClassNames = (assetClassIds?: string[]) => {
    if (!assetClassIds || assetClassIds.length === 0) return '-';
    const names = assetClassIds.map(id => assetClasses.find(a => a.id === id)?.name || id).join(', ');
    return names || '-';
  };
  
  // Helper to get phone number from lead owners only (single source of truth)
  const getLeadPhone = (lead: any): string => {
    // ONLY use lead owners as the single source of truth for contact info
    if (lead.owners && lead.owners.length > 0) {
      const primaryOwner = lead.owners.find((o: any) => o.isPrimary);
      if (primaryOwner?.phone?.trim()) return primaryOwner.phone.trim();
      
      // If no primary, get first owner with phone
      const ownerPhone = lead.owners.find((o: any) => o.phone)?.phone?.trim();
      if (ownerPhone) return ownerPhone;
    }
    
    return 'N/A';
  };
  
  // Helper to get email from lead owners only (single source of truth)
  const getLeadEmail = (lead: any): string => {
    // Helper to check if email is valid (not empty, not fake)
    const isValidEmail = (email: string | undefined | null): boolean => {
      if (!email || !email.trim()) return false;
      if (email.includes('@unknown.local')) return false;
      if (email.includes('none@none.com')) return false;
      return true;
    };
    
    // ONLY use lead owners as the single source of truth for contact info
    if (lead.owners && lead.owners.length > 0) {
      const primaryOwner = lead.owners.find((o: any) => o.isPrimary);
      if (isValidEmail(primaryOwner?.email)) {
        return primaryOwner.email.trim();
      }
      
      // If no primary, get first owner with email
      const ownerWithEmail = lead.owners.find((o: any) => isValidEmail(o.email));
      if (ownerWithEmail) return ownerWithEmail.email.trim();
    }
    
    return 'No email';
  };
  
  // Helper to check if lead has any phone number
  const hasPhoneNumber = (lead: any): boolean => {
    return getLeadPhone(lead) !== 'N/A';
  };
  
  // Helper to get contact name (synced with lead owners)
  const getContactName = (lead: any): { firstName: string; lastName: string; initials: string } => {
    // Priority 1: Check primary lead owner first
    if (lead.owners && lead.owners.length > 0) {
      const primaryOwner = lead.owners.find((o: any) => o.isPrimary);
      const primaryFn = (primaryOwner?.firstName || '').trim();
      const primaryLn = (primaryOwner?.lastName || '').trim();
      if (primaryFn || primaryLn) {
        return {
          firstName: primaryFn,
          lastName: primaryLn,
          initials: `${primaryFn ? primaryFn[0] : ''}${primaryLn ? primaryLn[0] : ''}`.toUpperCase() || 'UC'
        };
      }
      
      // If no primary, get first owner with name
      const ownerWithName = lead.owners.find((o: any) => (o.firstName && String(o.firstName).trim()) || (o.lastName && String(o.lastName).trim()));
      if (ownerWithName) {
        const fn = (ownerWithName.firstName || '').trim();
        const ln = (ownerWithName.lastName || '').trim();
        return {
          firstName: fn,
          lastName: ln,
          initials: `${fn ? fn[0] : ''}${ln ? ln[0] : ''}`.toUpperCase() || 'UC'
        };
      }
    }
    
    // Priority 2: Check seller/buyer/vendor as fallback
    const sellerFn = (lead.seller?.firstName || '').trim();
    const sellerLn = (lead.seller?.lastName || '').trim();
    if (sellerFn || sellerLn) {
      return {
        firstName: sellerFn,
        lastName: sellerLn,
        initials: `${sellerFn ? sellerFn[0] : ''}${sellerLn ? sellerLn[0] : ''}`.toUpperCase() || 'UC'
      };
    }
    
    const buyerFn = (lead.buyer?.firstName || '').trim();
    const buyerLn = (lead.buyer?.lastName || '').trim();
    if (buyerFn || buyerLn) {
      return {
        firstName: buyerFn,
        lastName: buyerLn,
        initials: `${buyerFn ? buyerFn[0] : ''}${buyerLn ? buyerLn[0] : ''}`.toUpperCase() || 'UC'
      };
    }
    
    const vendorFn = (lead.vendor?.firstName || '').trim();
    const vendorLn = (lead.vendor?.lastName || '').trim();
    if (vendorFn || vendorLn) {
      return {
        firstName: vendorFn,
        lastName: vendorLn,
        initials: `${vendorFn ? vendorFn[0] : ''}${vendorLn ? vendorLn[0] : ''}`.toUpperCase() || 'UC'
      };
    }
    
    // Fallback to Unknown Caller
    return {
      firstName: 'Unknown',
      lastName: 'Caller',
      initials: 'UC'
    };
  };
  
  // Set default tab based on user role
  const getDefaultTab = (): LeadType => {
    const userRoles = user?.roles?.map((r: any) => {
      if (typeof r === 'string') return r;
      return r.role?.name || r.name;
    }) || [];
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<'delete' | 'archive' | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Multi-select filters (changed from single select to arrays)
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPipelineStatuses, setSelectedPipelineStatuses] = useState<string[]>([]);
  const [selectedLeadSources, setSelectedLeadSources] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState("");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  
  // Dynamic filter data
  const [filterMarkets, setFilterMarkets] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<Array<{id: string; name: string; color?: string}>>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  // URL parameter handling for direct lead access
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Role-based access control
  const userRoleNames = user?.roles?.map((r: any) => {
    // Handle both string roles and object roles
    if (typeof r === 'string') return r;
    return r.role?.name || r.name;
  }) || [];
  const isACQ = userRoleNames.includes('ACQ');
  const isDisp = userRoleNames.includes('DISP');
  const isTC = userRoleNames.includes('TC');
  const isAdmin = userRoleNames.includes('ADMIN');
  const isManager = userRoleNames.includes('MANAGER');
  const isExecutive = userRoleNames.includes('EXECUTIVE');

  // Role-based lead type access
  const canViewSellerLeads = isAdmin || isExecutive || isManager || isACQ || isTC;
  const canViewBuyerLeads = isAdmin || isExecutive || isManager || isDisp || isTC;
  const canViewVendorLeads = isAdmin || isExecutive || isManager;

  // Ensure active tab is valid for user's role
  useEffect(() => {
    // If current tab is not accessible, switch to a valid one
    if (activeTab === 'SELLER' && !canViewSellerLeads) {
      if (canViewBuyerLeads) {
        setActiveTab('BUYER');
      } else if (canViewVendorLeads) {
        setActiveTab('VENDOR');
      }
    } else if (activeTab === 'BUYER' && !canViewBuyerLeads) {
      if (canViewSellerLeads) {
        setActiveTab('SELLER');
      } else if (canViewVendorLeads) {
        setActiveTab('VENDOR');
      }
    } else if (activeTab === 'VENDOR' && !canViewVendorLeads) {
      if (canViewSellerLeads) {
        setActiveTab('SELLER');
      } else if (canViewBuyerLeads) {
        setActiveTab('BUYER');
      }
    }
  }, [activeTab, canViewSellerLeads, canViewBuyerLeads, canViewVendorLeads]);
  
  // Sorting functionality - default to createdAt DESC (newest first)
  const { sortConfig, handleSort, resetSort } = useSortable({ key: 'createdAt', direction: 'desc' });

  // Load all leads and filter data on component mount
  useEffect(() => {
    fetchLeads(); // Fetch all leads without type filter
    loadFilterData(); // Load dynamic filter options
  }, []);

  // Handle leadId parameter from URL to navigate to lead detail
  useEffect(() => {
    const leadIdParam = searchParams.get('leadId');
    
    if (leadIdParam) {
      // Navigate directly to the lead detail page
      navigate(`/leads/${leadIdParam}/edit`);
    }
  }, [searchParams, navigate]);

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
        setFilterMarkets(marketsData.data || []);
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

      // Fetch all lead statuses from API instead of extracting from current leads
      const statusesResponse = await fetch(`${API_BASE}/lead-statuses`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (statusesResponse.ok) {
        const statusesData = await statusesResponse.json();
        setLeadStatuses(statusesData.data || []);
      }

      // Fetch agents for ACQ/DISP filters
      const agentsResponse = await fetch(`${API_BASE}/agents`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.data || []);
      }

      // Fetch lead sources
      const leadSourcesResponse = await fetch(`${API_BASE}/settings/lead-sources`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (leadSourcesResponse.ok) {
        const leadSourcesData = await leadSourcesResponse.json();
        setLeadSources(leadSourcesData.data || []);
      }
      
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Clear selected items and filters when switching tabs
  useEffect(() => {
    setSelectedItems([]);
    setSelectedMarkets([]);
    setSelectedStatuses([]);
    setSelectedPipelineStatuses([]);
    setSelectedLeadSources([]);
    setSelectedAgents([]);
    setSelectedDateRange("");
    setCustomDateFrom("");
    setCustomDateTo("");
  }, [activeTab]);


  // Get filtered and sorted leads based on search and active tab
  const getCurrentLeads = useMemo(() => {
    let filteredLeads = getLeadsByType(activeTab);
    
    // Apply search filter
    if (searchQuery) {
      filteredLeads = searchLeads(searchQuery).filter(lead => lead.leadType === activeTab);
    }
    
    // Apply multi-select filters
    if (selectedMarkets.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        return selectedMarkets.includes(lead.marketId);
      });
    }
    
    if (selectedStatuses.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        return selectedStatuses.includes(lead.leadStatusId);
      });
    }
    
    if (selectedPipelineStatuses.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        return selectedPipelineStatuses.includes(lead.pipelineStageId);
      });
    }

    // Agent filters (multi-select)
    if (selectedAgents.length > 0) {
      filteredLeads = filteredLeads.filter((lead: any) => selectedAgents.includes(lead.assignedUserId));
    }

    // Lead Source filter (multi-select)
    if (selectedLeadSources.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        return selectedLeadSources.includes(lead.leadSourceId);
      });
    }
    
    if (selectedDateRange) {
      // Date Created filter: Always use createdAt, no fallback
      // Use global UTC utilities for consistent timezone handling
      switch (selectedDateRange) {
        case 'today':
        case 'week':
        case 'month':
        case 'quarter':
        case 'year': {
          // Use global UTC utilities for preset ranges
          const { start, end } = getUTCDateRangeFromPeriod(selectedDateRange);
          
          // Validate dates before using them
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.error('Invalid date range from getUTCDateRangeFromPeriod:', { start, end, selectedDateRange });
            break; // Skip filtering if dates are invalid
          }
          
          // Debug logging for week filter
          if (selectedDateRange === 'week') {
            console.log('📅 Week Filter Range:', {
              start: start.toISOString(),
              end: end.toISOString(),
              startDate: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`,
              endDate: `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`,
              totalLeadsBeforeFilter: filteredLeads.length
            });
          }
          
          filteredLeads = filteredLeads.filter((lead: any) => {
            const createdAt = new Date(lead.createdAt);
            // Get UTC date components for accurate comparison
            const leadYear = createdAt.getUTCFullYear();
            const leadMonth = createdAt.getUTCMonth();
            const leadDate = createdAt.getUTCDate();
            
            // Create UTC date at start of day for the lead (normalize to start of day)
            const leadDateUTC = getUTCStartOfDay(leadYear, leadMonth, leadDate);
            
            // Compare with range (start and end are already UTC dates at start/end of day)
            const isInRange = leadDateUTC >= start && leadDateUTC <= end;
            
            // Debug first 3 leads for week filter
            if (selectedDateRange === 'week' && filteredLeads.indexOf(lead) < 3) {
              console.log('🔍 Lead Check:', {
                leadId: lead.id?.substring(0, 8),
                createdAt: lead.createdAt,
                leadDateUTC: leadDateUTC.toISOString(),
                leadDateStr: `${leadYear}-${String(leadMonth + 1).padStart(2, '0')}-${String(leadDate).padStart(2, '0')}`,
                isInRange,
                startCompare: leadDateUTC >= start,
                endCompare: leadDateUTC <= end
              });
            }
            
            return isInRange;
          });
          
          if (selectedDateRange === 'week') {
            console.log('📊 Week Filter Result:', {
              totalLeadsAfterFilter: filteredLeads.length
            });
          }
          
          break;
        }
        case 'custom': {
          // Custom range: Parse dates and set UTC boundaries
          // Normalize dates to YYYY-MM-DD format for consistent parsing
          const normalizedFrom = customDateFrom ? normalizeDateString(customDateFrom) : null;
          const normalizedTo = customDateTo ? normalizeDateString(customDateTo) : null;
          const from = normalizedFrom ? parseDateUTC(normalizedFrom) : null;
          const to = normalizedTo ? getUTCEndOfDay(
            new Date(normalizedTo + 'T00:00:00.000Z').getUTCFullYear(),
            new Date(normalizedTo + 'T00:00:00.000Z').getUTCMonth(),
            new Date(normalizedTo + 'T00:00:00.000Z').getUTCDate()
          ) : null;

          filteredLeads = filteredLeads.filter((lead: any) => {
            const createdAt = new Date(lead.createdAt);
            // Use >= and <= for consistency with preset ranges (same logic)
            if (from && createdAt < from) return false;
            if (to && createdAt > to) return false;
            return true;
          });
          break;
        }
      }
    }
    
    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      filteredLeads = sortLeads(filteredLeads, sortConfig.key, sortConfig.direction);
    }
    
    return filteredLeads;
  }, [getLeadsByType, activeTab, searchQuery, searchLeads, selectedMarkets, selectedStatuses, selectedPipelineStatuses, selectedDateRange, customDateFrom, customDateTo, selectedAgents, selectedLeadSources, sortConfig, sortLeads, pipelineStages]);

  const getLeadCount = (type: "SELLER" | "BUYER" | "VENDOR") => {
    // Count all leads of this type from the main leads array (not filtered by role)
    return leads.filter(lead => lead.leadType === type).length;
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
    return getCurrentLeads;
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
  };
  
  const handleDownloadTemplate = () => {
    generateCSVTemplate(activeTab);
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

  const handleBulkAction = (action: 'delete' | 'archive') => {
    if (selectedItems.length === 0) return;
    setPendingBulkAction(action);
    setIsConfirmDialogOpen(true);
  };

  const confirmBulkAction = async () => {
    if (!pendingBulkAction || selectedItems.length === 0) return;
    
    setIsBulkProcessing(true);
    setIsConfirmDialogOpen(false);
    
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const leadId of selectedItems) {
        try {
          if (pendingBulkAction === 'delete') {
            await deleteLead(leadId);
          } else if (pendingBulkAction === 'archive') {
            await updateLead(leadId, { status: 'archived' } as any);
          }
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to ${pendingBulkAction} lead ${leadId}:`, error);
        }
      }

      // Show error toast only if there were errors
      if (errorCount > 0) {
        toast({
          title: `Failed to ${pendingBulkAction} leads`,
          description: `${errorCount} lead${errorCount > 1 ? 's' : ''} could not be ${pendingBulkAction}d`,
          variant: "destructive",
        });
      }

      // Clear selection and refresh
      setSelectedItems([]);
      await fetchLeads();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${pendingBulkAction} leads`,
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
      setPendingBulkAction(null);
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


  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  // Handle lead click and set navigation context for next/prev buttons
  const handleLeadClick = (leadId: string) => {
    // Set the navigation context with the current filtered/sorted lead list
    const leadIds = currentLeads.map(lead => lead.id);
    setFromPipelineView(leadIds, {
      // Meta information about the source (lead tab)
      pipelineKey: activeTab,
    });
    
    // Navigate to the lead detail page
    navigate(`/leads/${leadId}/edit`);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          </div>
        </div>


        {/* Collapsible Filters */}
        {showFilters && (
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {/* Status Filter - Multi-select Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Lead Status</label>
                <MultiSelect
                  options={leadStatuses.map(status => ({
                    label: status.name,
                    value: status.id
                  }))}
                  selected={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="All Statuses"
                  disabled={loadingFilters}
                  className="h-8"
                />
              </div>

              {/* Pipeline Status Filter - Multi-select Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Pipeline Stages</label>
                <MultiSelect
                  options={pipelineStages.map(stage => ({
                    label: stage.name,
                    value: stage.id
                  }))}
                  selected={selectedPipelineStatuses}
                  onChange={setSelectedPipelineStatuses}
                  placeholder="All Stages"
                  disabled={loadingFilters}
                  className="h-8"
                />
              </div>

              {/* Lead Source Filter - Multi-select Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Lead Source</label>
                <MultiSelect
                  options={leadSources.map(source => ({
                    label: source.name,
                    value: source.id
                  }))}
                  selected={selectedLeadSources}
                  onChange={setSelectedLeadSources}
                  placeholder="All Sources"
                  disabled={loadingFilters}
                  className="h-8"
                />
              </div>

              {/* Date Created Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Date Created</label>
                <select 
                  className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>

                {selectedDateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-600">From</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-600">To</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Filters (tab-specific) - Multi-select Dropdown */}
              {activeTab === 'SELLER' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Acquisitions Agent</label>
                  <MultiSelect
                    options={agents
                      .filter((a: any) => {
                        const roles = (a.roles || []).map((r: any) => r?.role?.name || r?.name || r);
                        return roles.includes('ACQ') || roles.includes('MANAGER');
                      })
                      .map((a: any) => ({
                        label: `${a.firstName} ${a.lastName}`,
                        value: a.id
                      }))}
                    selected={selectedAgents}
                    onChange={setSelectedAgents}
                    placeholder="All ACQ Agents"
                    disabled={loadingFilters}
                    className="h-8"
                  />
                </div>
              )}

              {activeTab === 'BUYER' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Dispositions Agent</label>
                  <MultiSelect
                    options={agents
                      .filter((a: any) => {
                        const roles = (a.roles || []).map((r: any) => r?.role?.name || r?.name || r);
                        return roles.includes('DISP') || roles.includes('MANAGER');
                      })
                      .map((a: any) => ({
                        label: `${a.firstName} ${a.lastName}`,
                        value: a.id
                      }))}
                    selected={selectedAgents}
                    onChange={setSelectedAgents}
                    placeholder="All DISP Agents"
                    disabled={loadingFilters}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {currentLeads.length} leads found
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Clear all multi-select filters
                    setSearchQuery("");
                    setSelectedMarkets([]);
                    setSelectedStatuses([]);
                    setSelectedPipelineStatuses([]);
                    setSelectedLeadSources([]);
                    setSelectedAgents([]);
                    setSelectedDateRange("");
                    setCustomDateFrom("");
                    setCustomDateTo("");
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
        <div className="bg-white border-b border-gray-200">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeadType)} className="w-full">
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
                    className="border-gray-300 m-2.5"
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
                      disabled={isBulkProcessing}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {isBulkProcessing && pendingBulkAction === 'archive' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4 mr-1" />
                          Archive ({selectedItems.length})
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleBulkAction('delete')}
                      disabled={isBulkProcessing}
                      className="text-red-600 hover:text-red-900"
                    >
                      {isBulkProcessing && pendingBulkAction === 'delete' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete ({selectedItems.length})
                        </>
                      )}
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
                
                {/* Export Dropdown - Admin/Manager Only */}
                {(isAdmin || isManager) && (
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
                        }}>
                          <Download className="w-4 h-4 mr-2" />
                          Export Selected ({selectedItems.length})
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Filter Button (no "Hide" button; close via "Close Panel") */}
                {!showFilters && (
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
                
                {/* Add Lead Button/Dialog */}
                <Button 
                  size="sm" 
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    // Count available lead types
                    const availableTypes = [
                      canViewSellerLeads && 'seller',
                      canViewBuyerLeads && 'buyer',
                      canViewVendorLeads && 'vendor'
                    ].filter(Boolean);
                    
                    // If only one type available, navigate directly
                    if (availableTypes.length === 1) {
                      navigate(`/leads/add-${availableTypes[0]}`);
                    } else {
                      // If multiple types, show dialog
                      setIsAddLeadOpen(true);
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Lead
                </Button>
                
                {/* Add Lead Type Selection Dialog (only shown if multiple types available) */}
                <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Lead</DialogTitle>
                      <DialogDescription>
                        Choose the type of lead you want to add.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {canViewSellerLeads && (
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
                      )}
                      
                      {canViewBuyerLeads && (
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
                      )}
                      
                      {canViewVendorLeads && (
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
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Seller Leads Table */}
            <TabsContent value="SELLER" className="mt-0">
              <div className="bg-white overflow-x-auto rounded-lg shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 bg-gray-50">
                      <TableHead className="w-8 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 p-0">
                        <div className="flex items-center justify-center">
                          <Checkbox 
                            className="h-3.5 w-3.5"
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
                        </div>
                      </TableHead>
                      <SortableTableHeader sortKey="address" sortConfig={sortConfig} onSort={handleSort} className="min-w-[180px]">
                        Property Address
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="name" sortConfig={sortConfig} onSort={handleSort} className="min-w-[130px]">
                        Lead Name
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="email" sortConfig={sortConfig} onSort={handleSort} className="min-w-[150px]">
                        Contact Info
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="status" sortConfig={sortConfig} onSort={handleSort} className="min-w-[90px]">
                        Lead Status
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} className="min-w-[80px]">
                        Date Created
                      </SortableTableHeader>
                      <SortableTableHeader sortKey="lastContactAt" sortConfig={sortConfig} onSort={handleSort} className="min-w-[80px]">
                        Last Contact
                      </SortableTableHeader>
                      <TableHead className="w-8 sticky right-0 bg-gray-50 z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentLeads.map((lead) => (
                      <TableRow 
                        key={lead.id} 
                        className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer"
                        onClick={() => handleLeadClick(lead.id)}
                      >
                        <TableCell 
                          className="sticky left-0 bg-white z-10 border-r border-gray-200 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <Checkbox 
                              className="h-3.5 w-3.5"
                              checked={selectedItems.includes(lead.id)}
                              onCheckedChange={() => handleSelectItem(lead.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {lead.address ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}` : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const contact = getContactName(lead);
                            return (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-medium text-blue-600">
                                    {contact.initials}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900 truncate">
                                  {(contact.firstName || '').trim()} {(contact.lastName || '').trim()}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{formatUsPhoneForDisplay(getLeadPhone(lead))}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{getLeadEmail(lead)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.leadStatus ? (
                            <Badge 
                              className="border text-[10px] px-1.5 py-0" 
                              style={{ 
                                backgroundColor: `${lead.leadStatus.color}20`,
                                borderColor: lead.leadStatus.color,
                                color: lead.leadStatus.color
                              }}
                            >
                              {lead.leadStatus.name}
                            </Badge>
                          ) : (
                            <Badge className={`border text-[10px] px-1.5 py-0 ${getStatusBadgeColor(lead.status || 'New')}`}>
                              {lead.status || 'No Status'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : 'No contact'}
                        </TableCell>
                        <TableCell 
                          className="sticky right-0 bg-white z-10 border-l border-gray-200 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
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
              <div className="bg-white overflow-x-auto rounded-lg shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 bg-gray-50">
                      <TableHead className="w-8 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 p-0">
                        <div className="flex items-center justify-center">
                          <Checkbox 
                            className="h-3.5 w-3.5"
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
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[130px]">Lead Name</TableHead>
                      <TableHead className="min-w-[150px]">Contact Info</TableHead>
                      <TableHead className="min-w-[90px]">Price Range</TableHead>
                      <TableHead className="min-w-[80px]">Asset Class</TableHead>
                      <TableHead className="min-w-[60px]">Purchased</TableHead>
                      <TableHead className="min-w-[70px]">Credit</TableHead>
                      <TableHead className="min-w-[70px]">Pre-Appr</TableHead>
                      <TableHead className="min-w-[70px]">Timeline</TableHead>
                      <TableHead className="min-w-[80px]">Date Created</TableHead>
                      <TableHead className="min-w-[80px]">Last Contact</TableHead>
                      <TableHead className="w-8 sticky right-0 bg-gray-50 z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentLeads.map((lead) => (
                      <TableRow 
                        key={lead.id} 
                        className="border-b border-gray-100 hover:bg-green-50/50 cursor-pointer"
                        onClick={() => handleLeadClick(lead.id)}
                      >
                        <TableCell 
                          className="sticky left-0 bg-white z-10 border-r border-gray-200 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <Checkbox 
                              className="h-3.5 w-3.5"
                              checked={selectedItems.includes(lead.id)}
                              onCheckedChange={() => handleSelectItem(lead.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const contact = getContactName(lead);
                            return (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-medium text-green-600">
                                    {contact.initials}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900 truncate">
                                  {(contact.firstName || '').trim()} {(contact.lastName || '').trim()}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{formatUsPhoneForDisplay(getLeadPhone(lead))}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{getLeadEmail(lead)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          <span className="truncate block" title={getPriceRangeNames(lead.buyerCriteria?.priceRangeIds)}>
                            {getPriceRangeNames(lead.buyerCriteria?.priceRangeIds)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="truncate block" title={getAssetClassNames(lead.buyerCriteria?.assetClassIds)}>
                            {getAssetClassNames(lead.buyerCriteria?.assetClassIds)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-gray-900">{lead.buyer?.propertiesPurchased || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {lead.buyer?.creditScore ? (
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              lead.buyer.creditScore === 'Excellent' ? 'bg-green-100 text-green-700' :
                              lead.buyer.creditScore === 'Good' ? 'bg-blue-100 text-blue-700' :
                              lead.buyer.creditScore === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {lead.buyer.creditScore}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {lead.buyer?.preApproved ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">✓</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-gray-600">
                          {lead.buyer?.timeline || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : <span className="text-gray-400">No contact</span>}
                        </TableCell>
                        <TableCell 
                          className="sticky right-0 bg-white z-10 border-l border-gray-200 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
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

            {/* Vendor Leads Table */}
            <TabsContent value="VENDOR" className="mt-0">
              <div className="bg-white overflow-x-auto rounded-lg shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 bg-gray-50">
                      <TableHead className="w-8 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 p-0">
                        <div className="flex items-center justify-center">
                          <Checkbox 
                            className="h-3.5 w-3.5"
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
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[130px]">Lead Name</TableHead>
                      <TableHead className="min-w-[130px]">Company</TableHead>
                      <TableHead className="min-w-[150px]">Contact Info</TableHead>
                      <TableHead className="min-w-[90px]">Industry</TableHead>
                      <TableHead className="min-w-[60px]">Rating</TableHead>
                      <TableHead className="min-w-[60px]">Verified</TableHead>
                      <TableHead className="min-w-[80px]">Date Created</TableHead>
                      <TableHead className="min-w-[80px]">Last Contact</TableHead>
                      <TableHead className="w-8 sticky right-0 bg-gray-50 z-10 border-l border-gray-200"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTab === "VENDOR" ? currentLeads.map((lead) => (
                      <TableRow 
                        key={lead.id} 
                        className="border-b border-gray-100 hover:bg-purple-50/50 cursor-pointer"
                        onClick={() => handleLeadClick(lead.id)}
                      >
                        <TableCell 
                          className="sticky left-0 bg-white z-10 border-r border-gray-200 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <Checkbox 
                              className="h-3.5 w-3.5"
                              checked={selectedItems.includes(lead.id)}
                              onCheckedChange={() => handleSelectItem(lead.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const contact = getContactName(lead);
                            return (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-medium text-orange-600">
                                    {contact.initials}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900 truncate">
                                  {(contact.firstName || '').trim()} {(contact.lastName || '').trim()}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 truncate">{lead.vendor?.company}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{formatUsPhoneForDisplay(getLeadPhone(lead))}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{getLeadEmail(lead)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0">
                            {lead.vendor?.industry || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">N/A</TableCell>
                        <TableCell>
                          <Badge className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-gray-600">{lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : 'No contact'}</TableCell>
                        <TableCell 
                          className="sticky right-0 bg-white z-10 border-l border-gray-200 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
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

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingBulkAction === 'delete' ? 'Delete Leads' : 'Archive Leads'}
            </DialogTitle>
            <DialogDescription>
              {pendingBulkAction === 'delete' 
                ? `Are you sure you want to permanently delete ${selectedItems.length} lead${selectedItems.length > 1 ? 's' : ''}? This action cannot be undone.`
                : `Are you sure you want to archive ${selectedItems.length} lead${selectedItems.length > 1 ? 's' : ''}? Archived leads can be restored later.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setPendingBulkAction(null);
              }}
              disabled={isBulkProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={pendingBulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={confirmBulkAction}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {pendingBulkAction === 'delete' ? 'Deleting...' : 'Archiving...'}
                </>
              ) : (
                pendingBulkAction === 'delete' ? 'Delete' : 'Archive'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Leads;
