import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building, Users, UserCheck, MapPin, User, Phone, Mail, Building2, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Validation schemas
const sellerLeadSchema = z.object({
  type: z.literal('SELLER'),
  pipelineStageId: z.string().min(1, 'Pipeline stage is required'),
  address: z.object({
    address1: z.string().min(3, 'Address must be at least 3 characters'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zip: z.string().min(5, 'ZIP code must be at least 5 characters'),
  }),
  seller: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    motivation: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const buyerLeadSchema = z.object({
  type: z.literal('BUYER'),
  pipelineStageId: z.string().min(1, 'Pipeline stage is required'),
  buyer: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    vip: z.boolean().optional(),
  }),
  criteria: z.object({
    priceMin: z.string().optional(),
    priceMax: z.string().optional(),
    assetClass: z.string().optional(),
    markets: z.array(z.string()).optional(),
  }).optional(),
});

const vendorLeadSchema = z.object({
  type: z.literal('VENDOR'),
  pipelineStageId: z.string().min(1, 'Pipeline stage is required'),
  vendor: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    company: z.string().min(1, 'Company name is required'),
    industry: z.string().min(1, 'Industry is required'),
  }),
});

type LeadType = 'SELLER' | 'BUYER' | 'VENDOR';
type SellerLeadData = z.infer<typeof sellerLeadSchema>;
type BuyerLeadData = z.infer<typeof buyerLeadSchema>;
type VendorLeadData = z.infer<typeof vendorLeadSchema>;

