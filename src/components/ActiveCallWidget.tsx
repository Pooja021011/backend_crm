import React, { useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallStatus } from '@/hooks/useTwilioDevice';

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
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);

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

