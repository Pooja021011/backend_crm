import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Building,
  DollarSign,
  Target,
  Clock,
  Users,
  Star,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "@/hooks/useLeads";
import { LeadDocumentsTab } from "./LeadDocumentsTab";

interface ViewLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewLeadDialog: React.FC<ViewLeadDialogProps> = ({
  lead,
  open,
  onOpenChange,
}) => {
  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'SELLER': return 'bg-green-100 text-green-800';
      case 'BUYER': return 'bg-blue-100 text-blue-800';
      case 'VENDOR': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'NEW': return 'bg-yellow-100 text-yellow-800';
      case 'CONTACTED': return 'bg-blue-100 text-blue-800';
      case 'QUALIFIED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const renderSellerDetails = () => {
    if (!lead.seller) return null;
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Seller Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">First Name</label>
                <p className="text-gray-900">{lead.seller.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Name</label>
                <p className="text-gray-900">{lead.seller.lastName}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{lead.seller.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{lead.seller.email}</p>
                </div>
              </div>
            </div>

            {lead.seller.motivation && (
              <div>
                <label className="text-sm font-medium text-gray-600">Motivation Level</label>
                <Badge variant="outline" className="ml-2">
                  {lead.seller.motivation}
                </Badge>
              </div>
            )}

            {lead.seller.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{lead.seller.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {lead.address && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Address</label>
                <p className="text-gray-900">{lead.address.address1}</p>
                {lead.address.address2 && (
                  <p className="text-gray-900">{lead.address.address2}</p>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">City</label>
                  <p className="text-gray-900">{lead.address.city}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">State</label>
                  <p className="text-gray-900">{lead.address.state}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ZIP</label>
                  <p className="text-gray-900">{lead.address.zip}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  const renderBuyerDetails = () => {
    if (!lead.buyer) return null;
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Buyer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">First Name</label>
                <p className="text-gray-900">{lead.buyer.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Name</label>
                <p className="text-gray-900">{lead.buyer.lastName}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{lead.buyer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{lead.buyer.email}</p>
                </div>
              </div>
            </div>

            {lead.buyer.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{lead.buyer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {lead.buyerCriteria && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Buyer Criteria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Min Price</label>
                  <p className="text-gray-900">{lead.buyerCriteria.minPrice ? `$${lead.buyerCriteria.minPrice.toLocaleString()}` : 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Max Price</label>
                  <p className="text-gray-900">{lead.buyerCriteria.maxPrice ? `$${lead.buyerCriteria.maxPrice.toLocaleString()}` : 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Min Bedrooms</label>
                  <p className="text-gray-900">{lead.buyerCriteria.minBedrooms || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Min Bathrooms</label>
                  <p className="text-gray-900">{lead.buyerCriteria.minBathrooms || 'Not specified'}</p>
                </div>
              </div>

              {lead.buyerCriteria.preferredAreas && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Preferred Areas</label>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded">{lead.buyerCriteria.preferredAreas}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  const renderVendorDetails = () => {
    if (!lead.vendor) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Vendor Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">First Name</label>
              <p className="text-gray-900">{lead.vendor.firstName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Last Name</label>
              <p className="text-gray-900">{lead.vendor.lastName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900">{lead.vendor.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{lead.vendor.email}</p>
              </div>
            </div>
          </div>

          {lead.vendor.company && (
            <div>
              <label className="text-sm font-medium text-gray-600">Company</label>
              <p className="text-gray-900">{lead.vendor.company}</p>
            </div>
          )}

          {lead.vendor.serviceType && (
            <div>
              <label className="text-sm font-medium text-gray-600">Service Type</label>
              <p className="text-gray-900">{lead.vendor.serviceType}</p>
            </div>
          )}

          {lead.vendor.notes && (
            <div>
              <label className="text-sm font-medium text-gray-600">Notes</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{lead.vendor.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">Lead Details</DialogTitle>
              <Badge className={getLeadTypeColor(lead.leadType)}>
                {lead.leadType}
              </Badge>
              {lead.status && (
                <Badge variant="outline" className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription>
            View complete information for this lead
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Lead Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* General Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">{formatDate(lead.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <label className="text-sm font-medium text-gray-600">Updated</label>
                      <p className="text-gray-900">{formatDate(lead.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div>
                      <label className="text-sm font-medium text-gray-600">Assigned Agent</label>
                      <p className="text-gray-900">{lead.assignedUserId || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Type-specific details */}
            {lead.leadType === 'SELLER' && renderSellerDetails()}
            {lead.leadType === 'BUYER' && renderBuyerDetails()}
            {lead.leadType === 'VENDOR' && renderVendorDetails()}
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <LeadDocumentsTab lead={lead} />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Activity timeline coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
