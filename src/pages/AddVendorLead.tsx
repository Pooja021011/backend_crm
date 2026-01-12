import { useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useSettings } from "@/hooks/useSettings";
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
  Building,
  Briefcase,
  Upload
} from "lucide-react";
import { 
  validateEmail, 
  validateName, 
  validateCompanyName
} from "@/utils/validation";
import { PhoneInput } from "@/components/PhoneInput";

const AddVendorLead = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createLead } = useLeads();
  const { leadSources, isLoading: settingsLoading } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
    leadSource: "",
    company: "",
    industry: ""
  });

  const industries = [
    "Title Agent",
    "Lawyer",
    "Inspector",
    "Appraiser",
    "Contractor",
    "Project Manager",
    "Other"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // Create lead data according to API schema
      const leadData = {
        type: 'VENDOR' as const,
        vendor: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phoneNumber.trim(),
          email: formData.emailAddress.trim(),
          company: formData.company.trim(),
          industry: formData.industry,
          marketIds: undefined
        }
      };
      
      console.log('📤 Sending vendor lead data:', JSON.stringify(leadData, null, 2));

      const createdLead = await createLead(leadData);

      // Upload pending files if any
      if (pendingFiles.length > 0 && createdLead?.id) {
        let uploadedCount = 0;
        let failedCount = 0;
        
        for (const pendingFile of pendingFiles) {
          // Only upload files that have categories assigned
          if (pendingFile.category) {
            try {
              const fileFormData = new FormData();
              fileFormData.append('file', pendingFile.file);
              fileFormData.append('leadId', createdLead.id);
              fileFormData.append('category', pendingFile.category);
              fileFormData.append('tags', JSON.stringify(pendingFile.tags));
              fileFormData.append('description', pendingFile.description || '');
              fileFormData.append('isPublic', 'false');

              const response = await fetch('/api/v1/files/upload', {
                method: 'POST',
                body: fileFormData,
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
            description: `${formData.firstName} ${formData.lastName} from ${formData.company} has been added with ${uploadedCount} file${uploadedCount !== 1 ? 's' : ''}.${failedCount > 0 ? ` ${failedCount} file${failedCount !== 1 ? 's' : ''} failed to upload.` : ''}`,
          });
        } else if (failedCount > 0) {
          toast({
            title: "Lead Added, File Upload Failed",
            description: `${formData.firstName} ${formData.lastName} from ${formData.company} has been added, but ${failedCount} file${failedCount !== 1 ? 's' : ''} failed to upload.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Vendor Lead Added Successfully",
          description: `${formData.firstName} ${formData.lastName} from ${formData.company} has been added to your vendor leads.`,
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
    // Keep vendor business required; contact is optional
    return Boolean(formData.leadSource && formData.company && formData.industry);
  };

  return (
    <div className="space-y-6">
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
        <h1 className="text-2xl font-bold text-gray-900">Add Vendor Lead</h1>
      </div>

      {/* Form Content */}
      <div>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Contact Info Section */}
          <Card className="p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">CONTACT INFO</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* First Name & Last Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  First Name & Last Name *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <ValidatedInput
                    label=""
                    name="firstName"
                    value={formData.firstName}
                    onValueChange={(value) => handleInputChange('firstName', value)}
                  validator={(value) => value.trim() ? validateName(value, 'First name') : ({ isValid: true })}
                    placeholder="First Name"
                    showValidation={true}
                    icon={<User className="w-4 h-4" />}
                  />
                  <ValidatedInput
                    label=""
                    name="lastName"
                    value={formData.lastName}
                    onValueChange={(value) => handleInputChange('lastName', value)}
                    validator={(value) => value.trim() ? validateName(value, 'Last name') : ({ isValid: true })}
                    placeholder="Last Name"
                    showValidation={true}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Primary Phone Number
                </Label>
                <PhoneInput
                  label=""
                  value={formData.phoneNumber}
                  onChange={(value) => handleInputChange('phoneNumber', value)}
                  placeholder="Phone number"
                  required={false}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Primary Email *
                </Label>
                <ValidatedInput
                  label=""
                  name="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onValueChange={(value) => handleInputChange('emailAddress', value)}
                  validator={(value) => value.trim() ? validateEmail(value) : ({ isValid: true })}
                  placeholder="email@example.com"
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
                    <SelectValue placeholder={settingsLoading ? "Loading..." : "Select Lead Source"} />
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

            </div>
          </Card>

          {/* Business Information Section */}
          <Card className="p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company */}
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

                {/* Industry */}
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                    Industry *
                  </Label>
                  <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                    <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Select Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                Upload relevant documents for this vendor lead such as service contracts, certifications, or portfolio samples.
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
                    Add Lead
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

export default AddVendorLead;