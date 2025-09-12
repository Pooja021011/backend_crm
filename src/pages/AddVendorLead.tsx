import { useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useSettings } from "@/hooks/useSettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
import { PendingFileUploader, type PendingFileItem } from "@/components/PendingFileUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon,
  Building,
  MapPin,
  Briefcase,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateName, 
  validateCompanyName,
  formatPhoneNumber 
} from "@/utils/validation";

const AddVendorLead = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createLead } = useLeads();
  const { markets, leadSources, isLoading: settingsLoading } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
    leadSource: "",
    company: "",
    industry: "",
    markets: [] as string[]
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

  const handleMultiSelectChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
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
          industry: formData.industry
        }
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
    return formData.firstName && 
           formData.lastName && 
           formData.phoneNumber && 
           formData.emailAddress && 
           formData.leadSource &&
           formData.company &&
           formData.industry &&
           selectedDate;
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
            <h1 className="text-xl font-semibold text-gray-900">Add Vendor Lead</h1>
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
                  Add Lead
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
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
                    validator={(value) => validateName(value, 'First name')}
                    placeholder="First Name"
                    required
                    showValidation={true}
                    icon={<User className="w-4 h-4" />}
                  />
                  <ValidatedInput
                    label=""
                    name="lastName"
                    value={formData.lastName}
                    onValueChange={(value) => handleInputChange('lastName', value)}
                    validator={(value) => validateName(value, 'Last name')}
                    placeholder="Last Name"
                    required
                    showValidation={true}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <ValidatedInput
                label="Primary Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onValueChange={(value) => handleInputChange('phoneNumber', value)}
                validator={validatePhoneNumber}
                formatter={formatPhoneNumber}
                placeholder="(555) 123-4567"
                required
                icon={<Phone className="w-4 h-4" />}
              />

              {/* Email */}
              <ValidatedInput
                label="Primary Email"
                name="emailAddress"
                type="email"
                value={formData.emailAddress}
                onValueChange={(value) => handleInputChange('emailAddress', value)}
                validator={validateEmail}
                placeholder="email@example.com"
                required
                icon={<Mail className="w-4 h-4" />}
              />
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
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "M/d/yyyy") : "M/d/yyyy"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Market */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Market *
                </Label>
                <Select value="Primary Market" disabled>
                  <SelectTrigger className="h-10 border-gray-300 bg-gray-50">
                    <SelectValue placeholder="Primary Market" />
                  </SelectTrigger>
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

              {/* Market Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Market
                </Label>
                <p className="text-xs text-gray-500">Select the markets this vendor works within (optional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {markets.map((market) => (
                    <div key={market.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={`market-${market.id}`}
                        checked={formData.markets.includes(market.id)}
                        onCheckedChange={(checked) => 
                          handleMultiSelectChange('markets', market.id, checked as boolean)
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