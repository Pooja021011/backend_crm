import React, { useState } from "react";
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
  AlertCircle,
  Key
} from "lucide-react";
import { useAgents, type CreateAgentData } from "@/hooks/useAgents";
import { useToast } from "@/hooks/use-toast";
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateName, 
  formatPhoneNumber 
} from "@/utils/validation";

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: () => void;
}

const AVAILABLE_ROLES = [
  { id: 'ADMIN', name: 'Admin', description: 'Full system access' },
  { id: 'MANAGER', name: 'Manager', description: 'Team management' },
  { id: 'ACQ', name: 'Acquisitions', description: 'Lead acquisition' },
  { id: 'DISP', name: 'Dispositions', description: 'Lead disposition' },
  { id: 'TC', name: 'Transaction Coordinator', description: 'Transaction management' },
];

export const AddAgentDialog: React.FC<AddAgentDialogProps> = ({
  open,
  onOpenChange,
  onAgentCreated,
}) => {
  const { createAgent } = useAgents();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");

  const [formData, setFormData] = useState<CreateAgentData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'active',
    roles: [],
    password: ''
  });

  const [useCustomPassword, setUseCustomPassword] = useState(false);

  const handleInputChange = (field: keyof CreateAgentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, roleId]
        : prev.roles.filter(r => r !== roleId)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return false;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast({
        title: "Validation Error",
        description: emailValidation.error,
        variant: "destructive",
      });
      return false;
    }

    const phoneValidation = validatePhoneNumber(formData.phone);
    if (formData.phone && !phoneValidation.isValid) {
      toast({
        title: "Validation Error",
        description: phoneValidation.error,
        variant: "destructive",
      });
      return false;
    }

    if (formData.roles.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one role must be selected",
        variant: "destructive",
      });
      return false;
    }

    if (useCustomPassword && (!formData.password || formData.password.length < 8)) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long",
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
    setGeneratedPassword("");

    try {
      const submitData = {
        ...formData,
        phone: formData.phone || undefined,
        password: useCustomPassword ? formData.password : undefined
      };

      const result = await createAgent(submitData);
      
      if (result.generatedPassword) {
        setGeneratedPassword(result.generatedPassword);
      }

      toast({
        title: "Agent Created",
        description: `${formData.firstName} ${formData.lastName} has been created successfully.`,
      });

      // Don't close dialog immediately if password was generated
      if (!result.generatedPassword) {
        onAgentCreated();
        onOpenChange(false);
        resetForm();
      } else {
        onAgentCreated();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create agent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      status: 'active',
      roles: [],
      password: ''
    });
    setUseCustomPassword(false);
    setGeneratedPassword("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: "Password Copied",
      description: "The generated password has been copied to your clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5" />
            Add New Agent
          </DialogTitle>
          <DialogDescription>
            Create a new agent account with appropriate roles and permissions
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          // Show generated password
          <div className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Agent created successfully!</p>
                  <p>A password has been generated for the new agent:</p>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border font-mono text-sm">
                    <code className="flex-1">{generatedPassword}</code>
                    <Button size="sm" variant="outline" onClick={copyPassword}>
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Please share this password securely with the agent. They should change it on first login.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Show form
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
                    value={formData.firstName}
                    onValueChange={(value) => handleInputChange('firstName', value)}
                    validator={(value) => validateName(value, 'First name')}
                    placeholder="Enter first name"
                    required
                    icon={<User className="w-4 h-4" />}
                  />
                  <ValidatedInput
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
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
                    value={formData.email}
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
                    value={formData.phone}
                    onValueChange={(value) => handleInputChange('phone', value)}
                    validator={validatePhoneNumber}
                    formatter={formatPhoneNumber}
                    placeholder="(555) 123-4567"
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
                        checked={formData.roles.includes(role.id)}
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
                  Password Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-custom-password"
                    checked={useCustomPassword}
                    onCheckedChange={setUseCustomPassword}
                  />
                  <Label htmlFor="use-custom-password">
                    Set custom password (otherwise one will be generated)
                  </Label>
                </div>

                {useCustomPassword && (
                  <ValidatedInput
                    label="Password"
                    name="password"
                    value={formData.password}
                    onValueChange={(value) => handleInputChange('password', value)}
                    validator={(value) => value.length < 8 ? "Password must be at least 8 characters long" : ""}
                    placeholder="Enter password"
                    required
                    icon={<Lock className="w-4 h-4" />}
                    type="password"
                  />
                )}

                {!useCustomPassword && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      A secure password will be generated automatically and shown after the agent is created.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

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
                {isLoading ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
