import { useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useSettings } from "@/hooks/useSettings";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
import { PendingFileUploader, type PendingFileItem } from "@/components/PendingFileUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Target,
  Upload
} from "lucide-react";
import { 
  validateEmail, 
  validateName, 
  validateAddress,
  validateCity,
  validateState,
  validateZipCode
} from "@/utils/validation";
import { validatePhoneNumber } from "@/utils/phoneValidation";
import { PhoneInput } from "@/components/PhoneInput";

const AddSellerLead = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createLead } = useLeads();
  const { leadSources, isLoading: settingsLoading } = useSettings();
  const { getActiveAgents, isLoading: agentsLoading } = useAgents();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);

  // Check if current user is an ACQ agent
  const isACQAgent = user?.roles?.includes('ACQ');

  // Get active agents with ACQ role for the dropdown
  const acquisitionsAgents = getActiveAgents().filter(agent => 
    agent.roles.some(role => role.role.name === 'ACQ')
  );

  // Form state - initialize acquisitionsAgentId with current user if ACQ agent
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
    leadSource: "",
    acquisitionsAgentId: isACQAgent && user?.id ? user.id : "",
    propertyAddress: "",
    city: "",
    state: "",
    zip: "",
    // kept for backward compatibility in payload shape (optional)
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

  const validateField = (fieldName: string, value: string) => {
    let error = '';
    
    switch (fieldName) {
      case 'firstName':
        error = value.trim() ? (validateName(value, 'First name').error || '') : '';
        break;
      case 'lastName':
        error = value.trim() ? (validateName(value, 'Last name').error || '') : '';
        break;
      case 'phoneNumber':
        error = value.trim() ? (validatePhoneNumber(value) ? '' : 'Please enter a valid phone number with country code') : '';
        break;
      case 'emailAddress':
        error = value.trim() ? (validateEmail(value).error || '') : '';
        break;
      case 'propertyAddress':
        error = value.trim() ? (validateAddress(value).error || '') : '';
        break;
      case 'city':
        error = value.trim() ? (validateCity(value).error || '') : '';
        break;
      case 'state':
        error = value.trim() ? (validateState(value).error || '') : '';
        break;
      case 'zipCode':
        error = value.trim() ? (validateZipCode(value).error || '') : '';
        break;
      case 'acquisitionsAgentId':
        if (!value) error = 'Acquisitions agent is required';
        break;
      case 'leadSource':
        if (!value) error = 'Lead source is required';
        break;
      default:
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    return error === '';
  };

  const validateForm = () => {
    // Only require Lead Source + Assigned Agent; contact/address can be blank.
    const hasRequiredFields = formData.leadSource && formData.acquisitionsAgentId;
           
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
        seller: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phoneNumber.trim(),
          email: formData.emailAddress.trim(),
          notes: formData.leadSource ? `Lead Source: ${formData.leadSource}` : ''
        },
        address: {
          address1: formData.propertyAddress.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
          countyId: formData.countyId || undefined,
        },
        assignedUserId: formData.acquisitionsAgentId && formData.acquisitionsAgentId !== 'no-agents' ? formData.acquisitionsAgentId : undefined,
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
    const hasRequiredFields = formData.leadSource && formData.acquisitionsAgentId;
           
    const hasNoErrors = Object.values(errors).every(error => !error);
    
    return hasRequiredFields && hasNoErrors;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/leads')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Button>
        <div className="h-6 w-px bg-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">Add Seller Lead</h1>
      </div>

      {/* Form Content */}
      <div>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Lead Information Section */}
          <Card className="p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Lead Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <ValidatedInput
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onValueChange={(value) => handleInputChange('firstName', value)}
                validator={(value) => value.trim() ? validateName(value, 'First name') : ({ isValid: true })}
                placeholder="Enter first name"
                icon={<User className="w-4 h-4" />}
              />

              {/* Last Name */}
              <ValidatedInput
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onValueChange={(value) => handleInputChange('lastName', value)}
                validator={(value) => value.trim() ? validateName(value, 'Last name') : ({ isValid: true })}
                placeholder="Enter last name"
                icon={<User className="w-4 h-4" />}
              />

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <PhoneInput
                  label=""
                  value={formData.phoneNumber}
                  onChange={(value) => handleInputChange('phoneNumber', value)}
                  placeholder="Phone number"
                  required={false}
                />
              </div>

              {/* Email Address */}
              <ValidatedInput
                label="Email Address"
                name="emailAddress"
                type="email"
                value={formData.emailAddress}
                onValueChange={(value) => handleInputChange('emailAddress', value)}
                validator={(value) => value.trim() ? validateEmail(value) : ({ isValid: true })}
                placeholder="email@example.com"
                icon={<Mail className="w-4 h-4" />}
              />
            </div>
          </Card>

          {/* Assignment & Source Section */}
          <Card className="p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Assignment & Source</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={agentsLoading || isACQAgent}
                >
                  <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
                    <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Select acquisitions agent"} />
                  </SelectTrigger>
                  <SelectContent>
                    {acquisitionsAgents.map((agent) => {
                      const initials = `${agent.firstName.charAt(0)}${agent.lastName.charAt(0)}`;
                      const fullName = `${agent.firstName} ${agent.lastName}`;
                      const roleNames = agent.roles.map(r => r.role.name).join(', ');
                      return (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {initials}
                                </span>
                              </div>
                              <span className="font-medium">{fullName}</span>
                            </div>
                            <span className="text-xs text-gray-500 ml-8">{roleNames}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                    {acquisitionsAgents.length === 0 && !agentsLoading && (
                      <SelectItem value="no-agents" disabled>
                        No acquisitions agents available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Property Information Section */}
          <Card className="p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Property Information (optional)</h2>
            </div>
            
            <div className="space-y-6">
              {/* Property Address */}
              <ValidatedInput
                label="Property Address"
                name="propertyAddress"
                value={formData.propertyAddress}
                onValueChange={handleAddressChange}
                validator={(value) => value.trim() ? validateAddress(value) : ({ isValid: true })}
                placeholder="Enter property address"
                icon={<MapPin className="w-4 h-4" />}
              />

              {/* Additional Address Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ValidatedInput
                  label="City"
                  name="city"
                  value={formData.city}
                  onValueChange={(value) => handleInputChange('city', value)}
                  validator={(value) => value.trim() ? validateCity(value) : ({ isValid: true })}
                  placeholder="Enter city"
                />
                <ValidatedInput
                  label="State"
                  name="state"
                  value={formData.state}
                  onValueChange={(value) => handleInputChange('state', value.toUpperCase())}
                  validator={(value) => value.trim() ? validateState(value) : ({ isValid: true })}
                  placeholder="NC"
                  maxLength={2}
                />
                <ValidatedInput
                  label="ZIP Code"
                  name="zip"
                  value={formData.zip}
                  onValueChange={(value) => handleInputChange('zip', value)}
                  validator={(value) => value.trim() ? validateZipCode(value) : ({ isValid: true })}
                  placeholder="28202"
                />
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
          <Card className="p-4 shadow-sm border border-gray-200">
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