import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Filter, 
  X, 
  CalendarIcon, 
  ChevronDown,
  Search,
  RefreshCw
} from 'lucide-react';
import { safeDateFormat } from '@/utils/validation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { LeadType } from '@/hooks/useLeads';

export interface LeadFilterParams {
  type?: LeadType;
  marketId?: string;
  countyId?: string;
  pipelineStageId?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  tasksDueBefore?: string;
  priceRangeIds?: string[];
  assetClassIds?: string[];
  vipBuyer?: boolean;
  blacklistedBuyer?: boolean;
  vendorCompany?: string;
  vendorIndustry?: string;
  q?: string;
}

interface LeadFiltersProps {
  leadType: LeadType;
  filters: LeadFilterParams;
  onFiltersChange: (filters: LeadFilterParams) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

// Mock data - in real app, fetch from APIs
const mockMarkets = [
  { id: '1', name: 'Charlotte, NC' },
  { id: '2', name: 'Raleigh, NC' },
  { id: '3', name: 'Asheville, NC' },
  { id: '4', name: 'Greensboro, NC' }
];

const mockCounties = [
  { id: '1', name: 'Mecklenburg County' },
  { id: '2', name: 'Wake County' },
  { id: '3', name: 'Buncombe County' },
  { id: '4', name: 'Guilford County' }
];

const mockPipelineStages = [
  { id: '1', name: 'New Lead' },
  { id: '2', name: 'Contact Made' },
  { id: '3', name: 'Appointment Set' },
  { id: '4', name: 'Under Contract' },
  { id: '5', name: 'Closed' }
];

const mockPriceRanges = [
  { id: '1', label: '$0 - $100K' },
  { id: '2', label: '$100K - $200K' },
  { id: '3', label: '$200K - $300K' },
  { id: '4', label: '$300K+' }
];

const mockAssetClasses = [
  { id: '1', name: 'Single Family' },
  { id: '2', name: 'Condo' },
  { id: '3', name: 'Townhouse' },
  { id: '4', name: 'Multi-Family' }
];

const leadStatuses = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATING',
  'UNDER_CONTRACT',
  'CLOSED',
  'DEAD'
];

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  leadType,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Check user role permissions
  const userRoles = user?.roles || [];
  const isACQ = userRoles.includes('ACQ');
  const isDisp = userRoles.includes('DISP');
  const isTC = userRoles.includes('TC');
  const isAdmin = userRoles.includes('ADMIN');
  const isManager = userRoles.includes('MANAGER');
  const isExecutive = userRoles.includes('EXECUTIVE');

  // Role-based lead type restrictions
  const canViewSellerLeads = isAdmin || isExecutive || isManager || isACQ || isTC;
  const canViewBuyerLeads = isAdmin || isExecutive || isManager || isDisp || isTC;
  const canViewVendorLeads = isAdmin || isExecutive || isManager;

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.marketId) count++;
    if (filters.countyId) count++;
    if (filters.pipelineStageId) count++;
    if (filters.status) count++;
    if (filters.createdFrom || filters.createdTo) count++;
    if (filters.updatedFrom || filters.updatedTo) count++;
    if (filters.tasksDueBefore) count++;
    if (filters.priceRangeIds?.length) count++;
    if (filters.assetClassIds?.length) count++;
    if (filters.vipBuyer !== undefined) count++;
    if (filters.blacklistedBuyer !== undefined) count++;
    if (filters.vendorCompany) count++;
    if (filters.vendorIndustry) count++;
    if (filters.q) count++;
    
    setActiveFilterCount(count);
  }, [filters]);

  const handleFilterChange = (key: keyof LeadFilterParams, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateChange = (key: keyof LeadFilterParams, date: Date | undefined) => {
    handleFilterChange(key, date ? format(date, 'yyyy-MM-dd') : undefined);
  };

  const handleArrayFilterChange = (key: 'priceRangeIds' | 'assetClassIds', value: string, checked: boolean) => {
    const currentArray = filters[key] || [];
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <CardTitle className="text-lg">Lead Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              disabled={activeFilterCount === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={cn("w-4 h-4 mr-1 transition-transform", isExpanded && "rotate-180")} />
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search"
              value={filters.q || ''}
              onChange={(e) => handleFilterChange('q', e.target.value || undefined)}
              className="pl-10"
            />
          </div>
          <Button onClick={onApplyFilters} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t">
            {/* Market Filter */}
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <Select 
                value={filters.marketId || 'all'} 
                onValueChange={(value) => handleFilterChange('marketId', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {mockMarkets.map(market => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* County Filter */}
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Select 
                value={filters.countyId || 'all'} 
                onValueChange={(value) => handleFilterChange('countyId', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {mockCounties.map(county => (
                    <SelectItem key={county.id} value={county.id}>
                      {county.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Lead Status</Label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {leadStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pipeline Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="pipeline">Pipeline Status</Label>
              <Select 
                value={filters.pipelineStageId || 'all'} 
                onValueChange={(value) => handleFilterChange('pipelineStageId', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {mockPipelineStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buyer-specific filters */}
            {leadType === 'BUYER' && canViewBuyerLeads && (
              <>
                {/* Price Range Filter */}
                <div className="space-y-2">
                  <Label>Price Range</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {mockPriceRanges.map(range => (
                      <div key={range.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`price-${range.id}`}
                          checked={filters.priceRangeIds?.includes(range.id) || false}
                          onCheckedChange={(checked) => 
                            handleArrayFilterChange('priceRangeIds', range.id, !!checked)
                          }
                        />
                        <Label htmlFor={`price-${range.id}`} className="text-sm">
                          {range.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asset Class Filter */}
                <div className="space-y-2">
                  <Label>Asset Class</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {mockAssetClasses.map(assetClass => (
                      <div key={assetClass.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`asset-${assetClass.id}`}
                          checked={filters.assetClassIds?.includes(assetClass.id) || false}
                          onCheckedChange={(checked) => 
                            handleArrayFilterChange('assetClassIds', assetClass.id, !!checked)
                          }
                        />
                        <Label htmlFor={`asset-${assetClass.id}`} className="text-sm">
                          {assetClass.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VIP/Blacklisted Filters */}
                <div className="space-y-2">
                  <Label>Buyer Type</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="vip-buyer"
                        checked={filters.vipBuyer === true}
                        onCheckedChange={(checked) => 
                          handleFilterChange('vipBuyer', checked ? true : undefined)
                        }
                      />
                      <Label htmlFor="vip-buyer" className="text-sm">VIP Buyers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="blacklisted-buyer"
                        checked={filters.blacklistedBuyer === true}
                        onCheckedChange={(checked) => 
                          handleFilterChange('blacklistedBuyer', checked ? true : undefined)
                        }
                      />
                      <Label htmlFor="blacklisted-buyer" className="text-sm">Blacklisted</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Vendor-specific filters */}
            {leadType === 'VENDOR' && canViewVendorLeads && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Filter by company"
                    value={filters.vendorCompany || ''}
                    onChange={(e) => handleFilterChange('vendorCompany', e.target.value || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="Filter by industry"
                    value={filters.vendorIndustry || ''}
                    onChange={(e) => handleFilterChange('vendorIndustry', e.target.value || undefined)}
                  />
                </div>
              </>
            )}

            {/* Date Filters */}
            <div className="space-y-2">
              <Label>Created Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {filters.createdFrom ? safeDateFormat(filters.createdFrom, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdFrom ? new Date(filters.createdFrom) : undefined}
                      onSelect={(date) => handleDateChange('createdFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {filters.createdTo ? safeDateFormat(filters.createdTo, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdTo ? new Date(filters.createdTo) : undefined}
                      onSelect={(date) => handleDateChange('createdTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Updated Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {filters.updatedFrom ? safeDateFormat(filters.updatedFrom, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.updatedFrom ? new Date(filters.updatedFrom) : undefined}
                      onSelect={(date) => handleDateChange('updatedFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {filters.updatedTo ? safeDateFormat(filters.updatedTo, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.updatedTo ? new Date(filters.updatedTo) : undefined}
                      onSelect={(date) => handleDateChange('updatedTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tasks Due Filter */}
            <div className="space-y-2">
              <Label>Tasks Due Before</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {filters.tasksDueBefore ? safeDateFormat(filters.tasksDueBefore, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.tasksDueBefore ? new Date(filters.tasksDueBefore) : undefined}
                    onSelect={(date) => handleDateChange('tasksDueBefore', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Apply/Clear Actions */}
        {isExpanded && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClearFilters} disabled={activeFilterCount === 0}>
              Clear All Filters
            </Button>
            <Button onClick={onApplyFilters} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Apply Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
