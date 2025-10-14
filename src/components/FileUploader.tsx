import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Video, 
  X, 
  Check,
  AlertCircle,
  Loader2,
  Tag,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";

export interface FileUploadItem {
  id: string;
  file: File;
  category: string;
  tags: string[];
  description?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FileUploaderProps {
  leadId: string;
  onFilesUploaded: (files: FileUploadItem[]) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

const FILE_CATEGORIES = [
  { value: 'contract', label: 'Purchase Agreement', icon: FileText },
  { value: 'appraisal', label: 'Appraisal Report', icon: FileText },
  { value: 'inspection', label: 'Inspection Report', icon: FileText },
  { value: 'title', label: 'Title Documents', icon: FileText },
  { value: 'financial', label: 'Financial Documents', icon: FileText },
  { value: 'photos', label: 'Property Photos', icon: Image },
  { value: 'videos', label: 'Property Videos', icon: Video },
  { value: 'marketing', label: 'Marketing Materials', icon: Image },
  { value: 'legal', label: 'Legal Documents', icon: FileText },
  { value: 'other', label: 'Other Documents', icon: File }
];

const ACCEPTED_FILE_TYPES = {
  'image/*': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'video/*': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
  'text/plain': ['txt'],
  'application/zip': ['zip'],
  'application/x-rar-compressed': ['rar']
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  leadId,
  onFilesUploaded,
  maxFileSize = 50, // 50MB default
  acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES),
  className
}) => {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    if (file.type === 'application/pdf') return FileText;
    return File;
  };

  const getFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: FileUploadItem[] = [];
    
    Array.from(fileList).forEach(file => {
      const error = validateFile(file);
      
      const fileItem: FileUploadItem = {
        id: generateFileId(),
        file,
        category: '',
        tags: [],
        status: error ? 'error' : 'pending',
        progress: 0,
        error
      };
      
      newFiles.push(fileItem);
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    if (newFiles.some(f => f.status === 'error')) {
      toast({
        title: "File Validation Error",
        description: "Some files could not be added. Please check the file requirements.",
        variant: "destructive"
      });
    }
  }, [maxFileSize, acceptedTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const updateFileProperty = (fileId: string, property: keyof FileUploadItem, value: any) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, [property]: value } : file
    ));
  };

  const addTag = (fileId: string, tag: string) => {
    if (!tag.trim()) return;
    
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, tags: [...new Set([...file.tags, tag.trim()])] }
        : file
    ));
  };

  const removeTag = (fileId: string, tagToRemove: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, tags: file.tags.filter(tag => tag !== tagToRemove) }
        : file
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const uploadFiles = async () => {
    const validFiles = files.filter(f => f.status === 'pending' && f.category);
    
    if (validFiles.length === 0) {
      toast({
        title: "No Files to Upload",
        description: "Please add files and select categories before uploading.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    for (const fileItem of validFiles) {
      try {
        updateFileProperty(fileItem.id, 'status', 'uploading');
        
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('leadId', leadId);
        formData.append('category', fileItem.category);
        formData.append('tags', JSON.stringify(fileItem.tags));
        formData.append('description', fileItem.description || '');

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          updateFileProperty(fileItem.id, 'progress', prev => {
            const newProgress = prev + Math.random() * 20;
            return newProgress > 90 ? 90 : newProgress;
          });
        }, 200);

        const response = await fetch(`${API_BASE}/files/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        updateFileProperty(fileItem.id, 'status', 'completed');
        updateFileProperty(fileItem.id, 'progress', 100);
        
        toast({
          title: "File Uploaded",
          description: `${fileItem.file.name} has been uploaded successfully.`
        });

      } catch (error) {
        updateFileProperty(fileItem.id, 'status', 'error');
        updateFileProperty(fileItem.id, 'error', error instanceof Error ? error.message : 'Upload failed');
        
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${fileItem.file.name}`,
          variant: "destructive"
        });
      }
    }

    setIsUploading(false);
    onFilesUploaded(files.filter(f => f.status === 'completed'));
  };

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'uploading': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default: return <File className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400"
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            isDragging ? "bg-blue-100" : "bg-gray-100"
          )}>
            <Upload className={cn(
              "w-8 h-8",
              isDragging ? "text-blue-600" : "text-gray-600"
            )} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              {isDragging ? "Drop files here" : "Upload Documents"}
            </h3>
            <p className="text-sm text-gray-600">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-xs text-gray-500">
              Supports: PDF, Word, Excel, Images, Videos (max {maxFileSize}MB each)
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Choose Files
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              Files to Upload ({files.length})
            </h4>
            <Button
              onClick={uploadFiles}
              disabled={isUploading || files.every(f => f.status !== 'pending' || !f.category)}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Files
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {files.map((fileItem) => {
              const IconComponent = getFileIcon(fileItem.file);
              
              return (
                <Card key={fileItem.id} className="p-4">
                  <div className="space-y-4">
                    {/* File Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getFileSize(fileItem.file.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(fileItem.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(fileItem.id)}
                            disabled={fileItem.status === 'uploading'}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {fileItem.status === 'uploading' && (
                      <Progress value={fileItem.progress} className="h-2" />
                    )}

                    {/* Error Message */}
                    {fileItem.status === 'error' && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-600">{fileItem.error}</p>
                      </div>
                    )}

                    {/* File Configuration */}
                    {fileItem.status === 'pending' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`category-${fileItem.id}`}>Category *</Label>
                          <Select
                            value={fileItem.category}
                            onValueChange={(value) => updateFileProperty(fileItem.id, 'category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {FILE_CATEGORIES.map((category) => {
                                const IconComp = category.icon;
                                return (
                                  <SelectItem key={category.value} value={category.value}>
                                    <div className="flex items-center gap-2">
                                      <IconComp className="w-4 h-4" />
                                      {category.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`tags-${fileItem.id}`}>Tags</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {fileItem.tags.map((tag, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs gap-1"
                              >
                                <Tag className="w-3 h-3" />
                                {tag}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-1"
                                  onClick={() => removeTag(fileItem.id, tag)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              id={`tags-${fileItem.id}`}
                              placeholder="Add tag and press Enter"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTag(fileItem.id, e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                              className="text-xs"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor={`description-${fileItem.id}`}>Description</Label>
                          <Textarea
                            id={`description-${fileItem.id}`}
                            placeholder="Optional description..."
                            value={fileItem.description || ''}
                            onChange={(e) => updateFileProperty(fileItem.id, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
