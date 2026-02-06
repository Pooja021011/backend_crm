import { useState, useRef, useEffect } from "react";
import { Search, Building2, LogOut, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config/api";
import { useNavigate } from "react-router-dom";

interface KPIData {
  modes: Array<'admin' | 'manager' | 'acq'>;
  // Admin KPIs (company-wide)
  contractsSigned?: number;
  contractsSold?: number;
  totalProfit?: number;
  // Manager KPIs (team-wide for all ACQ agents)
  totalContracts?: number;
  leadsPerContract?: number;
  leadsMishandled?: number;
  leadsReceived?: number;
  slaBreaches?: number;
  stale48h?: number;
  mishandledColor?: 'green' | 'yellow' | 'orange' | 'red';
  // ACQ KPIs (personal stats)
  totalContractsPersonal?: number;
  leadsPerContractPersonal?: number;
  leadsMishandledPersonal?: number;
  leadsReceivedPersonal?: number;
  slaBreachesPersonal?: number;
  stale48hPersonal?: number;
  mishandledColorPersonal?: 'green' | 'yellow' | 'orange' | 'red';
}

interface SearchResult {
  id: string;
  type: 'SELLER' | 'BUYER' | 'VENDOR';
  name: string;
  subtitle: string;
  phone: string;
}

interface KPICardProps {
  title: string;
  value: string;
  trend?: string;
  color: "blue" | "green" | "purple" | "orange" | "yellow" | "red" | "indigo";
}

const KPICard = ({ title, value, trend, color }: KPICardProps) => {
  const colorConfig = {
    blue: {
      bg: "bg-blue-500",
      text: "text-white",
      border: "border-blue-500",
      label: "text-white",
      trend: "bg-white/20 text-white"
    },
    green: {
      bg: "bg-green-500", 
      text: "text-white",
      border: "border-green-500",
      label: "text-white",
      trend: "bg-white/20 text-white"
    },
    purple: {
      bg: "bg-purple-500",
      text: "text-white", 
      border: "border-purple-500",
      label: "text-white",
      trend: "bg-white/20 text-white"
    },
    orange: {
      bg: "bg-orange-500",
      text: "text-white",
      border: "border-orange-500", 
      label: "text-white",
      trend: "bg-white/20 text-white"
    },
    yellow: {
      bg: "bg-yellow-500",
      text: "text-white",
      border: "border-yellow-500",
      label: "text-white",
      trend: "bg-white/20 text-white"
    },
    red: {
      bg: "bg-red-500",
      text: "text-white",
      border: "border-red-500",
      label: "text-white",
      trend: "bg-white/20 text-white"
    },
    indigo: {
      bg: "bg-indigo-500",
      text: "text-white",
      border: "border-indigo-500",
      label: "text-white",
      trend: "bg-white/20 text-white"
    }
  };

  const config = colorConfig[color];

  return (
    <div className={cn(
      "px-3 py-2 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md min-w-[120px] flex-shrink-0",
      config.bg
    )}>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <p className={cn("text-[10px] font-semibold uppercase tracking-wide", config.label)}>
            {title}
          </p>
          {trend && (
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", config.trend)}>
              {trend}
            </span>
          )}
        </div>
        <p className={cn("text-base font-bold tracking-tight", config.text)}>
          {value}
        </p>
      </div>
    </div>
  );
};

export const DashboardHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData>({
    modes: [],
  });
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const kpiScrollRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Get user roles for filtering
  const userRoles = user?.roles || [];
  const canViewSeller = userRoles.includes('ADMIN') || userRoles.includes('EXECUTIVE') || 
                        userRoles.includes('MANAGER') || userRoles.includes('ACQ') || 
                        userRoles.includes('TC');
  const canViewBuyer = userRoles.includes('ADMIN') || userRoles.includes('EXECUTIVE') || 
                       userRoles.includes('MANAGER') || userRoles.includes('DISP') || 
                       userRoles.includes('TC');
  const canViewVendor = userRoles.includes('ADMIN') || userRoles.includes('EXECUTIVE') || 
                        userRoles.includes('MANAGER');

  // Debounce timer ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!kpiScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - kpiScrollRef.current.offsetLeft);
    setScrollLeft(kpiScrollRef.current.scrollLeft);
    kpiScrollRef.current.style.cursor = 'grabbing';
    kpiScrollRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !kpiScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - kpiScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    kpiScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    if (kpiScrollRef.current) {
      kpiScrollRef.current.style.cursor = 'grab';
      kpiScrollRef.current.style.userSelect = 'auto';
    }
  };

  const getMinSearchLength = (value: string) => {
    const trimmed = value.trim();
    const digitsOnly = trimmed.replace(/\D/g, "");
    // Allow short numeric searches for address numbers / street numbers
    if (digitsOnly.length >= 2) return 2;
    return 3;
  };

  // Search function that calls API
  const performSearch = async (query: string) => {
    const trimmed = query.trim();
    const minLen = getMinSearchLength(trimmed);
    // Require minimum length (2+ digits OR 3+ chars)
    if (!trimmed || trimmed.length < minLen) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query.trim())}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Debug logging
        console.log('🔍 Search Debug Info:');
        console.log('User roles:', userRoles);
        console.log('Can view - Seller:', canViewSeller, '| Buyer:', canViewBuyer, '| Vendor:', canViewVendor);
        console.log('Raw search results from API:', data.data);
        
        // Filter results based on user role permissions
        const filteredResults = (data.data || []).filter((result: SearchResult) => {
          if (result.type === 'SELLER') return canViewSeller;
          if (result.type === 'BUYER') return canViewBuyer;
          if (result.type === 'VENDOR') return canViewVendor;
          return false;
        });
        
        console.log('Filtered results:', filteredResults);
        
        setSearchResults(filteredResults.slice(0, 8)); // Limit to 8 results
      } else {
        console.error('Search failed:', response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input changes with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const minLen = getMinSearchLength(value);
    // Show dropdown immediately if the query is long enough
    setShowDropdown(value.trim().length >= minLen);
    
    // Only show loading if query is long enough
    if (value.trim().length >= minLen) {
      setIsSearching(true);
    } else {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce the API call
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch KPI data from API
  useEffect(() => {
    const fetchKpiData = async () => {
      setIsLoadingKpis(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE}/metrics/major-kpis?timeframe=This Month`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          const data = result.data || {};
          // New format: modes is an array, data contains all KPIs
          setKpiData({
            modes: data.modes || [],
            // Admin KPIs
            contractsSigned: data.contractsSigned,
            contractsSold: data.contractsSold,
            totalProfit: data.totalProfit,
            // Manager KPIs (team-wide)
            totalContracts: data.totalContracts,
            leadsPerContract: data.leadsPerContract,
            leadsMishandled: data.leadsMishandled,
            leadsReceived: data.leadsReceived,
            slaBreaches: data.slaBreaches,
            stale48h: data.stale48h,
            mishandledColor: data.mishandledColor,
            // ACQ KPIs (personal)
            totalContractsPersonal: data.totalContractsPersonal,
            leadsPerContractPersonal: data.leadsPerContractPersonal,
            leadsMishandledPersonal: data.leadsMishandledPersonal,
            leadsReceivedPersonal: data.leadsReceivedPersonal,
            slaBreachesPersonal: data.slaBreachesPersonal,
            stale48hPersonal: data.stale48hPersonal,
            mishandledColorPersonal: data.mishandledColorPersonal,
          });
        } else {
          console.error('Failed to fetch KPI data:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setIsLoadingKpis(false);
      }
    };

    fetchKpiData();
    
    // Refresh KPI data frequently for near-live updates
    // Commented out: Now only fetches on page reload, not every 30 seconds
    // const intervalId = setInterval(fetchKpiData, 30 * 1000);
    
    // return () => clearInterval(intervalId);
  }, []);

  // Format currency values
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '$0';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${Math.round(value / 1000)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPct2 = (value: number | null | undefined): string => {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return n.toFixed(2);
  };

  const mishandledColor = (count: number): KPICardProps['color'] => {
    if (count >= 10) return 'red';
    if (count >= 5) return 'orange';
    if (count >= 1) return 'yellow';
    return 'green';
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'SELLER': return '🏠';
      case 'BUYER': return '🛒';
      case 'VENDOR': return '🔧';
      default: return '📄';
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'SELLER': return 'bg-green-100 text-green-700';
      case 'BUYER': return 'bg-blue-100 text-blue-700';
      case 'VENDOR': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Handle clicking on a search result
  const handleResultClick = (result: SearchResult) => {
    // Navigate to lead edit page
    navigate(`/leads/${result.id}/edit`);
    // Close dropdown and clear search
    setShowDropdown(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .hide-scrollbar:active {
          scroll-behavior: auto;
        }
      `}</style>
      <div className="py-2" style={{ paddingLeft: '32px', paddingRight: '32px' }}>
        <div className="flex items-center justify-between gap-6">
          
          {/* Company Branding - Very Compact */}
          <div className="flex items-center space-x-2 min-w-fit">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-sm">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">Local Homes Buyers</h1>
              <p className="text-xs text-gray-600">Real Estate CRM</p>
            </div>
          </div>

          {/* Search Bar - 40% width */}
          <div className="flex-1 max-w-lg mx-4 relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
                className="pl-10 pr-4 py-2 h-9 w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-md shadow-sm text-sm placeholder:text-gray-400 transition-all duration-200"
              />
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <Card className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-6 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
                    <p className="text-gray-500 text-sm">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-lg">{getResultIcon(result.type)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm">{result.name}</h4>
                              <Badge className={cn("text-xs font-medium uppercase", getResultTypeColor(result.type))}>
                                {result.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">{result.subtitle}</p>
                            {result.phone && (
                              <p className="text-xs text-gray-500 font-mono mt-0.5">{result.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= getMinSearchLength(searchQuery) ? (
                  <div className="p-6 text-center">
                    <Search className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500 text-sm">No results found for "{searchQuery}"</p>
                  </div>
                ) : searchQuery.length > 0 && searchQuery.length < getMinSearchLength(searchQuery) ? (
                  <div className="p-6 text-center">
                    <div className="text-2xl mb-2">⌨️</div>
                    <p className="text-gray-500 text-sm">Type at least 3 characters (or 2 digits) to search</p>
                  </div>
                ) : null}
              </Card>
            )}
          </div>

          {/* Compact KPIs - Horizontal Scrollable */}
          <div className="relative flex-1 max-w-[700px]">
            <div 
              ref={kpiScrollRef}
              className="overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
              <div className="flex gap-2 pb-1 justify-start items-center">
              {/* ADMIN KPIs */}
              {kpiData.modes?.includes('admin') && (
                <>
                  <KPICard
                    title="CONTRACTS (TEAM)"
                    value={isLoadingKpis ? "..." : String(kpiData.contractsSigned || 0)}
                    color="blue"
                  />
                  <KPICard
                    title="LEADS/CONTRACT (TEAM)"
                    value={isLoadingKpis ? "..." : formatPct2(kpiData.leadsPerContract)}
                    color="green"
                  />
                  <KPICard
                    title="MISHANDLED (TEAM)"
                    value={isLoadingKpis ? "..." : String(kpiData.leadsMishandled || 0)}
                    color={kpiData.mishandledColor || 'green'}
                  />
                </>
              )}
              
              {/* MANAGER KPIs (Team Stats) */}
              {kpiData.modes?.includes('manager') && (
                <>
                  <div className="h-8 w-px bg-white/30 flex-shrink-0" /> {/* Separator */}
                  <KPICard
                    title="CONTRACTS (TEAM)"
                    value={isLoadingKpis ? "..." : String(kpiData.totalContracts || 0)}
                    color="orange"
                  />
                  <KPICard
                    title="LEADS/CONTRACT (TEAM)"
                    value={isLoadingKpis ? "..." : formatPct2(kpiData.leadsPerContract)}
                    color="orange"
                  />
                  <KPICard
                    title="MISHANDLED (TEAM)"
                    value={isLoadingKpis ? "..." : String(kpiData.leadsMishandled || 0)}
                    color={kpiData.mishandledColor || 'green'}
                  />
                </>
              )}
              
              {/* ACQ KPIs (Personal Stats) */}
              {kpiData.modes?.includes('acq') && (
                <>
                  <div className="h-8 w-px bg-white/30 flex-shrink-0" /> {/* Separator */}
                  <KPICard
                    title="MY CONTRACTS"
                    value={isLoadingKpis ? "..." : String(kpiData.totalContractsPersonal || 0)}
                    color="indigo"
                  />
                  <KPICard
                    title="MY LEADS/CONTRACT"
                    value={isLoadingKpis ? "..." : formatPct2(kpiData.leadsPerContractPersonal)}
                    color="indigo"
                  />
                  <KPICard
                    title="MY MISHANDLED"
                    value={isLoadingKpis ? "..." : String(kpiData.leadsMishandledPersonal || 0)}
                    color={kpiData.mishandledColorPersonal || 'green'}
                  />
                </>
              )}
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <div className="flex gap-1 mt-1">
                      {user?.roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};