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
import { Home, Plus, Search, TrendingUp, Calendar, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface Comparable {
  id: string;
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
  createdAt: string;
}

interface LeadComparable {
  id: string;
  leadId: string;
  comparableId: string;
  comparable: Comparable;
  addedAt: string;
}

interface CompsAnalysis {
  averagePrice: number;
  medianPrice: number;
  pricePerSqftAverage: number;
  pricePerSqftMedian: number;
  averageDom: number;
  totalComps: number;
  priceRange: {
    min: number;
    max: number;
  };
  sqftRange: {
    min: number;
    max: number;
  };
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
  const [searchResults, setSearchResults] = useState<Comparable[]>([]);
  const [analysis, setAnalysis] = useState<CompsAnalysis | null>(null);
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
      const response = await fetch(`/api/v1/comps/leads/${leadId}/comparables`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeadComps(data);
        
        // Load analysis if we have comps
        if (data.length > 0) {
          loadAnalysis();
        }
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

  const loadAnalysis = async () => {
    try {
      const response = await fetch(`/api/v1/comps/leads/${leadId}/analysis`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      // Analysis might fail if no valid comps, that's okay
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

      const response = await fetch(`/api/v1/comps/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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

      const response = await fetch(`/api/v1/comps/leads/${leadId}/suggestions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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

  const addCompToLead = async (comparableId: string) => {
    try {
      const response = await fetch(`/api/v1/comps/leads/${leadId}/comparables/${comparableId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadLeadComps();
        toast({
          title: "Success",
          description: "Comparable added to lead"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comparable",
        variant: "destructive"
      });
    }
  };

  const removeCompFromLead = async (comparableId: string) => {
    try {
      const response = await fetch(`/api/v1/comps/leads/${leadId}/comparables/${comparableId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadLeadComps();
        toast({
          title: "Success",
          description: "Comparable removed from lead"
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
        dateSold: newComp.dateSold ? new Date(newComp.dateSold).toISOString() : undefined
      };

      const response = await fetch('/api/v1/comps/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(compData)
      });

      if (response.ok) {
        const newComparable = await response.json();
        await addCompToLead(newComparable.id);
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
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create comparable",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Properties
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={getSuggestedComps} disabled={isSearching}>
              <Search className="h-4 w-4 mr-1" />
              {isSearching ? 'Searching...' : 'Get Suggestions'}
            </Button>
            <Dialog open={showAddCompDialog} onOpenChange={setShowAddCompDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Comp
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Comparable</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newComp.address}
                      onChange={(e) => setNewComp(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newComp.city}
                      onChange={(e) => setNewComp(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={newComp.state}
                      onChange={(e) => setNewComp(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      value={newComp.zip}
                      onChange={(e) => setNewComp(prev => ({ ...prev, zip: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="beds">Beds</Label>
                    <Input
                      id="beds"
                      type="number"
                      value={newComp.beds}
                      onChange={(e) => setNewComp(prev => ({ ...prev, beds: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="baths">Baths</Label>
                    <Input
                      id="baths"
                      type="number"
                      step="0.5"
                      value={newComp.baths}
                      onChange={(e) => setNewComp(prev => ({ ...prev, baths: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sqft">Square Feet</Label>
                    <Input
                      id="sqft"
                      type="number"
                      value={newComp.sqft}
                      onChange={(e) => setNewComp(prev => ({ ...prev, sqft: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="year-built">Year Built</Label>
                    <Input
                      id="year-built"
                      type="number"
                      value={newComp.yearBuilt}
                      onChange={(e) => setNewComp(prev => ({ ...prev, yearBuilt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sale-price">Sale Price</Label>
                    <Input
                      id="sale-price"
                      type="number"
                      value={newComp.salePrice}
                      onChange={(e) => setNewComp(prev => ({ ...prev, salePrice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dom">Days on Market</Label>
                    <Input
                      id="dom"
                      type="number"
                      value={newComp.dom}
                      onChange={(e) => setNewComp(prev => ({ ...prev, dom: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="date-sold">Date Sold</Label>
                    <Input
                      id="date-sold"
                      type="date"
                      value={newComp.dateSold}
                      onChange={(e) => setNewComp(prev => ({ ...prev, dateSold: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddCompDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createComparable}>
                    Add Comparable
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="comparables" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparables">Comparables ({leadComps.length})</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comparables" className="space-y-4">
            {leadComps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comparables added yet. Use "Get Suggestions" or "Add Comp" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Beds/Baths</TableHead>
                      <TableHead>Sq Ft</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Price/Sq Ft</TableHead>
                      <TableHead>DOM</TableHead>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadComps.map(({ id, comparable }) => (
                      <TableRow key={id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{comparable.address}</div>
                            <div className="text-sm text-muted-foreground">
                              {comparable.city}, {comparable.state} {comparable.zip}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {comparable.beds || 'N/A'} / {comparable.baths || 'N/A'}
                        </TableCell>
                        <TableCell>{comparable.sqft?.toLocaleString() || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(comparable.salePrice)}</TableCell>
                        <TableCell>{formatCurrency(comparable.pricePerSqft)}</TableCell>
                        <TableCell>{comparable.dom || 'N/A'}</TableCell>
                        <TableCell>{formatDate(comparable.dateSold)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCompFromLead(comparable.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {!analysis ? (
              <div className="text-center py-8 text-muted-foreground">
                Add at least one comparable with sale price to see analysis.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Average Price</div>
                    <div className="text-2xl font-semibold">{formatCurrency(analysis.averagePrice)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Median Price</div>
                    <div className="text-2xl font-semibold">{formatCurrency(analysis.medianPrice)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Avg Price/Sq Ft</div>
                    <div className="text-2xl font-semibold">{formatCurrency(analysis.pricePerSqftAverage)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Avg DOM</div>
                    <div className="text-2xl font-semibold">{analysis.averageDom} days</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Price Range</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(analysis.priceRange.min)} - {formatCurrency(analysis.priceRange.max)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Size Range</div>
                    <div className="text-lg font-semibold">
                      {analysis.sqftRange.min.toLocaleString()} - {analysis.sqftRange.max.toLocaleString()} sq ft
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total Comps</div>
                    <div className="text-2xl font-semibold">{analysis.totalComps}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Median Price/Sq Ft</div>
                    <div className="text-2xl font-semibold">{formatCurrency(analysis.pricePerSqftMedian)}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
                        <Button
                          size="sm"
                          onClick={() => addCompToLead(comp.id)}
                          disabled={leadComps.some(lc => lc.comparable.id === comp.id)}
                        >
                          {leadComps.some(lc => lc.comparable.id === comp.id) ? 'Added' : 'Add'}
                        </Button>
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
