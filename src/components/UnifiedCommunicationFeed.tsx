import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as UiCalendar } from './ui/calendar';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  FileText, 
  PhoneCall, 
  PhoneOff,
  Mic,
  MicOff,
  Send, 
  Loader2,
  User,
  CheckSquare,
  Calendar,
  Plus,
  Edit2,
  Save
} from 'lucide-react';

interface Communication {
  id: string;
  type: 'CALL' | 'SMS' | 'EMAIL' | 'NOTE' | 'TASK';
  direction?: 'INBOUND' | 'OUTBOUND';
  body?: string;
  subject?: string;
  metadata?: any;
  createdById?: string;
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
  leadId: string;
  communications: Communication[];
  tasks: any[];
  loadingCommunications: boolean;
  currentUser?: { id: string; roles?: string[] };
  canEditLead?: boolean;
  onRefreshCommunications?: () => void;
  onRefreshTasks?: () => void;
  onNoteUpdated?: (updated: any) => void;
  onTaskUpdated?: (updated: any) => void;
  
  // SMS props
  smsText: string;
  setSmsText: (text: string) => void;
  sendingSMS: boolean;
  onSendSMS: () => void;
  availablePhoneNumbers?: Array<{
    number: string;
    label: string;
    type: string;
    isPrimary?: boolean;
  }>;
  selectedSMSPhone?: string;
  onSMSPhoneChange?: (phone: string) => void;
  
  // Email props
  emailSubject: string;
  setEmailSubject: (subject: string) => void;
  emailBody: string;
  setEmailBody: (body: string) => void;
  sendingEmail: boolean;
  onSendEmail: () => void;
  availableEmailAddresses?: Array<{
    email: string;
    label: string;
    type: string;
    isPrimary?: boolean;
  }>;
  selectedEmail?: string;
  onEmailChange?: (email: string) => void;
  
  // Call props
  makingCall: boolean;
  onMakeCall: () => void;
  callStatus?: {
    status: string;
    duration?: number;
  };
  onHangUp: () => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  hasValidPhone: boolean;
  
  // Note props
  noteText: string;
  setNoteText: (text: string) => void;
  addingNote: boolean;
  onAddNote: () => void;
  
  // Task props
  onOpenTaskDialog?: () => void;
  
  // Lead info for filtering mentionable users
  lead?: {
    id: string;
    assignedUserId?: string;
    createdById?: string;
    dispAgentId?: string;
  };
}

