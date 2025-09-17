import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { API_BASE } from "@/config/api";
import { useToast } from "@/hooks/use-toast";

// CSS styles for email content
const emailContentStyles = `
  .email-content {
    font-family: Arial, sans-serif !important;
    line-height: 1.6 !important;
    color: #333 !important;
  }
  .email-content img {
    max-width: 100% !important;
    height: auto !important;
  }
  .email-content table {
    width: 100% !important;
    border-collapse: collapse !important;
  }
  .email-content a {
    color: #1a73e8 !important;
    text-decoration: underline !important;
  }
  .email-content blockquote {
    border-left: 3px solid #ddd !important;
    margin: 10px 0 !important;
    padding-left: 15px !important;
    color: #666 !important;
  }
`;
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Clock, 
  CheckSquare, 
  Users,
  PhoneMissed,
  MessageCircle,
  Calendar,
  Archive,
  Star,
  Reply,
  Bell,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Paperclip,
  Download,
} from "lucide-react";

const Inbox = () => {
  const [activeTab, setActiveTab] = useState("emails");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [gmailEmails, setGmailEmails] = useState<any[]>([]);
  const [emailSettings, setEmailSettings] = useState<any>(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [emailThread, setEmailThread] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const { toast } = useToast();

  // Helper function for API calls with automatic token refresh
  const makeApiCall = async (url: string, options: RequestInit) => {
    const response = await fetch(url, options);
    
    // If token expired, try to refresh and retry
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          
          if (refreshResponse.ok) {
            const { accessToken: newAccessToken } = await refreshResponse.json();
            localStorage.setItem('accessToken', newAccessToken);
            
            // Retry original request with new token
            const retryOptions = {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${newAccessToken}`
              }
            };
            return fetch(url, retryOptions);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    }
    
    return response;
  };

  // Function to extract name from email address
  const extractNameFromEmail = (fromField: string): string => {
    // Handle formats like: "John Doe <john@example.com>" or just "john@example.com"
    const nameMatch = fromField.match(/^(.+?)\s*<.*>$/);
    if (nameMatch) {
      return nameMatch[1].trim().replace(/['"]/g, ''); // Remove quotes if present
    }
    
    // If no name found, extract username from email
    const emailMatch = fromField.match(/([^@]+)@/);
    if (emailMatch) {
      return emailMatch[1].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Convert to proper case
    }
    
    return fromField; // Fallback to original
  };

  // Function to categorize Gmail emails based on sender and subject
  const categorizeEmail = (from: string, subject: string): string => {
    const fromLower = from.toLowerCase();
    const subjectLower = subject.toLowerCase();
    
    // Social networks and social platforms
    const socialKeywords = [
      'facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok',
      'snapchat', 'pinterest', 'reddit', 'whatsapp', 'telegram', 'discord',
      'social', 'notification', 'friend request', 'mentioned you', 'tagged you',
      'noreply@facebook', 'noreply@twitter', 'noreply@linkedin', 'noreply@instagram'
    ];
    
    // Promotional and marketing emails
    const promotionalKeywords = [
      'offer', 'sale', 'discount', 'deal', 'promo', 'coupon', 'free',
      'limited time', 'special offer', 'save', '%', 'marketing', 'newsletter',
      'unsubscribe', 'promotional', 'advertisement', 'ad', 'shop now',
      'amazon', 'flipkart', 'myntra', 'zomato', 'swiggy', 'uber', 'ola',
      'noreply@amazon', 'noreply@flipkart', 'offers@', 'deals@', 'marketing@'
    ];
    
    // Check for social emails
    for (const keyword of socialKeywords) {
      if (fromLower.includes(keyword) || subjectLower.includes(keyword)) {
        return 'social';
      }
    }
    
    // Check for promotional emails
    for (const keyword of promotionalKeywords) {
      if (fromLower.includes(keyword) || subjectLower.includes(keyword)) {
        return 'promotions';
      }
    }
    
    // Default to primary (personal/business emails)
    return 'primary';
  };

  // Check email settings and fetch Gmail emails
  useEffect(() => {
    const loadEmailSettings = async () => {
      const accessToken = localStorage.getItem('accessToken');
      try {
        const res = await fetch(`${API_BASE}/settings/email`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const json = await res.json();
        const settings = json?.data;
        setEmailSettings(settings);
        
        // If Gmail is connected, fetch emails
        if (settings?.gmailConnected) {
          fetchGmailEmails();
        }
      } catch (error) {
        console.error('Failed to load email settings:', error);
      }
    };

    loadEmailSettings();
  }, []);

  const fetchGmailEmails = async () => {
    setLoadingEmails(true);
    const accessToken = localStorage.getItem('accessToken');
    
    try {
      const res = await fetch(`${API_BASE}/settings/email/fetch-gmail?limit=20`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const json = await res.json();
      
      if (json.success && json.data) {
        console.log('✅ INBOX emails received:', json.data.length);
        
        // Simple: Just map all INBOX emails directly (no grouping, no SENT mixing)
        const transformedEmails = json.data.map((email: any) => {
          return {
            id: email.id,
            from: email.from,
            subject: email.subject,
            preview: email.body || email.html || 'No content',
            body: email.body,
            html: email.html,
            attachments: email.attachments || [],
            messageId: email.messageId,
            inReplyTo: email.inReplyTo,
            references: email.references,
            to: email.to,
            cc: email.cc,
            bcc: email.bcc,
            time: new Date(email.date).toLocaleString(),
            date: email.date,
            type: "email",
            source: "emails",
            category: categorizeEmail(email.from, email.subject),
            unread: !email.read,
            starred: false,
            priority: "normal",
            isGmail: true,
            threadCount: 1, // Will be updated when thread is fetched
            folder: email.folder
          };
        });
        
        setGmailEmails(transformedEmails);
        
        console.log('📊 Total INBOX emails in list:', transformedEmails.length);
        
        toast({
          title: "Gmail Sync Complete",
          description: `${transformedEmails.length} INBOX emails synced`,
        });
      } else {
        throw new Error(json.error || 'Failed to fetch emails');
      }
    } catch (error: any) {
      console.error('Gmail fetch error:', error);
      toast({
        title: "Gmail Sync Failed",
        description: error.message || "Failed to sync Gmail emails. Please check your IMAP settings.",
        variant: "destructive",
      });
    } finally {
      setLoadingEmails(false);
    }
  };


  // Handle email click to open detail modal (ONLY for Gmail emails)
  const handleEmailClick = async (email: any) => {
    // Only allow popup for Gmail emails
    if (!email.isGmail) {
      return; // Do nothing for non-Gmail emails
    }

    // Clear old data immediately to prevent showing stale content
    setSelectedEmail(null);
    setEmailThread([]);
    setReplyText('');
    setLoadingThread(true);
    
    // Show the modal with loading state
    setShowEmailDetail(true);

    // Show loading toast
    toast({
      title: "Loading Conversation",
      description: "Fetching email thread from Gmail...",
    });

    // Set the selected email after clearing old data
    setSelectedEmail(email);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      // Mark email as read on Gmail if it's unread
      if (email.unread) {
        console.log('🔄 Attempting to mark email as read:', email.id, 'unread:', email.unread);
        try {
          const markReadResponse = await makeApiCall(`${API_BASE}/settings/email/mark-read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              emailId: email.id
            })
          });
          
          const markReadResult = await markReadResponse.json();
          console.log('📧 Mark as read API response:', markReadResult);
          
          if (markReadResult.success) {
            console.log('✅ Email marked as read on Gmail:', email.id);
            
            // Update local state to reflect read status
            setGmailEmails(prev => {
              const updated = prev.map(e => 
                e.id === email.id ? { ...e, unread: false } : e
              );
              console.log('📊 Updated gmail emails state:', updated.find(e => e.id === email.id));
              return updated;
            });
            
            // Update selected email state
            const updatedEmail = { ...email, unread: false };
            setSelectedEmail(updatedEmail);
            console.log('📧 Updated selected email:', updatedEmail);
          } else {
            console.error('❌ Mark as read API failed:', markReadResult.error);
          }
        } catch (error) {
          console.error('❌ Failed to mark email as read:', error);
          // Continue with opening email even if marking as read fails
        }
      } else {
        console.log('📧 Email already read, skipping mark as read:', email.id);
      }
      
      // Fetch thread for this specific email on-demand
      const response = await makeApiCall(`${API_BASE}/settings/email/fetch-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          subject: email.subject
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('📧 Thread fetched:', result.data.length, 'emails');
        setEmailThread(result.data);
      } else {
        console.error('Thread fetch failed:', result.error);
        // Fallback: show just the single email
        setEmailThread([email]);
      }
    } catch (error) {
      console.error('Thread fetch error:', error);
      // Fallback: show just the single email
      setEmailThread([email]);
    } finally {
      setLoadingThread(false);
    }
  };

  // Send reply email
  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply message.",
        variant: "destructive",
      });
      return;
    }

    setSendingReply(true);
    const accessToken = localStorage.getItem('accessToken');

    try {
      // Always reply to the original sender (selectedEmail), not the latest email in thread
      // This prevents replying to ourselves when the latest email is our own SENT email
      const originalSender = selectedEmail.from;
      
      // For threading, use the latest email's messageId if available
      const latestEmail = emailThread.length > 0 ? 
        emailThread[emailThread.length - 1] : 
        selectedEmail;
      
      const response = await fetch(`${API_BASE}/settings/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          to: originalSender, // Always send to original sender, not latest email sender
          subject: selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          text: replyText,
          inReplyTo: latestEmail.messageId || latestEmail.id,
          references: latestEmail.messageId || latestEmail.id
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Reply Sent",
          description: "Your reply has been sent successfully!",
        });
        
        // Close the email detail modal and redirect to list
        setShowEmailDetail(false);
        setSelectedEmail(null);
        setReplyText('');
        setEmailThread([]);
        
        // Note: No need to refresh INBOX emails since reply goes to SENT folder
        // The reply will be visible in thread history when conversation is reopened
      } else {
        throw new Error(result.error || 'Failed to send reply');
      }
    } catch (error: any) {
      toast({
        title: "Reply Failed",
        description: error.message || "Failed to send reply. Please check your SMTP settings.",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Keep dummy data for non-email tabs, remove only email dummy data
  const allMessages = [
    // SMS
    {
      id: "5",
      from: "Mike Chen",
      subject: "Property showing follow-up", 
      preview: "Thanks for showing me the property yesterday. When can we schedule the inspection?",
      time: "1 hour ago",
      type: "sms",
      source: "sms",
      unread: true,
      starred: false,
      priority: "normal"
    },
    {
      id: "6",
      from: "Jennifer Martinez",
      subject: "Price negotiation",
      preview: "Hi! I'm interested in making an offer on the downtown property. Can we discuss pricing?",
      time: "2 hours ago",
      type: "sms",
      source: "sms", 
      unread: false,
      starred: false,
      priority: "normal"
    },
    // Missed Calls
    {
      id: "7",
      from: "Emily Davis",
      subject: "Missed call - Property inquiry",
      preview: "Missed call regarding the Riverside property listing. Left voicemail.",
      time: "3 hours ago",
      type: "call",
      source: "calls",
      unread: true,
      starred: false,
      priority: "normal"
    },
    {
      id: "8",
      from: "David Wilson",
      subject: "Missed call - Closing questions",
      preview: "Missed call about closing date and final walkthrough scheduling.",
      time: "4 hours ago",
      type: "call",
      source: "calls",
      unread: false,
      starred: false,
      priority: "normal"
    },
    // Tasks
    {
      id: "9",
      from: "System",
      subject: "Follow up with Oak Street lead",
      preview: "Schedule follow-up call with Sarah Johnson regarding her interest in 123 Oak Street property.",
      time: "5 hours ago",
      type: "task",
      source: "tasks",
      unread: true,
      starred: false,
      priority: "high"
    },
    {
      id: "10",
      from: "System", 
      subject: "Prepare contract documents",
      preview: "Draft purchase agreement for Maple Avenue property - due by end of week.",
      time: "1 day ago",
      type: "task",
      source: "tasks",
      unread: false,
      starred: false,
      priority: "medium"
    },
    // Communications (Lead messages)
    {
      id: "11",
      from: "Lead: Pine Boulevard",
      subject: "New buyer inquiry",
      preview: "New potential buyer has expressed interest in the Pine Boulevard property through the lead form.",
      time: "6 hours ago",
      type: "communication",
      source: "communications",
      unread: true,
      starred: false,
      priority: "normal"
    },
    {
      id: "12",
      from: "Lead: Elm Court",
      subject: "Seller updated motivation",
      preview: "Property seller has updated their motivation level and timeline in the lead details.",
      time: "1 day ago",
      type: "communication", 
      source: "communications",
      unread: false,
      starred: false,
      priority: "normal"
    }
  ];

  const getFilteredMessages = (source: string) => {
    if (source === "primary") {
      // For primary tab, only show Gmail emails with 'primary' category
      return gmailEmails.filter(email => email.category === 'primary');
    } else if (source === "emails") {
      // For emails tab, show all Gmail emails (all categories)
      return [...gmailEmails];
    } else {
      // For other tabs, show dummy data + Gmail emails
      const combinedMessages = [...allMessages, ...gmailEmails];
      if (source === "all") return combinedMessages;
      return combinedMessages.filter(message => message.source === source);
    }
  };

  const getUnreadCount = (source: string) => {
    const messages = getFilteredMessages(source);
    return messages.filter(m => m.unread).length;
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'sms': return '💬';
      case 'call': return '📞';
      case 'task': return '✅';
      case 'communication': return '💼';
      default: return '📄';
    }
  };

  const handleSelectAll = () => {
    const currentMessages = getFilteredMessages(activeTab);
    if (selectedItems.length === currentMessages.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentMessages.map(m => m.id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredMessages = getFilteredMessages(activeTab);
  const allSelected = selectedItems.length === filteredMessages.length && filteredMessages.length > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < filteredMessages.length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Add CSS styles for email content */}
      <style dangerouslySetInnerHTML={{ __html: emailContentStyles }} />
      
      {/* Inbox Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            <div className="text-sm text-gray-600">Chris Harris</div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-12 bg-transparent border-0 p-0 space-x-6">
            {/* Primary Tab - Temporarily Hidden */}
            {false && (
              <TabsTrigger 
                value="primary" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Primary</span>
                  {getUnreadCount("primary") > 0 && (
                    <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {getUnreadCount("primary")}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            )}

            <TabsTrigger 
              value="emails" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Emails</span>
                {getUnreadCount("emails") > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("emails")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="calls" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>Calls</span>
                {getUnreadCount("calls") > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("calls")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="sms" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
                {getUnreadCount("sms") > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("sms")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tasks" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                <span>Tasks</span>
                {getUnreadCount("tasks") > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("tasks")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="communications" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>Communications</span>
                {getUnreadCount("communications") > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("communications")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              value="reminders" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Reminders</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Toolbar */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={allSelected}
                  ref={(el) => {
                    if (el && el instanceof HTMLInputElement) el.indeterminate = someSelected;
                  }}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-300"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAll}
                  className="text-sm text-gray-600 hover:text-gray-900 px-2"
                >
                  Select all
                </Button>
              </div>
              
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {emailSettings?.gmailConnected && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchGmailEmails}
                  disabled={loadingEmails}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loadingEmails ? 'animate-spin' : ''}`} />
                  <span className="text-sm">{loadingEmails ? 'Syncing...' : 'Sync Gmail'}</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <span className="text-sm">Due date</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Messages List */}
          <TabsContent value={activeTab} className="mt-0">
            <div className="bg-white">
              {filteredMessages.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-500">No messages in this category</p>
                  <p className="text-sm text-gray-400 mt-2">All caught up! Check back later for new messages.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                        message.unread ? 'bg-blue-50/30' : ''
                      } ${
                        message.isGmail ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={() => handleEmailClick(message)}
                    >
                      {/* Checkbox */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedItems.includes(message.id)}
                          onCheckedChange={() => handleSelectItem(message.id)}
                          className="border-gray-300"
                        />
                      </div>
                      
                      {/* Message Icon */}
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          message.type === 'email' ? 'bg-blue-100 text-blue-600' :
                          message.type === 'sms' ? 'bg-green-100 text-green-600' :
                          message.type === 'call' ? 'bg-orange-100 text-orange-600' :
                          message.type === 'task' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getMessageIcon(message.type)}
                        </div>
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`font-medium text-sm ${
                            message.unread ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {extractNameFromEmail(message.from)}
                          </span>
                          
                          {/* Read/Unread Badge */}
                          <Badge 
                            variant={message.unread ? "default" : "secondary"} 
                            className={`text-xs px-1.5 py-0.5 ${
                              message.unread 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {message.unread ? 'Unread' : 'Read'}
                          </Badge>
                          
                          {message.starred && (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`text-sm flex-1 ${
                            message.unread ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}>
                            {message.subject}
                          </div>
                          {message.threadCount > 1 && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                              {message.threadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Time */}
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {message.time}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Detail Modal */}
        <Dialog open={showEmailDetail} onOpenChange={setShowEmailDetail}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {selectedEmail?.subject}
            </DialogTitle>
          </DialogHeader>
          
          {loadingThread && !selectedEmail ? (
            // Loading state when no email is selected yet
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading email content...</p>
              </div>
            </div>
          ) : selectedEmail ? (
            <div className="space-y-6">
              {/* Email Header */}
              <div className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900">
                        From: {extractNameFromEmail(selectedEmail.from)}
                      </h3>
                      {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Paperclip className="w-3 h-3 mr-1" />
                          {selectedEmail.attachments.length} attachment{selectedEmail.attachments.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedEmail.from}
                    </p>
                    {selectedEmail.to && (
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">To:</span> {selectedEmail.to}
                      </p>
                    )}
                    {selectedEmail.cc && (
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">CC:</span> {selectedEmail.cc}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Date:</span> {selectedEmail.time}
                    </p>
                    
                    {/* Email ID with Copy Button */}
                  </div>
                  {selectedEmail.starred && (
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
              </div>

              {/* Email Content - Direct Display */}
              <div className="bg-white rounded-lg border p-6">
                {selectedEmail.html ? (
                  <div 
                    className="email-content"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                    style={{ 
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: '1.6',
                      color: '#333'
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {selectedEmail.body || selectedEmail.preview || 'No content available'}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments ({selectedEmail.attachments.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedEmail.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <Paperclip className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attachment.contentType} • {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation History */}
              {(loadingThread || emailThread.filter(email => email.id !== selectedEmail.id).length > 0) && (
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {loadingThread ? (
                      <>Loading Conversation History...</>
                    ) : (
                      <>Conversation History ({emailThread.filter(email => email.id !== selectedEmail.id).length} more message{emailThread.filter(email => email.id !== selectedEmail.id).length > 1 ? 's' : ''})</>
                    )}
                  </h4>
                  
                  {loadingThread ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Loading conversation thread...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                    {emailThread
                      .filter(threadEmail => threadEmail.id !== selectedEmail.id) // Exclude the main email already shown above
                      .map((threadEmail, index) => (
                        <div key={threadEmail.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900">
                                  {extractNameFromEmail(threadEmail.from)}
                                </span>
                                {threadEmail.id === selectedEmail.id && (
                                  <Badge variant="secondary" className="text-xs">Current Email</Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  #{index + 1}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mb-1">
                                <span className="font-medium">From:</span> {threadEmail.from}
                              </p>
                              <p className="text-xs text-gray-500 mb-1">
                                <span className="font-medium">Date:</span> {new Date(threadEmail.date).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-700">
                            <div className="font-medium mb-2">{threadEmail.subject}</div>
                            <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                              {threadEmail.html ? (
                                <div 
                                  className="email-content text-xs"
                                  dangerouslySetInnerHTML={{ __html: threadEmail.html }}
                                />
                              ) : (
                                <div className="whitespace-pre-wrap text-xs">
                                  {threadEmail.body || 'No content'}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {threadEmail.attachments && threadEmail.attachments.length > 0 && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Paperclip className="w-3 h-3 mr-1" />
                                {threadEmail.attachments.length} attachment{threadEmail.attachments.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reply Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Reply</h4>
                <div className="space-y-3">
                  <Textarea
                    placeholder={`Reply to ${extractNameFromEmail(selectedEmail.from)}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="w-full"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Replying to: {selectedEmail.from}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowEmailDetail(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={sendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sendingReply ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Reply className="w-4 h-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inbox;