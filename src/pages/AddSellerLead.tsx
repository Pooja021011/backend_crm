import { useState, useEffect } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useSettings } from "@/hooks/useSettings";
import { useAgents } from "@/hooks/useAgents";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
import { PendingFileUploader, type PendingFileItem } from "@/components/PendingFileUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar as CalendarIcon,
  Building,
  Target,
  AlertCircle,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateName, 
  validateAddress,
  validateCity,
  validateState,
  validateZipCode,
  formatPhoneNumber 
} from "@/utils/validation";

const AddSellerLead = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createLead } = useLeads();
  const { markets, counties, leadSources, getCountiesByMarket, isLoading: settingsLoading } = useSettings();
  const { getActiveAgents, isLoading: agentsLoading } = useAgents();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [availableCounties, setAvailableCounties] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);

  // Get active agents with ACQ role
  const acquisitionsAgents = getActiveAgents().filter(agent => 
    agent.roles.some(role => role.role.name === 'ACQ')
  );

  // Update available counties when market changes
  useEffect(() => {
    if (selectedMarketId) {
      const marketCounties = getCountiesByMarket(selectedMarketId);
      setAvailableCounties(marketCounties);
    } else {
      setAvailableCounties([]);
    }
  }, [selectedMarketId, getCountiesByMarket]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
    leadSource: "",
    acquisitionsAgentId: "",
    propertyAddress: "",
    city: "",
    state: "",
    zip: "",
    motivation: "Medium",
    marketId: "",
    countyId: ""
  });


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
  };

  const handleAddressChange = (address: string) => {
    handleInputChange('propertyAddress', address);
    
    // Auto-populate logic would go here
    if (address.length > 10) {
      console.log("Auto-populating property information for:", address);
    }
  };

  const validateForm = () => {
    const hasRequiredFields = formData.firstName.trim() && 
           formData.lastName.trim() && 
           formData.phoneNumber.trim() && 
           formData.emailAddress.trim() && 
           formData.propertyAddress.trim() &&
           formData.leadSource &&
           formData.acquisitionsAgentId &&
           selectedDate;
           
    return hasRequiredFields;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const leadData = {
        type: 'SELLER' as const,
        marketId: formData.marketId || undefined,
        seller: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phoneNumber.trim(),
          email: formData.emailAddress.trim(),
          motivation: formData.motivation,
          notes: `Lead Source: ${formData.leadSource}`
        },
        address: {
          address1: formData.propertyAddress.trim(),
          city: formData.city.trim() || 'Unknown',
          state: formData.state.trim() || 'Unknown',
          zip: formData.zip.trim() || '00000',
          countyId: formData.countyId || undefined
        },
        assignedUserId: formData.acquisitionsAgentId || undefined,
        pipelineStageId: undefined // Will use default pipeline stage
      };

      const createdLead = await createLead(leadData);
      
      // Upload pending files if any
      if (pendingFiles.length > 0 && createdLead?.id) {
        let uploadedCount = 0;
        let failedCount = 0;
        
        for (const pendingFile of pendingFiles) {
          // Only upload files that have categories assigned
          if (pendingFile.category) {
            try {
              const formData = new FormData();
              formData.append('file', pendingFile.file);
              formData.append('leadId', createdLead.id);
              formData.append('category', pendingFile.category);
              formData.append('tags', JSON.stringify(pendingFile.tags));
              formData.append('description', pendingFile.description || '');
              formData.append('isPublic', 'false');

              const response = await fetch('/api/v1/files/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
              });

              if (response.ok) {
                uploadedCount++;
              } else {
                failedCount++;
              }
            } catch (error) {
              failedCount++;
            }
          }
        }
        
        if (uploadedCount > 0) {
          toast({
            title: "Lead and Files Added Successfully",
            description: `${formData.firstName} ${formData.lastName} has been added with ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}.${failedCount > 0 ? ` ${failedCount} file${failedCount !== 1 ? 's' : ''} failed to upload.` : ''}`,
          });
        } else if (failedCount > 0) {
          toast({
            title: "Lead Added, File Upload Failed",
            description: `${formData.firstName} ${formData.lastName} has been added, but ${failedCount} file${failedCount !== 1 ? 's' : ''} failed to upload.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Seller Lead Added Successfully",
          description: `${formData.firstName} ${formData.lastName} has been added to your leads.`,
        });
      }
      
      navigate('/leads');
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error Adding Lead",
        description: error instanceof Error ? error.message : "An error occurred while adding the lead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const hasRequiredFields = formData.firstName.trim() && 
           formData.lastName.trim() && 
           formData.phoneNumber.trim() && 
           formData.emailAddress.trim() && 
           formData.propertyAddress.trim() &&
           formData.leadSource &&
           formData.acquisitionsAgentId &&
           selectedDate;
           
    const hasNoErrors = Object.values(errors).every(error => !error);
    
    return hasRequiredFields && hasNoErrors;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/leads')}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Leads
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-900">Add Seller Lead</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/leads')}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid() || isLoading}
              className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Lead
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Lead Information Section */}
          <Card className="p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Lead Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
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

              {/* Last Name */}
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

              {/* Phone Number */}
              <ValidatedInput
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onValueChange={(value) => handleInputChange('phoneNumber', value)}
                validator={validatePhoneNumber}
                formatter={formatPhoneNumber}
                placeholder="(555) 123-4567"
                required
                icon={<Phone className="w-4 h-4" />}
              />

              {/* Email Address */}
              <ValidatedInput
                label="Email Address"
                name="emailAddress"
                type="email"
                value={formData.emailAddress}
                onValueChange={(value) => handleInputChange('emailAddress', value)}
                validator={validateEmail}
                placeholder="email@example.com"
                required
                icon={<Mail className="w-4 h-4" />}
              />
              
              {/* Motivation */}
              <div className="space-y-2">
                <Label htmlFor="motivation" className="text-sm font-medium text-gray-700">
                  Seller Motivation
                </Label>
                <Select value={formData.motivation} onValueChange={(value) => handleInputChange('motivation', value)}>
                  <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
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
            </div>
          </Card>

          {/* Assignment & Source Section */}
          <Card className="p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Assignment & Source</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Source */}
              <div className="space-y-2">
                <Label htmlFor="leadSource" className="text-sm font-medium text-gray-700">
                  Lead Source *
                </Label>
                <Select 
                  value={formData.leadSource} 
                  onValueChange={(value) => handleInputChange('leadSource', value)}
                  disabled={settingsLoading}
                >
                  <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue placeholder={settingsLoading ? "Loading..." : "Select lead source"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map((source) => (
                      <SelectItem key={source.id} value={source.name}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Market */}
              <div className="space-y-2">
                <Label htmlFor="market" className="text-sm font-medium text-gray-700">
                  Market *
                </Label>
                <Select 
                  value={formData.marketId} 
                  onValueChange={(value) => {
                    handleInputChange('marketId', value);
                    setSelectedMarketId(value);
                    // Reset county when market changes
                    handleInputChange('countyId', '');
                  }}
                  disabled={settingsLoading}
                >
                  <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
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

              {/* Acquisitions Agent */}
              <div className="space-y-2">
                <Label htmlFor="acquisitionsAgentId" className="text-sm font-medium text-gray-700">
                  Acquisitions Agent *
                </Label>
                <Select 
                  value={formData.acquisitionsAgentId} 
                  onValueChange={(value) => {
                    handleInputChange('acquisitionsAgentId', value);
                    validateField('acquisitionsAgentId', value);
                  }}
                  disabled={agentsLoading}
                >
                  <SelectTrigger className={cn(
                    "h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20",
                    errors.acquisitionsAgentId && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}>
                    <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Select acquisitions agent"} />
                  </SelectTrigger>
                  <SelectContent>
                    {acquisitionsAgents.map((agent) => {
                      const initials = `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`;
                      const fullName = `${agent.firstName} ${agent.lastName}`;
                      return (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {initials}
                              </span>
                            </div>
                            {fullName}
                          </div>
                        </SelectItem>
                      );
                    })}
                    {acquisitionsAgents.length === 0 && !agentsLoading && (
                      <SelectItem value="" disabled>
                        No acquisitions agents available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.acquisitionsAgentId && (
                  <Alert className="py-2 px-3 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-600">
                      {errors.acquisitionsAgentId}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Date Created */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Date Created *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-left font-normal border-gray-300 focus:border-blue-500 focus:ring-blue-500/20",
                        selectedDate ? "text-gray-900" : "text-muted-foreground",
                        errors.selectedDate && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date && errors.selectedDate) {
                          setErrors(prev => ({ ...prev, selectedDate: "" }));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.selectedDate && (
                  <Alert className="py-2 px-3 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-600">
                      {errors.selectedDate}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </Card>

          {/* Property Information Section */}
          <Card className="p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Property Information</h2>
            </div>
            
            <div className="space-y-6">
              {/* Property Address */}
              <ValidatedInput
                label="Property Address"
                name="propertyAddress"
                value={formData.propertyAddress}
                onValueChange={handleAddressChange}
                validator={validateAddress}
                placeholder="Enter property address"
                required
                icon={<MapPin className="w-4 h-4" />}
              />
              <p className="text-xs text-gray-500 -mt-1">
                Address will auto-populate additional property information
              </p>

              {/* Additional Address Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                
                {/* County */}
                <div className="space-y-2">
                  <Label htmlFor="county" className="text-sm font-medium text-gray-700">
                    County
                  </Label>
                  <Select 
                    value={formData.countyId} 
                    onValueChange={(value) => handleInputChange('countyId', value)}
                    disabled={settingsLoading || !selectedMarketId || availableCounties.length === 0}
                  >
                    <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
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

              {/* Auto-populated fields placeholder */}
              {formData.propertyAddress.length > 10 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    Property information will be auto-populated here:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-600">
                    <div>• Property Type</div>
                    <div>• Square Footage</div>
                    <div>• Year Built</div>
                    <div>• Lot Size</div>
                    <div>• Market Value</div>
                    <div>• Property Tax</div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Documents Section */}
          <Card className="p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Upload className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Documents & Files</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload relevant documents for this lead such as property photos, contracts, or other supporting files.
                You can also add documents after creating the lead.
              </p>
              
              <PendingFileUploader
                onFilesChanged={setPendingFiles}
                maxFileSize={50}
                className="mt-4"
              />
              
              {pendingFiles.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">
                    {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} ready to upload
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Files will be uploaded after the lead is created
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => navigate('/leads')}
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>
            
            <div className="flex items-center gap-3">
              <Button 
                type="button"
                variant="outline"
                disabled={!isFormValid()}
                className="gap-2"
              >
                Save as Draft
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding Lead...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Add Seller Lead
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSellerLead;