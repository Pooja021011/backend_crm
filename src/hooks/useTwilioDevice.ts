import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { API_BASE, makeApiCall } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

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
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>({
    status: 'idle',
    duration: 0,
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentCallNumber, setCurrentCallNumber] = useState<string>(''); // Track current call number
  const [currentCallLeadId, setCurrentCallLeadId] = useState<string>(''); // Track leadId (best-effort)
  const isOutgoingCallRef = useRef(false); // Track if we initiated the call (using ref for event handlers)
  const lastIdentityRef = useRef<string>(''); // Track which user identity this Device was created for
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const outgoingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const incomingCallRef = useRef<IncomingCallInfo | null>(null);
  const { toast } = useToast();

  const currentIdentityKey = user?.email || user?.id || '';
  const isAuthRoute =
    location.pathname === '/login' ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password');

  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const teardownDevice = useCallback((reason: string, forceDisconnect = false) => {
    try {
      console.log('🧹 Tearing down Twilio Device:', { reason, forceDisconnect });
    } catch {
      // ignore
    }

    // CRITICAL: Don't disconnect active calls unless forced (e.g., explicit logout)
    // This prevents calls from dropping during navigation/tab changes
    if (activeCallRef.current && !forceDisconnect) {
      console.log('⚠️ Active call in progress - skipping teardown to preserve call');
      return;
    }

    // Stop timers & audio first
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (ringtoneRef.current) {
      try {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }

    // Reject any pending incoming call so Twilio doesn't keep it ringing
    const pendingIncoming = incomingCallRef.current?.call;
    if (pendingIncoming) {
      try {
        pendingIncoming.reject();
      } catch {
        // ignore
      }
    }

    // Disconnect any active call ONLY if forced
    if (activeCallRef.current && forceDisconnect) {
      try {
        activeCallRef.current.disconnect();
      } catch {
        // ignore
      }
    }

    // Unregister/destroy the device so we stop receiving inbound calls after logout
    if (deviceRef.current) {
      try {
        deviceRef.current.unregister();
      } catch {
        // ignore
      }
      try {
        deviceRef.current.destroy();
      } catch {
        // ignore
      }
    }

    // Reset state
    setDevice(null);
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus({ status: 'idle', duration: 0 });
    setIsMuted(false);
    setCurrentCallNumber('');
    setCurrentCallLeadId('');
    isOutgoingCallRef.current = false;
    lastIdentityRef.current = '';
  }, []);

  const setVoicePresence = useCallback(async (online: boolean) => {
    try {
      await makeApiCall(`${API_BASE}/calls/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online }),
      });
    } catch {
      // Best-effort (may fail when token already cleared)
    }
  }, []);

  // Keep server presence fresh while device is registered so inbound calls keep routing correctly.
  useEffect(() => {
    if (isAuthRoute) return;
    if (!isAuthenticated) return;
    if (!device) return;

    // Heartbeat every 30s (server TTL is short by design).
    const id = setInterval(() => {
      setVoicePresence(true).catch(() => {});
    }, 30_000);

    return () => clearInterval(id);
  }, [device, isAuthenticated, isAuthRoute, setVoicePresence]);

  // Best-effort: unlock audio on first user interaction after navigation (helps ringtone playback).
  useEffect(() => {
    if (isAuthRoute) return;
    if (!isAuthenticated) return;

    let unlocked = false;
    const unlock = async () => {
      if (unlocked) return;
      unlocked = true;

      // Unlock BOTH incoming + outgoing audio elements. Browsers often block play()
      // if it's not directly inside a user gesture; our ringback play happens later
      // when Twilio emits "ringing", so we need to pre-unlock here.
      const audios = [ringtoneRef.current, outgoingRingtoneRef.current].filter(
        Boolean
      ) as HTMLAudioElement[];
      if (!audios.length) return;
      try {
        for (const a of audios) {
          const prevVol = a.volume;
          a.volume = 0;
          await a.play();
          a.pause();
          a.currentTime = 0;
          a.volume = prevVol;
        }
      } catch {
        // ignore; browser policy may still block until later interaction
      } finally {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [isAuthenticated, isAuthRoute]);

  // Absolute safety: never allow Twilio to stay active on auth screens.
  // This prevents incoming-call beeps/popups on /login even if something mounts unexpectedly.
  useEffect(() => {
    if (!isAuthRoute) return;
    teardownDevice('auth-route', true); // Force disconnect on auth screens
  }, [isAuthRoute, teardownDevice]);

  // If user changes (admin -> agent, agent -> admin), destroy the old Device so we re-register with correct identity.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!currentIdentityKey) return;

    // If device exists but identity changed, teardown to force fresh token + registration
    if (device && lastIdentityRef.current && lastIdentityRef.current !== currentIdentityKey) {
      teardownDevice('identity-changed', true); // Force disconnect when identity changes
    }
  }, [currentIdentityKey, isAuthenticated, device, teardownDevice]);

  // Critical: when auth becomes unauthenticated, explicitly destroy/unregister the Device
  // so Twilio inbound calls stop ringing even if the token is still valid.
  useEffect(() => {
    if (isAuthenticated) return;
    // Best effort: mark offline on server to prevent TwiML routing to this client
    setVoicePresence(false).catch(() => {});
    // Force disconnect on logout
    teardownDevice('logged-out', true);
  }, [isAuthenticated, teardownDevice, setVoicePresence]);

  // Warn user before closing tab/window if call is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeCallRef.current) {
        e.preventDefault();
        e.returnValue = 'You have an active call. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Initialize ringtones - incoming and outgoing
  useEffect(() => {
    // Create incoming ringtone audio element
    const ringtone = new Audio();
    ringtone.src = '/phone-ring.mp3';
    ringtone.loop = true; // Loop continuously for reliable ringing
    ringtone.volume = 0.5; // Audible volume
    ringtoneRef.current = ringtone;

    // Create outgoing ringtone audio element (ringback tone)
    const outgoingRingtone = new Audio();
    outgoingRingtone.src = '/phone-ring.mp3'; // Using same sound, can be different
    outgoingRingtone.loop = true;
    outgoingRingtone.volume = 0.5;
    outgoingRingtoneRef.current = outgoingRingtone;

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current = null;
      }
    };
  }, []);

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    if (isAuthRoute) return null;
    if (!isAuthenticated) return null;
    if (!currentIdentityKey) return null;
    // If device exists but was created for a different user, ignore and recreate.
    if (device && (!lastIdentityRef.current || lastIdentityRef.current === currentIdentityKey)) return device;

    setIsInitializing(true);
    try {
      const fetchTwilioToken = async () => {
        const response = await makeApiCall(`${API_BASE}/calls/token`);
        if (!response.ok) throw new Error('Failed to get access token');
        const data = await response.json();
        return data as { token: string; identity?: string };
      };

      // Get access token from backend
      const data = await fetchTwilioToken();
      const token = data.token;
      // Prefer the identity returned by backend (it may normalize emails to lowercase)
      lastIdentityRef.current = data.identity || currentIdentityKey || '';

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
        console.log('✅ Twilio Device registered successfully');
        console.log('📞 Ready to receive incoming calls');
        console.log('🔑 Client identity:', lastIdentityRef.current);
        // Mark online so inbound TwiML will dial the real client identity
        setVoicePresence(true).catch(() => {});
      });

      // Refresh token automatically before it expires
      newDevice.on('tokenWillExpire', async () => {
        try {
          console.log('🔄 Twilio tokenWillExpire: refreshing token...');
          const t = await fetchTwilioToken();
          if (t?.token) {
            newDevice.updateToken(t.token);
            console.log('✅ Twilio token updated');
          }
        } catch (e) {
          console.warn('⚠️ Failed to refresh Twilio token:', e);
          // best-effort: next call attempt will re-init if needed
        }
      });

      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
        // If token is invalid/expired, try refreshing token once
        const msg = String((error as any)?.message || '').toLowerCase();
        if (msg.includes('jwt') || msg.includes('token')) {
          fetchTwilioToken()
            .then((t) => {
              if (t?.token) newDevice.updateToken(t.token);
            })
            .catch(() => {});
        }
        toast({
          title: 'Device Error',
          description: error.message || 'Failed to initialize calling device',
          variant: 'destructive',
        });
      });

      newDevice.on('incoming', (call) => {
        console.log('===========================================');
        console.log('📞 INCOMING CALL RECEIVED');
        console.log('Call object:', call);
        console.log('Call parameters:', call.parameters);
        console.log('Current active call:', activeCallRef.current);
        console.log('Is outgoing call:', isOutgoingCallRef.current);
        console.log('===========================================');
        
        // CRITICAL: Check if there's already an active call
        // If yes, this is a call waiting scenario - don't auto-answer
        if (activeCallRef.current && !isOutgoingCallRef.current) {
          console.log('⚠️ Call waiting: Another call is already active');
          
          // Get call parameters
          const params = call.parameters;
          const from = params.From || 'Unknown';
          const callSid = call.parameters.CallSid || '';
          
          // Set incoming call state - this will show the call waiting popup
          setIncomingCall({
            call,
            from,
            callSid,
            customParameters: params
          });
          
          // Play ringtone
          if (ringtoneRef.current) {
            ringtoneRef.current.play().catch(err => {
              console.error('Failed to play ringtone:', err);
            });
          }
          
          // Handle call cancellation
          call.on('cancel', () => {
            console.log('📞 Call waiting was cancelled (caller hung up)');
            if (ringtoneRef.current) {
              ringtoneRef.current.pause();
              ringtoneRef.current.currentTime = 0;
            }
            setIncomingCall(null);
          });
          
          // Handle call disconnect (backup for cancelled)
          call.on('disconnect', () => {
            console.log('📞 Call waiting disconnected');
            
            // Stop ringtone
            if (ringtoneRef.current) {
              ringtoneRef.current.pause();
              ringtoneRef.current.currentTime = 0;
            }
            
            // Clear incoming call popup if still showing
            setIncomingCall(null);
          });
          
          // Auto-dismiss after 20 seconds (same as regular incoming calls)
          const missedCallTimeout = setTimeout(() => {
            console.log('📞 Call waiting timed out (20 seconds)');
            
            // Stop ringtone
            if (ringtoneRef.current) {
              ringtoneRef.current.pause();
              ringtoneRef.current.currentTime = 0;
            }
            
            // Reject the call - this will trigger voicemail routing on server
            try {
              call.reject();
            } catch (err) {
              console.error('Error rejecting timed out call waiting:', err);
            }
            
            // Clear incoming call popup
            setIncomingCall(null);
            
            toast({
              title: 'Missed Call',
              description: `Missed call from ${from}`,
              duration: 3000,
            });
          }, 20000); // 20 seconds - standard phone ring timeout
          
          // Store timeout ID to clear it if call is answered/rejected manually
          (call as any).missedCallTimeout = missedCallTimeout;
          
          // Show toast notification
          toast({
            title: '📞 Call Waiting',
            description: `Incoming call from ${from} while on active call`,
            duration: 5000,
          });
          
          return; // Don't auto-answer - show waiting popup
        }
        
        // IMPORTANT: Ignore any Device-level incoming event that may be emitted during an outbound call.
        // Outbound calls are managed via device.connect() and the Call instance returned there.
        // Treating this as a real incoming call (or auto-accepting) causes:
        // - timer starting before the callee answers
        // - ringback stopping after a single bell
        // - stuck UI and possible repeated call attempts
        if (isOutgoingCallRef.current) {
          console.log('🚫 Ignoring Device incoming event during outbound call');
          return;
        }
        
        // This is a real incoming call - show the popup
        // Get call parameters
        const params = call.parameters;
        const from = params.From || 'Unknown';
        const callSid = call.parameters.CallSid || '';
        
        console.log('📞 Real incoming call from:', from, 'CallSid:', callSid);
        
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
        
        // Handle call cancellation (caller hangs up before answer)
        call.on('cancel', () => {
          console.log('📞 Incoming call was cancelled (caller hung up)');
          
          // Stop ringtone immediately
          if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
          }
          
          // Clear incoming call popup
          setIncomingCall(null);
          
          toast({
            title: 'Missed Call',
            description: `Missed call from ${from}`,
            duration: 3000,
          });
        });
        
        // Handle call disconnect (backup for cancelled)
        call.on('disconnect', () => {
          console.log('📞 Incoming call disconnected');
          
          // Stop ringtone
          if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
          }
          
          // Clear incoming call popup if still showing
          setIncomingCall(null);
        });
        
        // Auto-dismiss after 20 seconds (standard phone ring timeout)
        const missedCallTimeout = setTimeout(() => {
          console.log('📞 Incoming call timed out (20 seconds)');
          
          // Stop ringtone
          if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
          }
          
          // Reject the call
          try {
            call.reject();
          } catch (err) {
            console.error('Error rejecting timed out call:', err);
          }
          
          // Clear incoming call popup
          setIncomingCall(null);
          
          toast({
            title: 'Missed Call',
            description: `Missed call from ${from}`,
            duration: 3000,
          });
        }, 20000); // 20 seconds - standard phone ring timeout
        
        // Store timeout ID to clear it if call is answered/rejected manually
        (call as any).missedCallTimeout = missedCallTimeout;
        
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
  }, [device, toast, isAuthenticated, currentIdentityKey, isAuthRoute]);

  // Make a call
  const makeCall = useCallback(async (phoneNumber: string, leadId?: string) => {
    try {
      // Guard: never initiate a second outbound call while another call is active/connecting/ringing.
      // This prevents accidental "redial" caused by double-clicks or duplicate UI triggers.
      if (activeCallRef.current || callStatus.status !== 'idle') {
        throw new Error('A call is already in progress. Please hang up before starting a new call.');
      }

      let deviceToUse = device;
      
      if (!deviceToUse) {
        deviceToUse = await initializeDevice();
        if (!deviceToUse) {
          throw new Error('Failed to initialize device');
        }
      }

      // Mark this as an outgoing call BEFORE making the call
      isOutgoingCallRef.current = true;
      
      setCallStatus({ status: 'connecting', duration: 0 });
      setCurrentCallNumber(phoneNumber); // Store the number being called
      setCurrentCallLeadId(leadId || '');

      // Make the call
      const call = await deviceToUse.connect({
        params: {
          To: phoneNumber,
        },
      });

      setActiveCall(call);
      console.log('📞 Outgoing call initiated, call object:', call);
      console.log('Attaching event listeners to outgoing call...');

      // Cleanup function for call end
      const cleanupCall = (reason: string) => {
        console.log(`🧹 Cleaning up call - Reason: ${reason}`);
        
        // Stop outgoing ringtone
        if (outgoingRingtoneRef.current) {
          outgoingRingtoneRef.current.pause();
          outgoingRingtoneRef.current.currentTime = 0;
          outgoingRingtoneRef.current.loop = false;
        }
        
        // Reset state
        setCallStatus({ status: 'idle', duration: 0 });
        setActiveCall(null);
        setCurrentCallNumber('');
        setCurrentCallLeadId('');
        isOutgoingCallRef.current = false;
        
        // Clear duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      // With answerOnBridge="true" in TwiML, Twilio should only bridge the browser leg
      // when the callee actually answers. We therefore treat `accept` as "connected".
      // Early-media (carrier busy tones / remote ringback) can still arrive as audio BEFORE accept,
      // so we keep local ringback strictly until accept/reject/cancel/disconnect (per requirement).
      let remoteAnswered = false;
      let isRinging = false;
      let answerPollInterval: NodeJS.Timeout | null = null;
      let connectedStarted = false;
      let consecutiveRemoteAudio = 0;
      let earlyMediaPollInterval: NodeJS.Timeout | null = null;
      let consecutiveEarlyMedia = 0;

      const stopLocalRingback = () => {
        if (!outgoingRingtoneRef.current) return;
        try {
          outgoingRingtoneRef.current.pause();
          outgoingRingtoneRef.current.currentTime = 0;
          outgoingRingtoneRef.current.loop = false;
        } catch {
          // ignore
        }
      };

      const startLocalRingback = () => {
        if (!outgoingRingtoneRef.current) return;
        try {
          outgoingRingtoneRef.current.currentTime = 0;
          outgoingRingtoneRef.current.loop = true;
          outgoingRingtoneRef.current.play().catch(err => {
            console.error('Failed to play ringback tone:', err);
          });
        } catch {
          // ignore
        }
      };

      // Start ringback immediately while connecting (this runs on the user click gesture,
      // so it avoids autoplay blocking and ensures the agent hears ringing until answer).
      startLocalRingback();

      const startConnected = () => {
        if (connectedStarted) return;
        connectedStarted = true;
        remoteAnswered = true;
        isRinging = false;

        if (answerPollInterval) {
          clearInterval(answerPollInterval);
          answerPollInterval = null;
        }
        if (earlyMediaPollInterval) {
          clearInterval(earlyMediaPollInterval);
          earlyMediaPollInterval = null;
        }

        // Stop local ringback when call connects
        stopLocalRingback();

        setCallStatus({ status: 'connected', duration: 0 });

        // Start duration counter
        let seconds = 0;
        durationIntervalRef.current = setInterval(() => {
          seconds++;
          setCallStatus(prev => ({ ...prev, duration: seconds }));
        }, 1000);
      };

      // Twilio Voice SDK can fire `accept` before the callee answers (early media / gateway accepted).
      // To guarantee ringback stays until the callee answers, poll internal flags and only switch
      // to connected when `_isAnswered === true`.
      const ensureAnswerPolling = () => {
        if (answerPollInterval) return;
        answerPollInterval = setInterval(() => {
          const answered = Boolean((call as any)._isAnswered);
          if (answered) {
            console.log('✅ Detected callee answered (_isAnswered=true).');
            startConnected();
          }
        }, 250);
      };

      // Call event listeners
      call.on('accept', () => {
        console.log('✅ Call accept event fired (waiting for _isAnswered to confirm callee answered)');
        ensureAnswerPolling();
      });

      const stopRingbackOnEarlyMedia = (source: string) => {
        if (!isRinging || remoteAnswered) return;
        console.log(`🔈 Early-media detected (${source}) - stopping local ringback to avoid overlap`);
        stopLocalRingback();
      };

      // Prevent "busy + bell together":
      // Use the official Call 'volume' event (fires frequently when remote audio is present).
      call.on('volume', (inputVolume: number, outputVolume: number) => {
        if (!isRinging || remoteAnswered) return;

        // outputVolume is 0..1-ish; require a sustained signal to avoid false positives
        if (typeof outputVolume === 'number' && outputVolume > 0.12) {
          consecutiveRemoteAudio++;
        } else {
          consecutiveRemoteAudio = 0;
        }

        if (consecutiveRemoteAudio >= 3) {
          stopRingbackOnEarlyMedia('volume-event');
        }
      });

      // Fallback: some environments don’t reliably emit 'volume' even though audio is playing.
      // Twilio Call keeps internal meters like _latestOutputVolume; poll briefly while ringing.
      const ensureEarlyMediaPolling = () => {
        if (earlyMediaPollInterval) return;
        earlyMediaPollInterval = setInterval(() => {
          if (!isRinging || remoteAnswered) return;
          const v = Number((call as any)._latestOutputVolume || 0);
          if (v > 0.12) {
            consecutiveEarlyMedia++;
          } else {
            consecutiveEarlyMedia = 0;
          }
          if (consecutiveEarlyMedia >= 3) {
            stopRingbackOnEarlyMedia('_latestOutputVolume');
            // Keep polling; if ringback was restarted we want to stop it again.
          }
        }, 200);
      };

      call.on('disconnect', () => {
        console.log('🔴 Call disconnect event fired');
        console.log('Remote answered:', remoteAnswered);
        isRinging = false;
        stopLocalRingback();
        if (answerPollInterval) {
          clearInterval(answerPollInterval);
          answerPollInterval = null;
        }
        if (earlyMediaPollInterval) {
          clearInterval(earlyMediaPollInterval);
          earlyMediaPollInterval = null;
        }

        cleanupCall('disconnect');
        
        // Only show "Call Ended" if call was actually connected
        // Otherwise, it was just ringing or busy
        if (remoteAnswered) {
          toast({
            title: 'Call Ended',
            description: 'The call has been disconnected',
          });
        } else {
          toast({
            title: 'Call Not Answered',
            description: 'The call was not answered',
          });
        }
      });

      call.on('cancel', () => {
        console.log('❌ Call cancel event fired');
        isRinging = false;
        stopLocalRingback();
        if (answerPollInterval) {
          clearInterval(answerPollInterval);
          answerPollInterval = null;
        }
        if (earlyMediaPollInterval) {
          clearInterval(earlyMediaPollInterval);
          earlyMediaPollInterval = null;
        }
        cleanupCall('cancel');
        
        toast({
          title: 'Call Cancelled',
          description: 'The call was cancelled',
        });
      });

      call.on('reject', () => {
        console.log('🚫 Call reject event fired');
        isRinging = false;
        stopLocalRingback();
        if (answerPollInterval) {
          clearInterval(answerPollInterval);
          answerPollInterval = null;
        }
        if (earlyMediaPollInterval) {
          clearInterval(earlyMediaPollInterval);
          earlyMediaPollInterval = null;
        }
        cleanupCall('reject');
        
        toast({
          title: 'Call Rejected',
          description: 'The call was rejected or busy',
          variant: 'destructive',
        });
      });

      call.on('error', (error) => {
        console.error('❌ Call error event fired:', error);
        isRinging = false;
        stopLocalRingback();
        if (answerPollInterval) {
          clearInterval(answerPollInterval);
          answerPollInterval = null;
        }
        if (earlyMediaPollInterval) {
          clearInterval(earlyMediaPollInterval);
          earlyMediaPollInterval = null;
        }
        cleanupCall(`error: ${error.message}`);
        
        toast({
          title: 'Call Error',
          description: error.message || 'An error occurred during the call',
          variant: 'destructive',
        });
      });

      call.on('ringing', () => {
        console.log('📞 Call ringing - remote phone is ringing');
        setCallStatus({ status: 'ringing', duration: 0 });
        isRinging = true;
        
        // Play ringback tone so user knows the call is ringing
        // This is REQUIRED for browser-to-PSTN calls
        console.log('Starting ringback tone playback');
        startLocalRingback();
        ensureAnswerPolling();
        ensureEarlyMediaPolling();
      });

    } catch (error: any) {
      console.error('Error making call:', error);
      setCallStatus({ 
        status: 'idle', 
        duration: 0,
        error: error.message 
      });
      setCurrentCallLeadId('');
      
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
      // Stop outgoing ringtone if still playing
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.pause();
        outgoingRingtoneRef.current.currentTime = 0;
      }
      
      activeCall.disconnect();
      // Don't set state here - let the disconnect event handler do it
      // This prevents double state updates and race conditions
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
      
      const call = incomingCall.call;
      
      // Clear missed call timeout
      if ((call as any).missedCallTimeout) {
        clearTimeout((call as any).missedCallTimeout);
      }
      
      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      
      // Store the caller's number
      setCurrentCallNumber(incomingCall.from);
      setCurrentCallLeadId(''); // Unknown for inbound; UI will resolve via phone lookup if needed
      
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
        // Reset to idle so future incoming calls can show the popup reliably
        setCallStatus({ status: 'idle', duration: 0 });
        setActiveCall(null);
        setCurrentCallNumber(''); // Clear stored number
        setCurrentCallLeadId('');
        isOutgoingCallRef.current = false; // Reset flag (just in case)
        
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
        setCurrentCallNumber('');
        setCurrentCallLeadId('');
        isOutgoingCallRef.current = false; // Reset outgoing flag
        
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
      setCurrentCallLeadId('');
      
      toast({
        title: 'Failed to Answer',
        description: error.message || 'Could not answer the call',
        variant: 'destructive',
      });
    }
  }, [incomingCall, toast]);

  // Reject incoming call and send to voicemail
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log('📞 Rejecting incoming call and sending to voicemail');
      
      const call = incomingCall.call;
      const params = incomingCall.customParameters || call.parameters || {};
      
      // For incoming calls to browser client, the CallSid is the child call
      // We need the ParentCallSid to redirect the original caller to voicemail
      const parentCallSid = params.ParentCallSid || params.CallSid || incomingCall.callSid;
      
      console.log('📞 Call SIDs:', {
        childCallSid: incomingCall.callSid,
        parentCallSid: parentCallSid,
        allParams: params
      });
      
      // Clear missed call timeout
      if ((call as any).missedCallTimeout) {
        clearTimeout((call as any).missedCallTimeout);
      }
      
      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      
      // IMPORTANT: Log to backend BEFORE rejecting to trigger voicemail routing
      // Send the PARENT CallSid so the original caller can be redirected to voicemail
      try {
        await makeApiCall(`${API_BASE}/calls/log-reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSid: parentCallSid,
            childCallSid: incomingCall.callSid,
            from: incomingCall.from,
            action: 'rejected'
          })
        });
        console.log('✅ Call rejection logged, voicemail routing triggered for parent call:', parentCallSid);
      } catch (logError) {
        console.error('Failed to log call rejection:', logError);
        // Continue anyway - still reject the call
      }
      
      // Reject the call on client side
      incomingCall.call.reject();
      setIncomingCall(null);
      
      toast({
        title: 'Call Sent to Voicemail',
        description: 'The caller can leave a voicemail message',
      });
    } catch (error: any) {
      console.error('Error rejecting call:', error);
      setIncomingCall(null);
    }
  }, [incomingCall, toast]);

  // Ignore incoming call (dismiss popup, let call keep ringing and timeout)
  const ignoreCall = useCallback(() => {
    if (!incomingCall) return;

    console.log('📞 Ignoring incoming call - will timeout after 20 seconds');
    
    // Stop ringtone but DON'T clear the timeout - let it ring silently
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    
    // Clear the incoming call state to hide the popup
    // The timeout will still fire and reject the call after 20 seconds
    setIncomingCall(null);
  }, [incomingCall]);

  // Cleanup on unmount - but don't force disconnect active calls
  // This allows calls to persist during navigation
  useEffect(() => {
    return () => {
      // Don't force disconnect - let calls persist
      teardownDevice('unmounted', false);
    };
  }, [teardownDevice]);

  return {
    device,
    activeCall,
    callStatus,
    incomingCall,
    isInitializing,
    isMuted,
    currentCallNumber, // Export current call number
    currentCallLeadId, // Export best-effort leadId (outbound)
    initializeDevice,
    makeCall,
    hangUp,
    toggleMute,
    answerCall,
    rejectCall,
    ignoreCall,
  };
};

