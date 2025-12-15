import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  Trash2,
  RefreshCw,
  Paperclip,
  Download,
  Send,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

const Inbox = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
  
  // SMS-specific state
  const [smsConversations, setSmsConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showSMSDetail, setShowSMSDetail] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  const [loadingSMS, setLoadingSMS] = useState(false);
  const [showNewSMS, setShowNewSMS] = useState(false);
  const [newSMSNumber, setNewSMSNumber] = useState('');
  const [leadPhoneNumbers, setLeadPhoneNumbers] = useState<any[]>([]);
  const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [selectedContactDetails, setSelectedContactDetails] = useState<any>(null);

  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationMessagesEndRef = useRef<HTMLDivElement>(null);

  // Call history state
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);
  const [showNewCall, setShowNewCall] = useState(false);
  const [newCallNumber, setNewCallNumber] = useState('');
  const [callPhoneSearchQuery, setCallPhoneSearchQuery] = useState('');
  const [selectedCallContact, setSelectedCallContact] = useState<any>(null);
  const [makingCall, setMakingCall] = useState(false);
  
  // Tasks / Communications state
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [leadCommunications, setLeadCommunications] = useState<any[]>([]);
  const [loadingComms, setLoadingComms] = useState(false);
  
  // Reminders state
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [reminderCounts, setReminderCounts] = useState<any>(null);
  
  // SLA status state
  const [slaStatus, setSlaStatus] = useState<any>(null);
  const [loadingSLA, setLoadingSLA] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Auto-scroll to bottom function
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Auto-scroll when messages change or conversation opens
  useEffect(() => {
    if (showSMSDetail && selectedConversation?.messages) {
      setTimeout(() => scrollToBottom(conversationMessagesEndRef), 100);
    }
  }, [showSMSDetail, selectedConversation?.messages]);
  
  // Helper function for API calls with automatic token refresh
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    // Add Authorization header with access token
    const accessToken = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    };

    const requestOptions = {
      ...options,
      headers
    };

    const response = await fetch(url, requestOptions);
    
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
              ...requestOptions,
              headers: {
                ...headers,
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


  // Handle email/task/communication/reminder click
  const handleEmailClick = async (email: any) => {
    console.log('🖱️ Item clicked:', email);
    console.log('📋 Item type:', email.type);
    console.log('🏠 Lead address:', email.leadAddress);
    
    // Handle task clicks - navigate to lead details and remove from list
    if (email.type === 'task') {
      console.log('✅ Task clicked - attempting navigation');
      console.log('📍 Lead address:', email.leadAddress);
      
      if (email.leadId) {
        const navigationUrl = `/leads/${email.leadId}/edit`;
        console.log('🔗 Navigation URL:', navigationUrl);
        console.log('🆔 Lead ID:', email.leadId);
        navigate(navigationUrl);
        
        // Remove task from the list
        setAssignedTasks(prevTasks => prevTasks.filter(task => task.id !== email.id));
        
        toast({
          title: "Task Completed & Lead Opened",
          description: `Opened ${email.from} details and removed task from list`,
        });
      } else {
        console.log('❌ No leadId found, navigating to leads page anyway');
        navigate('/leads');
        toast({
          title: "Navigation Test",
          description: "Navigated to leads page (no lead ID)",
        });
      }
      return;
    }
    
    // Handle communication clicks - navigate to lead details
    if (email.type === 'communication' && email.leadId) {
      console.log('💬 Navigating to communication lead ID:', email.leadId);
      navigate(`/leads/${email.leadId}/edit`);
      
      toast({
        title: "Lead Opened",
        description: `Opened ${email.from} details for communication`,
      });
      return;
    }
    
    // Handle reminder clicks - navigate to lead details and mark as completed
    if (email.type === 'reminder') {
      if (email.leadId) {
        navigate(`/leads/${email.leadId}/edit`);
      } else if (email.leadAddress) {
        navigate(`/leads?address=${encodeURIComponent(email.leadAddress)}`);
      }
      
      // Mark reminder as completed (remove from list)
      setReminders(prevReminders => prevReminders.filter(reminder => reminder.id !== email.id));
      
      toast({
        title: "Reminder Completed & Lead Opened",
        description: `Opened ${email.from} details and completed reminder`,
      });
      return;
    }
    
    // Handle notification clicks - navigate to lead details and mark as read
    if (email.type === 'notification') {
      if (email.leadId) {
        navigate(`/leads/${email.leadId}/edit`);
      } else if (email.leadAddress) {
        navigate(`/leads?address=${encodeURIComponent(email.leadAddress)}`);
      }
      
      // Mark notification as read (remove from list)
      setNotifications(prevNotifications => prevNotifications.filter(notification => notification.id !== email.id));
      
      toast({
        title: "Notification Read & Lead Opened",
        description: `Opened ${email.from} details and marked notification as read`,
      });
      return;
    }
    
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
        
        // Auto-clear notifications for ACQ/DISP agents
        try {
          const autoClearResponse = await fetch(`${API_BASE}/notifications/auto-clear/message-reply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              leadId: selectedEmail.leadId || selectedEmail.id // Use leadId if available
            })
          });
          
          if (autoClearResponse.ok) {
            const autoClearResult = await autoClearResponse.json();
            if (autoClearResult.data?.cleared > 0) {
              console.log(`🔄 Auto-cleared ${autoClearResult.data.cleared} notifications after reply`);
              // Refresh notifications to update the UI
              if (activeTab === 'reminders') {
                fetchNotifications();
              }
            }
          }
        } catch (error) {
          console.error('Auto-clear failed:', error);
          // Don't show error to user, this is background functionality
        }
        
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

  // SMS Functions
  const fetchSMSHistory = async () => {
    setLoadingSMS(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/sms/history`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setSmsConversations(result.data.conversations);
      } else {
        throw new Error(result.error || 'Failed to fetch SMS history');
      }
    } catch (error: any) {
      console.error('Error fetching SMS history:', error);
      toast({
        title: "Error",
        description: "Failed to load SMS conversations",
        variant: "destructive",
      });
    } finally {
      setLoadingSMS(false);
    }
  };

  const sendSMSMessage = async (phoneNumber: string, message: string) => {
    setSendingSMS(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: phoneNumber,
          text: message,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSmsMessage('');
        toast({
          title: "SMS Sent",
          description: `Message sent to ${phoneNumber}`,
        });
        
        // Auto-clear notifications for ACQ/DISP agents
        try {
          const accessToken = localStorage.getItem('accessToken');
          const autoClearResponse = await fetch(`${API_BASE}/notifications/auto-clear/message-reply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              leadId: selectedConversation?.leadId || phoneNumber // Use leadId if available
            })
          });
          
          if (autoClearResponse.ok) {
            const autoClearResult = await autoClearResponse.json();
            if (autoClearResult.data?.cleared > 0) {
              console.log(`🔄 Auto-cleared ${autoClearResult.data.cleared} notifications after SMS reply`);
              // Refresh notifications to update the UI
              if (activeTab === 'reminders') {
                fetchNotifications();
              }
            }
          }
        } catch (error) {
          console.error('SMS auto-clear failed:', error);
          // Don't show error to user, this is background functionality
        }
        
        // Refresh SMS history to show the new message
        await fetchSMSHistory();
        
        // If we have a selected conversation, refresh its messages
        if (selectedConversation && selectedConversation.phoneNumber === phoneNumber) {
          // In a real implementation, you'd fetch the updated conversation
          // For now, we'll just add the message to the local state
          const newMessage = {
            id: Date.now().toString(),
            text: message,
            direction: 'OUTBOUND',
            timestamp: new Date().toISOString(),
            status: 'sent'
          };
          
          setSelectedConversation(prev => ({
            ...prev,
            messages: [...prev.messages, newMessage],
            lastMessage: message,
            lastMessageTime: new Date().toISOString()
          }));
        }
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error: any) {
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    } finally {
      setSendingSMS(false);
    }
  };

  const handleSMSConversationClick = (conversation: any) => {
    setSelectedConversation(conversation);
    setShowSMSDetail(true);
  };

  // Fetch phone numbers from leads
  const fetchLeadPhoneNumbers = async () => {
    setLoadingPhoneNumbers(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('🔐 Fetching leads with token:', accessToken ? 'Token exists' : 'No token');
      
      const response = await fetch(`${API_BASE}/leads?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📦 API Result:', { hasData: !!result.data, dataLength: result.data?.length });
      
      // Leads API returns { data: [...], skip, take } format (no success field)
      if (result.data && Array.isArray(result.data)) {
        const phoneNumbers: any[] = [];
        
        result.data.forEach((lead: any) => {
          // Add seller phone numbers
          if (lead.seller?.phone) {
            phoneNumbers.push({
              phone: lead.seller.phone,
              name: `${lead.seller.firstName} ${lead.seller.lastName}`,
              type: 'Seller',
              leadId: lead.id,
              address: lead.address?.address1 || 'No address'
            });
          }
          if (lead.seller?.mobile) {
            phoneNumbers.push({
              phone: lead.seller.mobile,
              name: `${lead.seller.firstName} ${lead.seller.lastName}`,
              type: 'Seller (Mobile)',
              leadId: lead.id,
              address: lead.address?.address1 || 'No address'
            });
          }
          
          // Add buyer phone numbers
          if (lead.buyer?.phone) {
            phoneNumbers.push({
              phone: lead.buyer.phone,
              name: `${lead.buyer.firstName} ${lead.buyer.lastName}`,
              type: 'Buyer',
              leadId: lead.id,
              address: lead.address?.address1 || 'No address'
            });
          }
          if (lead.buyer?.mobile) {
            phoneNumbers.push({
              phone: lead.buyer.mobile,
              name: `${lead.buyer.firstName} ${lead.buyer.lastName}`,
              type: 'Buyer (Mobile)',
              leadId: lead.id,
              address: lead.address?.address1 || 'No address'
            });
          }
        });
        
        setLeadPhoneNumbers(phoneNumbers);
        console.log(`✅ Loaded ${phoneNumbers.length} phone numbers from ${result.data.length} leads`);
        console.log('📱 Phone numbers:', phoneNumbers.map(p => `${p.name}: ${p.phone}`));
      } else {
        console.error('❌ No data in response');
        toast({
          title: "Error Loading Contacts",
          description: "Invalid response format from server",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching phone numbers:', error);
      toast({
        title: "Error Loading Contacts",
        description: error.message || "Failed to load contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPhoneNumbers(false);
    }
  };

  const handleNewSMSSubmit = async () => {
    if (!newSMSNumber.trim() || !smsMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number and message are required",
        variant: "destructive",
      });
      return;
    }

    await sendSMSMessage(newSMSNumber, smsMessage);
    setShowNewSMS(false);
    setNewSMSNumber('');
    setSmsMessage('');
    setPhoneSearchQuery('');
  };

  // Load SMS history when switching to SMS tab
  useEffect(() => {
    if (activeTab === 'sms') {
      fetchSMSHistory();
    } else if (activeTab === 'calls') {
      fetchCallHistory();
    }
  }, [activeTab]);

  // Fetch phone numbers when New SMS dialog opens
  useEffect(() => {
    if (showNewSMS) {
      fetchLeadPhoneNumbers();
    }
  }, [showNewSMS]);

  // Fetch phone numbers when New Call dialog opens
  useEffect(() => {
    if (showNewCall) {
      fetchLeadPhoneNumbers();
    }
  }, [showNewCall]);

  // Fetch call history
  const fetchCallHistory = async () => {
    setLoadingCallHistory(true);
    try {
      const response = await makeApiCall(`${API_BASE}/calls/history`);
      const result = await response.json();
      
      if (result.success) {
        setCallHistory(result.data.calls || []);
      } else {
        throw new Error(result.error || 'Failed to fetch call history');
      }
    } catch (error: any) {
      console.error('Error fetching call history:', error);
      toast({
        title: "Error",
        description: "Failed to load call history",
        variant: "destructive",
      });
    } finally {
      setLoadingCallHistory(false);
    }
  };

  // Make outbound call
  const makeCall = async (phoneNumber: string, leadId?: string) => {
    setMakingCall(true);
    try {
      console.log('🔵 Making call to:', phoneNumber, 'leadId:', leadId);
      
      const response = await makeApiCall(`${API_BASE}/calls/make`, {
        method: 'POST',
        body: JSON.stringify({ 
          to: phoneNumber,
          leadId: leadId 
        })
      });

      const result = await response.json();
      console.log('🔵 Call response:', result);

      if (result.success) {
        toast({
          title: "Call Initiated",
          description: `Calling ${phoneNumber}...`,
        });
        
        // Refresh call history after successful call
        await fetchCallHistory();
        
        // Close the new call dialog
        setShowNewCall(false);
        setNewCallNumber('');
        setCallPhoneSearchQuery('');
        setSelectedCallContact(null);
      } else {
        throw new Error(result.error || 'Failed to make call');
      }
    } catch (error: any) {
      console.error('❌ Error making call:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to make call",
        variant: "destructive",
      });
    } finally {
      setMakingCall(false);
    }
  };

  // Handle new call submission
  const handleNewCallSubmit = async () => {
    if (!newCallNumber || !newCallNumber.trim()) {
      toast({
        title: "Error",
        description: "Please select a contact to call",
        variant: "destructive",
      });
      return;
    }

    await makeCall(newCallNumber, selectedCallContact?.leadId);
  };

  // Optional placeholder for calls/SMS until wired
  const staticOther = [
    {
      id: "missed-1",
      from: "Unknown",
      subject: "Missed call",
      preview: "Missed call",
      time: new Date().toLocaleString(),
      type: "call",
      source: "calls",
      unread: false,
      starred: false,
      priority: "normal"
    }
  ];

  // Helper function to create meaningful lead titles
  const createLeadTitle = (lead: any): string => {
    if (!lead) return 'Unknown Property';
    
    // Start with address if available
    let title = '';
    if (lead.address?.address1) {
      title = lead.address.address1;
      if (lead.address.city) {
        title += `, ${lead.address.city}`;
      }
    }
    
    // Add client name if available
    if (lead.seller?.firstName) {
      const clientName = `${lead.seller.firstName} ${lead.seller.lastName || ''}`.trim();
      title = title ? `${title} (${clientName})` : clientName;
    } else if (lead.buyer?.firstName) {
      const clientName = `${lead.buyer.firstName} ${lead.buyer.lastName || ''}`.trim();
      title = title ? `${title} (${clientName})` : clientName;
    }
    
    // Fallback to lead type if no other info
    if (!title) {
      if (lead.leadType === 'SELLER') {
        title = 'Seller Lead';
      } else if (lead.leadType === 'BUYER') {
        title = 'Buyer Lead';
      } else if (lead.leadType === 'VENDOR') {
        title = 'Vendor Lead';
      } else {
        title = 'Property Lead';
      }
    }
    
    return title;
  };

  // Fetch assigned tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    console.log('📋 Fetching tasks...');
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('🔑 Using token for tasks:', accessToken ? 'Token exists' : 'NO TOKEN!');
      const res = await fetch(`${API_BASE}/inbox/tasks`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      
      if (!res.ok) {
        console.error(`Tasks API error: ${res.status} ${res.statusText}`);
        if (res.status === 401) {
          console.error('❌ AUTHENTICATION FAILED - User not logged in or token expired');
          toast({
            title: "Authentication Error",
            description: "Please log in again to access your tasks.",
            variant: "destructive",
          });
        }
        setAssignedTasks([]);
        return;
      }
      
      const json = await res.json();
      console.log('Tasks response:', json);
      console.log('📋 RAW TASKS DATA:', json.data);
      
      if (json.data && Array.isArray(json.data)) {
        const items = json.data.map((t: any) => ({
        id: t.id,
        from: t.lead ? createLeadTitle(t.lead) : 'Task',
        subject: t.title,
        preview: t.description || '',
        time: new Date(t.dueAt).toLocaleString(),
        type: 'task',
        source: 'tasks',
        unread: t.status === 'OPEN',
        starred: false,
        priority: 'normal',
        leadId: t.lead?.id,
        leadAddress: t.lead?.address ? (
          // Check if address1 already contains city/state
          t.lead.address.address1.includes(t.lead.address.city) ? 
            t.lead.address.address1 : 
            `${t.lead.address.address1}, ${t.lead.address.city}, ${t.lead.address.state}`
        ) : ''
        }));
        setAssignedTasks(items);
        console.log('✅ Processed tasks:', items.length);
        console.log('📋 Sample task data:', items[0]);
      } else {
        console.log('❌ No tasks data found or invalid format');
        setAssignedTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setAssignedTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch communications
  const fetchCommunications = async () => {
    setLoadingComms(true);
    console.log('💬 Fetching communications...');
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('🔑 Using token for communications:', accessToken ? 'Token exists' : 'NO TOKEN!');
      const res = await fetch(`${API_BASE}/inbox/communications?timeframe=This%20Month`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      
      if (!res.ok) {
        console.error(`Communications API error: ${res.status} ${res.statusText}`);
        if (res.status === 401) {
          console.error('❌ AUTHENTICATION FAILED - User not logged in or token expired');
          toast({
            title: "Authentication Error", 
            description: "Please log in again to access communications.",
            variant: "destructive",
          });
        }
        setLeadCommunications([]);
        return;
      }
      
      const json = await res.json();
      console.log('Communications response:', json);
      console.log('💬 RAW COMMUNICATIONS DATA:', json.data);
      
      if (json.data && Array.isArray(json.data)) {
        const items = json.data.map((c: any) => ({
        id: c.id,
        from: c.lead ? createLeadTitle(c.lead) : (c.subject || c.type),
        subject: c.subject || `${c.type} ${c.direction}`,
        preview: c.content || c.notes || c.body || '',
        time: new Date(c.occurredAt).toLocaleString(),
        type: 'communication',
        source: 'communications',
        unread: c.direction === 'INBOUND',
        starred: false,
        priority: 'normal',
        leadId: c.lead?.id,
        leadAddress: c.lead?.address ? (
          // Check if address1 already contains city/state
          c.lead.address.address1.includes(c.lead.address.city) ? 
            c.lead.address.address1 : 
            `${c.lead.address.address1}, ${c.lead.address.city}, ${c.lead.address.state}`
        ) : '',
        commType: c.type,
        direction: c.direction
        }));
        setLeadCommunications(items);
        console.log('✅ Processed communications:', items.length);
        console.log('💬 Sample communication data:', items[0]);
      } else {
        console.log('❌ No communications data found or invalid format');
        setLeadCommunications([]);
      }
    } catch (error) {
      console.error('Error fetching communications:', error);
      setLeadCommunications([]);
    } finally {
      setLoadingComms(false);
    }
  };

  // Fetch reminders
  const fetchReminders = async () => {
    setLoadingReminders(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/reminders`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      
      if (!res.ok) {
        console.error(`Reminders API error: ${res.status} ${res.statusText}`);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        setReminders([]); // Set empty array on error
        return;
      }
      
      const json = await res.json();
      console.log('Reminders response:', json);
      
      if (json.success) {
        const items = (json?.data || []).map((r: any) => ({
          id: r.id,
          from: r.lead ? createLeadTitle(r.lead) : r.title,
          subject: r.title,
          preview: r.message || r.description || '',
          time: new Date(r.scheduledFor || r.createdAt).toLocaleString(),
          type: 'reminder',
          source: 'reminders',
          unread: r.status === 'PENDING',
          starred: false,
          priority: (r.priority || 'medium').toLowerCase(),
          reminderType: r.type,
          leadId: r.leadId,
          leadAddress: r.lead?.address ? `${r.lead.address.address1}, ${r.lead.address.city}, ${r.lead.address.state}` : '',
          dueDate: r.scheduledFor || r.dueDate,
          status: r.status
        }));
        setReminders(items);
        console.log('Processed reminders:', items.length);
      } else {
        console.error('Reminders API returned success: false', json);
        setReminders([]);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setReminders([]);
      // Don't show toast for reminders failure, it's not critical
    } finally {
      setLoadingReminders(false);
    }
  };

  // Fetch reminder counts
  const fetchReminderCounts = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/reminders/counts`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      const json = await res.json();
      
      if (json.success) {
        setReminderCounts(json.data);
      }
    } catch (error) {
      console.error('Error fetching reminder counts:', error);
    }
  };

  // Fetch SLA status
  const fetchSLAStatus = async () => {
    setLoadingSLA(true);
    console.log('📊 Fetching SLA status...');
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('🔑 Using token for SLA:', accessToken ? 'Token exists' : 'NO TOKEN!');
      const res = await fetch(`${API_BASE}/reminders/sla-status`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      
      if (!res.ok) {
        console.error(`SLA status API error: ${res.status} ${res.statusText}`);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        setSlaStatus(null);
        return;
      }
      
      const json = await res.json();
      console.log('SLA status response:', json);
      
      if (json.success) {
        setSlaStatus(json.data);
        console.log('✅ SLA Status loaded:', json.data);
      } else {
        console.error('SLA status API returned success: false', json);
        setSlaStatus(null);
      }
    } catch (error) {
      console.error('Error fetching SLA status:', error);
      setSlaStatus(null);
    } finally {
      setLoadingSLA(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/notifications`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      
      if (!res.ok) {
        console.error(`Notifications API error: ${res.status} ${res.statusText}`);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        setNotifications([]); // Set empty array on error
        return;
      }
      
      const json = await res.json();
      console.log('Notifications response:', json);
      
      if (json.success) {
        const items = (json?.data || []).map((n: any) => ({
          id: n.id,
          from: n.lead ? createLeadTitle(n.lead) : n.title,
          subject: n.title,
          preview: n.message || '',
          time: new Date(n.createdAt).toLocaleString(),
          type: 'notification',
          source: 'notifications',
          unread: !n.isRead,
          starred: false,
          priority: (n.priority || 'medium').toLowerCase(),
          notificationType: n.type,
          leadId: n.lead?.id,
          leadAddress: n.lead?.address ? `${n.lead.address.address1}, ${n.lead.address.city}, ${n.lead.address.state}` : '',
          dealId: n.deal?.id,
          triggeredBy: n.triggeredBy
        }));
        setNotifications(items);
        console.log('Processed notifications:', items.length);
      } else {
        console.error('Notifications API returned success: false', json);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      // Don't show toast for notifications failure, it's not critical
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    console.log('🚀 Inbox component mounted, loading data...');
    const token = localStorage.getItem('accessToken');
    console.log('🔑 Access token exists:', !!token);
    console.log('📋 Current state - Tasks:', assignedTasks.length, 'Communications:', leadCommunications.length);
    
    fetchTasks();
    fetchCommunications();
    fetchReminders();
    fetchReminderCounts();
    fetchSLAStatus();
    // Re-enable notifications - backend should be working now
    fetchNotifications();
  }, []);

  // Load on tab switch
  useEffect(() => {
    if (activeTab === 'tasks') fetchTasks();
    if (activeTab === 'communications') fetchCommunications();
    if (activeTab === 'reminders') {
      fetchReminders();
      fetchReminderCounts();
      // Re-enable notifications for reminders tab
      fetchNotifications(); // Also fetch notifications for reminders tab
    }
  }, [activeTab]);

  const getFilteredMessages = (source: string) => {
    if (source === "primary") {
      // For primary tab, only show Gmail emails with 'primary' category
      return gmailEmails.filter(email => email.category === 'primary');
    } else if (source === "emails") {
      // For emails tab, show all Gmail emails (all categories)
      return [...gmailEmails];
    } else if (source === 'tasks') {
      console.log(`🔍 Getting tasks for display: ${assignedTasks.length} items`, assignedTasks);
      return assignedTasks;
    } else if (source === 'communications') {
      console.log(`🔍 Getting communications for display: ${leadCommunications.length} items`, leadCommunications);
      return leadCommunications;
    } else if (source === 'reminders') {
      // Combine reminders and notifications for the reminders tab
      return [...reminders, ...notifications];
    } else {
      // For other tabs, show dummy data + Gmail emails
      const combinedMessages = [...staticOther, ...gmailEmails];
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
      case 'email': return <Mail className="w-3 h-3" />;
      case 'sms': return <MessageSquare className="w-3 h-3" />;
      case 'call': return <Phone className="w-3 h-3" />;
      case 'task': return <CheckSquare className="w-3 h-3" />;
      case 'communication': return <MessageCircle className="w-3 h-3" />;
      case 'reminder': return <Bell className="w-3 h-3" />;
      case 'notification': return <Bell className="w-3 h-3" />;
      default: return <Mail className="w-3 h-3" />;
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
    <div className="flex flex-col h-full bg-gray-50 max-w-full overflow-hidden">
      {/* Add CSS styles for email content */}
      <style dangerouslySetInnerHTML={{ __html: emailContentStyles }} />
      
      {/* Inbox Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* SLA Status Display */}
      {slaStatus && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${slaStatus.totalAlerts > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-sm font-medium text-gray-700">SLA Status</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Total Alerts:</span>
                  <span className={`font-medium ${slaStatus.totalAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {slaStatus.totalAlerts}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Critical:</span>
                  <span className={`font-medium ${slaStatus.criticalAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {slaStatus.criticalAlerts}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Overdue:</span>
                  <span className={`font-medium ${slaStatus.overdueItems > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {slaStatus.overdueItems}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Upcoming:</span>
                  <span className={`font-medium ${slaStatus.upcomingDeadlines > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {slaStatus.upcomingDeadlines}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {loadingSLA && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSLAStatus}
                disabled={loadingSLA}
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSLA ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}

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
                {getUnreadCount("reminders") > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("reminders")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>


          {/* Messages List */}
          <TabsContent value={activeTab} className="mt-0">
            <div className="bg-white">
              {/* SMS Tab Content */}
              {activeTab === 'sms' ? (
                <div>
                  {/* SMS Header with New Message Button */}
                  <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">SMS Conversations</h3>
                    <Button
                      onClick={() => setShowNewSMS(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Message
                    </Button>
                  </div>

                  {/* SMS Conversations List */}
                  {loadingSMS ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
                      <p className="text-gray-600">Loading SMS conversations...</p>
                    </div>
                  ) : smsConversations.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-500">No SMS conversations yet</p>
                      <p className="text-gray-400 mb-4">Start a new conversation to see messages here.</p>
                      <Button
                        onClick={() => setShowNewSMS(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Send First Message
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {smsConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleSMSConversationClick(conversation)}
                        >
                          {/* Contact Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                          
                          {/* Conversation Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-medium text-gray-900">
                                {conversation.contactName || conversation.phoneNumber}
                              </span>
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mb-1">
                              {conversation.phoneNumber}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {conversation.lastMessage}
                            </div>
                          </div>
                          
                          {/* Time */}
                          <div className="flex-shrink-0 text-sm text-gray-500">
                            {new Date(conversation.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'calls' ? (
                /* Call History Tab Content */
                <div>
                  {/* Call History Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Call History</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowNewCall(true)}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Make Call
                      </Button>
                      <Button
                        onClick={fetchCallHistory}
                        variant="ghost"
                        size="sm"
                        disabled={loadingCallHistory}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {loadingCallHistory ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Call History List */}
                  {loadingCallHistory ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
                      <p className="text-gray-600">Loading call history...</p>
                    </div>
                  ) : callHistory.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-8 h-8 text-purple-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-500">No call history yet</p>
                      <p className="text-gray-400 mb-4">Make your first call to see it here.</p>
                      <Button
                        onClick={() => setShowNewCall(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Make First Call
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {callHistory.map((call) => (
                        <div 
                          key={call.id} 
                          className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (call.leadId) {
                              navigate(`/leads/${call.leadId}/edit`);
                            } else {
                              toast({
                                title: "No Lead Associated",
                                description: "This call is not associated with any lead.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          {/* Call Direction Icon */}
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              call.direction === 'OUTBOUND' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            }`}>
                              <Phone className="w-4 h-4" />
                            </div>
                          </div>
                          
                          {/* Call Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-sm text-gray-900">
                                {call.contactName || 'Unknown'}
                              </span>
                              <Badge 
                                variant={call.direction === 'OUTBOUND' ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  call.direction === 'OUTBOUND' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {call.direction === 'OUTBOUND' ? 'Outbound' : 'Inbound'}
                              </Badge>
                              <Badge 
                                variant={
                                  call.status === 'completed' ? 'default' :
                                  call.status === 'missed' ? 'destructive' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {call.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600 font-mono">
                                {call.phoneNumber}
                              </span>
                              {call.duration > 0 && (
                                <span className="text-sm text-gray-500">
                                  Duration: {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Call Time */}
                          <div className="flex-shrink-0 text-sm text-gray-500">
                            {new Date(call.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Other Tabs Content */
                <div>
                  {/* Tab Headers with Refresh Buttons */}
                  {activeTab === 'emails' && emailSettings?.gmailConnected && (
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Email Messages</h3>
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
                    </div>
                  )}
                  
                  {activeTab === 'tasks' && (
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Assigned Tasks</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchTasks}
                        disabled={loadingTasks}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${loadingTasks ? 'animate-spin' : ''}`} />
                        <span className="text-sm">{loadingTasks ? 'Loading...' : 'Refresh Tasks'}</span>
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === 'communications' && (
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Lead Communications</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchCommunications}
                        disabled={loadingComms}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${loadingComms ? 'animate-spin' : ''}`} />
                        <span className="text-sm">{loadingComms ? 'Loading...' : 'Refresh Communications'}</span>
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === 'reminders' && (
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Reminders & Notifications</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchReminders}
                        disabled={loadingReminders}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${loadingReminders ? 'animate-spin' : ''}`} />
                        <span className="text-sm">{loadingReminders ? 'Loading...' : 'Refresh Reminders'}</span>
                      </Button>
                    </div>
                  )}
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
                            message.isGmail || message.type === 'task' || message.type === 'communication' || message.type === 'reminder' || message.type === 'notification' ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                          }`}
                          onClick={(e) => {
                            console.log('🖱️ DIV CLICKED - Event fired!');
                            console.log('📄 Message:', message);
                            handleEmailClick(message);
                          }}
                        >
                          {/* Message Icon */}
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              message.type === 'email' ? 'bg-blue-100 text-blue-600' :
                              message.type === 'sms' ? 'bg-green-100 text-green-600' :
                              message.type === 'call' ? 'bg-orange-100 text-orange-600' :
                              message.type === 'task' ? 'bg-purple-100 text-purple-600' :
                              message.type === 'reminder' ? (
                                message.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                message.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                message.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-blue-100 text-blue-600'
                              ) :
                              message.type === 'notification' ? (
                                message.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                message.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                message.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-green-100 text-green-600'
                              ) :
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
                              
                              {/* Priority Badge for Reminders and Notifications */}
                              {(message.type === 'reminder' || message.type === 'notification') && (
                                <Badge 
                                  variant="outline"
                                  className={`text-xs px-1.5 py-0.5 ${
                                    message.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                                    message.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    message.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {message.priority?.toUpperCase()}
                                </Badge>
                              )}
                              
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

      {/* SMS Detail Modal */}
      <Dialog open={showSMSDetail} onOpenChange={setShowSMSDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              {selectedConversation?.contactName || selectedConversation?.phoneNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedConversation && (
            <div className="space-y-4">
              {/* Conversation Header */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.contactName || 'Unknown Contact'}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedConversation.phoneNumber}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {selectedConversation.messages?.length || 0} messages
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedConversation.messages
                  ?.slice()
                  .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.direction === 'OUTBOUND'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.direction === 'OUTBOUND' ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                <div ref={conversationMessagesEndRef} />
              </div>

              {/* Reply Section */}
              <div className="border-t pt-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your message..."
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    className="min-h-[80px] resize-none"
                    disabled={sendingSMS}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {smsMessage.length}/160 characters
                    </div>
                    <Button
                      onClick={() => sendSMSMessage(selectedConversation.phoneNumber, smsMessage)}
                      disabled={sendingSMS || !smsMessage.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendingSMS ? (
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
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New SMS Modal */}
      <Dialog open={showNewSMS} onOpenChange={setShowNewSMS}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              New SMS Message
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Contact
                {!loadingPhoneNumbers && leadPhoneNumbers.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({leadPhoneNumbers.length} contacts available)
                  </span>
                )}
              </label>
              <div className="relative">
                <Input
                  placeholder="Search by name or phone number..."
                  value={phoneSearchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPhoneSearchQuery(value);
                    // Clear selected number if search is cleared
                    if (!value) {
                      setNewSMSNumber('');
                    }
                  }}
                  disabled={sendingSMS || loadingPhoneNumbers}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                
                {/* Phone Numbers Dropdown - Absolutely positioned */}
                {phoneSearchQuery && !newSMSNumber && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto border rounded-md bg-white shadow-lg z-50">
                  {loadingPhoneNumbers ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading contacts...
                    </div>
                  ) : leadPhoneNumbers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-amber-600 bg-amber-50">
                      ⚠️ No phone numbers loaded from database. Please add leads with phone numbers.
                    </div>
                  ) : (
                    leadPhoneNumbers
                      .filter(item => {
                        const searchLower = phoneSearchQuery.toLowerCase();
                        const phoneDigits = item.phone.replace(/\D/g, ''); // Remove non-digits
                        const searchDigits = phoneSearchQuery.replace(/\D/g, ''); // Remove non-digits from search
                        
                        return item.name.toLowerCase().includes(searchLower) ||
                               item.phone.includes(phoneSearchQuery) ||
                               phoneDigits.includes(searchDigits) || // Match by digits only
                               item.address.toLowerCase().includes(searchLower);
                      })
                      .map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setNewSMSNumber(item.phone);
                            setPhoneSearchQuery(item.phone);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className="text-xs text-gray-600">{item.phone}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.type} • {item.address}
                              </div>
                            </div>
                            <Phone className="w-4 h-4 text-green-600 mt-1" />
                          </div>
                        </button>
                      ))
                  )}
                  {!loadingPhoneNumbers && leadPhoneNumbers.filter(item => {
                    const searchLower = phoneSearchQuery.toLowerCase();
                    const phoneDigits = item.phone.replace(/\D/g, '');
                    const searchDigits = phoneSearchQuery.replace(/\D/g, '');
                    
                    return item.name.toLowerCase().includes(searchLower) ||
                           item.phone.includes(phoneSearchQuery) ||
                           phoneDigits.includes(searchDigits) ||
                           item.address.toLowerCase().includes(searchLower);
                  }).length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No contacts found matching "{phoneSearchQuery}"
                    </div>
                  )}
                  </div>
                )}
              </div>
              
              {/* Show message if no contacts loaded */}
              {!loadingPhoneNumbers && leadPhoneNumbers.length === 0 && !phoneSearchQuery && (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                  ⚠️ No contacts with phone numbers found. Please add leads with phone numbers first.
                </div>
              )}
              
              {newSMSNumber && (() => {
                // Find the selected contact details
                const selectedContact = leadPhoneNumbers.find(item => item.phone === newSMSNumber);
                return selectedContact ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-sm text-green-900">{selectedContact.name}</span>
                        </div>
                        <div className="text-xs text-green-700 ml-6">
                          <div className="font-medium">{selectedContact.phone}</div>
                          <div className="text-green-600 mt-1">
                            {selectedContact.type} • {selectedContact.address}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">{newSMSNumber}</span>
                  </div>
                );
              })()}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={sendingSMS}
              />
              <div className="text-xs text-gray-500 text-right">
                {smsMessage.length}/160 characters
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewSMS(false);
                setNewSMSNumber('');
                setSmsMessage('');
              }}
              disabled={sendingSMS}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
                onClick={handleNewSMSSubmit}
                disabled={sendingSMS || !newSMSNumber.trim() || !smsMessage.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sendingSMS ? (
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
          </div>
        </DialogContent>
      </Dialog>

      {/* New Call Modal */}
      <Dialog open={showNewCall} onOpenChange={setShowNewCall}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              Make a Call
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Contact
                {!loadingPhoneNumbers && leadPhoneNumbers.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({leadPhoneNumbers.length} contacts available)
                  </span>
                )}
              </label>
              <div className="relative">
                <Input
                  placeholder={newCallNumber ? "Contact selected - search again to change" : "Search by name or phone number..."}
                  value={callPhoneSearchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCallPhoneSearchQuery(value);
                    // Clear selected number if user starts typing
                    if (value && newCallNumber) {
                      setNewCallNumber('');
                      setSelectedCallContact(null);
                    }
                  }}
                  disabled={makingCall || loadingPhoneNumbers}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                
                {/* Phone Numbers Dropdown - Absolutely positioned */}
                {callPhoneSearchQuery && !newCallNumber && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto border rounded-md bg-white shadow-lg z-50">
                  {loadingPhoneNumbers ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading contacts...
                    </div>
                  ) : leadPhoneNumbers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-amber-600 bg-amber-50">
                      ⚠️ No phone numbers loaded from database. Please add leads with phone numbers.
                    </div>
                  ) : (
                    leadPhoneNumbers
                      .filter(item => {
                        const searchLower = callPhoneSearchQuery.toLowerCase();
                        const phoneDigits = item.phone.replace(/\D/g, ''); // Remove non-digits
                        const searchDigits = callPhoneSearchQuery.replace(/\D/g, ''); // Remove non-digits from search
                        
                        return item.name.toLowerCase().includes(searchLower) ||
                               item.phone.includes(callPhoneSearchQuery) ||
                               phoneDigits.includes(searchDigits) || // Match by digits only
                               item.address.toLowerCase().includes(searchLower);
                      })
                      .map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setNewCallNumber(item.phone);
                            setCallPhoneSearchQuery(''); // Clear search to hide dropdown
                            setSelectedCallContact({
                              name: item.name,
                              phone: item.phone,
                              type: item.type,
                              address: item.address,
                              leadId: item.leadId
                            });
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className="text-xs text-gray-600">{item.phone}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.type} • {item.address}
                              </div>
                            </div>
                            <Phone className="w-4 h-4 text-purple-600 mt-1" />
                          </div>
                        </button>
                      ))
                  )}
                  {!loadingPhoneNumbers && leadPhoneNumbers.filter(item => {
                    const searchLower = callPhoneSearchQuery.toLowerCase();
                    const phoneDigits = item.phone.replace(/\D/g, '');
                    const searchDigits = callPhoneSearchQuery.replace(/\D/g, '');
                    
                    return item.name.toLowerCase().includes(searchLower) ||
                           item.phone.includes(callPhoneSearchQuery) ||
                           phoneDigits.includes(searchDigits) ||
                           item.address.toLowerCase().includes(searchLower);
                  }).length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No contacts found matching "{callPhoneSearchQuery}"
                    </div>
                  )}
                  </div>
                )}
              </div>
              
              {/* Show message if no contacts loaded */}
              {!loadingPhoneNumbers && leadPhoneNumbers.length === 0 && !callPhoneSearchQuery && (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                  ⚠️ No contacts with phone numbers found. Please add leads with phone numbers first.
                </div>
              )}
              
              {newCallNumber && selectedCallContact && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-sm text-purple-900">{selectedCallContact.name}</span>
                      </div>
                      <div className="text-xs text-purple-700 ml-6">
                        <div className="font-medium">{selectedCallContact.phone}</div>
                        <div className="text-purple-600 mt-1">
                          {selectedCallContact.type} • {selectedCallContact.address}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCall(false);
                setNewCallNumber('');
                setCallPhoneSearchQuery('');
                setSelectedCallContact(null);
              }}
              disabled={makingCall}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNewCallSubmit}
              disabled={makingCall || !newCallNumber.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {makingCall ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Make Call
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inbox;