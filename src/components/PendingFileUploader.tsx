import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Video, 
  X, 
  Tag,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export interface PendingFileItem {
  id: string;
  file: File;
  category: string;
  tags: string[];
  description?: string;
}

interface PendingFileUploaderProps {
  onFilesChanged: (files: PendingFileItem[]) => void;
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

export const PendingFileUploader: React.FC<PendingFileUploaderProps> = ({
  onFilesChanged,
  maxFileSize = 50, // 50MB default
  acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES),
  className
}) => {
  const [files, setFiles] = useState<PendingFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    const newFiles: PendingFileItem[] = [];
    
    Array.from(fileList).forEach(file => {
      const error = validateFile(file);
      
      if (!error) {
        const fileItem: PendingFileItem = {
          id: generateFileId(),
          file,
          category: '',
          tags: []
        };
        
        newFiles.push(fileItem);
      }
    });

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChanged(updatedFiles);
    }
    
    if (newFiles.length < fileList.length) {
      toast({
        title: "Some Files Skipped",
        description: "Some files could not be added. Please check the file requirements.",
        variant: "destructive"
      });
    }
  }, [files, maxFileSize, acceptedTypes, onFilesChanged]);

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
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  }, [handleFiles]);

  const updateFileProperty = (fileId: string, property: keyof PendingFileItem, value: any) => {
    const updatedFiles = files.map(file => 
      file.id === fileId ? { ...file, [property]: value } : file
    );
    setFiles(updatedFiles);
    onFilesChanged(updatedFiles);
  };

  const addTag = (fileId: string, tag: string) => {
    if (!tag.trim()) return;
    
    const updatedFiles = files.map(file => 
      file.id === fileId 
        ? { ...file, tags: [...new Set([...file.tags, tag.trim()])] }
        : file
    );
    setFiles(updatedFiles);
    onFilesChanged(updatedFiles);
  };

  const removeTag = (fileId: string, tagToRemove: string) => {
    const updatedFiles = files.map(file => 
      file.id === fileId 
        ? { ...file, tags: file.tags.filter(tag => tag !== tagToRemove) }
        : file
    );
    setFiles(updatedFiles);
    onFilesChanged(updatedFiles);
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    setFiles(updatedFiles);
    onFilesChanged(updatedFiles);
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
          <h4 className="text-lg font-medium text-gray-900">
            Selected Files ({files.length})
          </h4>

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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* File Configuration */}
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
