import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { Home, Plus, Search, TrendingUp, Calendar, MapPin, Trash2, ExternalLink, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileText, Download, X, Loader2 } from 'lucide-react';
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
  arv?: number;
  arvDisplay?: string;
  onArvDisplayChange?: (raw: string) => void;
  onArvBlur?: () => void;
  canEditArv?: boolean;
  arvHelpText?: string;
  leadAddress?: {
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  suppressSuccessToasts?: boolean;
}

export const CompsManager: React.FC<CompsManagerProps> = ({
  leadId,
  leadAddress,
  arv = 0,
  arvDisplay,
  onArvDisplayChange,
  onArvBlur,
  canEditArv = true,
  arvHelpText = 'This value feeds the Underwriting ARV input automatically.',
  suppressSuccessToasts = false,
}) => {
  const [leadComps, setLeadComps] = useState<LeadComparable[]>([]);
  const [searchResults, setSearchResults] = useState<LeadComparable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddCompDialog, setShowAddCompDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Comps PDFs
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [activePdfIndex, setActivePdfIndex] = useState(0);
  
  const activePdf = pdfs[activePdfIndex];
  const canGoPrevPdf = activePdfIndex > 0;
  const canGoNextPdf = activePdfIndex < pdfs.length - 1;

  const goPrevPdf = () => {
    setActivePdfIndex((idx) => Math.max(0, idx - 1));
  };

  const goNextPdf = () => {
    setActivePdfIndex((idx) => Math.min(pdfs.length - 1, idx + 1));
  };
  
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

  // Keyboard navigation for PDF preview
  useEffect(() => {
    if (!showPdfPreview) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrevPdf();
      if (e.key === "ArrowRight") goNextPdf();
      if (e.key === "Escape") setShowPdfPreview(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPdfPreview, goPrevPdf, goNextPdf]);

  useEffect(() => {
    loadLeadComps();
    loadLeadCompPdfs();
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

  const loadLeadCompPdfs = async () => {
    try {
      const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/pdfs`);
      if (response.ok) {
        const json = await response.json();
        setPdfs(json.data || []);
      }
    } catch (e) {
      // non-blocking
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('📁 Files selected:', files?.length || 0);
    
    if (!files || files.length === 0) {
      console.log('⚠️ No files selected');
      return;
    }
    
    // Convert FileList to Array to preserve files after clearing input
    const fileArray = Array.from(files);
    console.log('📋 Converted to array:', fileArray.length, 'file(s)');
    
    // Clear input value so the same file can be selected again
    event.target.value = '';

    // Automatically expand the section to show upload progress
    setExpanded(true);
    setUploadingPdf(true);
    console.log('🚀 Starting upload for', fileArray.length, 'file(s)');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Upload each file sequentially
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        console.log(`📤 Uploading file ${i + 1}/${fileArray.length}:`, file.name, file.type, file.size);
        
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/pdfs`, {
            method: 'POST',
            body: formData,
          });

          console.log(`📥 Response for ${file.name}:`, response.status, response.statusText);

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const errorMsg = err?.error || err?.message || `HTTP ${response.status}`;
            console.error(`❌ Upload failed for ${file.name}:`, errorMsg);
            throw new Error(errorMsg);
          }

          successCount++;
          console.log(`✅ Successfully uploaded ${file.name}`);
        } catch (e: any) {
          errorCount++;
          const errorMsg = `${file.name}: ${e?.message || 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ Failed to upload ${file.name}:`, e);
        }
      }

      console.log(`📊 Upload complete: ${successCount} success, ${errorCount} failed`);

      // Show summary toast only if files were processed
      if (successCount > 0 || errorCount > 0) {
        if (successCount > 0 && errorCount === 0) {
          if (!suppressSuccessToasts) {
            toast({ 
              title: 'Success', 
              description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully` 
            });
          }
        } else if (successCount > 0 && errorCount > 0) {
          // Lead Detail UX: suppress success/partial-success popups; only show errors
          if (!suppressSuccessToasts) {
            toast({ 
              title: 'Partial Success', 
              description: `${successCount} uploaded, ${errorCount} failed. Check console for details.`,
              variant: 'default'
            });
          } else {
            toast({ 
              title: 'Upload Failed', 
              description: errors[0] || `Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`,
              variant: 'destructive' 
            });
          }
        } else if (errorCount > 0) {
          toast({ 
            title: 'Upload Failed', 
            description: errors[0] || `Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`,
            variant: 'destructive' 
          });
        }
      }

      // Only reload if at least one file was successfully uploaded
      if (successCount > 0) {
        console.log('🔄 Reloading PDF list...');
        await loadLeadCompPdfs();
      }
    } catch (e: any) {
      console.error('❌ Upload error:', e);
      toast({ title: 'Error', description: e?.message || 'Failed to upload files', variant: 'destructive' });
    } finally {
      setUploadingPdf(false);
      console.log('✅ Upload process complete');
    }
  };

  const deletePdf = async (id: string) => {
    try {
      const response = await makeApiCall(`${API_BASE}/comps/leads/${leadId}/pdfs/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete PDF');
      }
      if (!suppressSuccessToasts) toast({ title: 'Success', description: 'PDF removed' });
      await loadLeadCompPdfs();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete PDF', variant: 'destructive' });
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

  const formatArv = () => {
    if (!arv) return '$0';
    return formatCurrency(arv);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Home className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Comparable Properties</span>
          <span className="text-xs text-emerald-600 font-semibold">ARV: {formatArv()}</span>
          {uploadingPdf && (
            <span className="text-[10px] text-blue-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => document.getElementById(`comps-pdf-upload-${leadId}`)?.click()}
              disabled={uploadingPdf}
              title="Add PDF"
            >
              {uploadingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
            <input
              id={`comps-pdf-upload-${leadId}`}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
              disabled={uploadingPdf}
            />

            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-2 mt-2">
          {/* ARV input (inside Comparable Properties) */}
          {typeof arvDisplay === 'string' && typeof onArvDisplayChange === 'function' && (
            <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 rounded">
              <div>
                <Label className="text-[10px] text-slate-500">ARV</Label>
                <Input
                  name="arv"
                  type="text"
                  inputMode="numeric"
                  value={arvDisplay}
                  onChange={(e) => onArvDisplayChange(e.target.value)}
                  onBlur={onArvBlur}
                  className="h-6 text-xs"
                  placeholder="$0"
                  disabled={!canEditArv}
                />
              </div>
            </div>
          )}

          {/* PDFs */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Comp PDFs</span>
            </div>
            {uploadingPdf ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Uploading files...</span>
              </div>
            ) : pdfs.length === 0 ? (
              <div className="text-center py-2 text-[10px] text-muted-foreground">No PDFs yet</div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="relative px-8"
              >
                <CarouselContent>
                  {pdfs.map((p: any) => (
                    <CarouselItem
                      key={p.id}
                      className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                    >
                      <div className="relative border border-slate-200 rounded-lg bg-white hover:shadow-md transition-shadow group">
                        {/* File Thumbnail */}
                        {p.file?.mimeType?.startsWith('image/') ? (
                          <div className="relative w-full h-24 bg-slate-100 rounded-t-lg overflow-hidden">
                            <img
                              src={`${API_BASE}${p.previewUrl?.replace('/api/v1', '')}`}
                              alt={p.file?.originalName || 'File'}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => {
                                setActivePdfIndex(pdfs.findIndex(pdf => pdf.id === p.id));
                                setShowPdfPreview(true);
                              }}
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML =
                                    '<div class="flex items-center justify-center h-full text-slate-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div 
                            className="w-full h-24 bg-slate-100 rounded-t-lg flex items-center justify-center cursor-pointer"
                            onClick={() => {
                              setActivePdfIndex(pdfs.findIndex(pdf => pdf.id === p.id));
                              setShowPdfPreview(true);
                            }}
                          >
                            <FileText className="w-8 h-8 text-slate-400" />
                          </div>
                        )}

                        {/* Action Buttons Overlay */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.downloadUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`${API_BASE}${p.downloadUrl.replace('/api/v1', '')}`, '_blank');
                              }}
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5 text-white" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete ${p.fileName}?`)) {
                                deletePdf(p.id);
                              }
                            }}
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </Button>
                        </div>

                        {/* File Info */}
                        <div className="p-1.5">
                          <span
                            className="text-[10px] text-slate-700 font-medium truncate block"
                            title={p.file?.originalName || 'File'}
                          >
                            {p.file?.originalName || 'File'}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {p.file?.size ? `${((p.file.size || 0) / 1024).toFixed(0)}KB` : ''}
                          </span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {/* Navigation Arrows */}
                <CarouselPrevious
                  variant="ghost"
                  className="left-1 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm hover:bg-white"
                />
                <CarouselNext
                  variant="ghost"
                  className="right-1 top-1/2 -translate-y-1/2 bg-white/90 shadow-sm hover:bg-white"
                />
              </Carousel>
            )}
          </div>

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

        {/* PDF Preview Dialog */}
        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
          <DialogContent className="max-w-5xl p-0 overflow-hidden [&>button.absolute]:hidden">
            <div className="relative bg-black">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3 z-10 text-white hover:text-white bg-black/40 hover:bg-black/60"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>

              {activePdf && (
                <>
                  {activePdf.file?.mimeType === 'application/pdf' ? (
                    <iframe
                      src={`${API_BASE}${activePdf.previewUrl?.replace('/api/v1', '')}`}
                      className="w-full h-[80vh]"
                      title={activePdf.file?.originalName || 'PDF Preview'}
                    />
                  ) : activePdf.file?.mimeType?.startsWith('image/') ? (
                    <img
                      src={`${API_BASE}${activePdf.previewUrl?.replace('/api/v1', '')}`}
                      alt={activePdf.file?.originalName || 'File'}
                      className="w-full max-h-[80vh] object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-white">
                      <FileText className="w-24 h-24 mb-4" />
                      <p className="text-lg mb-2">{activePdf.file?.originalName || 'File'}</p>
                      <p className="text-sm text-gray-400 mb-4">
                        {activePdf.file?.size ? `${((activePdf.file.size || 0) / 1024).toFixed(0)}KB` : ''}
                      </p>
                      <Button
                        onClick={() => activePdf.previewUrl && window.open(`${API_BASE}${activePdf.previewUrl.replace('/api/v1', '')}`, '_blank')}
                        className="bg-white text-black hover:bg-gray-200"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Open Preview
                      </Button>
                    </div>
                  )}
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 disabled:opacity-40"
                onClick={goPrevPdf}
                disabled={!canGoPrevPdf}
                aria-label="Previous file"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 disabled:opacity-40"
                onClick={goNextPdf}
                disabled={!canGoNextPdf}
                aria-label="Next file"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
              <div className="text-sm text-muted-foreground truncate flex-1">
                {activePdf?.file?.originalName || 'File'}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => activePdf?.downloadUrl && window.open(`${API_BASE}${activePdf.downloadUrl.replace('/api/v1', '')}`, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <div className="text-xs text-muted-foreground">
                  {pdfs.length > 0 ? `${activePdfIndex + 1} / ${pdfs.length}` : ""}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      )}
    </div>
  );
};
