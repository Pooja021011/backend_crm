import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Users, Plus, DollarSign, MessageSquare, CheckCircle, XCircle, Clock, TrendingUp, UserPlus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { API_BASE, makeApiCall } from '../config/api';

interface Buyer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  segmentation?: string;
  criteria?: any;
  createdAt: string;
}

interface BuyerOffer {
  id: string;
  leadId: string;
  buyerId: string;
  buyer: Buyer;
  offerAmount: number;
  terms?: {
    financingType?: string;
    closingDate?: string;
    contingencies?: string[];
    earnestMoney?: number;
    inspectionPeriod?: number;
    otherTerms?: string;
  };
  status: string; // pending, accepted, rejected, countered
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OfferStats {
  totalOffers: number;
  highestOffer: number | null;
  averageOffer: number | null;
  pendingOffers: number;
  acceptedOffers: number;
}

interface BuyerManagementProps {
  leadId: string;
}

export const BuyerManagement: React.FC<BuyerManagementProps> = ({ leadId }) => {
  const [offers, setOffers] = useState<BuyerOffer[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOfferDialog, setShowNewOfferDialog] = useState(false);
  const [showNegotiateDialog, setShowNegotiateDialog] = useState(false);
  const [showNewBuyerDialog, setShowNewBuyerDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<BuyerOffer | null>(null);
  
  // New buyer form
  const [newBuyer, setNewBuyer] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    segmentation: ''
  });
  
  // New offer form
  const [newOffer, setNewOffer] = useState({
    buyerId: '',
    offerAmount: '',
    financingType: 'cash',
    closingDate: '',
    contingencies: [] as string[],
    earnestMoney: '',
    inspectionPeriod: '',
    otherTerms: '',
    notes: ''
  });

  // Negotiation form
  const [negotiation, setNegotiation] = useState({
    counterOfferAmount: '',
    newTerms: {
      financingType: '',
      closingDate: '',
      earnestMoney: '',
      inspectionPeriod: '',
      otherTerms: ''
    },
    notes: '',
    status: 'countered' as 'countered' | 'accepted' | 'rejected'
  });

  const { toast } = useToast();

  useEffect(() => {
    loadOffers();
    loadBuyers();
    loadStats();
  }, [leadId]);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      const response = await makeApiCall(`${API_BASE}/buyer-offers/leads/${leadId}/offers`);

