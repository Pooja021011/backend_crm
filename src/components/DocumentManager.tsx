import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Tabs removed - simplified to show all documents
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  File, 
  Image, 
  FileText, 
  Video, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Search,
  Calendar,
  User,
  Tag,
  History,
  Upload,
  FolderOpen,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { FileUploader } from "./FileUploader";
import { API_BASE } from "@/config/api";

export interface DocumentFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  category: string;
  tags: string[];
  description?: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt: string;
  updatedAt: string;
  version: number;
  versions?: DocumentVersion[];
  isPublic: boolean;
  leadId: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  filename: string;
  size: number;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt: string;
  changeNote?: string;
}

interface DocumentManagerProps {
  leadId: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canUpload?: boolean;
  className?: string;
}

const FILE_CATEGORIES = [
  { value: 'all', label: 'All Documents', icon: FolderOpen },
  { value: 'contract', label: 'Purchase Agreements', icon: FileText },
  { value: 'appraisal', label: 'Appraisal Reports', icon: FileText },
  { value: 'inspection', label: 'Inspection Reports', icon: FileText },
  { value: 'title', label: 'Title Documents', icon: FileText },
  { value: 'financial', label: 'Financial Documents', icon: FileText },
  { value: 'photos', label: 'Property Photos', icon: Image },
  { value: 'videos', label: 'Property Videos', icon: Video },
  { value: 'marketing', label: 'Marketing Materials', icon: Image },
  { value: 'legal', label: 'Legal Documents', icon: FileText },
  { value: 'other', label: 'Other Documents', icon: File }
];

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  leadId,
  canEdit = true,
  canDelete = true,
  canUpload = true,
  className
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // Fetch documents
  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  // Filter documents by search only
  useEffect(() => {
    let filtered = documents;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.originalName.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/files/lead/${leadId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.files || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const getFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    const cat = FILE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const handleDownload = async (document: DocumentFile) => {
    try {
      const response = await fetch(`${API_BASE}/files/download/${document.id}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = document.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${document.originalName}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the file",
        variant: "destructive"
      });
    }
  };

  const handlePreview = (document: DocumentFile) => {
    // Open preview in new tab
    const previewUrl = `${API_BASE}/files/preview/${document.id}`;
    window.open(previewUrl, '_blank');
  };

  const handleDelete = async (document: DocumentFile) => {
    if (!window.confirm(`Are you sure you want to delete "${document.originalName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/files/${document.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setDocuments(prev => prev.filter(d => d.id !== document.id));
      
      toast({
        title: "File Deleted",
        description: `${document.originalName} has been deleted`,
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the file",
        variant: "destructive"
      });
    }
  };

  const handleVersionHistory = (document: DocumentFile) => {
    setSelectedDocument(document);
    setIsVersionHistoryOpen(true);
  };

  const handleFilesUploaded = (uploadedFiles: any[]) => {
    setIsUploadDialogOpen(false);
    fetchDocuments(); // Refresh the document list
    
    toast({
      title: "Files Uploaded",
      description: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Document Management</h2>
          <p className="text-sm text-gray-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} total
          </p>
        </div>
        
        {canUpload && (
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload files related to this lead. Files will be categorized and tagged for easy organization.
                </DialogDescription>
              </DialogHeader>
              <FileUploader
                leadId={leadId}
                onFilesUploaded={handleFilesUploaded}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="mt-6">
          {filteredDocuments.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms or filters'
                    : 'Upload your first document to get started'
                  }
                </p>
                {canUpload && !searchQuery && (
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((document) => {
                const IconComponent = getFileIcon(document.mimeType);
                
                return (
                  <Card key={document.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {document.originalName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {getFileSize(document.size)} • v{document.version}
                            </p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(document)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(document)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {document.version > 1 && (
                              <DropdownMenuItem onClick={() => handleVersionHistory(document)}>
                                <History className="w-4 h-4 mr-2" />
                                Version History
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {canDelete && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(document)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(document.category)}
                          </Badge>
                          {document.isPublic && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Public
                            </Badge>
                          )}
                        </div>

                        {document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {document.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {document.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{document.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {document.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {document.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {document.uploadedBy.firstName} {document.uploadedBy.lastName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(document.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
      </div>

      {/* Version History Dialog */}
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              {selectedDocument?.originalName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument?.versions && (
            <div className="space-y-3">
              {selectedDocument.versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={version.version === selectedDocument.version ? "default" : "secondary"}>
                      v{version.version}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{version.filename}</p>
                      <p className="text-xs text-gray-500">
                        {getFileSize(version.size)} • {version.uploadedBy.firstName} {version.uploadedBy.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(version.uploadedAt).toLocaleString()}
                      </p>
                      {version.changeNote && (
                        <p className="text-xs text-gray-600 mt-1">{version.changeNote}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {version.version === selectedDocument.version && (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
