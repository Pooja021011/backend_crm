import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Clock, Mail, Phone, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallStatus } from '@/hooks/useTwilioDevice';
import { API_BASE, makeApiCall } from '@/config/api';
import { useNavigate } from 'react-router-dom';
import { useTwilioContext } from '@/contexts/TwilioContext';

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

type ResolvedLeadInfo = {
  leadId: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export const ActiveCallWidget: React.FC<ActiveCallWidgetProps> = ({
  callStatus,
  isMuted,
  onHangUp,
  onToggleMute,
  contactInfo,
}) => {
  const navigate = useNavigate();
  const { activeCall } = useTwilioContext();
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [resolvedLead, setResolvedLead] = useState<ResolvedLeadInfo | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isDialerExpanded, setIsDialerExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Draggable positioning (fixed)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    // initial: approximate top-right
    const margin = 24;
    const approxWidth = 240;
    return { x: Math.max(margin, window.innerWidth - approxWidth - margin), y: margin };
  });
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    width: number;
    height: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    width: 0,
    height: 0,
  });

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);

  const clampToViewport = (x: number, y: number, w: number, h: number) => {
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    return {
      x: Math.min(Math.max(x, margin), maxX),
      y: Math.min(Math.max(y, margin), maxY),
    };
  };

  // Keep widget within viewport on resize
  useEffect(() => {
    const onResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos(prev => clampToViewport(prev.x, prev.y, rect.width, rect.height));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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

  const phoneNumber = contactInfo?.phoneNumber || '';
  const leadId = contactInfo?.leadId || '';

  const hasLeadHint = Boolean(leadId) || Boolean(phoneNumber);
  
  // Check if this is an outbound call (outbound calls have leadId)
  const isOutboundCall = Boolean(leadId);
  
  // Send DTMF digit during call
  const sendDigit = (digit: string) => {
    if (activeCall && callStatus.status === 'connected') {
      try {
        activeCall.sendDigits(digit);
        console.log(`📞 Sent DTMF digit: ${digit}`);
      } catch (error) {
        console.error('Failed to send digit:', error);
      }
    }
  };

  const display = useMemo(() => {
    const name = resolvedLead?.name || contactInfo?.name || undefined;
    const phone = resolvedLead?.phone || phoneNumber || undefined;
    const email = resolvedLead?.email || undefined;
    const address = resolvedLead?.address || undefined;
    const id = resolvedLead?.leadId || leadId || undefined;
    return { id, name, phone, email, address };
  }, [resolvedLead, contactInfo?.name, phoneNumber, leadId]);

  const extractLeadInfo = (lead: any): ResolvedLeadInfo | null => {
    if (!lead?.id) return null;

    const contact = lead.seller || lead.buyer || lead.vendor || {};
    const firstName = contact.firstName || '';
    const lastName = contact.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || undefined;

    const address = lead.address?.address1
      ? `${lead.address.address1}${lead.address.city ? `, ${lead.address.city}` : ''}${lead.address.state ? `, ${lead.address.state}` : ''}`
      : undefined;

    return {
      leadId: lead.id,
      name,
      phone: contact.phone || undefined,
      email: contact.email || undefined,
      address,
    };
  };

  useEffect(() => {
    // Fetch only when connected (answered) and we have a hint; avoid re-fetch loops.
    if (callStatus.status !== 'connected') return;
    if (!hasLeadHint) return;

    let cancelled = false;

    const fetchLead = async () => {
      try {
        setLeadError(null);
        setLeadLoading(true);

        // Prefer leadId when available (outbound calls)
        if (leadId) {
          const resp = await makeApiCall(`${API_BASE}/leads/${leadId}`);
          if (!resp.ok) throw new Error('Failed to load lead');
          const data = await resp.json();
          const lead = data?.data;
          const extracted = extractLeadInfo(lead);
          if (!cancelled) setResolvedLead(extracted);
          return;
        }

        // Otherwise best-effort resolve by phone (inbound calls)
        if (phoneNumber) {
          const resp = await makeApiCall(
            `${API_BASE}/leads/search?phone=${encodeURIComponent(phoneNumber)}`
          );
          if (!resp.ok) throw new Error('Failed to search lead');
          const data = await resp.json();
          const lead = data?.lead;
          const extracted = extractLeadInfo(lead);
          if (!cancelled) setResolvedLead(extracted);
        }
      } catch (e: any) {
        if (!cancelled) {
          setResolvedLead(null);
          setLeadError(e?.message || 'Failed to load lead info');
        }
      } finally {
        if (!cancelled) setLeadLoading(false);
      }
    };

    fetchLead();

    return () => {
      cancelled = true;
    };
    // We intentionally depend on leadId/phoneNumber only; status gates fetch to connected.
  }, [callStatus.status, leadId, phoneNumber, hasLeadHint]);

  return (
    <div
      ref={containerRef}
      className="fixed bg-white rounded-xl shadow-lg border border-gray-200 p-2 w-60 z-[9999] cursor-grab active:cursor-grabbing"
      style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      onPointerDown={(e) => {
        // Allow normal interaction with controls/links without dragging.
        const target = e.target as HTMLElement | null;
        if (target?.closest('button') || target?.closest('a')) {
          // Note: address is a button; it should still be clickable.
          // If user wants to drag, they can start dragging from any empty space.
          return;
        }

        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();

        dragRef.current = {
          dragging: true,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: rect.left,
          startTop: rect.top,
          width: rect.width,
          height: rect.height,
        };

        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.dragging) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const next = clampToViewport(
          dragRef.current.startLeft + dx,
          dragRef.current.startTop + dy,
          dragRef.current.width,
          dragRef.current.height
        );
        setPos(next);
      }}
      onPointerUp={() => {
        dragRef.current.dragging = false;
      }}
    >
      {/* Status Badge */}
      <div className={`flex items-center justify-center gap-1.5 mb-2 ${status.color}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${callStatus.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
        <span className="text-xs font-semibold uppercase tracking-wide">{status.text}</span>
      </div>

      {/* Lead Info */}
      <div className="mb-2 text-center space-y-1">
        {display.address && display.id ? (
          <button
            type="button"
            onClick={() => navigate(`/leads/${display.id}/edit`)}
            className="w-full text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline truncate"
            title={display.address}
          >
            {display.address}
          </button>
        ) : display.address ? (
          <div className="text-xs font-semibold text-gray-800 truncate" title={display.address}>
            {display.address}
          </div>
        ) : null}

        {display.name ? (
          <div className="text-sm font-bold text-gray-900 truncate" title={display.name}>
            {display.name}
          </div>
        ) : null}

        <div className="space-y-0.5">
          {display.phone ? (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-700 font-mono">
              <Phone className="w-3 h-3" />
              <span className="truncate" title={display.phone}>
                {display.phone}
              </span>
            </div>
          ) : null}

          {!display.name && !display.phone && !display.address ? (
            <div className="text-xs text-gray-600">
              {leadLoading ? 'Loading lead…' : phoneNumber ? phoneNumber : 'Unknown'}
            </div>
          ) : null}
        </div>
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

          {/* Dialer Button - Only show for outbound calls when connected */}
          {isOutboundCall && callStatus.status === 'connected' && (
            <Button
              onClick={() => setIsDialerExpanded(!isDialerExpanded)}
              variant="outline"
              size="sm"
              className={`flex-1 text-xs ${
                isDialerExpanded
                  ? 'border border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'border border-gray-300 hover:border-gray-400'
              }`}
            >
              <Grid3x3 className="w-3 h-3 mr-1" />
              Dialer
            </Button>
          )}

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

        {/* Dial Pad - Expandable for outbound calls */}
        {isOutboundCall && callStatus.status === 'connected' && isDialerExpanded && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-3 gap-2">
              {/* Dial pad buttons: 1-9, *, 0, # */}
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <Button
                  key={digit}
                  onClick={() => sendDigit(digit)}
                  variant="outline"
                  size="sm"
                  className="h-10 w-full text-sm font-semibold hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100"
                  disabled={!activeCall}
                >
                  {digit}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {(callStatus.error || leadError) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-600 text-center">{callStatus.error || leadError}</p>
        </div>
      )}
    </div>
  );
};

