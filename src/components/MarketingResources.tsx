import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { FileImage, Plus, Link, FileText, Video, Eye, EyeOff, Copy, Trash2, ExternalLink, Upload } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface MarketingFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
}

interface MarketingResource {
  id: string;
  leadId: string;
  title: string;
  type: string; // flyer, photo, video, listing_link, campaign_link, brochure, virtual_tour, other
  url?: string;
  fileId?: string;
  file?: MarketingFile;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MarketingStats {
  totalResources: number;
  activeResources: number;
  resourcesByType: { type: string; count: number }[];
}

interface MarketingResourcesProps {
  leadId: string;
}

export const MarketingResources: React.FC<MarketingResourcesProps> = ({ leadId }) => {
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewResourceDialog, setShowNewResourceDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // New resource form
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'flyer',
    url: '',
    fileId: '',
    description: '',
    isActive: true
  });

  // Campaign form
  const [campaign, setCampaign] = useState({
    name: '',
    resources: [] as Array<{
      title: string;
      type: string;
      url?: string;
      fileId?: string;
      description?: string;
    }>
  });

  const { toast } = useToast();

  const resourceTypes = [
    { value: 'flyer', label: 'Flyer', icon: FileText },
    { value: 'photo', label: 'Photo', icon: FileImage },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'listing_link', label: 'Listing Link', icon: Link },
    { value: 'campaign_link', label: 'Campaign Link', icon: Link },
    { value: 'brochure', label: 'Brochure', icon: FileText },
    { value: 'virtual_tour', label: 'Virtual Tour', icon: Eye },
    { value: 'other', label: 'Other', icon: FileText }
  ];

  useEffect(() => {
    loadResources();
    loadStats();
  }, [leadId]);

  const loadResources = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/marketing/leads/${leadId}/resources`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load marketing resources",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/v1/marketing/leads/${leadId}/resources/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const createResource = async () => {
    if (!newResource.title) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }

    if (!newResource.url && !newResource.fileId) {
      toast({
        title: "Error",
        description: "Either URL or file is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const resourceData = {
        title: newResource.title,
        type: newResource.type,
        url: newResource.url || undefined,
        fileId: newResource.fileId || undefined,
        description: newResource.description || undefined,
        isActive: newResource.isActive
      };

      const response = await fetch(`/api/v1/marketing/leads/${leadId}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(resourceData)
      });

      if (response.ok) {
        await loadResources();
        await loadStats();
        setShowNewResourceDialog(false);
        setNewResource({
          title: '',
          type: 'flyer',
          url: '',
          fileId: '',
          description: '',
          isActive: true
        });
        toast({
          title: "Success",
          description: "Marketing resource created successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create marketing resource",
        variant: "destructive"
      });
    }
  };

  const updateResource = async (resourceId: string, updates: Partial<MarketingResource>) => {
    try {
      const response = await fetch(`/api/v1/marketing/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await loadResources();
        await loadStats();
        toast({
          title: "Success",
          description: "Resource updated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update resource",
        variant: "destructive"
      });
    }
  };

  const toggleResourceStatus = async (resourceId: string) => {
    try {
      const response = await fetch(`/api/v1/marketing/resources/${resourceId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadResources();
        await loadStats();
        toast({
          title: "Success",
          description: "Resource status updated"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update resource status",
        variant: "destructive"
      });
    }
  };

  const deleteResource = async (resourceId: string) => {
    try {
      const response = await fetch(`/api/v1/marketing/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadResources();
        await loadStats();
        toast({
          title: "Success",
          description: "Resource deleted successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive"
      });
    }
  };

  const createCampaign = async () => {
    if (!campaign.name || campaign.resources.length === 0) {
      toast({
        title: "Error",
        description: "Campaign name and at least one resource are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/marketing/leads/${leadId}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          campaignName: campaign.name,
          resources: campaign.resources
        })
      });

      if (response.ok) {
        await loadResources();
        await loadStats();
        setShowCampaignDialog(false);
        setCampaign({
          name: '',
          resources: []
        });
        toast({
          title: "Success",
          description: "Marketing campaign created successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create marketing campaign",
        variant: "destructive"
      });
    }
  };

  const generatePublicLinks = async () => {
    try {
      const response = await fetch(`/api/v1/marketing/leads/${leadId}/public-links`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const links = await response.json();
        // Copy to clipboard or show in a dialog
        const linkText = Object.entries(links).map(([resourceId, link]) => {
          const resource = resources.find(r => r.id === resourceId);
          return `${resource?.title}: ${link}`;
        }).join('\n');
        
        navigator.clipboard.writeText(linkText);
        toast({
          title: "Success",
          description: "Public links copied to clipboard"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate public links",
        variant: "destructive"
      });
    }
  };

  const getResourceIcon = (type: string) => {
    const resourceType = resourceTypes.find(rt => rt.value === type);
    const IconComponent = resourceType?.icon || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getResourceTypeLabel = (type: string) => {
    return resourceTypes.find(rt => rt.value === type)?.label || type;
  };

  const filteredResources = selectedType === 'all' 
    ? resources 
    : resources.filter(r => r.type === selectedType);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Marketing Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading marketing resources...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Marketing Resources
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={generatePublicLinks}>
              <Link className="h-4 w-4 mr-1" />
              Get Public Links
            </Button>
            <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Marketing Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaign.name}
                      onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Open House Marketing"
                    />
                  </div>
                  <div>
                    <Label>Resources (Add at least one)</Label>
                    <div className="space-y-2">
                      {campaign.resources.map((resource, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={resource.title}
                            onChange={(e) => {
                              const updatedResources = [...campaign.resources];
                              updatedResources[index].title = e.target.value;
                              setCampaign(prev => ({ ...prev, resources: updatedResources }));
                            }}
                            placeholder="Resource title"
                          />
                          <Select
                            value={resource.type}
                            onValueChange={(value) => {
                              const updatedResources = [...campaign.resources];
                              updatedResources[index].type = value;
                              setCampaign(prev => ({ ...prev, resources: updatedResources }));
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {resourceTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const updatedResources = campaign.resources.filter((_, i) => i !== index);
                              setCampaign(prev => ({ ...prev, resources: updatedResources }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCampaign(prev => ({
                            ...prev,
                            resources: [...prev.resources, { title: '', type: 'flyer', description: '' }]
                          }));
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Resource
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createCampaign}>
                    Create Campaign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showNewResourceDialog} onOpenChange={setShowNewResourceDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Marketing Resource</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resource-title">Title</Label>
                    <Input
                      id="resource-title"
                      value={newResource.title}
                      onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Property Flyer"
                    />
                  </div>

                  <div>
                    <Label htmlFor="resource-type">Type</Label>
                    <Select value={newResource.type} onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs defaultValue="url" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">External Link</TabsTrigger>
                      <TabsTrigger value="file">Upload File</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="url" className="space-y-4">
                      <div>
                        <Label htmlFor="resource-url">URL</Label>
                        <Input
                          id="resource-url"
                          type="url"
                          value={newResource.url}
                          onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value, fileId: '' }))}
                          placeholder="https://example.com/flyer.pdf"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="file" className="space-y-4">
                      <div>
                        <Label htmlFor="resource-file">File Upload</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-sm text-gray-600">
                            File upload integration would go here
                          </p>
                          <Input
                            id="resource-file"
                            type="file"
                            className="mt-2"
                            onChange={(e) => {
                              // File upload logic would go here
                              // For now, just clear the URL
                              setNewResource(prev => ({ ...prev, url: '' }));
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div>
                    <Label htmlFor="resource-description">Description</Label>
                    <Textarea
                      id="resource-description"
                      value={newResource.description}
                      onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="resource-active"
                      checked={newResource.isActive}
                      onCheckedChange={(checked) => setNewResource(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="resource-active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowNewResourceDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createResource}>
                    Add Resource
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resources" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="resources" className="space-y-4">
            {/* Filter by type */}
            <div className="flex items-center gap-2">
              <Label>Filter by type:</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {resourceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No marketing resources found. Add your first resource to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map(resource => (
                  <Card key={resource.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getResourceIcon(resource.type)}
                          <div>
                            <div className="font-medium">{resource.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {getResourceTypeLabel(resource.type)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {resource.isActive ? (
                            <Badge variant="default">
                              <Eye className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>

                      {resource.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {resource.description}
                        </p>
                      )}

                      {resource.file && (
                        <div className="text-xs text-muted-foreground mb-3">
                          File: {resource.file.originalName} ({formatFileSize(resource.file.size)})
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        {resource.url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(resource.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleResourceStatus(resource.id)}
                        >
                          {resource.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteResource(resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Resources</div>
                      <div className="text-2xl font-semibold">{stats.totalResources}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Active Resources</div>
                      <div className="text-2xl font-semibold text-green-600">{stats.activeResources}</div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Resources by Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.resourcesByType.map(({ type, count }) => (
                      <Card key={type}>
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center mb-2">
                            {getResourceIcon(type)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getResourceTypeLabel(type)}
                          </div>
                          <div className="text-xl font-semibold">{count}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
