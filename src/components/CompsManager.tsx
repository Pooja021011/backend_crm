import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Home, Plus, Search, TrendingUp, Calendar, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { API_BASE, makeApiCall } from '../config/api';

interface LeadComparable {
  id: string;
  leadId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  salePrice?: number;
  pricePerSqft?: number;
  dom?: number;
  dateSold?: string;
  images: string[];
  addedAt: string;
  createdAt: string;
}

interface CompsManagerProps {
  leadId: string;
  leadAddress?: {
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
}

export const CompsManager: React.FC<CompsManagerProps> = ({ leadId, leadAddress }) => {
  const [leadComps, setLeadComps] = useState<LeadComparable[]>([]);
  const [searchResults, setSearchResults] = useState<LeadComparable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddCompDialog, setShowAddCompDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    city: leadAddress?.city || '',
    state: leadAddress?.state || '',
    zip: leadAddress?.zip || '',
    minBeds: '',
    maxBeds: '',
    minBaths: '',
    maxBaths: '',
    minSqft: '',
    maxSqft: '',
    minPrice: '',
    maxPrice: '',
    soldAfter: '',
    soldBefore: ''
  });

  // New comp form
  const [newComp, setNewComp] = useState({
    address: '',
    city: leadAddress?.city || '',
    state: leadAddress?.state || '',
    zip: leadAddress?.zip || '',
    beds: '',
    baths: '',
    sqft: '',
    yearBuilt: '',
    salePrice: '',
    dom: '',
    dateSold: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadLeadComps();
  }, [leadId]);

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const openImageGallery = (images: string[]) => {
    setSelectedImages(images);
    setShowImageGallery(true);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const loadLeadComps = async () => {
    try {
      setIsLoading(true);
      const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/comparables`);

      if (response.ok) {
        const data = await response.json();
        setLeadComps(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load comparables",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchComparables = async () => {
    try {
      setIsSearching(true);
      const params = new URLSearchParams();
      
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await makeApiCall(`${API_BASE}/comps/search?${params}`);

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search comparables",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getSuggestedComps = async () => {
    if (!leadAddress) {
      toast({
        title: "Error",
        description: "Lead address is required for suggestions",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSearching(true);
      const params = new URLSearchParams({
        city: leadAddress.city,
        state: leadAddress.state,
        zip: leadAddress.zip
      });

      const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/suggestions?${params}`);

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchDialog(true);
        toast({
          title: "Success",
          description: `Found ${data.length} suggested comparables`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get suggested comparables",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const deleteComparable = async (comparableId: string) => {
    try {
      const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/comparables/${comparableId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadLeadComps();
        toast({
          title: "Success",
          description: "Comparable removed"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove comparable",
        variant: "destructive"
      });
    }
  };

  const createComparable = async () => {
    try {
      const compData = {
        ...newComp,
        beds: newComp.beds ? parseInt(newComp.beds) : undefined,
        baths: newComp.baths ? parseFloat(newComp.baths) : undefined,
        sqft: newComp.sqft ? parseInt(newComp.sqft) : undefined,
        yearBuilt: newComp.yearBuilt ? parseInt(newComp.yearBuilt) : undefined,
        salePrice: newComp.salePrice ? parseInt(newComp.salePrice) : undefined,
        dom: newComp.dom ? parseInt(newComp.dom) : undefined,
        // Backend will coerce this to a Date; send as YYYY-MM-DD for clarity
        dateSold: newComp.dateSold || undefined
      };

      const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/comparables`, {
        method: 'POST',
        body: JSON.stringify(compData)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || `Failed to create comparable (HTTP ${response.status})`);
      }

      await loadLeadComps();
      setShowAddCompDialog(false);
      setNewComp({
        address: '',
        city: leadAddress?.city || '',
        state: leadAddress?.state || '',
        zip: leadAddress?.zip || '',
        beds: '',
        baths: '',
        sqft: '',
        yearBuilt: '',
        salePrice: '',
        dom: '',
        dateSold: ''
      });
      toast({
        title: "Success",
        description: "Comparable property created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create comparable",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading comparables...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200">
      <CardHeader className="p-3 pb-0">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Home className="h-4 w-4" />
            Comparable Properties
          </div>
          <Dialog open={showAddCompDialog} onOpenChange={setShowAddCompDialog}>
            <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-6 text-xs px-2"><Plus className="h-3 w-3 mr-0.5" />Add</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="text-sm">Add Comparable</DialogTitle></DialogHeader>
              <div className="grid grid-cols-4 gap-1 max-h-64 overflow-y-auto">
                <div className="col-span-2"><Label className="text-[10px]">Address</Label><Input value={newComp.address} onChange={(e) => setNewComp(prev => ({ ...prev, address: e.target.value }))} placeholder="123 Main St" className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">City</Label><Input value={newComp.city} onChange={(e) => setNewComp(prev => ({ ...prev, city: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">State</Label><Input value={newComp.state} onChange={(e) => setNewComp(prev => ({ ...prev, state: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">ZIP</Label><Input value={newComp.zip} onChange={(e) => setNewComp(prev => ({ ...prev, zip: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">Beds</Label><Input type="number" value={newComp.beds} onChange={(e) => setNewComp(prev => ({ ...prev, beds: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">Baths</Label><Input type="number" step="0.5" value={newComp.baths} onChange={(e) => setNewComp(prev => ({ ...prev, baths: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">SqFt</Label><Input type="number" value={newComp.sqft} onChange={(e) => setNewComp(prev => ({ ...prev, sqft: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">Year</Label><Input type="number" value={newComp.yearBuilt} onChange={(e) => setNewComp(prev => ({ ...prev, yearBuilt: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">Price</Label><Input type="number" value={newComp.salePrice} onChange={(e) => setNewComp(prev => ({ ...prev, salePrice: e.target.value }))} className="h-6 text-xs" /></div>
                <div><Label className="text-[10px]">DOM</Label><Input type="number" value={newComp.dom} onChange={(e) => setNewComp(prev => ({ ...prev, dom: e.target.value }))} className="h-6 text-xs" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Date Sold</Label><Input type="date" value={newComp.dateSold} onChange={(e) => setNewComp(prev => ({ ...prev, dateSold: e.target.value }))} className="h-6 text-xs" /></div>
              </div>
              <div className="flex justify-end gap-1 mt-2">
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setShowAddCompDialog(false)}>Cancel</Button>
                <Button size="sm" className="h-6 text-xs" onClick={createComparable}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {leadComps.length === 0 ? (
          <div className="text-center py-3 text-[10px] text-muted-foreground">No comps yet</div>
        ) : (
          <div className="overflow-x-auto max-h-40">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="py-1 px-1">Address</TableHead>
                  <TableHead className="py-1 px-1">Beds/Baths</TableHead>
                  <TableHead className="py-1 px-1">Sq Ft</TableHead>
                  <TableHead className="py-1 px-1">Sale Price</TableHead>
                  <TableHead className="py-1 px-1">Price/Sq Ft</TableHead>
                  <TableHead className="py-1 px-1">DOM</TableHead>
                  <TableHead className="py-1 px-1">Date Sold</TableHead>
                  <TableHead className="py-1 px-1"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadComps.map((comp) => (
                  <TableRow key={comp.id} className="text-[10px]">
                    <TableCell className="py-1 px-1">
                      <div className="font-medium">{comp.address}</div>
                      <div className="text-slate-400">{comp.city}, {comp.state}</div>
                    </TableCell>
                    <TableCell className="py-1 px-1">{comp.beds || '-'}/{comp.baths || '-'}</TableCell>
                    <TableCell className="py-1 px-1">{comp.sqft?.toLocaleString() || '-'}</TableCell>
                    <TableCell className="py-1 px-1">{formatCurrency(comp.salePrice)}</TableCell>
                    <TableCell className="py-1 px-1">{formatCurrency(comp.pricePerSqft)}</TableCell>
                    <TableCell className="py-1 px-1">{comp.dom || '-'}</TableCell>
                    <TableCell className="py-1 px-1">{formatDate(comp.dateSold)}</TableCell>
                    <TableCell className="py-1 px-1"><Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => deleteComparable(comp.id)}><Trash2 className="h-2.5 w-2.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Search Results Dialog */}
        <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
          <DialogContent className="max-w-6xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Search Results ({searchResults.length} found)</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Beds/Baths</TableHead>
                    <TableHead>Sq Ft</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Price/Sq Ft</TableHead>
                    <TableHead>Date Sold</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{comp.address}</div>
                          <div className="text-sm text-muted-foreground">
                            {comp.city}, {comp.state} {comp.zip}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {comp.beds || 'N/A'} / {comp.baths || 'N/A'}
                      </TableCell>
                      <TableCell>{comp.sqft?.toLocaleString() || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(comp.salePrice)}</TableCell>
                      <TableCell>{formatCurrency(comp.pricePerSqft)}</TableCell>
                      <TableCell>{formatDate(comp.dateSold)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">Reference</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Gallery Dialog */}
        <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Property Images</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {selectedImages.length > 0 ? selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Property ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(image, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No images available for this property</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
