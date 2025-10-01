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
  const { markets, leadSources, getCountiesByMarket, isLoading: settingsLoading } = useSettings();
  const { agents, isLoading: agentsLoading, getActiveAgents } = useAgents();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
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
    
    // Buyer specific
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    minBathrooms: '',
    preferredAreas: '',
    
    // Vendor specific
    company: '',
    serviceType: ''
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
      firstName: contactInfo?.firstName || '',
      lastName: contactInfo?.lastName || '',
      phone: contactInfo?.phone || '',
      email: contactInfo?.email || '',
      notes: contactInfo?.notes || '',
      address1: lead.address?.address1 || '',
      address2: lead.address?.address2 || '',
      city: lead.address?.city || '',
      state: lead.address?.state || '',
      zip: lead.address?.zip || '',
      countyId: lead.address?.countyId || '',
      motivation: lead.seller?.motivation || '',
      minPrice: lead.buyerCriteria?.minPrice?.toString() || '',
      maxPrice: lead.buyerCriteria?.maxPrice?.toString() || '',
      minBedrooms: lead.buyerCriteria?.minBedrooms?.toString() || '',
      minBathrooms: lead.buyerCriteria?.minBathrooms?.toString() || '',
      preferredAreas: lead.buyerCriteria?.preferredAreas || '',
      company: lead.vendor?.company || '',
      serviceType: lead.vendor?.serviceType || ''
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
          notes: formData.notes.trim()
        };
        
        updateData.buyerCriteria = {
          minPrice: formData.minPrice ? parseInt(formData.minPrice) : undefined,
          maxPrice: formData.maxPrice ? parseInt(formData.maxPrice) : undefined,
          minBedrooms: formData.minBedrooms ? parseInt(formData.minBedrooms) : undefined,
          minBathrooms: formData.minBathrooms ? parseInt(formData.minBathrooms) : undefined,
          preferredAreas: formData.preferredAreas.trim() || undefined
        };
      } else if (lead.leadType === 'VENDOR') {
        updateData.vendor = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          serviceType: formData.serviceType,
          notes: formData.notes.trim()
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
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Price</Label>
                        <ValidatedInput
                          name="minPrice"
                          value={formData.minPrice}
                          onValueChange={(value) => handleInputChange('minPrice', value)}
                          placeholder="100000"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Price</Label>
                        <ValidatedInput
                          name="maxPrice"
                          value={formData.maxPrice}
                          onValueChange={(value) => handleInputChange('maxPrice', value)}
                          placeholder="500000"
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Bedrooms</Label>
                        <ValidatedInput
                          name="minBedrooms"
                          value={formData.minBedrooms}
                          onValueChange={(value) => handleInputChange('minBedrooms', value)}
                          placeholder="3"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Min Bathrooms</Label>
                        <ValidatedInput
                          name="minBathrooms"
                          value={formData.minBathrooms}
                          onValueChange={(value) => handleInputChange('minBathrooms', value)}
                          placeholder="2"
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Areas</Label>
                      <Textarea
                        value={formData.preferredAreas}
                        onChange={(e) => handleInputChange('preferredAreas', e.target.value)}
                        placeholder="Describe preferred neighborhoods or areas..."
                        rows={3}
                      />
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
                  <CardContent className="space-y-4">
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
                          <SelectItem value="Real Estate Agent">Real Estate Agent</SelectItem>
                          <SelectItem value="Lender">Lender</SelectItem>
                          <SelectItem value="Insurance Agent">Insurance Agent</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
