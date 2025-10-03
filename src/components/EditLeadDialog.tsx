import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building,
  Target,
  Save,
  X,
  UserCheck
} from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useSettings } from "@/hooks/useSettings";
import { useAgents } from "@/hooks/useAgents";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateName, 
  validateAddress,
  validateCity,
  validateState,
  validateZipCode,
  validateCompanyName,
  formatPhoneNumber 
} from "@/utils/validation";
import type { Lead } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/config/api";

interface EditLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: () => void;
}

export const EditLeadDialog: React.FC<EditLeadDialogProps> = ({
  lead,
  open,
  onOpenChange,
  onLeadUpdated,
}) => {
  // Deal editing state (optional quick edit without opening view dialog)
  const [dealContractPrice, setDealContractPrice] = useState<string>("");
  const [dealSoldPrice, setDealSoldPrice] = useState<string>("");
  const [dealNetProfit, setDealNetProfit] = useState<string>("");
  const { user } = useAuth();
  const { updateLead } = useLeads();
  const { markets, leadSources, priceRanges, assetClasses, getCountiesByMarket, isLoading: settingsLoading } = useSettings();
  const { agents, isLoading: agentsLoading, getActiveAgents } = useAgents();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  
  // Check if current user is an ACQ agent
  const isACQAgent = user?.roles?.includes('ACQ');
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [availableCounties, setAvailableCounties] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    // General fields
    status: lead.status || 'NEW',
    marketId: lead.marketId || '',
    assignedUserId: lead.assignedUserId || '',
    pipelineStageId: lead.pipelineStageId || '',
    
    // Contact fields
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
    
    // Address fields (for sellers)
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    countyId: '',
    
    // Seller specific
    motivation: '',
    
    // Buyer specific - match Add form
    leadMarkets: [] as string[],
    priceRanges: [] as string[],
    assetClasses: [] as string[],
    propertiesPurchased: '0',
    creditScore: '',
    preApproved: false,
    buyerMotivation: '',
    timeline: '',
    
    // Vendor specific
    company: '',
    serviceType: '',
    vendorMarkets: [] as string[]
  });

  // Initialize form data when lead changes
  useEffect(() => {
    if (!lead) return;
    // Load deal for quick edit
    (async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/deals/${lead.id}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const json = await res.json();
        const d = json?.data;
        setDealContractPrice(d?.contractPrice != null ? String(d.contractPrice) : "");
        setDealSoldPrice(d?.soldPrice != null ? String(d.soldPrice) : "");
        setDealNetProfit(d?.netProfit != null ? String(d.netProfit) : "");
      } catch {}
    })();

    const contactInfo = lead.seller || lead.buyer || lead.vendor;
    
    setFormData({
      status: lead.status || 'NEW',
      marketId: lead.marketId || '',
      assignedUserId: lead.assignedUserId || '',
      pipelineStageId: lead.pipelineStageId || '',
      firstName: contactInfo?.firstName || '',
      lastName: contactInfo?.lastName || '',
      phone: contactInfo?.phone || '',
      email: contactInfo?.email || '',
      notes: lead.seller?.notes || '', // Only sellers have notes
      address1: lead.address?.address1 || '',
      address2: '', // address2 doesn't exist in schema
      city: lead.address?.city || '',
      state: lead.address?.state || '',
      zip: lead.address?.zip || '',
      countyId: lead.address?.countyId || '',
      motivation: lead.seller?.motivation || '',
      leadMarkets: lead.buyerCriteria?.marketIds || [],
      priceRanges: lead.buyerCriteria?.priceRangeIds || [],
      assetClasses: lead.buyerCriteria?.assetClassIds || [],
      propertiesPurchased: lead.buyer?.propertiesPurchased?.toString() || '0',
      creditScore: lead.buyer?.creditScore || '',
      preApproved: lead.buyer?.preApproved || false,
      buyerMotivation: lead.buyer?.motivation || '',
      timeline: lead.buyer?.timeline || '',
      company: lead.vendor?.company || '',
      serviceType: lead.vendor?.industry || '', // vendor uses industry field
      vendorMarkets: lead.vendor?.marketIds || []
    });

    if (lead.marketId) {
      setSelectedMarketId(lead.marketId);
    }
  }, [lead]);

  // Update available counties when market changes
  useEffect(() => {
    if (selectedMarketId) {
      const marketCounties = getCountiesByMarket(selectedMarketId);
      setAvailableCounties(marketCounties);
    } else {
      setAvailableCounties([]);
    }
  }, [selectedMarketId, getCountiesByMarket]);

  // Load pipeline stages based on lead type
  useEffect(() => {
    if (!lead) return;
    
    const loadPipelineStages = async () => {
      try {
        setLoadingStages(true);
        let pipelineKey = 'ACQUISITIONS'; // Default
        
        if (lead.leadType === 'SELLER') {
          pipelineKey = 'ACQUISITIONS';
        } else if (lead.leadType === 'BUYER') {
          pipelineKey = 'DISPOSITIONS';
        } else if (lead.leadType === 'VENDOR') {
          pipelineKey = 'ACQUISITIONS';
        }
        
        const response = await fetch(`${API_BASE}/pipeline/${pipelineKey}/stages`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPipelineStages(data.data || []);
        }
      } catch (error) {
        console.error('Error loading pipeline stages:', error);
        toast({
          title: "Warning",
          description: "Could not load pipeline stages.",
          variant: "destructive"
        });
      } finally {
        setLoadingStages(false);
      }
    };
    
    loadPipelineStages();
  }, [lead, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelectChange = (field: 'leadMarkets' | 'priceRanges' | 'assetClasses' | 'vendorMarkets', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter((item: string) => item !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData: any = {
        status: formData.status,
        marketId: formData.marketId || undefined,
        assignedUserId: formData.assignedUserId || undefined,
        pipelineStageId: formData.pipelineStageId || undefined,
      };

      // Update type-specific data
      if (lead.leadType === 'SELLER') {
        updateData.seller = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          motivation: formData.motivation,
          notes: formData.notes.trim()
        };
        
        updateData.address = {
          address1: formData.address1.trim(),
          address2: formData.address2.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
          countyId: formData.countyId || undefined
        };
      } else if (lead.leadType === 'BUYER') {
        updateData.buyer = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          propertiesPurchased: parseInt(formData.propertiesPurchased) || 0,
          creditScore: formData.creditScore || undefined,
          preApproved: formData.preApproved,
          motivation: formData.buyerMotivation || undefined,
          timeline: formData.timeline || undefined
        };
        
        // Update buyer criteria if any data
        const criteriaData = {
          marketIds: formData.leadMarkets.length > 0 ? formData.leadMarkets : undefined,
          priceRangeIds: formData.priceRanges.length > 0 ? formData.priceRanges : undefined,
          assetClassIds: formData.assetClasses.length > 0 ? formData.assetClasses : undefined
        };
        
        const hasCriteria = criteriaData.marketIds || criteriaData.priceRangeIds || criteriaData.assetClassIds;
        if (hasCriteria) {
          updateData.buyerCriteria = criteriaData;
        }
      } else if (lead.leadType === 'VENDOR') {
        updateData.vendor = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          industry: formData.serviceType,
          marketIds: formData.vendorMarkets.length > 0 ? formData.vendorMarkets : undefined
        };
      }

      await updateLead(lead.id, updateData);

      // Save deal quick edits if any value provided
      if (dealContractPrice || dealSoldPrice || dealNetProfit) {
        const accessToken = localStorage.getItem('accessToken');
        await fetch(`${API_BASE}/deals/${lead.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify({
            contractPrice: dealContractPrice ? Number(dealContractPrice) : null,
            soldPrice: dealSoldPrice ? Number(dealSoldPrice) : null,
            netProfit: dealNetProfit ? Number(dealNetProfit) : null,
          })
        });
      }
      
      toast({
        title: "Lead Updated",
        description: "The lead has been successfully updated.",
      });
      
      onLeadUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'SELLER': return 'bg-green-100 text-green-800';
      case 'BUYER': return 'bg-blue-100 text-blue-800';
      case 'VENDOR': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">Edit Lead</DialogTitle>
              <Badge className={getLeadTypeColor(lead.leadType)}>
                {lead.leadType}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Update the lead information below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="CONTACTED">Contacted</SelectItem>
                      <SelectItem value="QUALIFIED">Qualified</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Market</Label>
                  <Select 
                    value={formData.marketId} 
                    onValueChange={(value) => {
                      handleInputChange('marketId', value);
                      setSelectedMarketId(value);
                      handleInputChange('countyId', '');
                    }}
                    disabled={settingsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={settingsLoading ? "Loading..." : "Select market"} />
                    </SelectTrigger>
                    <SelectContent>
                      {markets.map((market) => (
                        <SelectItem key={market.id} value={market.id}>
                          {market.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Assigned Agent
                </Label>
                <Select 
                  value={formData.assignedUserId || 'unassigned'} 
                  onValueChange={(value) => handleInputChange('assignedUserId', value === 'unassigned' ? null : value)}
                  disabled={agentsLoading || (isACQAgent && lead.leadType === 'SELLER')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Select agent"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {getActiveAgents().map((agent) => {
                      const initials = `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`;
                      const fullName = `${agent.firstName} ${agent.lastName}`;
                      const roleNames = agent.roles.map(role => role.role.name).join(', ');
                      
                      return (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {initials}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{fullName}</span>
                              <span className="text-xs text-gray-500">{roleNames}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                    {getActiveAgents().length === 0 && !agentsLoading && (
                      <SelectItem value="no-agents" disabled>
                        No agents available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Pipeline Stage
                </Label>
                <Select 
                  value={formData.pipelineStageId || 'none'} 
                  onValueChange={(value) => handleInputChange('pipelineStageId', value === 'none' ? '' : value)}
                  disabled={loadingStages}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingStages ? "Loading stages..." : "Select pipeline stage"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                    {pipelineStages.length === 0 && !loadingStages && (
                      <SelectItem value="none" disabled>
                        No stages available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {pipelineStages.length === 0 && !loadingStages && (
                  <p className="text-xs text-amber-600">⚠ No stages available for your role</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="contact" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contact">Contact Info</TabsTrigger>
              {lead.leadType === 'SELLER' && <TabsTrigger value="property">Property</TabsTrigger>}
              {lead.leadType === 'BUYER' && <TabsTrigger value="criteria">Criteria</TabsTrigger>}
              {lead.leadType === 'VENDOR' && <TabsTrigger value="service">Service</TabsTrigger>}
              <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="deal">Deal</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ValidatedInput
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onValueChange={(value) => handleInputChange('firstName', value)}
                      validator={(value) => validateName(value, 'First name')}
                      placeholder="Enter first name"
                      required
                      icon={<User className="w-4 h-4" />}
                    />
                    <ValidatedInput
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onValueChange={(value) => handleInputChange('lastName', value)}
                      validator={(value) => validateName(value, 'Last name')}
                      placeholder="Enter last name"
                      required
                      icon={<User className="w-4 h-4" />}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ValidatedInput
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onValueChange={(value) => handleInputChange('phone', value)}
                      validator={validatePhoneNumber}
                      formatter={formatPhoneNumber}
                      placeholder="(555) 123-4567"
                      required
                      icon={<Phone className="w-4 h-4" />}
                    />
                    <ValidatedInput
                      label="Email Address"
                      name="email"
                      value={formData.email}
                      onValueChange={(value) => handleInputChange('email', value)}
                      validator={validateEmail}
                      placeholder="email@example.com"
                      required
                      icon={<Mail className="w-4 h-4" />}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {lead.leadType === 'SELLER' && (
              <TabsContent value="property" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ValidatedInput
                      label="Property Address"
                      name="address1"
                      value={formData.address1}
                      onValueChange={(value) => handleInputChange('address1', value)}
                      validator={validateAddress}
                      placeholder="Enter property address"
                      required
                      icon={<MapPin className="w-4 h-4" />}
                    />

                    <div className="grid grid-cols-4 gap-4">
                      <ValidatedInput
                        label="City"
                        name="city"
                        value={formData.city}
                        onValueChange={(value) => handleInputChange('city', value)}
                        validator={validateCity}
                        placeholder="Enter city"
                      />
                      <ValidatedInput
                        label="State"
                        name="state"
                        value={formData.state}
                        onValueChange={(value) => handleInputChange('state', value.toUpperCase())}
                        validator={validateState}
                        placeholder="NC"
                        maxLength={2}
                      />
                      <ValidatedInput
                        label="ZIP Code"
                        name="zip"
                        value={formData.zip}
                        onValueChange={(value) => handleInputChange('zip', value)}
                        validator={validateZipCode}
                        placeholder="28202"
                      />
                      
                      <div className="space-y-2">
                        <Label>County</Label>
                        <Select 
                          value={formData.countyId} 
                          onValueChange={(value) => handleInputChange('countyId', value)}
                          disabled={settingsLoading || !selectedMarketId || availableCounties.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue 
                              placeholder={
                                !selectedMarketId 
                                  ? "Select market first" 
                                  : availableCounties.length === 0 
                                  ? "No counties available" 
                                  : "Select county"
                              } 
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCounties.map((county) => (
                              <SelectItem key={county.id} value={county.id}>
                                {county.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Motivation Level</Label>
                      <Select value={formData.motivation} onValueChange={(value) => handleInputChange('motivation', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select motivation level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Very High">Very High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {lead.leadType === 'BUYER' && (
              <TabsContent value="criteria" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Buyer Criteria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Lead Market */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700">
                        Lead Market
                      </Label>
                      <p className="text-xs text-gray-500">Select the markets this buyer is interested in</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {markets.map((market) => (
                          <div key={market.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <Checkbox
                              id={`market-${market.id}`}
                              checked={formData.leadMarkets.includes(market.id)}
                              onCheckedChange={(checked) => 
                                handleMultiSelectChange('leadMarkets', market.id, checked as boolean)
                              }
                              className="border-gray-300"
                              disabled={settingsLoading}
                            />
                            <Label 
                              htmlFor={`market-${market.id}`} 
                              className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                            >
                              {market.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700">
                        Price Range
                      </Label>
                      <p className="text-xs text-gray-500">Select the price ranges this buyer is considering</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {priceRanges.map((range) => (
                          <div key={range.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <Checkbox
                              id={`price-${range.id}`}
                              checked={formData.priceRanges.includes(range.id)}
                              onCheckedChange={(checked) => 
                                handleMultiSelectChange('priceRanges', range.id, checked as boolean)
                              }
                              className="border-gray-300"
                              disabled={settingsLoading}
                            />
                            <Label 
                              htmlFor={`price-${range.id}`} 
                              className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                            >
                              {range.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Asset Class */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700">
                        Asset Class
                      </Label>
                      <p className="text-xs text-gray-500">Select the asset classes this buyer is interested in</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {assetClasses.map((assetClass) => (
                          <div key={assetClass.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <Checkbox
                              id={`asset-${assetClass.id}`}
                              checked={formData.assetClasses.includes(assetClass.id)}
                              onCheckedChange={(checked) => 
                                handleMultiSelectChange('assetClasses', assetClass.id, checked as boolean)
                              }
                              className="border-gray-300"
                              disabled={settingsLoading}
                            />
                            <Label 
                              htmlFor={`asset-${assetClass.id}`} 
                              className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                            >
                              {assetClass.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Buyer Qualification */}
                    <div className="space-y-6 mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Buyer Qualification</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Properties Purchased */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Properties Purchased
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.propertiesPurchased}
                            onChange={(e) => handleInputChange('propertiesPurchased', e.target.value)}
                            placeholder="0"
                            className="h-10 border-gray-300"
                          />
                        </div>

                        {/* Credit Score */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Credit Score
                          </Label>
                          <Select 
                            value={formData.creditScore} 
                            onValueChange={(value) => handleInputChange('creditScore', value)}
                          >
                            <SelectTrigger className="h-10 border-gray-300">
                              <SelectValue placeholder="Select credit score range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Excellent">Excellent (750+)</SelectItem>
                              <SelectItem value="Good">Good (700-749)</SelectItem>
                              <SelectItem value="Fair">Fair (650-699)</SelectItem>
                              <SelectItem value="Poor">Poor (&lt;650)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Motivation */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Motivation Level
                          </Label>
                          <Select 
                            value={formData.buyerMotivation} 
                            onValueChange={(value) => handleInputChange('buyerMotivation', value)}
                          >
                            <SelectTrigger className="h-10 border-gray-300">
                              <SelectValue placeholder="Select motivation level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Timeline
                          </Label>
                          <Select 
                            value={formData.timeline} 
                            onValueChange={(value) => handleInputChange('timeline', value)}
                          >
                            <SelectTrigger className="h-10 border-gray-300">
                              <SelectValue placeholder="Select purchase timeline" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Immediate">Immediate</SelectItem>
                              <SelectItem value="30 Days">Within 30 Days</SelectItem>
                              <SelectItem value="60 Days">Within 60 Days</SelectItem>
                              <SelectItem value="90+ Days">90+ Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Pre-Approved */}
                      <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id="edit-preApproved"
                          checked={formData.preApproved}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, preApproved: checked as boolean }))
                          }
                          className="border-gray-300"
                        />
                        <Label 
                          htmlFor="edit-preApproved" 
                          className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                        >
                          Pre-Approved for Financing
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {lead.leadType === 'VENDOR' && (
              <TabsContent value="service" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Service Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ValidatedInput
                      label="Company"
                      name="company"
                      value={formData.company}
                      onValueChange={(value) => handleInputChange('company', value)}
                      validator={validateCompanyName}
                      placeholder="Company Name"
                      required
                      icon={<Building className="w-4 h-4" />}
                    />

                    <div className="space-y-2">
                      <Label>Service Type</Label>
                      <Select value={formData.serviceType} onValueChange={(value) => handleInputChange('serviceType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Title Agent">Title Agent</SelectItem>
                          <SelectItem value="Lawyer">Lawyer</SelectItem>
                          <SelectItem value="Inspector">Inspector</SelectItem>
                          <SelectItem value="Appraiser">Appraiser</SelectItem>
                          <SelectItem value="Contractor">Contractor</SelectItem>
                          <SelectItem value="Project Manager">Project Manager</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Markets */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Market
                      </Label>
                      <p className="text-xs text-gray-500">Select the markets this vendor works within</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {markets.map((market) => (
                          <div key={market.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <Checkbox
                              id={`vendor-market-${market.id}`}
                              checked={formData.vendorMarkets.includes(market.id)}
                              onCheckedChange={(checked) => 
                                handleMultiSelectChange('vendorMarkets', market.id, checked as boolean)
                              }
                              className="border-gray-300"
                              disabled={settingsLoading}
                            />
                            <Label 
                              htmlFor={`vendor-market-${market.id}`} 
                              className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                            >
                              {market.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Add any additional notes about this lead..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          <TabsContent value="deal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deal (Quick Edit)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Contract Price</Label>
                    <Input type="number" value={dealContractPrice} onChange={(e) => setDealContractPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label>Sold Price</Label>
                    <Input type="number" value={dealSoldPrice} onChange={(e) => setDealSoldPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label>Net Profit</Label>
                    <Input type="number" value={dealNetProfit} onChange={(e) => setDealNetProfit(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
