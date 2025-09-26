import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, Calendar, TrendingUp, Home, BarChart3, MessageSquare, Phone, Mail, AlertCircle, CheckSquare, Clock, Bell, User, MapPin, Edit, ExternalLink, Reply, Forward, PauseCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/config/api";
import SMSWidget from "@/components/SMSWidget";
import CallWidget from "@/components/CallWidget";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Dialog states
  const [editTaskDialog, setEditTaskDialog] = useState({ open: false, task: null });
  const [replyDialog, setReplyDialog] = useState({ open: false, communication: null });
  const [forwardDialog, setForwardDialog] = useState({ open: false, communication: null });
  const [snoozeDialog, setSnoozeDialog] = useState({ open: false, reminder: null });

  // Loading states
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingComms, setLoadingComms] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Test dynamic data for Tasks
  const testTasks = [
    {
      id: 1,
      title: "Follow up with John Doe - 123 Main St",
      description: "Schedule property inspection and discuss offer details",
      priority: "high",
      dueDate: "2024-01-15",
      status: "pending",
      assignedTo: "Agent Smith",
      leadAddress: "123 Main St, Charlotte, NC",
      leadTitle: "Luxury Downtown Condo - 123 Main St",
      leadName: "John Doe"
    },
    {
      id: 2,
      title: "Complete due diligence for Oak Ave property",
      description: "Review inspection reports and finalize contract terms",
      priority: "medium",
      dueDate: "2024-01-16",
      status: "in-progress",
      assignedTo: "Agent Johnson",
      leadAddress: "456 Oak Ave, Raleigh, NC",
      leadTitle: "Family Home with Large Yard - 456 Oak Ave",
      leadName: "Jane Smith"
    },
    {
      id: 3,
      title: "Send marketing materials to Sarah Wilson",
      description: "Prepare property brochures and comparable analysis",
      priority: "low",
      dueDate: "2024-01-17",
      status: "completed",
      assignedTo: "Agent Davis",
      leadAddress: "321 Elm St, Greensboro, NC",
      leadTitle: "Modern Townhouse - 321 Elm St",
      leadName: "Sarah Wilson"
    },
    {
      id: 4,
      title: "Schedule closing for Pine Rd property",
      description: "Coordinate with title company and all parties",
      priority: "high",
      dueDate: "2024-01-18",
      status: "pending",
      assignedTo: "Agent Brown",
      leadAddress: "789 Pine Rd, Durham, NC",
      leadTitle: "Spacious Ranch Home - 789 Pine Rd",
      leadName: "Michael Johnson"
    }
  ];

  // Test dynamic data for Communications
  const testCommunications = [
    {
      id: 1,
      type: "email",
      subject: "Property Inquiry - 123 Main St",
      from: "john.doe@email.com",
      to: "agent@realestate.com",
      message: "I'm interested in learning more about this property. Can we schedule a viewing?",
      timestamp: "2024-01-15 10:30 AM",
      status: "unread",
      leadName: "John Doe",
      leadAddress: "123 Main St, Charlotte, NC"
    },
    {
      id: 2,
      type: "sms",
      subject: "Quick question about offer",
      from: "+1 (555) 234-5678",
      to: "+1 (555) 123-4567",
      message: "Hi, can you clarify the closing timeline for our offer?",
      timestamp: "2024-01-15 2:15 PM",
      status: "read",
      leadName: "Jane Smith",
      leadAddress: "456 Oak Ave, Raleigh, NC"
    },
    {
      id: 3,
      type: "call",
      subject: "Property valuation discussion",
      from: "+1 (555) 345-6789",
      to: "+1 (555) 123-4567",
      message: "Discussed current market conditions and pricing strategy",
      timestamp: "2024-01-15 4:45 PM",
      status: "completed",
      leadName: "Mike Johnson",
      leadAddress: "789 Pine Rd, Durham, NC"
    },
    {
      id: 4,
      type: "email",
      subject: "Contract amendments required",
      from: "sarah.wilson@email.com",
      to: "agent@realestate.com",
      message: "Please review the attached amendments to the purchase agreement.",
      timestamp: "2024-01-16 9:20 AM",
      status: "unread",
      leadName: "Sarah Wilson",
      leadAddress: "321 Elm St, Greensboro, NC"
    }
  ];

  // Test dynamic data for Reminders
  const testReminders = [
    {
      id: 1,
      title: "Property inspection scheduled",
      description: "Inspection for 123 Main St property at 2:00 PM",
      date: "2024-01-15",
      time: "2:00 PM",
      type: "appointment",
      priority: "high",
      leadName: "John Doe",
      leadAddress: "123 Main St, Charlotte, NC",
      status: "upcoming"
    },
    {
      id: 2,
      title: "Contract deadline reminder",
      description: "Buyer response deadline for Oak Ave property",
      date: "2024-01-16",
      time: "5:00 PM",
      type: "deadline",
      priority: "urgent",
      leadName: "Jane Smith",
      leadAddress: "456 Oak Ave, Raleigh, NC",
      status: "urgent"
    },
    {
      id: 3,
      title: "Follow-up call scheduled",
      description: "Weekly check-in call with potential seller",
      date: "2024-01-17",
      time: "10:00 AM",
      type: "call",
      priority: "medium",
      leadName: "Mike Johnson",
      leadAddress: "789 Pine Rd, Durham, NC",
      status: "scheduled"
    },
    {
      id: 4,
      title: "Document submission deadline",
      description: "Final paperwork due for closing process",
      date: "2024-01-18",
      time: "12:00 PM",
      type: "deadline",
      priority: "high",
      leadName: "Sarah Wilson",
      leadAddress: "321 Elm St, Greensboro, NC",
      status: "pending"
    }
  ];

  // State for managing tasks, communications, and reminders
  const [tasks, setTasks] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [reminders, setReminders] = useState([]);

  // Helper function for API calls with automatic token refresh
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
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
            const refreshData = await refreshResponse.json();
            localStorage.setItem('accessToken', refreshData.accessToken);
            
            // Retry original request with new token
            return fetch(url, {
              ...options,
              headers: {
                'Authorization': `Bearer ${refreshData.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
              }
            });
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    }
    
    return response;
  };

  // Helper function to create meaningful lead titles
  const createLeadTitle = (lead: any): string => {
    if (!lead) return 'Unknown Property';
    
    // Try to create a descriptive title
    let title = '';
    
    // Add property type/description if available
    if (lead.leadType === 'SELLER') {
      title = 'Property for Sale';
    } else if (lead.leadType === 'BUYER') {
      title = 'Buyer Lead';
    } else if (lead.leadType === 'VENDOR') {
      title = 'Vendor Lead';
    } else {
      title = 'Property Lead';
    }
    
    // Add address if available
    if (lead.address) {
      title += ` - ${lead.address.address1}`;
    }
    
    // Add client name if available
    if (lead.seller && lead.seller.firstName) {
      title += ` (${lead.seller.firstName} ${lead.seller.lastName})`;
    } else if (lead.buyer && lead.buyer.firstName) {
      title += ` (${lead.buyer.firstName} ${lead.buyer.lastName})`;
    }
    
    return title;
  };

  // Fetch assigned tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await makeApiCall(`${API_BASE}/inbox/tasks`);
      const json = await res.json();
      const items = (json?.data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        priority: t.priority?.toLowerCase() || 'medium',
        dueDate: new Date(t.dueAt).toLocaleDateString(),
        status: t.status === 'OPEN' ? 'pending' : 'completed',
        assignedTo: t.assignedUser ? `${t.assignedUser.firstName} ${t.assignedUser.lastName}` : 'Unassigned',
        leadAddress: t.lead?.address ? `${t.lead.address.address1}, ${t.lead.address.city}, ${t.lead.address.state}` : '',
        leadTitle: t.lead ? createLeadTitle(t.lead) : 'No Lead',
        leadName: t.lead?.seller ? `${t.lead.seller.firstName} ${t.lead.seller.lastName}` : 
                  t.lead?.buyer ? `${t.lead.buyer.firstName} ${t.lead.buyer.lastName}` : 'Unknown'
      }));
      setTasks(items);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch communications
  const fetchCommunications = async () => {
    setLoadingComms(true);
    try {
      const res = await makeApiCall(`${API_BASE}/inbox/communications`);
      const json = await res.json();
      const items = (json?.data || []).map((c: any) => ({
        id: c.id,
        type: c.type?.toLowerCase() || 'email',
        subject: c.subject || 'No Subject',
        from: c.fromEmail || c.fromPhone || 'Unknown',
        to: c.toEmail || c.toPhone || 'Unknown',
        message: c.content || c.notes || 'No content',
        timestamp: new Date(c.occurredAt).toLocaleString(),
        status: c.direction === 'INBOUND' ? 'unread' : 'read',
        leadName: c.lead?.seller ? `${c.lead.seller.firstName} ${c.lead.seller.lastName}` : 
                  c.lead?.buyer ? `${c.lead.buyer.firstName} ${c.lead.buyer.lastName}` : 'Unknown',
        leadAddress: c.lead?.address ? `${c.lead.address.address1}, ${c.lead.address.city}, ${c.lead.address.state}` : ''
      }));
      setCommunications(items);
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "Failed to load communications",
        variant: "destructive",
      });
    } finally {
      setLoadingComms(false);
    }
  };

  // Fetch reminders
  const fetchReminders = async () => {
    setLoadingReminders(true);
    try {
      const res = await makeApiCall(`${API_BASE}/notifications/reminders`);
      const json = await res.json();
      const items = (json?.data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.message || '',
        priority: r.priority?.toLowerCase() || 'medium',
        date: new Date(r.scheduledFor).toLocaleDateString(),
        time: new Date(r.scheduledFor).toLocaleTimeString(),
        status: r.status === 'PENDING' ? 'pending' : 'completed',
        leadName: r.lead?.seller ? `${r.lead.seller.firstName} ${r.lead.seller.lastName}` : 
                  r.lead?.buyer ? `${r.lead.buyer.firstName} ${r.lead.buyer.lastName}` : 'Unknown',
        leadAddress: r.lead?.address ? `${r.lead.address.address1}, ${r.lead.address.city}, ${r.lead.address.state}` : ''
      }));
      setReminders(items);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "Failed to load reminders",
        variant: "destructive",
      });
    } finally {
      setLoadingReminders(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTasks();
    fetchCommunications();
    fetchReminders();
  }, []);

  // Action handlers
  const handleLeadNavigation = (leadAddress: string, leadTitle?: string, taskId?: number) => {
    // Navigate to leads page with lead address as identifier
    navigate(`/leads?address=${encodeURIComponent(leadAddress)}`);
    
    // If taskId is provided, remove the task from the list
    if (taskId) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      toast({
        title: "Task Completed & Lead Opened",
        description: `Opened ${leadTitle || leadAddress} details and removed task from list`,
      });
    } else {
      toast({
        title: "Navigating to Lead",
        description: `Opening details for ${leadTitle || leadAddress}`,
      });
    }
  };

  const handleTaskComplete = (taskId: number) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' }
          : task
      )
    );
    toast({
      title: "Task Completed",
      description: "Task marked as completed successfully",
    });
    // Here you would typically make an API call to update the task status
    console.log(`Completing task ${taskId}`);
  };

  const handleTaskEdit = (task: any) => {
    setEditTaskDialog({ open: true, task });
  };

  const handleTaskSave = (updatedTask: any) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id 
          ? { ...task, ...updatedTask }
          : task
      )
    );
    toast({
      title: "Task Updated",
      description: "Task has been updated successfully",
    });
    setEditTaskDialog({ open: false, task: null });
    // Here you would typically make an API call to update the task
    console.log('Updating task:', updatedTask);
  };

  const handleCommunicationReply = (communication: any) => {
    setReplyDialog({ open: true, communication });
  };

  const handleCommunicationForward = (communication: any) => {
    setForwardDialog({ open: true, communication });
  };

  const handleSendReply = (replyData: any) => {
    // Add a new communication entry for the reply
    const newReply = {
      id: communications.length + 1,
      type: replyData.communication.type,
      subject: `Re: ${replyData.communication.subject}`,
      from: "agent@realestate.com",
      to: replyData.communication.from,
      message: "Reply sent successfully",
      timestamp: new Date().toLocaleString(),
      status: "read",
      leadName: replyData.communication.leadName,
      leadAddress: replyData.communication.leadAddress
    };
    
    setCommunications(prevComms => [newReply, ...prevComms]);
    
    toast({
      title: "Reply Sent",
      description: `Reply sent to ${replyData.communication.leadName}`,
    });
    setReplyDialog({ open: false, communication: null });
    // Here you would typically make an API call to send the reply
    console.log('Sending reply:', replyData);
  };

  const handleSendForward = (forwardData: any) => {
    toast({
      title: "Message Forwarded",
      description: "Message has been forwarded successfully",
    });
    setForwardDialog({ open: false, communication: null });
    // Here you would typically make an API call to forward the message
    console.log('Forwarding message:', forwardData);
  };

  const handleReminderSnooze = (reminder: any) => {
    setSnoozeDialog({ open: true, reminder });
  };

  const handleReminderComplete = (reminderId: number) => {
    setReminders(prevReminders => 
      prevReminders.map(reminder => 
        reminder.id === reminderId 
          ? { ...reminder, status: 'completed' }
          : reminder
      )
    );
    toast({
      title: "Reminder Completed",
      description: "Reminder marked as completed",
    });
    // Here you would typically make an API call to complete the reminder
    console.log(`Completing reminder ${reminderId}`);
  };

  const handleSnoozeReminder = (snoozeData: any) => {
    toast({
      title: "Reminder Snoozed",
      description: `Reminder snoozed until ${snoozeData.newTime}`,
    });
    setSnoozeDialog({ open: false, reminder: null });
    // Here you would typically make an API call to snooze the reminder
    console.log('Snoozing reminder:', snoozeData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'unread': return 'bg-red-100 text-red-800';
      case 'read': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Widget Grid - Command Center Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Active Properties Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Building className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">+5%</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Properties</p>
            <p className="text-2xl font-black text-blue-900">124</p>
            <p className="text-xs text-blue-600">Vacant: <span className="font-semibold">3</span> • Needs Attention: <span className="font-semibold text-orange-600">2</span></p>
          </div>
        </Card>

        {/* Active Leads Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-green-200/50 bg-gradient-to-br from-green-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">+8%</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Active Leads</p>
            <p className="text-2xl font-black text-green-900">89</p>
            <p className="text-xs text-green-600">New This Week: <span className="font-semibold">12</span> • Hot: <span className="font-semibold text-red-600">8</span></p>
          </div>
        </Card>

        {/* Performance Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">+15%</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Closed This Month</p>
            <p className="text-2xl font-black text-purple-900">47</p>
            {/* Mini Bar Chart */}
            <div className="flex items-end gap-1 h-6">
              <div className="w-1 bg-purple-300 h-3"></div>
              <div className="w-1 bg-purple-400 h-4"></div>
              <div className="w-1 bg-purple-500 h-5"></div>
              <div className="w-1 bg-purple-600 h-6"></div>
              <div className="w-1 bg-purple-700 h-4"></div>
            </div>
          </div>
        </Card>

        {/* Pipeline Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">Pipeline</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Lead Pipeline</p>
            <p className="text-2xl font-black text-orange-900">156</p>
            <p className="text-xs text-orange-600">Prospects: <span className="font-semibold">15</span> • Qualified: <span className="font-semibold text-green-600">8</span></p>
          </div>
        </Card>

      </div>

      {/* Second Row - More Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Property Management Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Home className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-600 font-bold">→</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Property Mgmt</p>
            <p className="text-sm font-bold text-blue-900">Track & Manage</p>
            <p className="text-xs text-blue-600">Portfolio Overview</p>
          </div>
        </Card>

        {/* Communication Hub Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-green-200/50 bg-gradient-to-br from-green-50/80 to-white cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-bold text-red-600">3</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Communications</p>
            <p className="text-sm font-bold text-green-900">Messages & Calls</p>
            <p className="text-xs text-green-600">Unread: <span className="font-semibold text-red-600">3</span> • Appointments: <span className="font-semibold">1</span></p>
          </div>
        </Card>

        {/* Communication Widgets - SMS & Call */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-indigo-200/50 bg-gradient-to-br from-indigo-50/80 to-white">
          <Tabs defaultValue="sms" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="sms" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="call" className="text-xs">
                <Phone className="w-3 h-3 mr-1" />
                Call
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sms" className="mt-0">
              <SMSWidget />
            </TabsContent>
            
            <TabsContent value="call" className="mt-0">
              <CallWidget />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Alerts Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-xs font-bold text-yellow-600">2</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Alerts</p>
            <p className="text-sm font-bold text-orange-900">Needs Attention</p>
            <p className="text-xs text-orange-600">Due Today: <span className="font-semibold text-red-600">2</span> • Overdue: <span className="font-semibold text-red-700">0</span></p>
          </div>
        </Card>

      </div>

      {/* Tasks, Communications, and Reminders Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Tasks
              <Badge className="bg-red-100 text-red-800">{tasks.filter(t => t.status !== 'completed').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communications
              <Badge className="bg-blue-100 text-blue-800">{communications.filter(c => c.status === 'unread').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
              <Badge className="bg-orange-100 text-orange-800">{reminders.filter(r => r.status === 'urgent').length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Tasks</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={fetchTasks}
                  disabled={loadingTasks}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", loadingTasks && "animate-spin")} />
                  Refresh
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
            {loadingTasks ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading tasks...</p>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tasks found</p>
                <p className="text-gray-400 text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tasks.map((task) => (
                <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleLeadNavigation(task.leadAddress, task.leadTitle, task.id)}
                        >
                          <MapPin className="w-3 h-3" />
                          {task.leadTitle}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assignedTo}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {task.dueDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTaskEdit(task)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTaskComplete(task.id)}
                        disabled={task.status === 'completed'}
                      >
                        <CheckSquare className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </div>
                </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Communications</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={fetchCommunications}
                  disabled={loadingComms}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", loadingComms && "animate-spin")} />
                  Refresh
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
            </div>
            {loadingComms ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
                  <p className="text-gray-600">Loading communications...</p>
                </div>
              </div>
            ) : communications.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No communications found</p>
                <p className="text-gray-400 text-sm">Start a conversation!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {communications.map((comm) => (
                <Card key={comm.id} className={cn(
                  "p-4 hover:shadow-md transition-shadow",
                  comm.status === 'unread' ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {comm.type === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                          {comm.type === 'sms' && <MessageSquare className="w-4 h-4 text-green-500" />}
                          {comm.type === 'call' && <Phone className="w-4 h-4 text-purple-500" />}
                          <h4 className="font-medium text-gray-900">{comm.subject}</h4>
                        </div>
                        <Badge className={getStatusColor(comm.status)}>{comm.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{comm.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleLeadNavigation(comm.leadAddress, `${comm.leadName} - ${comm.leadAddress}`)}
                        >
                          <User className="w-3 h-3" />
                          {comm.leadName}
                        </div>
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleLeadNavigation(comm.leadAddress, `${comm.leadName} - ${comm.leadAddress}`)}
                        >
                          <MapPin className="w-3 h-3" />
                          {comm.leadAddress}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {comm.timestamp}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        From: {comm.from} → To: {comm.to}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCommunicationReply(comm)}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCommunicationForward(comm)}
                      >
                        <Forward className="w-3 h-3 mr-1" />
                        Forward
                      </Button>
                    </div>
                  </div>
                </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upcoming Reminders</h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={fetchReminders}
                  disabled={loadingReminders}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", loadingReminders && "animate-spin")} />
                  Refresh
                </Button>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <Bell className="w-4 h-4 mr-2" />
                  Add Reminder
                </Button>
              </div>
            </div>
            {loadingReminders ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
                  <p className="text-gray-600">Loading reminders...</p>
                </div>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No reminders found</p>
                <p className="text-gray-400 text-sm">All set for now!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {reminders.map((reminder) => (
                <Card key={reminder.id} className={cn(
                  "p-4 hover:shadow-md transition-shadow",
                  reminder.status === 'urgent' ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {reminder.type === 'appointment' && <Calendar className="w-4 h-4 text-blue-500" />}
                          {reminder.type === 'deadline' && <AlertCircle className="w-4 h-4 text-red-500" />}
                          {reminder.type === 'call' && <Phone className="w-4 h-4 text-green-500" />}
                          <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                        </div>
                        <Badge className={getPriorityColor(reminder.priority)}>{reminder.priority}</Badge>
                        <Badge className={getStatusColor(reminder.status)}>{reminder.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{reminder.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleLeadNavigation(reminder.leadAddress, `${reminder.leadName} - ${reminder.leadAddress}`)}
                        >
                          <User className="w-3 h-3" />
                          {reminder.leadName}
                        </div>
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleLeadNavigation(reminder.leadAddress, `${reminder.leadName} - ${reminder.leadAddress}`)}
                        >
                          <MapPin className="w-3 h-3" />
                          {reminder.leadAddress}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {reminder.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {reminder.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReminderSnooze(reminder)}
                      >
                        <PauseCircle className="w-3 h-3 mr-1" />
                        Snooze
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReminderComplete(reminder.id)}
                      >
                        <CheckSquare className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </div>
                </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskDialog.open} onOpenChange={(open) => setEditTaskDialog({ open, task: editTaskDialog.task })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Make changes to the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-title" className="text-right">
                Title
              </Label>
              <Input
                id="task-title"
                defaultValue={editTaskDialog.task?.title || ""}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="task-description"
                defaultValue={editTaskDialog.task?.description || ""}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-priority" className="text-right">
                Priority
              </Label>
              <Select defaultValue={editTaskDialog.task?.priority || "medium"}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => handleTaskSave(editTaskDialog.task)}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onOpenChange={(open) => setReplyDialog({ open, communication: replyDialog.communication })}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Reply to {replyDialog.communication?.leadName}</DialogTitle>
            <DialogDescription>
              Send a reply to this communication.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reply-subject" className="text-right">
                Subject
              </Label>
              <Input
                id="reply-subject"
                defaultValue={`Re: ${replyDialog.communication?.subject || ""}`}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reply-message" className="text-right">
                Message
              </Label>
              <Textarea
                id="reply-message"
                placeholder="Type your reply here..."
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => handleSendReply({ communication: replyDialog.communication })}>
              <Reply className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={forwardDialog.open} onOpenChange={(open) => setForwardDialog({ open, communication: forwardDialog.communication })}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
            <DialogDescription>
              Forward this communication to another recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forward-to" className="text-right">
                To
              </Label>
              <Input
                id="forward-to"
                placeholder="recipient@example.com"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forward-subject" className="text-right">
                Subject
              </Label>
              <Input
                id="forward-subject"
                defaultValue={`Fwd: ${forwardDialog.communication?.subject || ""}`}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forward-message" className="text-right">
                Message
              </Label>
              <Textarea
                id="forward-message"
                placeholder="Add a message (optional)..."
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => handleSendForward({ communication: forwardDialog.communication })}>
              <Forward className="w-4 h-4 mr-2" />
              Forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialog.open} onOpenChange={(open) => setSnoozeDialog({ open, reminder: snoozeDialog.reminder })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Snooze Reminder</DialogTitle>
            <DialogDescription>
              Choose when you'd like to be reminded again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="snooze-duration" className="text-right">
                Snooze for
              </Label>
              <Select defaultValue="1hour">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15min">15 minutes</SelectItem>
                  <SelectItem value="30min">30 minutes</SelectItem>
                  <SelectItem value="1hour">1 hour</SelectItem>
                  <SelectItem value="2hours">2 hours</SelectItem>
                  <SelectItem value="4hours">4 hours</SelectItem>
                  <SelectItem value="1day">1 day</SelectItem>
                  <SelectItem value="1week">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => handleSnoozeReminder({ reminder: snoozeDialog.reminder, newTime: '1 hour' })}>
              <PauseCircle className="w-4 h-4 mr-2" />
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;