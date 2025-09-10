import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  Mail, 
  Phone,
  Lock,
  Save
} from "lucide-react";

const Settings = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Information Card */}
      <Card className="bg-gradient-subtle border border-border/50 shadow-card overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <User className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Profile Information</h2>
          </div>
        
          <div className="space-y-6">
            {/* Name Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    First Name
                  </Label>
                  <Input 
                    id="firstName" 
                    defaultValue="Chris" 
                    className="bg-input border-border focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Last Name
                  </Label>
                  <Input 
                    id="lastName" 
                    defaultValue="Harris" 
                    className="bg-input border-border focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Section */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email" 
                defaultValue="chris.harris@localhomesbuyers.com" 
                className="bg-input border-border focus:ring-primary focus:border-primary"
              />
            </div>

            <Separator />

            {/* Phone Numbers Section */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Linked Phone Numbers
              </Label>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input 
                    defaultValue="(555) 123-4567" 
                    className="bg-input border-border focus:ring-primary focus:border-primary"
                  />
                  <Button variant="outline" size="sm">
                    Remove
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    defaultValue="(555) 987-6543" 
                    className="bg-input border-border focus:ring-primary focus:border-primary"
                  />
                  <Button variant="outline" size="sm">
                    Remove
                  </Button>
                </div>
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Add Phone Number
                </Button>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end pt-4">
              <Button className="bg-gradient-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-2" />
                Save Profile Changes
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Password Reset Card */}
      <Card className="bg-gradient-subtle border border-border/50 shadow-card overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
              <Lock className="w-7 h-7 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Security Settings</h2>
          </div>
        
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                Current Password
              </Label>
              <Input 
                id="currentPassword" 
                type="password" 
                placeholder="Enter your current password"
                className="bg-input border-border focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                New Password
              </Label>
              <Input 
                id="newPassword" 
                type="password" 
                placeholder="Enter your new password"
                className="bg-input border-border focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm New Password
              </Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="Confirm your new password"
                className="bg-input border-border focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" className="border-warning text-warning hover:bg-warning hover:text-warning-foreground">
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <Card className="bg-gradient-subtle border border-border/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <SettingsIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Local Homes Buyers CRM</h3>
                <p className="text-sm text-muted-foreground font-medium">Version 2.1.4 • Real Estate Investment Platform</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Last Updated: February 1, 2024</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;