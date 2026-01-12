import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IncomingCallInfo } from '@/hooks/useTwilioDevice';
import { API_BASE, makeApiCall } from '@/config/api';
import { formatUsPhoneForDisplay } from '@/utils/phone';

interface IncomingCallPopupProps {
  incomingCall: IncomingCallInfo;
  onAnswer: () => void;
  onReject: () => void;
}

interface LeadInfo {
  id: string;
  name: string;
  address?: string;
  leadType?: string;
}

export const IncomingCallPopup: React.FC<IncomingCallPopupProps> = ({
  incomingCall,
  onAnswer,
  onReject,
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
        {/* Pulsing phone icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-green-500 rounded-full p-6">
              <Phone className="w-12 h-12 text-white animate-bounce" />
            </div>
          </div>
        </div>

        {/* Incoming call text */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Incoming Call
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

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={onReject}
            variant="outline"
            size="lg"
            className="flex-1 border-2 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-600"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Reject
          </Button>
          
          <Button
            onClick={onAnswer}
            size="lg"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <Phone className="w-5 h-5 mr-2" />
            Answer
          </Button>
        </div>

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

