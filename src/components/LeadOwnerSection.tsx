import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Trash2, Star, Phone, Mail, User, Pencil } from 'lucide-react';
import { API_BASE } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { formatUsPhoneForDisplay, normalizeUsPhoneToE164 } from '@/utils/phone';

interface LeadOwner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  order: number;
}

interface LeadOwnerSectionProps {
  leadId: string;
  readOnly?: boolean;
  onEditingChange?: (isEditing: boolean, ownerId: string | null, ownerData: { firstName: string; lastName: string; phone: string; email: string } | null) => void;
  suppressSuccessToasts?: boolean;
}

export interface LeadOwnerSectionRef {
  cancelEdit: () => void;
  refresh: () => void;
}

export const LeadOwnerSection = forwardRef<LeadOwnerSectionRef, LeadOwnerSectionProps>(({ leadId, readOnly = false, onEditingChange, suppressSuccessToasts = false }, ref) => {
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const { toast } = useToast();

  const [newOwner, setNewOwner] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  const [editOwner, setEditOwner] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchOwners();
  }, [leadId]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    cancelEdit: () => {
      handleCancelEdit();
    },
    refresh: () => {
      fetchOwners();
    }
  }));

  const fetchOwners = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/owners`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOwners(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwner = async () => {
    const payload = {
      firstName: (newOwner.firstName || '').trim(),
      lastName: (newOwner.lastName || '').trim(),
      phone: (newOwner.phone || '').trim(),
      email: (newOwner.email || '').trim(),
    };

    // All fields optional, but don't create a completely blank owner row
    if (!payload.firstName && !payload.lastName && !payload.phone && !payload.email) {
      toast({
        title: 'Validation Error',
        description: 'Please enter at least one field',
        variant: 'destructive'
      });
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/leads/${leadId}/owners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if (!suppressSuccessToasts) {
          toast({
            title: 'Success',
            description: 'Owner added successfully'
          });
        }
        setNewOwner({ firstName: '', lastName: '', phone: '', email: '' });
        setIsAdding(false);
        fetchOwners();
      } else {
        throw new Error('Failed to add owner');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add owner',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteOwner = async (ownerId: string) => {
    const ownerToDelete = owners.find(o => o.id === ownerId);
    const isPrimary = ownerToDelete?.isPrimary;
    const hasOtherOwners = owners.length > 1;
    
    let confirmMessage = 'Are you sure you want to delete this owner?';
    if (isPrimary && hasOtherOwners) {
      confirmMessage = 'This is the primary owner. The next owner will be promoted to primary. Are you sure you want to delete this owner?';
    } else if (isPrimary && !hasOtherOwners) {
      confirmMessage = 'This is the only owner. Are you sure you want to delete this owner?';
    }
    
    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/owners/${ownerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (!suppressSuccessToasts) {
          toast({
            title: 'Success',
            description: 'Owner deleted successfully'
          });
        }
        fetchOwners();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete owner',
        variant: 'destructive'
      });
    }
  };

  const handleSetPrimary = async (ownerId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/owners/${ownerId}/primary`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (!suppressSuccessToasts) {
          toast({
            title: 'Success',
            description: 'Primary owner updated'
          });
        }
        fetchOwners();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update primary owner',
        variant: 'destructive'
      });
    }
  };

  const handleEditOwner = (owner: LeadOwner) => {
    setEditingOwnerId(owner.id);
    const ownerData = {
      firstName: owner.firstName,
      lastName: owner.lastName,
      phone: owner.phone,
      email: owner.email
    };
    setEditOwner(ownerData);
    onEditingChange?.(true, owner.id, ownerData);
  };

  const handleUpdateOwner = async (ownerId: string) => {
    const payload = {
      firstName: (editOwner.firstName || '').trim(),
      lastName: (editOwner.lastName || '').trim(),
      phone: (editOwner.phone || '').trim(),
      email: (editOwner.email || '').trim(),
    };

    // Allow partial updates, but prevent saving a completely blank owner row.
    if (!payload.firstName && !payload.lastName && !payload.phone && !payload.email) {
      toast({
        title: 'Validation Error',
        description: 'Please enter at least one field (or delete the owner)',
        variant: 'destructive'
      });
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/owners/${ownerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if (!suppressSuccessToasts) {
          toast({
            title: 'Success',
            description: 'Owner updated successfully'
          });
        }
        setEditingOwnerId(null);
        setEditOwner({ firstName: '', lastName: '', phone: '', email: '' });
        onEditingChange?.(false, null, null);
        fetchOwners();
      } else {
        throw new Error('Failed to update owner');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update owner',
        variant: 'destructive'
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingOwnerId(null);
    setEditOwner({ firstName: '', lastName: '', phone: '', email: '' });
    onEditingChange?.(false, null, null);
  };

  if (loading) {
    return <div className="text-center py-4">Loading owners...</div>;
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Lead Owners</span>
        </div>
        {!readOnly && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 text-[10px] px-1"
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus className="w-2.5 h-2.5 mr-0.5" />
            Add
          </Button>
        )}
      </div>
      <div className="space-y-1">
        {/* Existing Owners */}
        {owners.length === 0 && !isAdding && (
          <p className="text-[10px] text-slate-500 text-center py-2">
            No owners added yet
          </p>
        )}

        {owners.map((owner) => (
          editingOwnerId === owner.id ? (
            // Edit Mode
            <div key={owner.id} className="p-1.5 bg-slate-100 rounded space-y-1">
              <span className="text-[10px] font-medium text-slate-600">Edit Owner</span>
              <div className="grid grid-cols-4 gap-1">
                <div>
                  <Label className="text-[10px] text-slate-500">First Name</Label>
                  <Input
                    className="h-6 text-xs"
                    value={editOwner.firstName}
                    onChange={(e) => {
                      const updated = { ...editOwner, firstName: e.target.value };
                      setEditOwner(updated);
                      onEditingChange?.(true, editingOwnerId, updated);
                    }}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Last Name</Label>
                  <Input
                    className="h-6 text-xs"
                    value={editOwner.lastName}
                    onChange={(e) => {
                      const updated = { ...editOwner, lastName: e.target.value };
                      setEditOwner(updated);
                      onEditingChange?.(true, editingOwnerId, updated);
                    }}
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Phone</Label>
                  <Input
                    className="h-6 text-xs"
                    value={formatUsPhoneForDisplay(editOwner.phone)}
                    onChange={(e) => {
                      const updated = { ...editOwner, phone: normalizeUsPhoneToE164(e.target.value) || e.target.value };
                      setEditOwner(updated);
                      onEditingChange?.(true, editingOwnerId, updated);
                    }}
                    placeholder="555-123-4567"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Email</Label>
                  <Input
                    className="h-6 text-xs"
                    type="email"
                    value={editOwner.email}
                    onChange={(e) => {
                      const updated = { ...editOwner, email: e.target.value };
                      setEditOwner(updated);
                      onEditingChange?.(true, editingOwnerId, updated);
                    }}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => handleUpdateOwner(owner.id)}>Save</Button>
                <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <div
              key={owner.id}
              className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-[10px] group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-800">
                    {owner.firstName} {owner.lastName}
                  </span>
                  {owner.isPrimary && (
                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  {owner.phone && owner.phone.trim() !== '' && (
                    <span className="flex items-center gap-0.5">
                      <Phone className="h-2 w-2" />
                      {formatUsPhoneForDisplay(owner.phone)}
                    </span>
                  )}
                  {owner.email && 
                   !owner.email.includes('@unknown.local') && 
                   !owner.email.includes('none@none.com') && 
                   owner.email.trim() !== '' && (
                    <span className="flex items-center gap-0.5">
                      <Mail className="h-2 w-2" />
                      {owner.email}
                    </span>
                  )}
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => handleEditOwner(owner)}
                    title="Edit owner"
                  >
                    <Pencil className="h-2.5 w-2.5 text-blue-500" />
                  </Button>
                  {!owner.isPrimary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleSetPrimary(owner.id)}
                      title="Set as primary"
                    >
                      <Star className="h-2.5 w-2.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteOwner(owner.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          )
        ))}

        {/* Add New Owner Form */}
        {isAdding && !readOnly && (
          <div className="p-1.5 bg-slate-100 rounded space-y-1">
            <span className="text-[10px] font-medium text-slate-600">Add New Owner</span>
            <div className="grid grid-cols-4 gap-1">
              <div>
                <Label className="text-[10px] text-slate-500">First Name</Label>
                <Input
                  className="h-6 text-xs"
                  value={newOwner.firstName}
                  onChange={(e) => setNewOwner({ ...newOwner, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Last Name</Label>
                <Input
                  className="h-6 text-xs"
                  value={newOwner.lastName}
                  onChange={(e) => setNewOwner({ ...newOwner, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Phone</Label>
                <Input
                  className="h-6 text-xs"
                  value={formatUsPhoneForDisplay(newOwner.phone)}
                  onChange={(e) => setNewOwner({ ...newOwner, phone: normalizeUsPhoneToE164(e.target.value) || e.target.value })}
                  placeholder="555-123-4567"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Email</Label>
                <Input
                  className="h-6 text-xs"
                  type="email"
                  value={newOwner.email}
                  onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={handleAddOwner}>Add</Button>
              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => {
                setIsAdding(false);
                setNewOwner({ firstName: '', lastName: '', phone: '', email: '' });
              }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LeadOwnerSection.displayName = 'LeadOwnerSection';

