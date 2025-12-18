import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  FileText, 
  PhoneCall, 
  PhoneOff, 
  Send, 
  Loader2,
  User,
  CheckSquare,
  Calendar,
  Plus
} from 'lucide-react';

interface Communication {
  id: string;
  type: 'CALL' | 'SMS' | 'EMAIL' | 'NOTE' | 'TASK';
  direction?: 'INBOUND' | 'OUTBOUND';
  body?: string;
  subject?: string;
  title?: string;
  description?: string;
  status?: string;
  dueAt?: string;
  occurredAt: string;
  createdAt?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
}

interface UnifiedCommunicationFeedProps {
  communications: Communication[];
  tasks: any[];
  loadingCommunications: boolean;
  
  // SMS props
  smsText: string;
  setSmsText: (text: string) => void;
  sendingSMS: boolean;
  onSendSMS: () => void;
  
  // Email props
  emailSubject: string;
  setEmailSubject: (subject: string) => void;
  emailBody: string;
  setEmailBody: (body: string) => void;
  sendingEmail: boolean;
  onSendEmail: () => void;
  
  // Call props
  makingCall: boolean;
  onMakeCall: () => void;
  callStatus?: {
    status: string;
  };
  onHangUp: () => void;
  hasValidPhone: boolean;
  
  // Note props
  noteText: string;
  setNoteText: (text: string) => void;
  addingNote: boolean;
  onAddNote: () => void;
  
  // Task props
  onOpenTaskDialog?: () => void;
}

