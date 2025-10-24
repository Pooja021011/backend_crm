import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FileText,
  Edit2
} from "lucide-react";
import { safeDateFormat } from "@/utils/validation";
import type { Lead } from "@/hooks/useLeads";
import { LeadDocumentsTab } from "./LeadDocumentsTab";
// Hidden tabs - uncomment imports if you enable the tabs below
// import { UnderwritingCalculator } from "./UnderwritingCalculator";
// import { CompsManager } from "./CompsManager";
// import { BuyerManagement } from "./BuyerManagement";
// import { MarketingResources } from "./MarketingResources";
// import { LeadActivityTab } from "./LeadActivityTab";
import { API_BASE } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Role-based access control
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isExecutive = userRoles.includes('EXECUTIVE');
  const isManager = userRoles.includes('MANAGER');
  const isACQ = userRoles.includes('ACQ');
  const isDisp = userRoles.includes('DISP');
  const isTC = userRoles.includes('TC');

  // Feature access permissions
  const canAccessUnderwriting = isAdmin || isExecutive || isManager || isACQ || isTC;
  const canAccessComps = isAdmin || isExecutive || isManager || isACQ || isTC;
  const canAccessBuyerMgmt = isAdmin || isExecutive || isManager || isDisp || isTC;
  const canAccessMarketing = isAdmin || isExecutive || isManager || isACQ || isDisp || isTC;

  // Only showing Details and Documents tabs
  const getTabsGridCols = () => {
    return 'grid-cols-2';
  };
  
  // Read-only deal information state
  const [dealLoading, setDealLoading] = React.useState(false);
  const [contractPrice, setContractPrice] = React.useState<string>("");
  const [soldPrice, setSoldPrice] = React.useState<string>("");
  const [netProfit, setNetProfit] = React.useState<string>("");
  const [contractedAt, setContractedAt] = React.useState<string>("");
  const [closedAt, setClosedAt] = React.useState<string>("");

  // Fetch deal information (read-only)
  React.useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        setDealLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/deals/${lead.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const json = await res.json();
        const d = json?.data;
        if (d) {
          setContractPrice(d.contractPrice != null ? String(d.contractPrice) : "");
          setSoldPrice(d.soldPrice != null ? String(d.soldPrice) : "");
          setNetProfit(d.netProfit != null ? String(d.netProfit) : "");
          setContractedAt(d.contractedAt ? new Date(d.contractedAt).toISOString().slice(0,16) : "");
          setClosedAt(d.closedAt ? new Date(d.closedAt).toISOString().slice(0,16) : "");
        } else {
          setContractPrice(""); setSoldPrice(""); setNetProfit(""); setContractedAt(""); setClosedAt("");
        }
      } finally {
        setDealLoading(false);
      }
    };
    load();
  }, [open, lead.id]);
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
    return safeDateFormat(dateString, 'MMM dd, yyyy');
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
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-xl">Lead Details</DialogTitle>
              <Badge className={getLeadTypeColor(lead.leadType)}>
                {lead.leadType}
              </Badge>
              {lead.leadStatus ? (
                <Badge 
                  variant="outline" 
                  style={{ 
                    backgroundColor: `${lead.leadStatus.color}20`,
                    borderColor: lead.leadStatus.color,
                    color: lead.leadStatus.color
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: lead.leadStatus.color }}
                    />
                    {lead.leadStatus.name}
                  </div>
                </Badge>
              ) : lead.status ? (
                <Badge variant="outline" className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              ) : null}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate(`/leads/${lead.id}/edit`);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Lead
            </Button>
          </div>
          <DialogDescription>
            View complete information for this lead
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className={`grid w-full ${getTabsGridCols()}`}>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            {/* Hidden tabs - uncomment to enable
            {canAccessUnderwriting && (
              <TabsTrigger value="underwriting">Underwriting</TabsTrigger>
            )}
            {canAccessComps && (
              <TabsTrigger value="comps">Comps</TabsTrigger>
            )}
            {canAccessBuyerMgmt && (
              <TabsTrigger value="buyers">Buyers</TabsTrigger>
            )}
            {canAccessMarketing && (
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
            )}
            <TabsTrigger value="activity">Activity</TabsTrigger>
            */}
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

            {/* Deal Information - READ ONLY */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dealLoading ? (
                  <p className="text-sm text-gray-500">Loading deal information...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contract Price</label>
                        <p className="text-gray-900 font-semibold text-lg">
                          {contractPrice ? `$${Number(contractPrice).toLocaleString()}` : "Not set"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Sold Price</label>
                        <p className="text-gray-900 font-semibold text-lg">
                          {soldPrice ? `$${Number(soldPrice).toLocaleString()}` : "Not set"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Net Profit</label>
                        <p className={`font-semibold text-lg ${netProfit && Number(netProfit) > 0 ? 'text-green-600' : netProfit && Number(netProfit) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {netProfit ? `$${Number(netProfit).toLocaleString()}` : "Not calculated"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contracted At</label>
                        <p className="text-gray-900">
                          {contractedAt ? safeDateFormat(contractedAt) : "Not contracted"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Closed At</label>
                        <p className="text-gray-900">
                          {closedAt ? safeDateFormat(closedAt) : "Not closed"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Profit Margin Calculation */}
                    {soldPrice && contractPrice && Number(soldPrice) > 0 && Number(contractPrice) > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-gray-700">Profit Margin</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {((Number(netProfit) / Number(soldPrice)) * 100).toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <LeadDocumentsTab lead={lead} />
          </TabsContent>

          {/* Hidden tabs - uncomment to enable
          {canAccessUnderwriting && (
            <TabsContent value="underwriting" className="mt-6">
              <UnderwritingCalculator leadId={lead.id} />
            </TabsContent>
          )}

          {canAccessComps && (
            <TabsContent value="comps" className="mt-6">
              <CompsManager 
                leadId={lead.id} 
                leadAddress={lead.address ? {
                  address1: lead.address.address1,
                  city: lead.address.city,
                  state: lead.address.state,
                  zip: lead.address.zip
                } : undefined}
              />
            </TabsContent>
          )}

          {canAccessBuyerMgmt && (
            <TabsContent value="buyers" className="mt-6">
              <BuyerManagement leadId={lead.id} />
            </TabsContent>
          )}

          {canAccessMarketing && (
            <TabsContent value="marketing" className="mt-6">
              <MarketingResources leadId={lead.id} />
            </TabsContent>
          )}

          <TabsContent value="activity" className="mt-6">
            <LeadActivityTab 
              leadId={lead.id}
              leadCreatedAt={lead.createdAt}
              leadUpdatedAt={lead.updatedAt}
            />
          </TabsContent>
          */}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