export const UnifiedCommunicationFeed: React.FC<UnifiedCommunicationFeedProps> = ({
  leadId,
  communications,
  tasks,
  loadingCommunications,
  currentUser,
  canEditLead = false,
  onRefreshCommunications,
  onRefreshTasks,
  onNoteUpdated,
  onTaskUpdated,
  lead,
  smsText,
  setSmsText,
  sendingSMS,
  onSendSMS,
  availablePhoneNumbers = [],
  selectedSMSPhone,
  onSMSPhoneChange,
  emailSubject,
  setEmailSubject,
  emailBody,
  setEmailBody,
  sendingEmail,
  onSendEmail,
  availableEmailAddresses = [],
  selectedEmail,
  onEmailChange,
  makingCall,
  onMakeCall,
  callStatus,
  onHangUp,
  onToggleMute,
  isMuted,
  hasValidPhone,
  noteText,
  setNoteText,
  addingNote,
  onAddNote,
  onOpenTaskDialog,
}) => {
  const { toast } = useToast();
  // Dialog states
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Edit dialogs
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [editNoteBody, setEditNoteBody] = useState('');
  const [savingNoteEdit, setSavingNoteEdit] = useState(false);

  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [savingTaskEdit, setSavingTaskEdit] = useState(false);
  const [taskEditForm, setTaskEditForm] = useState({
    title: '',
    description: '',
    dueAtIso: '',
    assignedToId: '',
    status: 'OPEN',
  });
  const [taskEditDuePickerOpen, setTaskEditDuePickerOpen] = useState(false);
  const [taskEditDueDate, setTaskEditDueDate] = useState<Date | null>(null);
  const [taskEditDueHour, setTaskEditDueHour] = useState<string>('');
  const [taskEditDueMinute, setTaskEditDueMinute] = useState<string>('');
  const [taskEditDueAmPm, setTaskEditDueAmPm] = useState<'AM' | 'PM'>('AM');
  
  // User mention state
  const [users, setUsers] = useState<Array<{id: string; firstName: string; lastName: string}>>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionAtIndex, setMentionAtIndex] = useState<number | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);

  // Recording playback state (recordingSid -> object URL)
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});
  const [recordingLoading, setRecordingLoading] = useState<Record<string, boolean>>({});

  const formatTaskDueDisplay = (iso?: string) => {
    if (!iso) return 'Select due date & time';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Select due date & time';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const setTaskEditDueFromDateTime = (dt: Date) => {
    if (!dt || Number.isNaN(dt.getTime())) return;

    const dateOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const hours24 = dt.getHours();
    const ampm: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
    const hour12 = hours24 % 12 || 12;
    const minute = dt.getMinutes();

    setTaskEditDueDate(dateOnly);
    setTaskEditDueHour(String(hour12));
    setTaskEditDueMinute(String(minute).padStart(2, '0'));
    setTaskEditDueAmPm(ampm);

    setTaskEditForm((prev) => ({ ...prev, dueAtIso: dt.toISOString() }));
  };

  const computeTaskDueIso = (date: Date | null, hourStr: string, minuteStr: string, ampm: 'AM' | 'PM') => {
    if (!date) return '';
    const hour12 = parseInt(hourStr || '', 10);
    const minute = parseInt(minuteStr || '', 10);
    if (!hour12 || Number.isNaN(minute)) return '';

    const hour24 = ampm === 'PM' ? ((hour12 % 12) + 12) : (hour12 % 12);
    const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minute, 0, 0);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString();
  };

  const formatFromToLine = (item: any) => {
    if (!item || !['CALL', 'SMS', 'EMAIL'].includes(item.type)) return null;

    const direction = item.direction ? String(item.direction).toUpperCase() : 'UNKNOWN';
    const meta = (item as any)?.metadata || {};
    const fromVal = meta?.from ?? 'Unknown';
    const toValRaw = meta?.to ?? 'Unknown';
    const toVal =
      Array.isArray(toValRaw) ? toValRaw.filter(Boolean).join(', ') : String(toValRaw || 'Unknown');

    return `${direction} • From: ${String(fromVal || 'Unknown')} → To: ${toVal}`;
  };

  const canEditNoteItem = (item: any) => {
    if (item.type !== 'NOTE') return false;
    const userId = currentUser?.id;
    const roles = currentUser?.roles || [];
    const privileged = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('TC');
    const isAuthor = !!userId && item.createdById === userId;
    return privileged || canEditLead || isAuthor;
  };

  const canEditTaskItem = (item: any) => {
    if (item.type !== 'TASK') return false;
    const userId = currentUser?.id;
    const isAssignee = !!userId && item.assignedToId === userId;
    return canEditLead || isAssignee;
  };

  const openEditNote = (item: any) => {
    setEditingNote(item);
    setEditNoteBody(item.body || '');
  };

  const saveEditedNote = async () => {
    if (!editingNote) return;
    setSavingNoteEdit(true);
    try {
      const response = await makeApiCall(`${API_BASE}/leads/${leadId}/communications/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editNoteBody }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || 'Failed to update note');
      }
      const json = await response.json().catch(() => ({}));
      const updated = (json as any)?.data || (json as any);
      if (updated?.id) onNoteUpdated?.(updated);
      setEditingNote(null);
      setEditNoteBody('');
      toast({ title: 'Updated', description: 'Note updated' });
      // Ensure UI refresh happens even if caller returns a Promise.
      await Promise.resolve(onRefreshCommunications?.());
      await Promise.resolve(onRefreshTasks?.());
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to update note', variant: 'destructive' });
    } finally {
      setSavingNoteEdit(false);
    }
  };

  const openEditTask = (item: any) => {
    setEditingTask(item);
    const nowPlusOneHour = new Date(Date.now() + 60 * 60 * 1000);
    const baseDate = item?.dueAt ? new Date(item.dueAt) : nowPlusOneHour;
    const initial = Number.isNaN(baseDate.getTime()) ? nowPlusOneHour : baseDate;
    setTaskEditForm({
      title: item.title || '',
      description: item.description || '',
      dueAtIso: initial.toISOString(),
      assignedToId: item.assignedToId || '',
      status: item.status || 'OPEN',
    });
    setTaskEditDueFromDateTime(initial);
    setTaskEditDuePickerOpen(false);
  };

  const saveEditedTask = async () => {
    if (!editingTask) return;
    setSavingTaskEdit(true);
    try {
      const payload: any = {
        title: taskEditForm.title,
        description: taskEditForm.description,
        status: taskEditForm.status,
      };
      if (taskEditForm.dueAtIso) payload.dueAt = taskEditForm.dueAtIso;
      payload.assignedToId = taskEditForm.assignedToId || null;

      const response = await makeApiCall(`${API_BASE}/leads/${leadId}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || 'Failed to update task');
      }
      const json = await response.json().catch(() => ({}));
      const updated = (json as any)?.data || (json as any);
      if (updated?.id) onTaskUpdated?.(updated);
      toast({ title: 'Updated', description: 'Task updated' });
      setEditingTask(null);
      setTaskEditDuePickerOpen(false);
      await Promise.resolve(onRefreshTasks?.());
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to update task', variant: 'destructive' });
    } finally {
      setSavingTaskEdit(false);
    }
  };
  
  // Load users for @ mentions (all active users)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await makeApiCall(`${API_BASE}/agents`);
        if (response.ok) {
          const data = await response.json();
          const allUsers = data.data || [];

          const activeUsers = allUsers
            .filter((u: any) => (u?.status ? String(u.status).toLowerCase() === 'active' : true))
            .map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }))
            .filter((u: any) => u?.id && u?.firstName && u?.lastName);

          setUsers(activeUsers);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  const loadRecording = async (recordingSid: string) => {
    if (!recordingSid) return;
    if (recordingUrls[recordingSid]) return;
    if (recordingLoading[recordingSid]) return;

    setRecordingLoading((p) => ({ ...p, [recordingSid]: true }));
    try {
      const resp = await makeApiCall(`${API_BASE}/calls/recordings/${recordingSid}`);
      if (!resp.ok) throw new Error('Failed to load recording');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setRecordingUrls((p) => ({ ...p, [recordingSid]: url }));
    } catch {
      // Best-effort; keep UI usable even if recording can't be fetched
    } finally {
      setRecordingLoading((p) => ({ ...p, [recordingSid]: false }));
    }
  };
  
  // Auto-load all recordings when communications change
  useEffect(() => {
    communications.forEach((comm) => {
      if (comm.type === 'CALL' && (comm as any)?.metadata?.recordingSid) {
        loadRecording((comm as any).metadata.recordingSid);
      }
    });
  }, [communications]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      Object.values(recordingUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
    };
  }, [recordingUrls]);

  // Merge communications and tasks into one array
  // Filter out auto-generated mention tasks (they only appear in Inbox, not in lead communications)
  const filteredTasks = tasks.filter(task => 
    !task.title?.startsWith('Review note on ')
  );
  
  const allItems = [
    ...communications,
    ...filteredTasks.map(task => ({
      id: task.id,
      type: 'TASK' as const,
      title: task.title,
      description: task.description,
      status: task.status,
      dueAt: task.dueAt,
      occurredAt: task.createdAt || task.dueAt,
      createdAt: task.createdAt,
      assignedTo: task.assignedTo,
      user: task.createdBy,
      assignedToId: task.assignedToId,
    }))
  ];

  // Sort all items by timestamp (oldest first - newest at bottom)
  const sortedItems = allItems.sort((a, b) => {
    const dateA = new Date(a.occurredAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.occurredAt || b.createdAt || 0).getTime();
    return dateA - dateB;
  });

  // Auto-scroll to bottom on initial load (when entering lead)
  useEffect(() => {
    if (loadingCommunications) return;
    if (didInitialScrollRef.current) return;
    if (!feedRef.current) return;

    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      if (!feedRef.current) return;
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    });
  }, [loadingCommunications, sortedItems.length]);

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
  };
  
  const handleNoteInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNoteText(value);
    setCursorPosition(cursorPos);

    // Detect mention query near cursor (supports "@S" or "@Sam F" etc.)
    const textBeforeCursor = value.substring(0, cursorPos);
    const re = /(^|\s)@([^\n@]{0,30})$/;
    const match = re.exec(textBeforeCursor);

    if (match) {
      const atIndex = (match.index ?? 0) + match[1].length;
      const query = (match[2] || '').trim().toLowerCase();
      setMentionAtIndex(atIndex);
      setMentionSearchTerm(query);
      setShowUserDropdown(true);
      return;
    }

    setMentionAtIndex(null);
    setShowUserDropdown(false);
  };
  
  const handleUserSelect = (user: {id: string; firstName: string; lastName: string}) => {
    const textAfterCursor = noteText.substring(cursorPosition);

    const start = mentionAtIndex ?? noteText.substring(0, cursorPosition).lastIndexOf('@');
    if (start === null || start < 0) return;

    const beforeAt = noteText.substring(0, start);
    const mention = `@${user.firstName} ${user.lastName}`;
    const newText = beforeAt + mention + ' ' + textAfterCursor;
    setNoteText(newText);
    setShowUserDropdown(false);
    setMentionAtIndex(null);

    // Focus back on textarea
    setTimeout(() => {
      if (noteInputRef.current) {
        noteInputRef.current.focus();
        const newCursorPos = beforeAt.length + mention.length + 1;
        noteInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };
  
  const filteredUsers = users
    .filter((user) => {
      const q = mentionSearchTerm.trim();
      if (!q) return true;

      const tokens = q.split(/\s+/).filter(Boolean);
      const first = user.firstName.toLowerCase();
      const last = user.lastName.toLowerCase();
      const full = `${first} ${last}`;

      // Each token must match the START of first/last/full name (prefix matching)
      return tokens.every((t) => first.startsWith(t) || last.startsWith(t) || full.startsWith(t));
    })
    .sort((a, b) => {
      const an = `${a.firstName} ${a.lastName}`.toLowerCase();
      const bn = `${b.firstName} ${b.lastName}`.toLowerCase();
      return an.localeCompare(bn);
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">Communications</h3>
          <span className="text-xs text-slate-500">({allItems.length})</span>
        </div>
      </div>

      {/* Unified Feed - All Items */}
      <div ref={feedRef} className="flex-1 overflow-y-auto space-y-1 min-h-[300px] max-h-[420px] pr-1 mb-2">
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
            <div key={item.id} className="flex gap-1.5 p-1.5 hover:bg-slate-50 rounded border-b border-slate-100">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getIconForType(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      {getTypeLabel(item.type)}
                    </span>
                    {item.user && (
                      <span className="text-xs font-medium text-slate-900">
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(item.occurredAt || item.createdAt || '')}
                    </span>
                    {(canEditNoteItem(item) || canEditTaskItem(item)) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        title={item.type === 'NOTE' ? 'Edit note' : 'Edit'}
                        onClick={() => {
                          if (item.type === 'NOTE') openEditNote(item);
                          if (item.type === 'TASK') openEditTask(item);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Direction + From/To (CALL/SMS/EMAIL) */}
                {formatFromToLine(item) && (
                  <div className="text-[10px] text-slate-500 mb-1">
                    {formatFromToLine(item)}
                  </div>
                )}

                {/* Task Title */}
                {item.type === 'TASK' && item.title && (
                  <p className="text-xs font-medium text-slate-900 mb-0.5">
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
                  <p className="text-xs font-medium text-slate-700 mb-0.5">
                    {item.subject}
                  </p>
                )}

                {/* Body / Description */}
                {(item.body || item.description) && (
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">
                    {item.body || item.description}
                  </p>
                )}

                {/* Voicemail / Call recording playback (CALL only) */}
                {item.type === 'CALL' && (item as any)?.metadata?.recordingSid && (
                  <div className="mt-1.5 rounded border border-slate-200 bg-white p-1.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold">
                          {(item as any)?.metadata?.isVoicemail ? 'Voicemail' : 'Call recording'}
                        </span>
                        {Number((item as any)?.metadata?.recordingDuration || 0) ? (
                          <span className="ml-2">({Number((item as any)?.metadata?.recordingDuration || 0)}s)</span>
                        ) : null}
                      </div>
                      {recordingLoading[(item as any)?.metadata?.recordingSid] && (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      )}
                    </div>

                    {recordingUrls[(item as any)?.metadata?.recordingSid] && (
                      <audio
                        className="w-full"
                        controls
                        src={recordingUrls[(item as any)?.metadata?.recordingSid]}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Note Input Box - Always Visible */}
      <div className="border-t border-slate-200 pt-2 bg-white">
        <div className="relative mb-2">
          <Textarea
            ref={noteInputRef}
            value={noteText}
            onChange={handleNoteInputChange}
            placeholder="Add a note... (Type @ to mention someone)"
            className="min-h-[60px] text-sm resize-none pr-12"
            disabled={addingNote}
          />
          <Button
            onClick={handleAddNote}
            disabled={addingNote || !noteText.trim()}
            size="sm"
            className="absolute bottom-2 right-2 h-8 px-3"
          >
            {addingNote ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
          
          {/* User Mention Dropdown */}
          {showUserDropdown && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{user.firstName} {user.lastName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-1">
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
            {/* Phone Number Selector - Show if multiple numbers available */}
            {availablePhoneNumbers && availablePhoneNumbers.length > 1 && (
              <div>
                <Label htmlFor="sms-phone">Phone Number</Label>
                <Select value={selectedSMSPhone} onValueChange={onSMSPhoneChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select phone number..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePhoneNumbers.map((phone, idx) => (
                      <SelectItem key={idx} value={phone.number}>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <div className="flex flex-col">
                            <span className="font-medium">{phone.label}</span>
                            <span className="text-xs text-gray-500">{phone.number}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Show selected phone if only one number */}
            {availablePhoneNumbers && availablePhoneNumbers.length === 1 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{availablePhoneNumbers[0].number}</span>
              </div>
            )}
            
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
            {/* Email Address Selector - Show if multiple emails available */}
            {availableEmailAddresses && availableEmailAddresses.length > 1 && (
              <div>
                <Label htmlFor="email-address">Email Address</Label>
                <Select value={selectedEmail} onValueChange={onEmailChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select email address..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmailAddresses.map((email, idx) => (
                      <SelectItem key={idx} value={email.email}>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <div className="flex flex-col">
                            <span className="font-medium">{email.label}</span>
                            <span className="text-xs text-gray-500">{email.email}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Show selected email if only one email */}
            {availableEmailAddresses && availableEmailAddresses.length === 1 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{availableEmailAddresses[0].email}</span>
              </div>
            )}
            
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
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim() || !selectedEmail}
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

      {/* Edit Note Dialog */}
      <Dialog
        open={!!editingNote}
        onOpenChange={(open) => {
          if (!open) {
            setEditingNote(null);
            setEditNoteBody('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>Update the note body (mentions will be re-processed).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Note</Label>
            <Textarea
              value={editNoteBody}
              onChange={(e) => setEditNoteBody(e.target.value)}
              className="min-h-[140px]"
              disabled={savingNoteEdit}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingNote(null)} disabled={savingNoteEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEditedNote} disabled={savingNoteEdit}>
              {savingNoteEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-sm">Title</Label>
              <Input
                value={taskEditForm.title}
                onChange={(e) => setTaskEditForm((p) => ({ ...p, title: e.target.value }))}
                disabled={savingTaskEdit}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={taskEditForm.description}
                onChange={(e) => setTaskEditForm((p) => ({ ...p, description: e.target.value }))}
                className="min-h-[110px]"
                disabled={savingTaskEdit}
              />
            </div>
            <div>
              <Label className="text-sm">Due</Label>
              <Popover open={taskEditDuePickerOpen} onOpenChange={setTaskEditDuePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={savingTaskEdit}
                  >
                    {formatTaskDueDisplay(taskEditForm.dueAtIso)}
                    <Calendar className="w-4 h-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-3">
                    <UiCalendar
                      mode="single"
                      selected={taskEditDueDate || undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setTaskEditDueDate(d);
                        const iso = computeTaskDueIso(d, taskEditDueHour, taskEditDueMinute, taskEditDueAmPm);
                        if (iso) setTaskEditForm((p) => ({ ...p, dueAtIso: iso }));
                      }}
                      initialFocus
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Hour</Label>
                        <Select
                          value={taskEditDueHour}
                          onValueChange={(v) => {
                            setTaskEditDueHour(v);
                            const iso = computeTaskDueIso(taskEditDueDate, v, taskEditDueMinute, taskEditDueAmPm);
                            if (iso) setTaskEditForm((p) => ({ ...p, dueAtIso: iso }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => {
                              const hour = String(i + 1);
                              return (
                                <SelectItem key={hour} value={hour}>
                                  {hour}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Minute</Label>
                        <Select
                          value={taskEditDueMinute}
                          onValueChange={(v) => {
                            setTaskEditDueMinute(v);
                            const iso = computeTaskDueIso(taskEditDueDate, taskEditDueHour, v, taskEditDueAmPm);
                            if (iso) setTaskEditForm((p) => ({ ...p, dueAtIso: iso }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => {
                              const m = String(i * 5).padStart(2, '0');
                              return (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">AM/PM</Label>
                        <Select
                          value={taskEditDueAmPm}
                          onValueChange={(v: 'AM' | 'PM') => {
                            setTaskEditDueAmPm(v);
                            const iso = computeTaskDueIso(taskEditDueDate, taskEditDueHour, taskEditDueMinute, v);
                            if (iso) setTaskEditForm((p) => ({ ...p, dueAtIso: iso }));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setTaskEditDuePickerOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <Select
                value={taskEditForm.status}
                onValueChange={(value) => setTaskEditForm((p) => ({ ...p, status: value }))}
              >
                <SelectTrigger disabled={savingTaskEdit}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="DONE">DONE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-sm">Assigned To</Label>
              <Select
                value={taskEditForm.assignedToId || 'unassigned'}
                onValueChange={(value) => setTaskEditForm((p) => ({ ...p, assignedToId: value === 'unassigned' ? '' : value }))}
              >
                <SelectTrigger disabled={savingTaskEdit}>
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingTask(null)} disabled={savingTaskEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEditedTask} disabled={savingTaskEdit}>
              {savingTaskEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
