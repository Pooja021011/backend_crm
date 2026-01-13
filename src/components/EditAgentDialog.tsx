import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Phone, 
  Mail, 
  Lock,
  Save,
  X,
  Shield,
  AlertCircle
} from "lucide-react";
import { useAgents, type Agent, type UpdateAgentData } from "@/hooks/useAgents";
import { useToast } from "@/hooks/use-toast";
import { 
  validateEmail, 
  validateE164PhoneNumber, 
  validateName, 
  formatE164PhoneNumber 
} from "@/utils/validation";

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentUpdated: () => void;
}

const AVAILABLE_ROLES = [
  { id: 'ADMIN', name: 'Admin', description: 'Full system access' },
  { id: 'MANAGER', name: 'Manager', description: 'Team management' },
  { id: 'ACQ', name: 'Acquisitions', description: 'Lead acquisition' },
  { id: 'DISP', name: 'Dispositions', description: 'Lead disposition' },
  { id: 'TC', name: 'Transaction Coordinator', description: 'Transaction management' },
];

export const EditAgentDialog: React.FC<EditAgentDialogProps> = ({
  agent,
  open,
  onOpenChange,
  onAgentUpdated,
}) => {
  const { updateAgent } = useAgents();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<UpdateAgentData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'active',
    roles: [],
    password: ''
  });

  const [changePassword, setChangePassword] = useState(false);

  // Initialize form data when agent changes
  useEffect(() => {
    if (agent) {
      setFormData({
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone || '',
        status: agent.status,
        roles: agent.roles.map(r => r.role.name),
        password: ''
      });
      setChangePassword(false);
    }
  }, [agent]);

  const handleInputChange = (field: keyof UpdateAgentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...(prev.roles || []), roleId]
        : (prev.roles || []).filter(r => r !== roleId)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.lastName?.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.email?.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return false;
    }

    const emailValidation = validateEmail(formData.email);
    if (formData.email && !emailValidation.isValid) {
      toast({
        title: "Validation Error",
        description: emailValidation.error,
        variant: "destructive",
      });
      return false;
    }

    const phoneValidation = validateE164PhoneNumber(formData.phone);
    if (formData.phone && !phoneValidation.isValid) {
      toast({
        title: "Validation Error",
        description: phoneValidation.error,
        variant: "destructive",
      });
      return false;
    }

    if (!formData.roles || formData.roles.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one role must be selected",
        variant: "destructive",
      });
      return false;
    }

    if (changePassword && !formData.password) {
      toast({
        title: "Validation Error",
        description: "Password is required when changing password",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const updateData: UpdateAgentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        status: formData.status,
        roles: formData.roles
      };

      if (changePassword && formData.password) {
        updateData.password = formData.password;
      }

      await updateAgent(agent.id, updateData);
      
      toast({
        title: "Agent Updated",
        description: `${formData.firstName} ${formData.lastName} has been updated successfully.`,
      });

      onAgentUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update agent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setChangePassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Agent
          </DialogTitle>
          <DialogDescription>
            Update agent information, roles, and permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ValidatedInput
                  label="First Name"
                  name="firstName"
                  value={formData.firstName || ''}
                  onValueChange={(value) => handleInputChange('firstName', value)}
                  validator={(value) => validateName(value, 'First name')}
                  placeholder="Enter first name"
                  required
                  icon={<User className="w-4 h-4" />}
                />
                <ValidatedInput
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName || ''}
                  onValueChange={(value) => handleInputChange('lastName', value)}
                  validator={(value) => validateName(value, 'Last name')}
                  placeholder="Enter last name"
                  required
                  icon={<User className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ValidatedInput
                  label="Email Address"
                  name="email"
                  value={formData.email || ''}
                  onValueChange={(value) => handleInputChange('email', value)}
                  validator={validateEmail}
                  placeholder="agent@company.com"
                  required
                  icon={<Mail className="w-4 h-4" />}
                  type="email"
                />
                <ValidatedInput
                  label="Phone Number"
                  name="phone"
                  value={formData.phone || ''}
                  onValueChange={(value) => handleInputChange('phone', value)}
                  validator={validateE164PhoneNumber}
                  formatter={formatE164PhoneNumber}
                  placeholder="+17752548172"
                  icon={<Phone className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'active' | 'inactive') => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AVAILABLE_ROLES.map((role) => (
                  <div key={role.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={(formData.roles || []).includes(role.id)}
                      onCheckedChange={(checked) => handleRoleChange(role.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`role-${role.id}`} className="font-medium cursor-pointer">
                        {role.name}
                      </Label>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="change-password"
                  checked={changePassword}
                  onCheckedChange={setChangePassword}
                />
                <Label htmlFor="change-password">
                  Change password
                </Label>
              </div>

              {changePassword ? (
                <ValidatedInput
                  label="New Password"
                  name="password"
                  value={formData.password || ''}
                  onValueChange={(value) => handleInputChange('password', value)}
                  validator={(value) => value.length < 8 ? "Password must be at least 8 characters long" : ""}
                  placeholder="Enter new password"
                  required
                  icon={<Lock className="w-4 h-4" />}
                  type="password"
                />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Leave unchecked to keep the current password unchanged.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Warning for agents with leads */}
          {agent._count.assignedLeads > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This agent has {agent._count.assignedLeads} assigned lead(s). 
                Changes to roles or status may affect their access to these leads.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Updating...' : 'Update Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
