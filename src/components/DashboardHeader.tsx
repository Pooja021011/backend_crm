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
  color: "blue" | "green" | "purple" | "orange";
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
    }
  };

  const config = colorConfig[color];

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md min-w-[140px]",
      config.bg
    )}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn("text-xs font-semibold uppercase tracking-wide", config.label)}>
            {title}
          </p>
          {trend && (
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", config.trend)}>
              {trend}
            </span>
          )}
        </div>
        <p className={cn("text-lg font-bold tracking-tight", config.text)}>
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
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  // Search function that calls API
  const performSearch = async (query: string) => {
    // Require minimum 3 characters
    if (!query.trim() || query.trim().length < 3) {
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

    // Show dropdown immediately if there's text
    setShowDropdown(value.length >= 3);
    
    // Only show loading if query is long enough
    if (value.trim().length >= 3) {
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
    // Navigate to leads page with leadId parameter
    navigate(`/leads?leadId=${result.id}`);
    // Close dropdown and clear search
    setShowDropdown(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 py-2">
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
                placeholder="Search by seller/buyer name or property address..."
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
                ) : searchQuery.length >= 3 ? (
                  <div className="p-6 text-center">
                    <div className="text-2xl mb-2">🔍</div>
                    <p className="text-gray-500 text-sm">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">Try searching by property address, seller name, or buyer name</p>
                  </div>
                ) : searchQuery.length > 0 && searchQuery.length < 3 ? (
                  <div className="p-6 text-center">
                    <div className="text-2xl mb-2">⌨️</div>
                    <p className="text-gray-500 text-sm">Type at least 3 characters to search</p>
                    <p className="text-xs text-gray-400 mt-1">Search by property address, seller name, or buyer name</p>
                  </div>
                ) : null}
              </Card>
            )}
          </div>

          {/* Compact KPIs - 30% width */}
          <div className="flex gap-2 min-w-fit">
            <KPICard
              title="CONTRACTS SIGNED"
              value="24"
              trend="+12%"
              color="blue"
            />
            <KPICard
              title="CONTRACTS SOLD"
              value="18"
              trend="+8%"
              color="green"
            />
            <KPICard
              title="TOTAL PROFIT"
              value="$485K"
              trend="+15%"
              color="purple"
            />
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