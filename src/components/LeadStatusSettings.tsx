import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  Plus,
  Trash2,
  Edit,
  X,
  AlertCircle,
  CheckCircle,
  GripVertical
} from "lucide-react";
import { API_BASE } from "@/config/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LeadStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  orderIndex: number;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_COLORS = [
  "#6B7280", // Gray
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
];

export const LeadStatusSettings = () => {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<LeadStatus>>({
    name: "",
    description: "",
    color: DEFAULT_COLORS[0],
    active: true,
    isDefault: false,
  });

  // Helper function for API calls
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Request failed');
    }
    
    return response.json();
  };

  // Fetch lead statuses
  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      const data = await makeApiCall(`${API_BASE}/lead-statuses`);
      if (data.success) {
        setStatuses(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load lead statuses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Handle create status
  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Status name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = await makeApiCall(`${API_BASE}/lead-statuses`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          color: formData.color || DEFAULT_COLORS[0],
          active: formData.active ?? true,
          isDefault: formData.isDefault ?? false,
        }),
      });

      if (data.success) {
        toast({
          title: "Success",
          description: "Lead status created successfully",
        });
        setFormData({
          name: "",
          description: "",
          color: DEFAULT_COLORS[0],
          active: true,
          isDefault: false,
        });
        setAddingNew(false);
        fetchStatuses();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update status
  const handleUpdate = async (id: string) => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Status name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = await makeApiCall(`${API_BASE}/lead-statuses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          color: formData.color,
          active: formData.active,
          isDefault: formData.isDefault,
        }),
      });

      if (data.success) {
        toast({
          title: "Success",
          description: "Lead status updated successfully",
        });
        setEditingId(null);
        setFormData({
          name: "",
          description: "",
          color: DEFAULT_COLORS[0],
          active: true,
          isDefault: false,
        });
        fetchStatuses();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete status
  const handleDelete = async (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default statuses cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const data = await makeApiCall(`${API_BASE}/lead-statuses/${id}`, {
        method: 'DELETE',
      });

      if (data.success) {
        toast({
          title: "Success",
          description: "Lead status deleted successfully",
        });
        fetchStatuses();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit button
  const startEdit = (status: LeadStatus) => {
    setEditingId(status.id);
    setFormData({
      name: status.name,
      description: status.description || "",
      color: status.color || DEFAULT_COLORS[0],
      active: status.active,
      isDefault: status.isDefault,
    });
    setAddingNew(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingId(null);
    setAddingNew(false);
    setFormData({
      name: "",
      description: "",
      color: DEFAULT_COLORS[0],
      active: true,
      isDefault: false,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Statuses</CardTitle>
          <CardDescription>Loading lead statuses...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Lead Statuses</CardTitle>
        <CardDescription>
          Manage lead statuses - add, edit, or delete custom statuses for your leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Lead statuses help you categorize and track leads. Default statuses cannot be deleted.
          </AlertDescription>
        </Alert>

        {/* Add New Status Button */}
        {!addingNew && !editingId && (
          <Button onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Status
          </Button>
        )}

        {/* Add/Edit Form */}
        {(addingNew || editingId) && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-lg">
                {addingNew ? "Add New Status" : "Edit Status"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="status-name">Status Name *</Label>
                <Input
                  id="status-name"
                  placeholder="e.g., New Lead, In Progress, Closed"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="status-description">Description (Optional)</Label>
                <Textarea
                  id="status-description"
                  placeholder="Brief description of this status..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSaving}
                  rows={2}
                />
              </div>

              {/* Color Picker */}
              <div>
                <Label htmlFor="status-color">Color</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        "w-10 h-10 rounded-md border-2 transition-all",
                        formData.color === color ? "border-black scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="status-active">Active</Label>
                <Switch
                  id="status-active"
                  checked={formData.active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  disabled={isSaving}
                />
              </div>

              {/* Default Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status-default">Default Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Default statuses cannot be deleted
                  </p>
                </div>
                <Switch
                  id="status-default"
                  checked={formData.isDefault ?? false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  disabled={isSaving}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  disabled={isSaving || !formData.name?.trim()}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {addingNew ? "Create Status" : "Update Status"}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statuses List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {statuses.length} Status{statuses.length !== 1 ? 'es' : ''}
          </h3>
          {statuses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No lead statuses found. Add your first status to get started.
              </AlertDescription>
            </Alert>
          ) : (
            statuses.map((status) => (
              <Card key={status.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Color Indicator */}
                      <div
                        className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: status.color || DEFAULT_COLORS[0] }}
                      />
                      
                      {/* Status Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base">{status.name}</h4>
                          {status.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {!status.active && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {status.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {status.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {editingId !== status.id && (
                      <div className="flex gap-2 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(status)}
                          disabled={isSaving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(status.id, status.name, status.isDefault)}
                          disabled={isSaving || status.isDefault}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
