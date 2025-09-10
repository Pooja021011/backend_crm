import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  Trash2
} from "lucide-react";

const Inbox = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const allMessages = [
    // Emails
    {
      id: "1",
      from: "Wayne Enterprises",
      subject: "Schedule a UX/UX walkthrough with Catwoman.",
      preview: "Hi, I saw your listing for the property on Oak Street and I'm very interested in scheduling a viewing...",
      time: "Aug 5",
      type: "email",
      source: "emails",
      unread: true,
      starred: false,
      priority: "normal"
    },
    {
      id: "2", 
      from: "Bush Company",
      subject: "Follow up with Tobias re Blue Man Group tickets.",
      preview: "I've completed my review of the purchase agreement for the Maple Avenue property...",
      time: "Aug 5",
      type: "email",
      source: "emails", 
      unread: true,
      starred: false,
      priority: "normal"
    },
    {
      id: "3",
      from: "Dundee Mifflin",
      subject: "Sync with Dwight regarding beet call.",
      preview: "Thanks for showing me the property yesterday. When can we schedule the inspection?",
      time: "Yesterday",
      type: "email",
      source: "emails",
      unread: true,
      starred: false,
      priority: "normal"
    },
    {
      id: "4",
      from: "Schrute Farms",
      subject: "Prepare a beetroot farm-specific offer.",
      preview: "Hi! I'm interested in making an offer on the downtown property. Can we discuss pricing?",
      time: "Yesterday",
      type: "email",
      source: "emails",
      unread: false,
      starred: false,
      priority: "normal"
    },
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
    if (source === "all") return allMessages;
    return allMessages.filter(message => message.source === source);
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
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent hover:border-gray-300 px-0 pb-3"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Primary</span>
                {getUnreadCount("all") > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getUnreadCount("all")}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            
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
                      className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        message.unread ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <Checkbox 
                        checked={selectedItems.includes(message.id)}
                        onCheckedChange={() => handleSelectItem(message.id)}
                        className="border-gray-300"
                      />
                      
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
                            {message.from}
                          </span>
                          {message.starred && (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        <div className={`text-sm mt-1 ${
                          message.unread ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}>
                          {message.subject}
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
    </div>
  );
};

export default Inbox;