interface LeadFormProps {
  type: LeadType;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ type, onSubmit, onCancel, isLoading = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  
  // Get the appropriate schema based on type
  const getSchema = () => {
    switch (type) {
      case 'SELLER': return sellerLeadSchema;
      case 'BUYER': return buyerLeadSchema;
      case 'VENDOR': return vendorLeadSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      type,
      pipelineStageId: '',
      ...(type === 'SELLER' && {
        address: { address1: '', city: '', state: '', zip: '' },
        seller: { firstName: '', lastName: '', phone: '', email: '', motivation: '', notes: '' }
      }),
      ...(type === 'BUYER' && {
        buyer: { firstName: '', lastName: '', phone: '', email: '', vip: false },
        criteria: { priceMin: '', priceMax: '', assetClass: '', markets: [] }
      }),
      ...(type === 'VENDOR' && {
        vendor: { firstName: '', lastName: '', phone: '', email: '', company: '', industry: '' }
      }),
    },
  });

  // Load pipeline stages based on lead type
  React.useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        setLoadingStages(true);
        let pipelineKey = 'ACQUISITIONS'; // Default
        
        if (type === 'SELLER') {
          pipelineKey = 'ACQUISITIONS';
        } else if (type === 'BUYER') {
          pipelineKey = 'DISPOSITIONS';
        } else if (type === 'VENDOR') {
          pipelineKey = 'ACQUISITIONS'; // Fallback
        }
        
        const response = await fetch(`/api/v1/pipeline/${pipelineKey}/stages`, {
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
          description: "Could not load pipeline stages. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setLoadingStages(false);
      }
    };
    
    loadPipelineStages();
  }, [type, toast]);

  const { register, handleSubmit, formState: { errors, isValid, touchedFields }, watch, setValue } = form;

  // Real-time validation indicators
  const getFieldStatus = (fieldName: string) => {
    const fieldError = errors[fieldName as keyof typeof errors];
    const isTouched = touchedFields[fieldName as keyof typeof touchedFields];
    
    if (!isTouched) return 'default';
    if (fieldError) return 'error';
    return 'success';
  };

  const getFieldClasses = (fieldName: string) => {
    const status = getFieldStatus(fieldName);
    const baseClasses = 'transition-all duration-200';
    
    switch (status) {
      case 'error':
        return `${baseClasses} border-red-500 focus:border-red-500 focus:ring-red-500/20`;
      case 'success':
        return `${baseClasses} border-green-500 focus:border-green-500 focus:ring-green-500/20`;
      default:
        return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500/20`;
    }
  };

  const handlePhoneChange = (fieldName: string, value: string) => {
    // UI: show without +1; Storage: keep +1 E.164
    const digits = value.replace(/\D/g, '');
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    setValue(fieldName as any, normalized.slice(0, 10));
  };

  const onFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
      toast({
        title: "Success!",
        description: `${type.toLowerCase()} lead created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'SELLER': return <Building className="w-5 h-5" />;
      case 'BUYER': return <Users className="w-5 h-5" />;
      case 'VENDOR': return <UserCheck className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'SELLER': return 'Add Seller Lead';
      case 'BUYER': return 'Add Buyer Lead';
      case 'VENDOR': return 'Add Vendor Lead';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'SELLER': return 'Property owner looking to sell';
      case 'BUYER': return 'Investor looking to purchase';
      case 'VENDOR': return 'Service provider or contractor';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">{getTitle()}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{getDescription()}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Contact Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    {...register(`${type.toLowerCase()}.firstName` as any)}
                    className={getFieldClasses(`${type.toLowerCase()}.firstName`)}
                    placeholder="Enter first name"
                  />
                  {errors[type.toLowerCase() as keyof typeof errors]?.firstName && (
                    <p className="text-xs text-red-600">
                      {errors[type.toLowerCase() as keyof typeof errors]?.firstName?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    {...register(`${type.toLowerCase()}.lastName` as any)}
                    className={getFieldClasses(`${type.toLowerCase()}.lastName`)}
                    placeholder="Enter last name"
                  />
                  {errors[type.toLowerCase() as keyof typeof errors]?.lastName && (
                    <p className="text-xs text-red-600">
                      {errors[type.toLowerCase() as keyof typeof errors]?.lastName?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    {...register(`${type.toLowerCase()}.phone` as any)}
                    onChange={(e) => handlePhoneChange(`${type.toLowerCase()}.phone`, e.target.value)}
                    className={getFieldClasses(`${type.toLowerCase()}.phone`)}
                    placeholder="(555) 123-4567"
                  />
                  {errors[type.toLowerCase() as keyof typeof errors]?.phone && (
                    <p className="text-xs text-red-600">
                      {errors[type.toLowerCase() as keyof typeof errors]?.phone?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register(`${type.toLowerCase()}.email` as any)}
                    className={getFieldClasses(`${type.toLowerCase()}.email`)}
                    placeholder="Enter email address"
                  />
                  {errors[type.toLowerCase() as keyof typeof errors]?.email && (
                    <p className="text-xs text-red-600">
                      {errors[type.toLowerCase() as keyof typeof errors]?.email?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline Stage Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Pipeline Stage</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pipelineStageId" className="text-sm font-medium">
                  Initial Stage <span className="text-red-500">*</span>
                </Label>
                <Select 
                  onValueChange={(value) => setValue('pipelineStageId', value)}
                  disabled={loadingStages}
                >
                  <SelectTrigger className={getFieldClasses('pipelineStageId')}>
                    <SelectValue placeholder={loadingStages ? "Loading stages..." : "Select pipeline stage"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.pipelineStageId && (
                  <p className="text-xs text-red-600">{errors.pipelineStageId.message}</p>
                )}
                {pipelineStages.length === 0 && !loadingStages && (
                  <p className="text-xs text-amber-600">⚠ No stages available for your role</p>
                )}
              </div>
            </div>

            {/* Seller-specific fields */}
            {type === 'SELLER' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Property Address</h3>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address1" className="text-sm font-medium">
                    Street Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address1"
                    {...register('address.address1')}
                    className={getFieldClasses('address.address1')}
                    placeholder="123 Main Street"
                  />
                  {errors.address?.address1 && (
                    <p className="text-xs text-red-600">{errors.address.address1.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      {...register('address.city')}
                      className={getFieldClasses('address.city')}
                      placeholder="Charlotte"
                    />
                    {errors.address?.city && (
                      <p className="text-xs text-red-600">{errors.address.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="state"
                      {...register('address.state')}
                      className={getFieldClasses('address.state')}
                      placeholder="NC"
                    />
                    {errors.address?.state && (
                      <p className="text-xs text-red-600">{errors.address.state.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-sm font-medium">
                      ZIP Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="zip"
                      {...register('address.zip')}
                      className={getFieldClasses('address.zip')}
                      placeholder="28202"
                    />
                    {errors.address?.zip && (
                      <p className="text-xs text-red-600">{errors.address.zip.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motivation" className="text-sm font-medium">Motivation Level</Label>
                    <Select onValueChange={(value) => setValue('seller.motivation', value)}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register('seller.notes')}
                    className="resize-none"
                    rows={3}
                    placeholder="Additional notes about the seller or property..."
                  />
                </div>
              </div>
            )}

            {/* Buyer-specific fields */}
            {type === 'BUYER' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Investment Criteria</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vip"
                    {...register('buyer.vip')}
                  />
                  <Label htmlFor="vip" className="text-sm font-medium">VIP Buyer</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceMin" className="text-sm font-medium">Min Price</Label>
                    <Input
                      id="priceMin"
                      {...register('criteria.priceMin')}
                      placeholder="$100,000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priceMax" className="text-sm font-medium">Max Price</Label>
                    <Input
                      id="priceMax"
                      {...register('criteria.priceMax')}
                      placeholder="$500,000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assetClass" className="text-sm font-medium">Preferred Asset Class</Label>
                  <Select onValueChange={(value) => setValue('criteria.assetClass', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single Family">Single Family</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Vendor-specific fields */}
            {type === 'VENDOR' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Business Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company"
                      {...register('vendor.company')}
                      className={getFieldClasses('vendor.company')}
                      placeholder="Enter company name"
                    />
                    {errors.vendor?.company && (
                      <p className="text-xs text-red-600">{errors.vendor.company.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-sm font-medium">
                      Industry <span className="text-red-500">*</span>
                    </Label>
                    <Select onValueChange={(value) => setValue('vendor.industry', value)}>
                      <SelectTrigger className={getFieldClasses('vendor.industry')}>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Construction">Construction</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Legal Services">Legal Services</SelectItem>
                        <SelectItem value="Financial Services">Financial Services</SelectItem>
                        <SelectItem value="Home Inspection">Home Inspection</SelectItem>
                        <SelectItem value="Landscaping">Landscaping</SelectItem>
                        <SelectItem value="Cleaning Services">Cleaning Services</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.vendor?.industry && (
                      <p className="text-xs text-red-600">{errors.vendor.industry.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Badge variant={isValid ? "default" : "secondary"} className="text-xs">
                  {isValid ? "✓ Form Valid" : "⚠ Please complete required fields"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Creating...' : `Create ${type} Lead`}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};


