import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, User, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CallStatus } from '@/hooks/useTwilioDevice';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface ActiveCallWidgetProps {
  callStatus: CallStatus;
  isMuted: boolean;
  onHangUp: () => void;
  onToggleMute: () => void;
  contactInfo?: {
    name?: string;
    phoneNumber?: string;
    leadId?: string;
    callSid?: string;
  };
}

export const ActiveCallWidget: React.FC<ActiveCallWidgetProps> = ({
  callStatus,
  isMuted,
  onHangUp,
  onToggleMute,
  contactInfo,
}) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNotesRef = useRef('');
  const hasUnsavedChanges = useRef(false);
  // Save notes to backend
  const saveNotes = useCallback(async (notesToSave: string, isImmediate = false) => {
    if (!notesToSave.trim() || !contactInfo?.phoneNumber) {
      return;
    }

    // Don't save if notes haven't changed
    if (notesToSave === lastSavedNotesRef.current && !isImmediate) {
      return;
    }

    try {
      setIsSaving(true);
      await makeApiCall(`${API_BASE}/calls/save-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: contactInfo?.leadId,
          phoneNumber: contactInfo.phoneNumber,
          notes: notesToSave,
          callSid: contactInfo?.callSid
        })
      });
      
      lastSavedNotesRef.current = notesToSave;
      hasUnsavedChanges.current = false;
      
      if (isImmediate) {
        toast({
          title: 'Notes Saved',
          description: 'Call notes have been saved successfully',
        });
      }
    } catch (error) {
      console.error('Failed to save call notes:', error);
      toast({
        title: 'Failed to Save Notes',
        description: 'Could not save call notes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [contactInfo, toast]);

  // Auto-save notes with debounce
  useEffect(() => {
    if (notes.trim() && notes !== lastSavedNotesRef.current) {
      hasUnsavedChanges.current = true;
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save (2 seconds after typing stops)
      saveTimeoutRef.current = setTimeout(() => {
        saveNotes(notes);
      }, 2000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, saveNotes]);

  // Save notes when call ends
  useEffect(() => {
    return () => {
      // Component unmounting (call ended) - save any unsaved notes immediately
      if (hasUnsavedChanges.current && notes.trim()) {
        // Use sync API or navigator.sendBeacon for guaranteed delivery
        if (navigator.sendBeacon && contactInfo?.phoneNumber) {
          const data = JSON.stringify({
            leadId: contactInfo?.leadId,
            phoneNumber: contactInfo.phoneNumber,
            notes: notes,
            callSid: contactInfo?.callSid
          });
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE}/calls/save-notes`, blob);
        }
      }
    };
  }, [notes, contactInfo]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status text and color
  const getStatusDisplay = () => {
    switch (callStatus.status) {
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-600' };
      case 'ringing':
        return { text: 'Ringing...', color: 'text-blue-600' };
      case 'connected':
        return { text: 'Connected', color: 'text-green-600' };
      case 'disconnected':
        return { text: 'Disconnected', color: 'text-gray-600' };
      default:
        return { text: 'Idle', color: 'text-gray-600' };
    }
  };

  const status = getStatusDisplay();

  // Don't show if not in an active call state
  if (callStatus.status === 'idle' || callStatus.status === 'disconnected') {
    return null;
  }

  return (
    <div className="fixed top-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-80 z-[9999] animate-in slide-in-from-top duration-300">
      {/* Status Badge */}
      <div className={`flex items-center justify-center gap-1.5 mb-2 ${status.color}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${callStatus.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
        <span className="text-xs font-semibold uppercase tracking-wide">{status.text}</span>
      </div>

      {/* Contact Info - More Compact */}
      <div className="text-center mb-2">
        <div className="flex justify-center mb-2">
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-2">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
        
        {contactInfo?.name ? (
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-gray-900">{contactInfo.name}</h3>
            <p className="text-xs text-gray-600">{contactInfo.phoneNumber}</p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-gray-900">{contactInfo?.phoneNumber || 'Unknown'}</p>
        )}
      </div>

      {/* Call Duration - Smaller */}
      {callStatus.status === 'connected' && (
        <div className="flex items-center justify-center gap-1.5 mb-2 text-gray-700">
          <Clock className="w-3 h-3" />
          <span className="text-xs font-mono font-semibold">
            {formatDuration(callStatus.duration)}
          </span>
        </div>
      )}

      {/* Call Controls - More Compact */}
      <div className="space-y-2">
        <div className="flex gap-2 justify-center">
          {/* Notes Toggle Button */}
          <Button
            onClick={() => setShowNotes(!showNotes)}
            variant="outline"
            size="sm"
            className="flex-1 text-xs border border-gray-300 hover:border-gray-400"
          >
            <FileText className="w-3 h-3 mr-1" />
            {showNotes ? 'Hide Notes' : 'Notes'}
          </Button>

          {/* Mute/Unmute Button */}
          <Button
            onClick={onToggleMute}
            variant="outline"
            size="sm"
            className={`flex-1 text-xs ${
              isMuted 
                ? 'border border-red-500 bg-red-50 text-red-600 hover:bg-red-100' 
                : 'border border-gray-300 hover:border-gray-400'
            }`}
            disabled={callStatus.status !== 'connected'}
          >
            {isMuted ? (
              <>
                <MicOff className="w-3 h-3 mr-1" />
                Unmute
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 mr-1" />
                Mute
              </>
            )}
          </Button>

          {/* Hang Up Button */}
          <Button
            onClick={onHangUp}
            size="sm"
            className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white border border-red-600"
          >
            <PhoneOff className="w-3 h-3 mr-1" />
            End
          </Button>
        </div>

        {/* Call Notes Section */}
        {showNotes && (
          <div className="space-y-2 animate-in slide-in-from-top duration-200">
            <div className="relative">
              <Textarea
                placeholder="Add call notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
              />
              {isSaving && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  Saving...
                </div>
              )}
            </div>
            <Button
              onClick={() => saveNotes(notes, true)}
              size="sm"
              variant="outline"
              className="w-full text-xs"
              disabled={!notes.trim() || isSaving}
            >
              Save Notes
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {callStatus.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-600 text-center">{callStatus.error}</p>
        </div>
      )}
    </div>
  );
};

