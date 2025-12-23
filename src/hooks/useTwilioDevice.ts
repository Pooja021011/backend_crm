import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

export interface CallStatus {
  status: 'idle' | 'connecting' | 'ringing' | 'connected' | 'disconnected';
  duration: number;
  error?: string;
}

export interface IncomingCallInfo {
  call: Call;
  from: string;
  callSid: string;
  customParameters?: Record<string, string>;
}

export const useTwilioDevice = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>({
    status: 'idle',
    duration: 0,
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize ringtone
  useEffect(() => {
    // Create ringtone audio element
    const ringtone = new Audio();
    // Using a data URI for a simple ringtone (beep sound)
    // This is a short sine wave beep that repeats
    ringtone.src = 'data:audio/wav;base64,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';
    ringtone.loop = true;
    ringtone.volume = 0.5;
    ringtoneRef.current = ringtone;

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, []);

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    if (device) return device;

    setIsInitializing(true);
    try {
      // Get access token from backend
      const response = await makeApiCall(`${API_BASE}/calls/token`);
      
      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      const token = data.token;

      // Test microphone access first before creating Device
      console.log('🎤 Testing microphone access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        console.log('✅ Microphone access granted');
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
      } catch (micError: any) {
        console.error('❌ Microphone test failed:', micError);
        throw new Error(`Microphone not accessible: ${micError.message}`);
      }

      // Create Twilio Device with minimal constraints
      const newDevice = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        edge: 'ashburn',
        sounds: {
          incoming: false,
          outgoing: false,
          disconnect: false
        },
        // Let browser use default audio settings
        audioConstraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Device event listeners
      newDevice.on('registered', () => {
        console.log('Twilio Device registered');
      });

      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
        toast({
          title: 'Device Error',
          description: error.message || 'Failed to initialize calling device',
          variant: 'destructive',
        });
      });

      newDevice.on('incoming', (call) => {
        console.log('📞 Incoming call received:', call);
        
        // Get call parameters
        const params = call.parameters;
        const from = params.From || 'Unknown';
        const callSid = call.parameters.CallSid || '';
        
        console.log('Incoming call from:', from, 'CallSid:', callSid);
        
        // Play ringtone
        if (ringtoneRef.current) {
          ringtoneRef.current.play().catch(err => {
            console.error('Failed to play ringtone:', err);
          });
        }
        
        // Set incoming call state
        setIncomingCall({
          call,
          from,
          callSid,
          customParameters: params
        });
        
        // Show toast notification
        toast({
          title: '📞 Incoming Call',
          description: `Call from ${from}`,
          duration: 10000,
        });
      });

      // Register the device
      await newDevice.register();
      setDevice(newDevice);
      setIsInitializing(false);
      
      console.log('✅ Twilio Device initialized and registered successfully');
      return newDevice;
    } catch (error: any) {
      console.error('❌ Error initializing device:', error);
      setIsInitializing(false);
      
      let errorMessage = 'Could not initialize calling device';
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'AcquisitionFailedError') {
        errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
      } else if (error.code === 31402) {
        errorMessage = 'Could not access microphone. Please check:\n1. Microphone is connected\n2. No other app is using it\n3. Browser has permission';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      toast({
        title: 'Initialization Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [device, toast]);

  // Make a call
  const makeCall = useCallback(async (phoneNumber: string) => {
    try {
      let deviceToUse = device;
      
      if (!deviceToUse) {
        deviceToUse = await initializeDevice();
        if (!deviceToUse) {
          throw new Error('Failed to initialize device');
        }
      }

      setCallStatus({ status: 'connecting', duration: 0 });

      // Make the call
      const call = await deviceToUse.connect({
        params: {
          To: phoneNumber,
        },
      });

      setActiveCall(call);

      // Call event listeners
      call.on('accept', () => {
        console.log('Call accepted');
        setCallStatus({ status: 'connected', duration: 0 });
        
        // Start duration counter
        let seconds = 0;
        durationIntervalRef.current = setInterval(() => {
          seconds++;
          setCallStatus(prev => ({ ...prev, duration: seconds }));
        }, 1000);

        toast({
          title: 'Call Connected',
          description: 'You are now connected',
        });
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus({ status: 'disconnected', duration: 0 });
        setActiveCall(null);
        
        // Clear duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        toast({
          title: 'Call Ended',
          description: 'The call has been disconnected',
        });
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        setCallStatus({ status: 'idle', duration: 0 });
        setActiveCall(null);
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      });

      call.on('reject', () => {
        console.log('Call rejected');
        setCallStatus({ status: 'idle', duration: 0 });
        setActiveCall(null);
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        toast({
          title: 'Call Rejected',
          description: 'The call was rejected',
          variant: 'destructive',
        });
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
        setCallStatus({ 
          status: 'idle', 
          duration: 0,
          error: error.message 
        });
        setActiveCall(null);
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        toast({
          title: 'Call Error',
          description: error.message || 'An error occurred during the call',
          variant: 'destructive',
        });
      });

      call.on('ringing', () => {
        console.log('Call ringing');
        setCallStatus({ status: 'ringing', duration: 0 });
      });

    } catch (error: any) {
      console.error('Error making call:', error);
      setCallStatus({ 
        status: 'idle', 
        duration: 0,
        error: error.message 
      });
      
      toast({
        title: 'Call Failed',
        description: error.message || 'Could not place the call',
        variant: 'destructive',
      });
    }
  }, [device, initializeDevice, toast]);

  // Hang up call
  const hangUp = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setCallStatus({ status: 'idle', duration: 0 });
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [activeCall]);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      const currentMuteState = activeCall.isMuted();
      activeCall.mute(!currentMuteState);
      setIsMuted(!currentMuteState);
      return !currentMuteState;
    }
    return false;
  }, [activeCall]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log('📞 Answering incoming call');
      
      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      
      const call = incomingCall.call;
      
      // Log to backend that call was answered
      try {
        await makeApiCall(`${API_BASE}/calls/log-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSid: incomingCall.callSid,
            from: incomingCall.from,
            action: 'answered'
          })
        });
      } catch (logError) {
        console.error('Failed to log call answer:', logError);
        // Continue anyway - don't block the call
      }
      
      // Accept the call
      call.accept();
      
      // Set as active call
      setActiveCall(call);
      setIncomingCall(null);
      setCallStatus({ status: 'connected', duration: 0 });
      
      // Start duration counter
      let seconds = 0;
      durationIntervalRef.current = setInterval(() => {
        seconds++;
        setCallStatus(prev => ({ ...prev, duration: seconds }));
      }, 1000);

      // Setup call event listeners
      call.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus({ status: 'disconnected', duration: 0 });
        setActiveCall(null);
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        toast({
          title: 'Call Ended',
          description: 'The call has been disconnected',
        });
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
        setCallStatus({ 
          status: 'idle', 
          duration: 0,
          error: error.message 
        });
        setActiveCall(null);
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        toast({
          title: 'Call Error',
          description: error.message || 'An error occurred during the call',
          variant: 'destructive',
        });
      });

      toast({
        title: 'Call Connected',
        description: 'You are now connected',
      });

    } catch (error: any) {
      console.error('Error answering call:', error);
      setIncomingCall(null);
      
      toast({
        title: 'Failed to Answer',
        description: error.message || 'Could not answer the call',
        variant: 'destructive',
      });
    }
  }, [incomingCall, toast]);

  // Reject incoming call
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log('📞 Rejecting incoming call');
      
      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      
      // Log to backend that call was rejected
      try {
        await makeApiCall(`${API_BASE}/calls/log-reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSid: incomingCall.callSid,
            from: incomingCall.from,
            action: 'rejected'
          })
        });
      } catch (logError) {
        console.error('Failed to log call rejection:', logError);
        // Continue anyway
      }
      
      incomingCall.call.reject();
      setIncomingCall(null);
      
      toast({
        title: 'Call Rejected',
        description: 'The incoming call was rejected',
      });
    } catch (error: any) {
      console.error('Error rejecting call:', error);
      setIncomingCall(null);
    }
  }, [incomingCall, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (activeCall) {
        activeCall.disconnect();
      }
      if (device) {
        device.unregister();
        device.destroy();
      }
    };
  }, []);

  return {
    device,
    activeCall,
    callStatus,
    incomingCall,
    isInitializing,
    isMuted,
    initializeDevice,
    makeCall,
    hangUp,
    toggleMute,
    answerCall,
    rejectCall,
  };
};

