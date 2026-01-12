import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal,
  Edit,
  Mail,
  Trash2,
  Phone,
  MessageSquare
} from "lucide-react";
import { SendEmailDialog } from "./SendEmailDialog";
import { useLeads } from "@/hooks/useLeads";
import { useTwilioContext } from "@/contexts/TwilioContext";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@/hooks/useLeads";
import { normalizeUsPhoneToE164 } from "@/utils/phone";

interface LeadActionsProps {
  lead: Lead;
  onLeadUpdated?: () => void;
}

export const LeadActions: React.FC<LeadActionsProps> = ({ lead, onLeadUpdated }) => {
  const navigate = useNavigate();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteLead } = useLeads();
  const { makeCall } = useTwilioContext(); // Use shared Twilio context
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteLead(lead.id);
      toast({
        title: "Lead Deleted",
        description: "The lead has been successfully deleted.",
      });
      onLeadUpdated?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCall = async () => {
    const phoneNumber = lead.seller?.phone || lead.buyer?.phone || lead.vendor?.phone;
    if (phoneNumber) {
      try {
        const formattedPhone = normalizeUsPhoneToE164(phoneNumber);
        if (!formattedPhone) return;
        
        // Make browser-to-phone call using shared Twilio Device instance
        await makeCall(formattedPhone);
        
        toast({
          title: "Call Initiated",
          description: `Calling ${getLeadName()}...`,
        });
      } catch (error: any) {
        console.error('Failed to initiate call:', error);
        toast({
          title: "Call Failed",
          description: error.message || "Could not place the call",
          variant: "destructive",
        });
      }
    }
  };

  const handleSMS = () => {
    const phoneNumber = lead.seller?.phone || lead.buyer?.phone || lead.vendor?.phone;
    if (phoneNumber) {
      const formattedPhone = normalizeUsPhoneToE164(phoneNumber);
      if (!formattedPhone) return;
      window.location.href = `sms:${formattedPhone}`;
    }
  };

  const getLeadName = () => {
    if (lead.seller) return `${lead.seller.firstName} ${lead.seller.lastName}`;
    if (lead.buyer) return `${lead.buyer.firstName} ${lead.buyer.lastName}`;
    if (lead.vendor) return `${lead.vendor.firstName} ${lead.vendor.lastName}`;
    return 'Unknown Lead';
  };

  const getLeadPhone = () => {
    return lead.seller?.phone || lead.buyer?.phone || lead.vendor?.phone;
  };

  const hasPhone = Boolean(getLeadPhone());

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Lead
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </DropdownMenuItem>
          
          {hasPhone && (
            <>
              <DropdownMenuItem onClick={handleCall}>
                <Phone className="w-4 h-4 mr-2" />
                Call Lead
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleSMS}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send SMS
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Send Email Dialog */}
      <SendEmailDialog 
        lead={lead}
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the lead for <strong>{getLeadName()}</strong>? 
              This action cannot be undone and will permanently remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
