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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mail, 
  Send, 
  X, 
  User,
  Users,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@/hooks/useLeads";

interface SendEmailDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Email templates
const EMAIL_TEMPLATES = {
  SELLER: {
    initial_contact: {
      subject: "Thank you for your property inquiry",
      body: `Dear {{firstName}},

Thank you for reaching out to us regarding your property at {{address}}. We appreciate your interest in working with our team.

Our acquisition specialist will be in touch with you shortly to discuss your property and answer any questions you may have about the selling process.

In the meantime, if you have any urgent questions, please don't hesitate to reach out to us directly.

Best regards,
{{agentName}}
{{companyName}}`
    },
    follow_up: {
      subject: "Following up on your property at {{address}}",
      body: `Hi {{firstName}},

I wanted to follow up on our previous conversation about your property at {{address}}. 

We're very interested in learning more about your situation and how we can help you achieve your goals with this property.

Would you be available for a brief call this week to discuss next steps?

Best regards,
{{agentName}}
{{companyName}}`
    },
    offer_ready: {
      subject: "Property Offer - {{address}}",
      body: `Dear {{firstName}},

We're pleased to inform you that we're ready to present an offer for your property at {{address}}.

Our team has completed the initial analysis and we believe we can provide you with a competitive offer that meets your needs.

Please let us know when would be a good time to discuss the details of our offer.

Best regards,
{{agentName}}
{{companyName}}`
    }
  },
  BUYER: {
    welcome: {
      subject: "Welcome to our buyer network!",
      body: `Dear {{firstName}},

Welcome to our exclusive buyer network! We're excited to help you find the perfect property that meets your criteria.

Based on your preferences:
- Price Range: {{priceRange}}
- Location: {{preferredAreas}}

We'll be sending you new property opportunities that match your criteria as they become available.

Best regards,
{{agentName}}
{{companyName}}`
    },
    property_match: {
      subject: "New Property Match - {{address}}",
      body: `Hi {{firstName}},

We have a new property that matches your buying criteria:

Property Address: {{address}}
Price: {{price}}
Bedrooms: {{bedrooms}}
Bathrooms: {{bathrooms}}

This property just became available and we wanted to give you first opportunity to view it.

Would you like to schedule a showing?

Best regards,
{{agentName}}
{{companyName}}`
    }
  },
  VENDOR: {
    welcome: {
      subject: "Welcome to our vendor network",
      body: `Dear {{firstName}},

Thank you for joining our vendor network. We're excited to work with {{company}} and leverage your {{serviceType}} services.

We'll be in touch when opportunities arise that match your expertise and service area.

Please don't hesitate to reach out if you have any questions about working with our team.

Best regards,
{{agentName}}
{{companyName}}`
    },
    opportunity: {
      subject: "Service Opportunity - {{serviceType}}",
      body: `Hi {{firstName}},

We have a new opportunity that may be a good fit for {{company}}.

Service Needed: {{serviceType}}
Property Location: {{address}}
Timeline: {{timeline}}

If you're available and interested, please let us know and we'll provide additional details.

Best regards,
{{agentName}}
{{companyName}}`
    }
  }
};