      if (response.ok) {
        const data = await response.json();
        setOffers(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load offers",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuyers = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyers`);

      if (response.ok) {
        const data = await response.json();
        setBuyers(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading buyers:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyer-offers/leads/${leadId}/offers/stats`);

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const createBuyer = async () => {
    if (!newBuyer.firstName || !newBuyer.lastName || !newBuyer.email || !newBuyer.phone) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await makeApiCall(`${API_BASE}/buyers`, {
        method: 'POST',
        body: JSON.stringify(newBuyer)
      });

      if (response.ok) {
        await loadBuyers();
        setShowNewBuyerDialog(false);
        setNewBuyer({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          segmentation: ''
        });
        toast({
          title: "Success",
          description: "Buyer created successfully"
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create buyer');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create buyer",
        variant: "destructive"
      });
    }
  };

  const createOffer = async () => {
    if (!newOffer.buyerId || !newOffer.offerAmount) {
      toast({
        title: "Error",
        description: "Buyer and offer amount are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const offerData = {
        buyerId: newOffer.buyerId,
        offerAmount: parseInt(newOffer.offerAmount),
        terms: {
          financingType: newOffer.financingType,
          closingDate: newOffer.closingDate || undefined,
          contingencies: newOffer.contingencies,
          earnestMoney: newOffer.earnestMoney ? parseInt(newOffer.earnestMoney) : undefined,
          inspectionPeriod: newOffer.inspectionPeriod ? parseInt(newOffer.inspectionPeriod) : undefined,
          otherTerms: newOffer.otherTerms || undefined
        },
        status: 'pending',
        notes: newOffer.notes || undefined
      };

      const response = await makeApiCall(`${API_BASE}/buyer-offers/leads/${leadId}/offers`, {
        method: 'POST',
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        await loadOffers();
        await loadStats();
        setShowNewOfferDialog(false);
        setNewOffer({
          buyerId: '',
          offerAmount: '',
          financingType: 'cash',
          closingDate: '',
          contingencies: [],
          earnestMoney: '',
          inspectionPeriod: '',
          otherTerms: '',
          notes: ''
        });
        toast({
          title: "Success",
          description: "Offer created successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create offer",
        variant: "destructive"
      });
    }
  };

  const negotiateOffer = async () => {
    if (!selectedOffer) return;

    try {
      const negotiationData = {
        status: negotiation.status,
        counterOfferAmount: negotiation.counterOfferAmount ? parseInt(negotiation.counterOfferAmount) : undefined,
        newTerms: negotiation.status === 'countered' ? negotiation.newTerms : undefined,
        notes: negotiation.notes
      };

      const response = await makeApiCall(`${API_BASE}/buyer-offers/offers/${selectedOffer.id}/negotiate`, {
        method: 'PUT',
        body: JSON.stringify(negotiationData)
      });

      if (response.ok) {
        await loadOffers();
        await loadStats();
        setShowNegotiateDialog(false);
        setSelectedOffer(null);
        setNegotiation({
          counterOfferAmount: '',
          newTerms: {
            financingType: '',
            closingDate: '',
            earnestMoney: '',
            inspectionPeriod: '',
            otherTerms: ''
          },
          notes: '',
          status: 'countered'
        });
        toast({
          title: "Success",
          description: "Offer updated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update offer",
        variant: "destructive"
      });
    }
  };

  const acceptOffer = async (offerId: string) => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyer-offers/offers/${offerId}/accept`, {
        method: 'PUT',
        body: JSON.stringify({ notes: 'Offer accepted' })
      });

      if (response.ok) {
        await loadOffers();
        await loadStats();
        toast({
          title: "Success",
          description: "Offer accepted successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept offer",
        variant: "destructive"
      });
    }
  };

  const rejectOffer = async (offerId: string, reason?: string) => {
    try {
      const response = await makeApiCall(`${API_BASE}/buyer-offers/offers/${offerId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadOffers();
        await loadStats();
        toast({
          title: "Success",
          description: "Offer rejected"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject offer",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'countered':
        return <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" />Countered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value?: number) => {
    return value ? `$${value.toLocaleString()}` : 'N/A';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Buyer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading buyer information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Buyer Management
          </div>
          <div className="flex gap-2">
            <Dialog open={showNewBuyerDialog} onOpenChange={setShowNewBuyerDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4 mr-1" />
                  New Buyer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Buyer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyer-first-name">First Name *</Label>
                      <Input
                        id="buyer-first-name"
                        value={newBuyer.firstName}
                        onChange={(e) => setNewBuyer(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyer-last-name">Last Name *</Label>
                      <Input
                        id="buyer-last-name"
                        value={newBuyer.lastName}
                        onChange={(e) => setNewBuyer(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="buyer-email">Email *</Label>
                    <Input
                      id="buyer-email"
                      type="email"
                      value={newBuyer.email}
                      onChange={(e) => setNewBuyer(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyer-phone">Phone *</Label>
                    <Input
                      id="buyer-phone"
                      type="tel"
                      value={newBuyer.phone}
                      onChange={(e) => setNewBuyer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyer-segmentation">Segmentation</Label>
                    <Select value={newBuyer.segmentation} onValueChange={(value) => setNewBuyer(prev => ({ ...prev, segmentation: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select segmentation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setShowNewBuyerDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createBuyer}>
                      Create Buyer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showNewOfferDialog} onOpenChange={setShowNewOfferDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Offer
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Offer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <Label htmlFor="buyer-select">Buyer</Label>
                  <Select value={newOffer.buyerId} onValueChange={(value) => setNewOffer(prev => ({ ...prev, buyerId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map(buyer => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.firstName} {buyer.lastName} - {buyer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="offer-amount">Offer Amount</Label>
                  <Input
                    id="offer-amount"
                    type="number"
                    value={newOffer.offerAmount}
                    onChange={(e) => setNewOffer(prev => ({ ...prev, offerAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="financing-type">Financing Type</Label>
                  <Select value={newOffer.financingType} onValueChange={(value) => setNewOffer(prev => ({ ...prev, financingType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="hard_money">Hard Money</SelectItem>
                      <SelectItem value="fha">FHA</SelectItem>
                      <SelectItem value="va">VA</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="closing-date">Closing Date</Label>
                    <Input
                      id="closing-date"
                      type="date"
                      value={newOffer.closingDate}
                      onChange={(e) => setNewOffer(prev => ({ ...prev, closingDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="earnest-money">Earnest Money</Label>
                    <Input
                      id="earnest-money"
                      type="number"
                      value={newOffer.earnestMoney}
                      onChange={(e) => setNewOffer(prev => ({ ...prev, earnestMoney: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="inspection-period">Inspection Period (days)</Label>
                  <Input
                    id="inspection-period"
                    type="number"
                    value={newOffer.inspectionPeriod}
                    onChange={(e) => setNewOffer(prev => ({ ...prev, inspectionPeriod: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="other-terms">Other Terms</Label>
                  <Textarea
                    id="other-terms"
                    value={newOffer.otherTerms}
                    onChange={(e) => setNewOffer(prev => ({ ...prev, otherTerms: e.target.value }))}
                    placeholder="Additional terms and conditions..."
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newOffer.notes}
                    onChange={(e) => setNewOffer(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowNewOfferDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createOffer}>
                  Create Offer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="offers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="offers">Offers ({offers.length})</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="offers" className="space-y-4">
            {offers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No offers received yet. Create the first offer to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map(offer => (
                  <Card key={offer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-medium">
                              {offer.buyer.firstName} {offer.buyer.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {offer.buyer.email} • {offer.buyer.phone}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-semibold text-green-600">
                              {formatCurrency(offer.offerAmount)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {offer.terms?.financingType || 'N/A'} • {formatDate(offer.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(offer.status)}
                          {offer.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOffer(offer);
                                  setShowNegotiateDialog(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Negotiate
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => acceptOffer(offer.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectOffer(offer.id, 'Declined by seller')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {offer.terms && (
                        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {offer.terms.closingDate && (
                              <div>Closing: {new Date(offer.terms.closingDate).toLocaleDateString()}</div>
                            )}
                            {offer.terms.earnestMoney && (
                              <div>Earnest: {formatCurrency(offer.terms.earnestMoney)}</div>
                            )}
                            {offer.terms.inspectionPeriod && (
                              <div>Inspection: {offer.terms.inspectionPeriod} days</div>
                            )}
                            {offer.terms.contingencies && offer.terms.contingencies.length > 0 && (
                              <div>Contingencies: {offer.terms.contingencies.join(', ')}</div>
                            )}
                          </div>
                          {offer.terms.otherTerms && (
                            <div className="mt-2">Terms: {offer.terms.otherTerms}</div>
                          )}
                        </div>
                      )}
                      
                      {offer.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          {offer.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {!stats ? (
              <div className="text-center py-8 text-muted-foreground">
                No statistics available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Highest Offer</div>
                        <div className="text-2xl font-semibold">{formatCurrency(stats.highestOffer)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Average Offer</div>
                        <div className="text-2xl font-semibold">{formatCurrency(stats.averageOffer)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Total Offers</div>
                        <div className="text-2xl font-semibold">{stats.totalOffers}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Pending Offers</div>
                        <div className="text-2xl font-semibold">{stats.pendingOffers}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Accepted Offers</div>
                        <div className="text-2xl font-semibold">{stats.acceptedOffers}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Negotiation Dialog */}
        <Dialog open={showNegotiateDialog} onOpenChange={setShowNegotiateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Negotiate Offer</DialogTitle>
            </DialogHeader>
            {selectedOffer && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium">
                    {selectedOffer.buyer.firstName} {selectedOffer.buyer.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Original Offer: {formatCurrency(selectedOffer.offerAmount)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="negotiation-action">Action</Label>
                  <Select value={negotiation.status} onValueChange={(value: 'countered' | 'accepted' | 'rejected') => setNegotiation(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="countered">Counter Offer</SelectItem>
                      <SelectItem value="accepted">Accept Offer</SelectItem>
                      <SelectItem value="rejected">Reject Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {negotiation.status === 'countered' && (
                  <>
                    <div>
                      <Label htmlFor="counter-amount">Counter Offer Amount</Label>
                      <Input
                        id="counter-amount"
                        type="number"
                        value={negotiation.counterOfferAmount}
                        onChange={(e) => setNegotiation(prev => ({ ...prev, counterOfferAmount: e.target.value }))}
                        placeholder={selectedOffer.offerAmount.toString()}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-closing-date">New Closing Date</Label>
                        <Input
                          id="new-closing-date"
                          type="date"
                          value={negotiation.newTerms.closingDate}
                          onChange={(e) => setNegotiation(prev => ({ 
                            ...prev, 
                            newTerms: { ...prev.newTerms, closingDate: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-earnest-money">New Earnest Money</Label>
                        <Input
                          id="new-earnest-money"
                          type="number"
                          value={negotiation.newTerms.earnestMoney}
                          onChange={(e) => setNegotiation(prev => ({ 
                            ...prev, 
                            newTerms: { ...prev.newTerms, earnestMoney: e.target.value }
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new-other-terms">Additional Terms</Label>
                      <Textarea
                        id="new-other-terms"
                        value={negotiation.newTerms.otherTerms}
                        onChange={(e) => setNegotiation(prev => ({ 
                          ...prev, 
                          newTerms: { ...prev.newTerms, otherTerms: e.target.value }
                        }))}
                        placeholder="Additional terms or changes..."
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="negotiation-notes">Notes</Label>
                  <Textarea
                    id="negotiation-notes"
                    value={negotiation.notes}
                    onChange={(e) => setNegotiation(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes about this negotiation..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNegotiateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={negotiateOffer}>
                    {negotiation.status === 'countered' ? 'Send Counter' : 
                     negotiation.status === 'accepted' ? 'Accept Offer' : 'Reject Offer'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
