import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

export interface CallStatus {
  status: 'idle' | 'connecting' | 'ringing' | 'connected' | 'disconnected';
  duration: number;
  error?: string;
}

export const useTwilioDevice = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>({
    status: 'idle',
    duration: 0,
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

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

      // Create Twilio Device with basic audio constraints
      const newDevice = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        edge: 'ashburn', // Use closest edge location
        // Simplified audio constraints for better compatibility
        sounds: {
          incoming: false,
          outgoing: false,
          disconnect: false
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
        console.log('Incoming call:', call);
        // Handle incoming calls if needed
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
      const isMuted = activeCall.isMuted();
      activeCall.mute(!isMuted);
      return !isMuted;
    }
    return false;
  }, [activeCall]);

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
    isInitializing,
    initializeDevice,
    makeCall,
    hangUp,
    toggleMute,
  };
};

