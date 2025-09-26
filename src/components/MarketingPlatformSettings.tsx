import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Settings, Plus, Edit, Trash2, ExternalLink, Globe } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { API_BASE } from '@/config/api';

interface MarketingPlatform {
  id: string;
  name: string;
  type: string; // 'listing', 'social', 'email', 'advertising', 'analytics'
  baseUrl: string;
  description?: string;
  isActive: boolean;
  apiEndpoint?: string;
  authRequired: boolean;
  configFields: {
    name: string;
    type: string; // 'text', 'url', 'password', 'select'
    required: boolean;
    options?: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

interface MarketingPlatformSettingsProps {
  userRoles: string[];
}

export const MarketingPlatformSettings: React.FC<MarketingPlatformSettingsProps> = ({ userRoles }) => {
  const [platforms, setPlatforms] = useState<MarketingPlatform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<MarketingPlatform | null>(null);

  // New platform form
  const [newPlatform, setNewPlatform] = useState({
    name: '',
    type: 'listing',
    baseUrl: '',
    description: '',
    isActive: true,
    apiEndpoint: '',
    authRequired: false,
    configFields: [] as any[]
  });

  const { toast } = useToast();

  const platformTypes = [
    { value: 'listing', label: 'Listing Platform' },
    { value: 'social', label: 'Social Media' },
    { value: 'email', label: 'Email Marketing' },
    { value: 'advertising', label: 'Advertising' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'other', label: 'Other' }
  ];

  // Check if user is admin
  const isAdmin = userRoles.includes('ADMIN');

  useEffect(() => {
    if (isAdmin) {
      loadPlatforms();
    }
  }, [isAdmin]);

  const loadPlatforms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/settings/marketing-platforms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load marketing platforms",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPlatform = async () => {
    if (!newPlatform.name || !newPlatform.baseUrl) {
      toast({
        title: "Error",
        description: "Name and base URL are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/settings/marketing-platforms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(newPlatform)
      });

      if (response.ok) {
        await loadPlatforms();
        setShowCreateDialog(false);
        setNewPlatform({
          name: '',
          type: 'listing',
          baseUrl: '',
          description: '',
          isActive: true,
          apiEndpoint: '',
          authRequired: false,
          configFields: []
        });
        toast({
          title: "Success",
          description: "Marketing platform created successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create marketing platform",
        variant: "destructive"
      });
    }
  };

  const updatePlatform = async (platformId: string, updates: Partial<MarketingPlatform>) => {
    try {
      const response = await fetch(`${API_BASE}/settings/marketing-platforms/${platformId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await loadPlatforms();
        toast({
          title: "Success",
          description: "Marketing platform updated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update marketing platform",
        variant: "destructive"
      });
    }
  };

  const deletePlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this marketing platform?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/settings/marketing-platforms/${platformId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        await loadPlatforms();
        toast({
          title: "Success",
          description: "Marketing platform deleted successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete marketing platform",
        variant: "destructive"
      });
    }
  };

  const togglePlatformStatus = async (platform: MarketingPlatform) => {
    await updatePlatform(platform.id, { isActive: !platform.isActive });
  };

  const addConfigField = () => {
    setNewPlatform(prev => ({
      ...prev,
      configFields: [
        ...prev.configFields,
        { name: '', type: 'text', required: false }
      ]
    }));
  };

  const removeConfigField = (index: number) => {
    setNewPlatform(prev => ({
      ...prev,
      configFields: prev.configFields.filter((_, i) => i !== index)
    }));
  };

  const updateConfigField = (index: number, field: string, value: any) => {
    setNewPlatform(prev => ({
      ...prev,
      configFields: prev.configFields.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500">Admin access required to manage marketing platforms</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Marketing Platform Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading platforms...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Marketing Platform Settings
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Platform
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Marketing Platform</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Platform Name</Label>
                    <Input
                      id="name"
                      value={newPlatform.name}
                      onChange={(e) => setNewPlatform(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. MLS Listings"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Platform Type</Label>
                    <select
                      id="type"
                      value={newPlatform.type}
                      onChange={(e) => setNewPlatform(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      {platformTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    value={newPlatform.baseUrl}
                    onChange={(e) => setNewPlatform(prev => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPlatform.description}
                    onChange={(e) => setNewPlatform(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Platform description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="apiEndpoint">API Endpoint (optional)</Label>
                    <Input
                      id="apiEndpoint"
                      value={newPlatform.apiEndpoint}
                      onChange={(e) => setNewPlatform(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                      placeholder="/api/v1/listings"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="authRequired"
                      checked={newPlatform.authRequired}
                      onCheckedChange={(checked) => setNewPlatform(prev => ({ ...prev, authRequired: checked }))}
                    />
                    <Label htmlFor="authRequired">Requires Authentication</Label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Configuration Fields</Label>
                    <Button size="sm" variant="outline" onClick={addConfigField}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {newPlatform.configFields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder="Field name"
                        value={field.name}
                        onChange={(e) => updateConfigField(index, 'name', e.target.value)}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateConfigField(index, 'type', e.target.value)}
                        className="p-2 border rounded"
                      >
                        <option value="text">Text</option>
                        <option value="url">URL</option>
                        <option value="password">Password</option>
                        <option value="select">Select</option>
                      </select>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateConfigField(index, 'required', checked)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeConfigField(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={newPlatform.isActive}
                    onCheckedChange={(checked) => setNewPlatform(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createPlatform}>
                  Create Platform
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No marketing platforms configured yet.</p>
            <p className="text-sm">Add platforms to enable marketing integrations.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth Required</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map(platform => (
                <TableRow key={platform.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{platform.name}</div>
                      {platform.description && (
                        <div className="text-sm text-muted-foreground">
                          {platform.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {platformTypes.find(t => t.value === platform.type)?.label || platform.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a 
                      href={platform.baseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      {platform.baseUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={platform.isActive}
                        onCheckedChange={() => togglePlatformStatus(platform)}
                      />
                      <Badge variant={platform.isActive ? "default" : "secondary"}>
                        {platform.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {platform.authRequired ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedPlatform(platform);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePlatform(platform.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
