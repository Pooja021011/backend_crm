import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Phone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SMSMessage {
  to: string;
  text: string;
  leadId?: string;
}

interface SMSResponse {
  success: boolean;
  data?: {
    messageId: string;
    to: string;
    text: string;
    sentAt: string;
  };
  error?: string;
}

const SMSWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recentMessages, setRecentMessages] = useState<SMSResponse[]>([]);
  const { toast } = useToast();

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    return phone;
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const sendSMS = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number and message are required",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: formattedPhone,
          text: message,
        }),
      });

      const result: SMSResponse = await response.json();

      if (result.success) {
        setRecentMessages(prev => [result, ...prev.slice(0, 4)]);
        setPhoneNumber('');
        setMessage('');
        toast({
          title: "SMS Sent Successfully",
          description: `Message sent to ${formattedPhone}`,
        });
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error: any) {
      console.error('SMS sending error:', error);
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      sendSMS();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-green-200/50 bg-gradient-to-br from-green-50/80 to-white cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold">SMS</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Telnyx SMS</p>
            <p className="text-sm font-bold text-green-900">Send Messages</p>
            <p className="text-xs text-green-600">Quick SMS Communication</p>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Send SMS via Telnyx
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="+1234567890 or 1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10"
                disabled={isSending}
              />
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message here... (Ctrl+Enter to send)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[100px] resize-none"
              disabled={isSending}
            />
            <div className="text-xs text-gray-500 text-right">
              {message.length}/160 characters
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={sendSMS}
            disabled={isSending || !phoneNumber.trim() || !message.trim()}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send SMS
              </>
            )}
          </Button>

          {/* Recent Messages */}
          {recentMessages.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700">Recent Messages</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recentMessages.map((msg, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                    {msg.success ? (
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={msg.success ? "default" : "destructive"} className="text-xs">
                          {msg.data?.to || 'Unknown'}
                        </Badge>
                        {msg.data?.sentAt && (
                          <span className="text-gray-500">
                            {new Date(msg.data.sentAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 truncate">
                        {msg.data?.text || msg.error}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Use international format: +1234567890</li>
              <li>Press Ctrl+Enter to send quickly</li>
              <li>Standard SMS limit: 160 characters</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SMSWidget;