export const SendEmailDialog: React.FC<SendEmailDialogProps> = ({
  lead,
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
    recipient: 'lead' // 'lead' or 'agent'
  });

  // Get lead contact info
  const getLeadEmail = () => {
    return lead.seller?.email || lead.buyer?.email || lead.vendor?.email || '';
  };

  const getLeadName = () => {
    const contact = lead.seller || lead.buyer || lead.vendor;
    return contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown';
  };

  const getAssignedAgentEmail = () => {
    // This would typically come from a user lookup by assignedUserId
    // For now, return a placeholder
    return 'agent@company.com';
  };

  // Initialize email data when dialog opens
  useEffect(() => {
    if (open) {
      setEmailData({
        to: emailData.recipient === 'lead' ? getLeadEmail() : getAssignedAgentEmail(),
        cc: '',
        subject: '',
        body: '',
        recipient: 'lead'
      });
      setSelectedTemplate('');
    }
  }, [open]);

  // Update recipient when selection changes
  useEffect(() => {
    setEmailData(prev => ({
      ...prev,
      to: prev.recipient === 'lead' ? getLeadEmail() : getAssignedAgentEmail()
    }));
  }, [emailData.recipient]);

  const getAvailableTemplates = () => {
    const templates = EMAIL_TEMPLATES[lead.leadType as keyof typeof EMAIL_TEMPLATES] || {};
    return Object.entries(templates).map(([key, template]) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ...template
    }));
  };

  const applyTemplate = (templateKey: string) => {
    const templates = EMAIL_TEMPLATES[lead.leadType as keyof typeof EMAIL_TEMPLATES] || {};
    const template = templates[templateKey as keyof typeof templates];
    
    if (!template) return;

    // Replace template variables
    let subject = template.subject;
    let body = template.body;

    const contact = lead.seller || lead.buyer || lead.vendor;
    const replacements = {
      '{{firstName}}': contact?.firstName || '',
      '{{lastName}}': contact?.lastName || '',
      '{{address}}': lead.address?.address1 || '',
      '{{company}}': lead.vendor?.company || '',
      '{{serviceType}}': lead.vendor?.serviceType || '',
      '{{agentName}}': 'Your Agent', // Would come from assigned user
      '{{companyName}}': 'Your Company',
      '{{priceRange}}': lead.buyerCriteria ? `$${lead.buyerCriteria.minPrice?.toLocaleString()} - $${lead.buyerCriteria.maxPrice?.toLocaleString()}` : '',
      '{{preferredAreas}}': lead.buyerCriteria?.preferredAreas || '',
      '{{price}}': '$XXX,XXX',
      '{{bedrooms}}': 'X',
      '{{bathrooms}}': 'X',
      '{{timeline}}': 'ASAP'
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    setEmailData(prev => ({
      ...prev,
      subject,
      body
    }));
  };

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey) {
      applyTemplate(templateKey);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.to.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    if (!emailData.subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
    }

    if (!emailData.body.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email message.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Here you would integrate with your email service
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real implementation, you would call something like:
      // await emailService.sendEmail({
      //   to: emailData.to,
      //   cc: emailData.cc,
      //   subject: emailData.subject,
      //   body: emailData.body,
      //   leadId: lead.id
      // });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'SELLER': return 'bg-green-100 text-green-800';
      case 'BUYER': return 'bg-blue-100 text-blue-800';
      case 'VENDOR': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Send Email
              </DialogTitle>
              <Badge className={getLeadTypeColor(lead.leadType)}>
                {lead.leadType}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Send an email to {getLeadName()} or the assigned agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span>{getLeadName()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span>{getLeadEmail() || 'No email available'}</span>
              </div>
              {lead.assignedUserId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned Agent:</span>
                  <span>{lead.assignedUserId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Composition */}
          <div className="space-y-4">
            {/* Recipient Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select 
                  value={emailData.recipient} 
                  onValueChange={(value) => setEmailData(prev => ({ ...prev, recipient: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead Contact</SelectItem>
                    <SelectItem value="agent">Assigned Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTemplates().map((template) => (
                      <SelectItem key={template.key} value={template.key}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="to">To *</Label>
                <Input
                  id="to"
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  type="email"
                  value={emailData.cc}
                  onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="cc@email.com (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message *</Label>
                <Textarea
                  id="body"
                  value={emailData.body}
                  onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Enter your message..."
                  rows={10}
                  required
                />
              </div>
            </div>

            {!getLeadEmail() && emailData.recipient === 'lead' && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  This lead doesn't have an email address on file.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={isLoading || (!getLeadEmail() && emailData.recipient === 'lead')}
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
