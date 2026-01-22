import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  Plus,
  Trash2,
  Edit,
  X
} from "lucide-react";
import { API_BASE } from "@/config/api";
import { useToast } from "@/hooks/use-toast";

interface LeadSource {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const LeadSourceSettings = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<LeadSource>>({
    name: "",
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

  // Fetch lead sources
  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const data = await makeApiCall(`${API_BASE}/settings/lead-sources`);
      if (data.success || data.data) {
        setSources(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load lead sources",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // Handle create source
  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Source name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = await makeApiCall(`${API_BASE}/settings/lead-sources`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          active: true,
        }),
      });

      if (data.success || data.data) {
        // Success toast removed - only show errors
        setFormData({
          name: "",
        });
        setAddingNew(false);
        fetchSources();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead source",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update source
  const handleUpdate = async (id: string) => {
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Source name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = await makeApiCall(`${API_BASE}/settings/lead-sources/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name.trim(),
          active: true,
        }),
      });

      if (data.success || data.data) {
        // Success toast removed - only show errors
        setEditingId(null);
        setFormData({
          name: "",
        });
        fetchSources();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead source",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete source
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const data = await makeApiCall(`${API_BASE}/settings/lead-sources/${id}`, {
        method: 'DELETE',
      });

      if (data.success !== false) {
        // Success toast removed - only show errors
        fetchSources();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead source",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit button
  const startEdit = (source: LeadSource) => {
    setEditingId(source.id);
    setFormData({
      name: source.name,
    });
    setAddingNew(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingId(null);
    setAddingNew(false);
    setFormData({
      name: "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
          <CardDescription>Loading lead sources...</CardDescription>
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
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>
          Manage lead sources for tracking where your leads come from
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Source Button */}
        {!addingNew && !editingId && (
          <Button onClick={() => setAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Source
          </Button>
        )}

        {/* Add/Edit Form */}
        {(addingNew || editingId) && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-lg">
                {addingNew ? "Add New Source" : "Edit Source"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="source-name">Source Name *</Label>
                <Input
                  id="source-name"
                  placeholder="e.g., Mailer, SMS, Call, Foreclosure, Other"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      {addingNew ? "Create Source" : "Update Source"}
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

        {/* Sources List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {sources.length} Source{sources.length !== 1 ? 's' : ''}
          </h3>
          {sources.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No lead sources found. Add your first source to get started.
              </AlertDescription>
            </Alert>
          ) : (
            sources.map((source) => (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Source Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base">{source.name}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {editingId !== source.id && (
                      <div className="flex gap-2 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(source)}
                          disabled={isSaving}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(source.id, source.name)}
                          disabled={isSaving}
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

