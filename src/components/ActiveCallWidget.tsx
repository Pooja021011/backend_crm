import React from 'react';
import { Phone, PhoneOff, Mic, MicOff, User, Clock } from 'lucide-react';
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
  };
}

export const ActiveCallWidget: React.FC<ActiveCallWidgetProps> = ({
  callStatus,
  isMuted,
  onHangUp,
  onToggleMute,
  contactInfo,
}) => {
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
    <div className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-6 w-80 z-[9999] animate-in slide-in-from-bottom duration-300">
      {/* Status Badge */}
      <div className={`flex items-center justify-center gap-2 mb-4 ${status.color}`}>
        <div className={`w-2 h-2 rounded-full ${callStatus.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
        <span className="text-sm font-semibold uppercase tracking-wide">{status.text}</span>
      </div>

      {/* Contact Info */}
      <div className="text-center mb-4">
        <div className="flex justify-center mb-3">
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-4">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {contactInfo?.name ? (
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">{contactInfo.name}</h3>
            <p className="text-sm text-gray-600">{contactInfo.phoneNumber}</p>
          </div>
        ) : (
          <p className="text-lg font-semibold text-gray-900">{contactInfo?.phoneNumber || 'Unknown'}</p>
        )}
      </div>

      {/* Call Duration */}
      {callStatus.status === 'connected' && (
        <div className="flex items-center justify-center gap-2 mb-4 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono font-semibold">
            {formatDuration(callStatus.duration)}
          </span>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex gap-3 justify-center">
        {/* Mute/Unmute Button */}
        <Button
          onClick={onToggleMute}
          variant="outline"
          size="lg"
          className={`flex-1 ${
            isMuted 
              ? 'border-2 border-red-500 bg-red-50 text-red-600 hover:bg-red-100' 
              : 'border-2 border-gray-300 hover:border-gray-400'
          }`}
          disabled={callStatus.status !== 'connected'}
        >
          {isMuted ? (
            <>
              <MicOff className="w-5 h-5 mr-2" />
              Unmute
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Mute
            </>
          )}
        </Button>

        {/* Hang Up Button */}
        <Button
          onClick={onHangUp}
          size="lg"
          className="flex-1 bg-red-500 hover:bg-red-600 text-white border-2 border-red-600"
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          End Call
        </Button>
      </div>

      {/* Error Message */}
      {callStatus.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-center">{callStatus.error}</p>
        </div>
      )}
    </div>
  );
};

