import React, { createContext, useContext, ReactNode } from 'react';
import { useTwilioDevice } from '@/hooks/useTwilioDevice';
import type { CallStatus, IncomingCallInfo } from '@/hooks/useTwilioDevice';
import type { Call, Device } from '@twilio/voice-sdk';

interface TwilioContextType {
  device: Device | null;
  activeCall: Call | null;
  callStatus: CallStatus;
  incomingCall: IncomingCallInfo | null;
  isInitializing: boolean;
  isMuted: boolean;
  currentCallNumber: string;
  currentCallLeadId: string;
  initializeDevice: () => Promise<Device | null>;
  makeCall: (phoneNumber: string, leadId?: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => boolean;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  ignoreCall: () => void;
}

const TwilioContext = createContext<TwilioContextType | undefined>(undefined);

export const TwilioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const twilioDevice = useTwilioDevice();

  return (
    <TwilioContext.Provider value={twilioDevice}>
      {children}
    </TwilioContext.Provider>
  );
};

export const useTwilioContext = () => {
  const context = useContext(TwilioContext);
  if (context === undefined) {
    throw new Error('useTwilioContext must be used within a TwilioProvider');
  }
  return context;
};