export const UnifiedCommunicationFeed: React.FC<UnifiedCommunicationFeedProps> = ({
  communications,
  tasks,
  loadingCommunications,
  smsText,
  setSmsText,
  sendingSMS,
  onSendSMS,
  emailSubject,
  setEmailSubject,
  emailBody,
  setEmailBody,
  sendingEmail,
  onSendEmail,
  makingCall,
  onMakeCall,
  callStatus,
  onHangUp,
  hasValidPhone,
  noteText,
  setNoteText,
  addingNote,
  onAddNote,
  onOpenTaskDialog,
}) => {
  // Dialog states
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  // Merge communications and tasks into one array
  const allItems = [
    ...communications,
    ...tasks.map(task => ({
      id: task.id,
      type: 'TASK' as const,
      title: task.title,
      description: task.description,
      status: task.status,
      dueAt: task.dueAt,
      occurredAt: task.createdAt || task.dueAt,
      createdAt: task.createdAt,
      assignedTo: task.assignedTo,
      user: task.createdBy
    }))
  ];

  // Sort all items by timestamp (most recent first)
  const sortedItems = allItems.sort((a, b) => {
    const dateA = new Date(a.occurredAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.occurredAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="w-4 h-4 text-blue-600" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'NOTE':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'TASK':
        return <CheckSquare className="w-4 h-4 text-pink-600" />;
      default:
        return <User className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CALL': return 'Call';
      case 'SMS': return 'SMS';
      case 'EMAIL': return 'Email';
      case 'NOTE': return 'Note';
      case 'TASK': return 'Task';
      default: return type;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleSendSMS = () => {
    onSendSMS();
    setShowSMSDialog(false);
    setSmsText('');
  };

  const handleSendEmail = () => {
    onSendEmail();
    setShowEmailDialog(false);
    setEmailSubject('');
    setEmailBody('');
  };

  const handleAddNote = () => {
    onAddNote();
    setShowNoteDialog(false);
    setNoteText('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">Communications</h3>
          <span className="text-xs text-slate-500">({allItems.length})</span>
        </div>
      </div>

      {/* Unified Feed - All Items */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[400px] max-h-[500px] pr-1 mb-2">
        {loadingCommunications ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No communications yet</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="flex gap-2 p-2 hover:bg-slate-50 rounded border-b border-slate-100">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getIconForType(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      {getTypeLabel(item.type)}
                    </span>
                    {item.user && (
                      <span className="text-sm font-medium text-slate-900">
                        {item.user.firstName} {item.user.lastName}
                      </span>
                    )}
                    {item.direction && (
                      <span className="text-xs text-slate-500">
                        {item.direction === 'INBOUND' ? '→' : '←'}
                      </span>
                    )}
                    {item.type === 'TASK' && item.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.status === 'DONE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatDateTime(item.occurredAt || item.createdAt || '')}
                  </span>
                </div>

                {/* Task Title */}
                {item.type === 'TASK' && item.title && (
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {item.title}
                  </p>
                )}

                {/* Task Due Date */}
                {item.type === 'TASK' && item.dueAt && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due: {formatDateTime(item.dueAt)}</span>
                  </div>
                )}

                {/* Task Assigned To */}
                {item.type === 'TASK' && item.assignedTo && (
                  <div className="text-xs text-slate-500 mb-1">
                    Assigned to: {item.assignedTo.firstName} {item.assignedTo.lastName}
                  </div>
                )}

                {/* Email Subject */}
                {item.subject && (
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    {item.subject}
                  </p>
                )}

                {/* Body / Description */}
                {(item.body || item.description) && (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {item.body || item.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons at Bottom */}
      <div className="border-t border-slate-200 pt-2 bg-white">
        {/* Call Status Banner - Above Buttons */}
        {callStatus?.status && callStatus.status !== 'idle' && callStatus.status !== 'disconnected' && (
          <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-purple-600 animate-pulse" />
              <span className="text-sm text-purple-700 font-medium">
                {callStatus.status === 'connecting' && 'Connecting...'}
                {callStatus.status === 'ringing' && 'Ringing...'}
                {callStatus.status === 'connected' && 'Call in progress'}
              </span>
            </div>
            <Button
              onClick={onHangUp}
              size="sm"
              className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-3 h-3 mr-1" />
              Hang Up
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-5 gap-1">
          {/* Call Button */}
          <Button
            onClick={onMakeCall}
            disabled={makingCall || !hasValidPhone || (callStatus?.status && callStatus.status !== 'idle')}
            size="sm"
            variant="outline"
            className="h-9 text-xs flex flex-col items-center justify-center gap-0.5 p-1"
            title={!hasValidPhone ? 'No phone number' : 'Make a call'}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call</span>
          </Button>

          {/* SMS Button */}
          <Button
            onClick={() => setShowSMSDialog(true)}
            size="sm"
            variant="outline"
            className="h-9 text-xs flex flex-col items-center justify-center gap-0.5 p-1"
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS</span>
          </Button>

          {/* Email Button */}
          <Button
            onClick={() => setShowEmailDialog(true)}
            size="sm"
            variant="outline"
            className="h-9 text-xs flex flex-col items-center justify-center gap-0.5 p-1"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </Button>

          {/* Note Button */}
          <Button
            onClick={() => setShowNoteDialog(true)}
            size="sm"
            variant="outline"
            className="h-9 text-xs flex flex-col items-center justify-center gap-0.5 p-1"
          >
            <FileText className="w-4 h-4" />
            <span>Note</span>
          </Button>

          {/* Task Button */}
          <Button
            onClick={onOpenTaskDialog}
            size="sm"
            variant="outline"
            className="h-9 text-xs flex flex-col items-center justify-center gap-0.5 p-1"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Task</span>
          </Button>
        </div>
      </div>

      {/* SMS Dialog */}
      <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Send SMS
            </DialogTitle>
            <DialogDescription>
              Send a text message to this lead
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Type your SMS message..."
                className="min-h-[120px] mt-1"
                disabled={sendingSMS}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSMSDialog(false)}
                disabled={sendingSMS}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendSMS}
                disabled={sendingSMS || !smsText.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {sendingSMS ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send SMS</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Send Email
            </DialogTitle>
            <DialogDescription>
              Send an email to this lead
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
                className="mt-1"
                disabled={sendingEmail}
              />
            </div>
            <div>
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Type your email message..."
                className="min-h-[150px] mt-1"
                disabled={sendingEmail}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                disabled={sendingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendingEmail ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Send Email</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Add Note
            </DialogTitle>
            <DialogDescription>
              Add an internal note or activity log
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-text">Note</Label>
              <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type your note..."
                className="min-h-[120px] mt-1"
                disabled={addingNote}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNoteDialog(false)}
                disabled={addingNote}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={addingNote || !noteText.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {addingNote ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" />Add Note</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
