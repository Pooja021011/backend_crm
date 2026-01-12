import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, User, Voicemail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IncomingCallInfo } from '@/hooks/useTwilioDevice';
import { API_BASE, makeApiCall } from '@/config/api';
import { formatUsPhoneForDisplay } from '@/utils/phone';

interface CallWaitingPopupProps {
  incomingCall: IncomingCallInfo;
  onSendToVoicemail: () => void;
  onIgnore: () => void;
  currentCallDuration: number;
}

interface LeadInfo {
  id: string;
  name: string;
  address?: string;
  leadType?: string;
}

export const CallWaitingPopup: React.FC<CallWaitingPopupProps> = ({
  incomingCall,
  onSendToVoicemail,
  onIgnore,
  currentCallDuration
}) => {
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch lead information based on phone number
  useEffect(() => {
    const fetchLeadInfo = async () => {
      try {
        const phoneNumber = incomingCall.from;
        
        // Try to find the lead by phone number
        const response = await makeApiCall(
          `${API_BASE}/leads/search?phone=${encodeURIComponent(phoneNumber)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.lead) {
            const lead = data.lead;
            setLeadInfo({
              id: lead.id,
              name: lead.seller 
                ? `${lead.seller.firstName} ${lead.seller.lastName}`
                : lead.buyer
                ? `${lead.buyer.firstName} ${lead.buyer.lastName}`
                : 'Unknown Contact',
              address: lead.address 
                ? `${lead.address.address1}, ${lead.address.city}, ${lead.address.state}`
                : undefined,
              leadType: lead.leadType,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching lead info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadInfo();
  }, [incomingCall.from]);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
        {/* Warning indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-yellow-100 border-2 border-yellow-500 rounded-full p-4">
            <Phone className="w-8 h-8 text-yellow-600 animate-pulse" />
          </div>
        </div>

        {/* Current call status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 font-medium">Current call in progress</span>
            <div className="flex items-center gap-1 text-blue-600">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-semibold">{formatDuration(currentCallDuration)}</span>
            </div>
          </div>
        </div>

        {/* Incoming call info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Incoming Call Waiting
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span>Loading caller info...</span>
            </div>
          ) : leadInfo ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-800">
                <User className="w-5 h-5" />
                <span>{leadInfo.name}</span>
              </div>
              {leadInfo.address && (
                <p className="text-sm text-gray-600">{leadInfo.address}</p>
              )}
              {leadInfo.leadType && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {leadInfo.leadType}
                </span>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {formatUsPhoneForDisplay(incomingCall.from)}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-gray-800">
                Unknown Caller
              </p>
              <p className="text-sm text-gray-600">
                {formatUsPhoneForDisplay(incomingCall.from)}
              </p>
            </div>
          )}
        </div>

        {/* Warning message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-800 text-center">
            You are currently on a call. Choose how to handle this incoming call.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            onClick={onSendToVoicemail}
            size="lg"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Voicemail className="w-5 h-5 mr-2" />
            Send to Voicemail
          </Button>
          
          <Button
            onClick={onIgnore}
            variant="outline"
            size="lg"
            className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Ignore (Keep Ringing)
          </Button>
        </div>

        {/* Note: Call hold/switch feature can be added later */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Note: Call switching will be available in a future update
        </p>

        {/* Lead link if available */}
        {leadInfo && (
          <div className="mt-4 text-center">
            <a
              href={`/leads/${leadInfo.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View Lead Details →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
