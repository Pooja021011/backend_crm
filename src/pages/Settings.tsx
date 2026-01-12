import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Settings as SettingsIcon, 
  User, 
  Mail, 
  Phone,
  Lock,
  Save,
  Server,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info,
  UserCog,
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  UserCheck,
  MessageSquare,
  UserX,
  Shield,
  Mic,
  Square,
  Play,
  Upload
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE, makeApiCall } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatUsPhoneForDisplay, normalizeUsPhoneToE164 } from "@/utils/phone";
import { useAgents, type Agent } from "@/hooks/useAgents";
import { AddAgentDialog } from "@/components/AddAgentDialog";
import { EditAgentDialog } from "@/components/EditAgentDialog";
import { MarketingPlatformSettings } from "@/components/MarketingPlatformSettings";
import { PipelineSettings } from "@/components/PipelineSettings";
import { LeadDistributionSettings } from "@/components/LeadDistributionSettings";
import { LeadStatusSettings } from "@/components/LeadStatusSettings";
import { LeadSourceSettings } from "@/components/LeadSourceSettings";
import { safeDateFormat } from "@/utils/validation";

type EmailSettings = {
  email: string;
  provider: 'SMTP' | 'GMAIL';
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  imapHost?: string | null;
  imapPort?: number | null;
  imapSecure?: boolean | null;
  imapUser?: string | null;
  imapPass?: string | null;
  syncEnabled?: boolean;
  gmailConnected?: boolean;
};

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  
  // Check if user has admin or manager role
  const isAdminOrManager = user?.roles?.some(role => ['ADMIN', 'MANAGER'].includes(role)) || false;
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [originalEmailSettings, setOriginalEmailSettings] = useState<EmailSettings | null>(null);
  const [emailSettingsModified, setEmailSettingsModified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Agents state
  const { agents, isLoading, error, deleteAgent, refreshAgents } = useAgents();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // SMS Settings state
  const [smsSettings, setSmsSettings] = useState<any>(null);
  const [loadingSmsSettings, setLoadingSmsSettings] = useState(false);
  const [savingSmsSettings, setSavingSmsSettings] = useState(false);

  // Voicemail greeting state (per-user)
  const [voicemailBlob, setVoicemailBlob] = useState<Blob | null>(null);
  const [voicemailUrl, setVoicemailUrl] = useState<string>('');
  const [savedVoicemailAt, setSavedVoicemailAt] = useState<string>('');
  const [isRecordingVoicemail, setIsRecordingVoicemail] = useState(false);
  const [savingVoicemailGreeting, setSavingVoicemailGreeting] = useState(false);
  const voicemailRecorderRef = useRef<MediaRecorder | null>(null);
  const voicemailChunksRef = useRef<Blob[]>([]);
  const voicemailObjectUrlRef = useRef<string>('');

  // Cleanup voicemail preview URL
  useEffect(() => {
    return () => {
      if (voicemailObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(voicemailObjectUrlRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const encodeWav = (audioBuffer: AudioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;

    // Interleave channels
    const interleaved = new Float32Array(numFrames * numChannels);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < numFrames; i++) {
        interleaved[i * numChannels + ch] = channelData[i];
      }
    }

    // 16-bit PCM
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = interleaved.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      let s = Math.max(-1, Math.min(1, interleaved[i]));
      const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const blobToWav = async (input: Blob) => {
    const arrayBuffer = await input.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const wav = encodeWav(decoded);
    try {
      await audioCtx.close();
    } catch {
      // ignore
    }
    return wav;
  };

  const startVoicemailRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ title: 'Error', description: 'Microphone not supported in this browser', variant: 'destructive' });
        return;
      }

      // Clear previous preview
      if (voicemailObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(voicemailObjectUrlRef.current);
        } catch {
          // ignore
        }
        voicemailObjectUrlRef.current = '';
      }
      setVoicemailUrl('');
      setVoicemailBlob(null);
      setSavedVoicemailAt('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = {};
      // Use a broadly supported mime type; we’ll convert to WAV after recording
      if (MediaRecorder.isTypeSupported('audio/webm')) options.mimeType = 'audio/webm';
      const recorder = new MediaRecorder(stream, options);
      voicemailRecorderRef.current = recorder;
      voicemailChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) voicemailChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop tracks to release mic
        stream.getTracks().forEach((t) => t.stop());

        try {
          const raw = new Blob(voicemailChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const wav = await blobToWav(raw);
          setVoicemailBlob(wav);
          const url = URL.createObjectURL(wav);
          voicemailObjectUrlRef.current = url;
          setVoicemailUrl(url);
        } catch (err) {
          console.error('Voicemail WAV conversion failed:', err);
          toast({ title: 'Error', description: 'Failed to process recording. Please try again.', variant: 'destructive' });
        }
      };

      recorder.start();
      setIsRecordingVoicemail(true);
    } catch (err: any) {
      console.error('Mic recording error:', err);
      toast({ title: 'Error', description: err?.message || 'Microphone permission denied', variant: 'destructive' });
    }
  };

  const stopVoicemailRecording = () => {
    const r = voicemailRecorderRef.current;
    if (!r) return;
    if (r.state !== 'inactive') r.stop();
    voicemailRecorderRef.current = null;
    setIsRecordingVoicemail(false);
  };

  const saveVoicemailGreeting = async () => {
    if (!voicemailBlob) {
      toast({ title: 'Error', description: 'Record a voicemail greeting first', variant: 'destructive' });
      return;
    }

    setSavingVoicemailGreeting(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', voicemailBlob, 'voicemail.wav');

      const resp = await fetch(`${API_BASE}/settings/sms/voicemail-greeting`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'Failed to save voicemail greeting');
      }

      // Switch preview to server-backed URL so it persists across reloads
      if (voicemailObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(voicemailObjectUrlRef.current);
        } catch {
          // ignore
        }
        voicemailObjectUrlRef.current = '';
      }

      const updatedAt = json?.data?.voicemailGreetingUpdatedAt || new Date().toISOString();
      setSavedVoicemailAt(updatedAt);
      if (user?.id) {
        setVoicemailUrl(`${API_BASE}/calls/voicemail-greeting/${encodeURIComponent(user.id)}`);
      }

      // Keep blob optional; UI should show preview even after refresh.
      setVoicemailBlob(null);

      toast({ title: 'Saved', description: 'Voicemail greeting saved successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save voicemail greeting', variant: 'destructive' });
    } finally {
      setSavingVoicemailGreeting(false);
    }
  };

  // Test SMS and Call state
  const [sendingTestSMS, setSendingTestSMS] = useState(false);
  const [makingTestCall, setMakingTestCall] = useState(false);
  
  // Load per-user email settings
  useEffect(() => {
    const load = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;

      try {
        const response = await makeApiCall(`${API_BASE}/settings/email`);
        const data = await response.json();
        
        console.log('Loading email settings:', data); // Debug log
        
        if (data.success) {
          // Handle case where no settings exist yet (data.data is null)
          const settingsData = data.data || {};
          
          const settings = {
            email: settingsData.email || user?.email || '',
            provider: settingsData.provider || 'SMTP',
            smtpHost: settingsData.smtpHost || '',
            smtpPort: settingsData.smtpPort || 587,
            smtpSecure: settingsData.smtpSecure !== false,
            smtpUser: settingsData.smtpUser || '',
            smtpPass: settingsData.smtpPass || '',
            imapHost: settingsData.imapHost || '',
            imapPort: settingsData.imapPort || 993,
            imapSecure: settingsData.imapSecure !== false,
            imapUser: settingsData.imapUser || '',
            imapPass: settingsData.imapPass || '',
            syncEnabled: settingsData.syncEnabled || false,
            gmailConnected: settingsData.gmailConnected || false
          };
          
          console.log('Setting email settings to:', settings); // Debug log
          setEmailSettings(settings);
          setOriginalEmailSettings(settings); // Store original settings
          setEmailSettingsModified(false); // Reset modified flag
        } else {
          console.log('Failed to load email settings:', data.error);
          // Set default settings even if API call fails
          const defaultSettings = {
            email: user?.email || '',
            provider: 'SMTP' as const,
            smtpHost: '',
            smtpPort: 587,
            smtpSecure: true,
            smtpUser: '',
            smtpPass: '',
            imapHost: '',
            imapPort: 993,
            imapSecure: true,
            imapUser: '',
            imapPass: '',
            syncEnabled: false,
            gmailConnected: false
          };
          setEmailSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Failed to load email settings:', error);
      }
    };

    load();
  }, [user?.email]);

  // Track email settings modifications
  useEffect(() => {
    if (!emailSettings || !originalEmailSettings) {
      setEmailSettingsModified(false);
      return;
    }
    
    // Compare current settings with original
    const isModified = JSON.stringify(emailSettings) !== JSON.stringify(originalEmailSettings);
    setEmailSettingsModified(isModified);
  }, [emailSettings, originalEmailSettings]);

  // Reload settings when email tab becomes active
  useEffect(() => {
    if (activeTab === 'email' && !emailSettings) {
      const load = async () => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;

        try {
          const response = await makeApiCall(`${API_BASE}/settings/email`);
          const data = await response.json();
          
          console.log('Reloading email settings for tab:', data);
          
          if (data.success) {
            // Handle case where no settings exist yet (data.data is null)
            const settingsData = data.data || {};
            
            const settings = {
              email: settingsData.email || user?.email || '',
              provider: settingsData.provider || 'SMTP',
              smtpHost: settingsData.smtpHost || '',
              smtpPort: settingsData.smtpPort || 587,
              smtpSecure: settingsData.smtpSecure !== false,
              smtpUser: settingsData.smtpUser || '',
              smtpPass: settingsData.smtpPass || '',
              imapHost: settingsData.imapHost || '',
              imapPort: settingsData.imapPort || 993,
              imapSecure: settingsData.imapSecure !== false,
              imapUser: settingsData.imapUser || '',
              imapPass: settingsData.imapPass || '',
              syncEnabled: settingsData.syncEnabled || false,
              gmailConnected: settingsData.gmailConnected || false
            };
            
            setEmailSettings(settings);
          }
        } catch (error) {
          console.error('Failed to reload email settings:', error);
        }
      };

      load();
    }
  }, [activeTab, emailSettings, user?.email]);

  // Load SMS settings when SMS tab becomes active
  useEffect(() => {
    if (activeTab === 'sms') {
      const loadSmsSettings = async () => {
        setLoadingSmsSettings(true);
        try {
          const response = await makeApiCall(`${API_BASE}/settings/sms`);
          const result = await response.json();
          
          if (result.success) {
            const data = result.data || {
              phoneNumber: '',
              displayName: '',
              active: true
            };
            setSmsSettings(data);

            // If a greeting exists in DB, show it as “Saved” and allow preview
            if (data?.voicemailGreetingPath && user?.id) {
              setSavedVoicemailAt(data?.voicemailGreetingUpdatedAt || '');
              // Use server-backed URL (persists)
              setVoicemailUrl(`${API_BASE}/calls/voicemail-greeting/${encodeURIComponent(user.id)}`);
              setVoicemailBlob(null);
            }
          }
        } catch (error) {
          console.error('Failed to load SMS settings:', error);
          toast({
            title: "Error",
            description: "Failed to load SMS settings",
            variant: "destructive",
          });
        } finally {
          setLoadingSmsSettings(false);
        }
      };

      loadSmsSettings();
    }
  }, [activeTab, user?.id]);

  // SMS Settings functions
  const saveSmsSettings = async () => {
    if (!smsSettings) return;

    setSavingSmsSettings(true);
    try {
      const response = await makeApiCall(`${API_BASE}/settings/sms`, {
        method: 'POST',
        body: JSON.stringify({ ...smsSettings, active: true })
      });

      const result = await response.json();
      if (result.success) {
        setSmsSettings(result.data);
        toast({
          title: "SMS Settings Saved",
          description: "Your SMS settings have been saved successfully!",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save SMS settings",
        variant: "destructive",
      });
    } finally {
      setSavingSmsSettings(false);
    }
  };

  // Send test SMS
  const testSMSConnection = async () => {
    if (!smsSettings?.phoneNumber) return;
    
    setSendingTestSMS(true);
    try {
      const response = await makeApiCall(`${API_BASE}/sms/send`, {
        method: 'POST',
        body: JSON.stringify({
          to: smsSettings.phoneNumber, // Test to the same number
          text: 'Test SMS from Real Estate CRM - Your SMS configuration is working!'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "SMS Connection Test Successful",
          description: `SMS is working correctly with your number ${formatUsPhoneForDisplay(smsSettings.phoneNumber)}`,
          variant: "default"
        });
      } else {
        throw new Error(result.error || 'SMS configuration has issues');
      }
    } catch (error: any) {
      toast({
        title: "SMS Connection Test Failed",
        description: error.message || "SMS configuration has issues. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setSendingTestSMS(false);
    }
  };

  // Test call connection
  const testCallConnection = async () => {
    if (!smsSettings?.phoneNumber) return;
    
    setMakingTestCall(true);
    try {
      const response = await makeApiCall(`${API_BASE}/calls/make`, {
        method: 'POST',
        body: JSON.stringify({
          to: smsSettings.phoneNumber // Test to the same number
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Call Connection Test Successful",
          description: `Call functionality is working correctly with your number ${formatUsPhoneForDisplay(smsSettings.phoneNumber)}`,
          variant: "default"
        });
      } else {
        throw new Error(result.error || 'Call configuration has issues');
      }
    } catch (error: any) {
      toast({
        title: "Call Connection Test Failed",
        description: error.message || "Call configuration has issues. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setMakingTestCall(false);
    }
  };


  // Load user profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await makeApiCall(`${API_BASE}/users/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      const result = await response.json();
      if (result.success) {
        // Refresh user data in AuthContext
        await refreshUser();
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully!",
        });
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordData.newPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const response = await makeApiCall(`${API_BASE}/users/change-password`, {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully!",
        });
        // Clear the form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        throw new Error(result.error || 'Failed to change password');
      }
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const saveEmailSettings = async () => {
    if (!emailSettings) return;

    setSaving(true);
    try {
      const response = await makeApiCall(`${API_BASE}/settings/email`, {
        method: 'POST',
        body: JSON.stringify(emailSettings)
      });

      const result = await response.json();
      if (result.success) {
        // Update original settings and reset modified flag
        setOriginalEmailSettings(emailSettings);
        setEmailSettingsModified(false);
        
        toast({
          title: "Settings Saved",
          description: "Your email settings have been updated successfully!",
        });
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testImapConnection = async () => {
    if (!emailSettings) return;

    // Check if settings have been modified
    if (emailSettingsModified) {
      toast({
        title: "Save Settings First",
        description: "Please save your IMAP settings before testing the connection.",
        variant: "destructive",
      });
      return;
    }

    setTestingImap(true);
    try {
      const response = await makeApiCall(`${API_BASE}/settings/email/test-imap`, {
        method: 'POST',
        body: JSON.stringify({
          imapHost: emailSettings.imapHost,
          imapPort: emailSettings.imapPort || 993,
          imapUser: emailSettings.imapUser,
          imapPass: emailSettings.imapPass,
          imapSecure: emailSettings.imapSecure !== false
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "IMAP Connection Successful",
          description: "IMAP connection test successful! You can now sync emails.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "IMAP Connection Failed",
        description: error.message || "Failed to connect to IMAP server. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setTestingImap(false);
    }
  };

  const testSmtpConnection = async () => {
    if (!emailSettings) return;
    
    // Check if settings have been modified
    if (emailSettingsModified) {
      toast({
        title: "Save Settings First",
        description: "Please save your SMTP settings before testing the connection.",
        variant: "destructive",
      });
      return;
    }
    
    setTestingSmtp(true);
    try {
      const res = await makeApiCall(`${API_BASE}/settings/email/test-smtp`, {
        method: 'POST'
      });
      const result = await res.json();
      if (result.success) {
        toast({
          title: "SMTP Connection Successful",
          description: "SMTP connection test successful! You can send emails.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "SMTP Connection Failed",
        description: error.message || "Failed to connect to SMTP server. Please check your settings.",
        variant: "destructive",
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const connectGmail = async () => {
    if (!emailSettings) return;

    // Check if settings have been modified (only for connecting, not disconnecting)
    if (!emailSettings.gmailConnected && emailSettingsModified) {
      toast({
        title: "Save Settings First",
        description: "Please save your email settings before connecting Gmail.",
        variant: "destructive",
      });
      return;
    }

    setConnectingGmail(true);
    try {
      if (emailSettings.gmailConnected) {
        // Disconnect Gmail and save immediately
        const updatedSettings = { ...emailSettings, gmailConnected: false };
        setEmailSettings(updatedSettings);
        
        // Save to backend with updated settings
        const saveResponse = await makeApiCall(`${API_BASE}/settings/email`, {
          method: 'POST',
          body: JSON.stringify(updatedSettings)
        });
        
        const saveResult = await saveResponse.json();
        if (saveResult.success) {
          setOriginalEmailSettings(updatedSettings);
          setEmailSettingsModified(false);
          toast({
            title: "Gmail Disconnected",
            description: "Gmail account disconnected successfully!",
          });
        } else {
          throw new Error(saveResult.error || 'Failed to save Gmail disconnection');
        }
      } else {
        // First test IMAP connection before connecting
        if (!emailSettings?.imapHost || !emailSettings?.imapUser || !emailSettings?.imapPass) {
          toast({
            title: "IMAP Configuration Missing",
            description: "Please fill in IMAP settings and test connection first.",
            variant: "destructive",
          });
          return;
        }

        // Test IMAP connection first
        const response = await makeApiCall(`${API_BASE}/settings/email/test-imap`, {
          method: 'POST',
          body: JSON.stringify({
            imapHost: emailSettings.imapHost,
            imapPort: emailSettings.imapPort || 993,
            imapUser: emailSettings.imapUser,
            imapPass: emailSettings.imapPass,
            imapSecure: emailSettings.imapSecure !== false
          })
        });

        const result = await response.json();

        if (result.success) {
          // Connection successful, mark as connected and save immediately
          const updatedSettings = { ...emailSettings, gmailConnected: true };
          setEmailSettings(updatedSettings);
          
          // Save to backend with updated settings
          const saveResponse = await makeApiCall(`${API_BASE}/settings/email`, {
            method: 'POST',
            body: JSON.stringify(updatedSettings)
          });
          
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            setOriginalEmailSettings(updatedSettings);
            setEmailSettingsModified(false);
            toast({
              title: "Gmail Connected",
              description: "Gmail account connected successfully! You can now sync emails.",
            });
          } else {
            throw new Error(saveResult.error || 'Failed to save Gmail connection');
          }
        } else {
          throw new Error(result.error || 'IMAP connection failed');
        }
      }
    } catch (error: any) {
      toast({
        title: "Gmail Connection Failed",
        description: error.message || "Failed to connect Gmail account. Please check your IMAP settings.",
        variant: "destructive",
      });
    } finally {
      setConnectingGmail(false);
    }
  };

  // Agent helper functions
  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agent.firstName.toLowerCase().includes(searchLower) ||
      agent.lastName.toLowerCase().includes(searchLower) ||
      agent.email.toLowerCase().includes(searchLower) ||
      (agent.phone && agent.phone.includes(searchTerm))
    );
  });

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowEditDialog(true);
  };

  const handleDelete = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;

    try {
      await deleteAgent(agentToDelete.id);
      toast({
        title: "Agent Deleted",
        description: `${agentToDelete.firstName} ${agentToDelete.lastName} has been deleted successfully.`,
      });
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getRoleColors = (roles: { role: { name: string } }[]) => {
    const roleColorMap: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'ACQ': 'bg-green-100 text-green-800',
      'DISP': 'bg-purple-100 text-purple-800',
      'TC': 'bg-orange-100 text-orange-800',
    };

    return roles.map(({ role }) => ({
      name: role.name,
      color: roleColorMap[role.name] || 'bg-gray-100 text-gray-800'
    }));
  };

  const formatDate = (dateString: string) => {
    return safeDateFormat(dateString, 'MMM dd, yyyy');
  };

  return (
    <div style={{ margin: '0', width: '100%', overflow: 'visible' }}>
      <div style={{ overflow: 'visible' }}>
          {/* Profile Tab - Only show when activeTab is 'profile' */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Profile Information Card */}
              <Card className="border-0 shadow-none overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Profile Information</h2>
                  </div>
                
                  <div className="space-y-6">
                    {/* Name Section */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            First Name
                          </Label>
                          <Input 
                            id="firstName" 
                            value={profileData.firstName}
                            onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="Enter your first name"
                            className="bg-input border-border focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Last Name
                          </Label>
                          <Input 
                            id="lastName" 
                            value={profileData.lastName}
                            onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Enter your last name"
                            className="bg-input border-border focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Address
                          </Label>
                          <Input 
                            id="email" 
                            type="email" 
                            value={profileData.email}
                            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter your email address"
                            className="bg-input border-border focus:ring-primary focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Phone Number
                          </Label>
                          <Input 
                            id="phone" 
                            type="tel" 
                            value={formatUsPhoneForDisplay(profileData.phone)}
                            onChange={(e) =>
                              setProfileData((prev) => ({
                                ...prev,
                                // Store as +1 E.164 (or raw while typing); UI will hide +1 regardless
                                phone: normalizeUsPhoneToE164(e.target.value) || e.target.value,
                              }))
                            }
                            placeholder="(555) 123-4567"
                            className="bg-input border-border focus:ring-primary focus:border-primary"
                            disabled={!isAdminOrManager}
                            readOnly={!isAdminOrManager}
                          />
                          {!isAdminOrManager && (
                            <p className="text-xs text-muted-foreground">
                              Contact your administrator to update your phone number
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="bg-gradient-primary text-primary-foreground"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Password Reset Card */}
              <Card className="border-0 shadow-none overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Security Settings</h2>
                  </div>
                
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        Current Password
                      </Label>
                      <Input 
                        id="currentPassword" 
                        type="password" 
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter your current password"
                        className="bg-input border-border focus:ring-primary focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">
                        New Password
                      </Label>
                      <Input 
                        id="newPassword" 
                        type="password" 
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter your new password (minimum 6 characters)"
                        className="bg-input border-border focus:ring-primary focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm your new password"
                        className="bg-input border-border focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={changePassword}
                        disabled={changingPassword}
                        variant="outline" 
                        className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        {changingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Email Sync Tab - Only show when activeTab is 'email' */}
          {activeTab === 'email' && (
            <div className="space-y-8">
              <Card className="border-0 shadow-none overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Server className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Email & Sync Settings</h2>
                  </div>

                  <div className="space-y-8">
                    {/* Gmail Sync */}
                    <div className="p-6 border border-border rounded-lg bg-background/50">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">Gmail Account Sync</h3>
                      </div>

                      {/* IMAP Server Configuration */}
                      <div className="space-y-6">
                        <h4 className="text-lg font-medium text-foreground mb-4">IMAP Server Configuration</h4>
                        {/* Info box for App Password */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-2 text-sm">
                            <p className="text-blue-900 font-medium">Gmail App Password Required</p>
                            <p className="text-blue-800">
                              To connect Gmail, you need a <strong>16-character App Password</strong> (not your regular Gmail password).
                            </p>
                            <div className="space-y-1 text-blue-700">
                              <p>Steps to generate:</p>
                              <ol className="list-decimal list-inside space-y-1 ml-2">
                                <li>Enable 2-Factor Authentication on your Google account</li>
                                <li>Visit: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-900">myaccount.google.com/apppasswords</a></li>
                                <li>Generate a new App Password for "Mail"</li>
                                <li>Copy the 16-character password and paste it below</li>
                              </ol>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="imapHost">IMAP Host</Label>
                            <Input
                              id="imapHost"
                              placeholder="imap.gmail.com"
                              value={emailSettings?.imapHost || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, imapHost: e.target.value } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="imapPort">IMAP Port</Label>
                            <Input
                              id="imapPort"
                              type="number"
                              placeholder="993"
                              value={emailSettings?.imapPort?.toString() || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, imapPort: e.target.value ? parseInt(e.target.value) : null } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="imapUser">Email Address (IMAP Username)</Label>
                            <Input
                              id="imapUser"
                              type="email"
                              placeholder="your-email@gmail.com"
                              value={emailSettings?.imapUser || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, imapUser: e.target.value } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="imapPass" className="flex items-center gap-2">
                              App Password (IMAP Password)
                              <span className="text-xs text-muted-foreground font-normal">(16 characters)</span>
                            </Label>
                            <Input
                              id="imapPass"
                              type="password"
                              placeholder="xxxx xxxx xxxx xxxx"
                              value={emailSettings?.imapPass || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, imapPass: e.target.value } : s)}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="imapSecure"
                            checked={emailSettings?.imapSecure !== false}
                            onCheckedChange={(checked) => setEmailSettings(s => s ? { ...s, imapSecure: checked } : s)}
                          />
                          <Label htmlFor="imapSecure">Use SSL/TLS</Label>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <Button 
                              variant="outline" 
                              onClick={testImapConnection}
                              disabled={testingImap || !emailSettings?.imapHost || !emailSettings?.imapUser || !emailSettings?.imapPass || emailSettingsModified}
                            >
                              {testingImap ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <Server className="w-4 h-4 mr-2" />
                                  Test IMAP Connection
                                </>
                              )}
                            </Button>

                            <Button
                              onClick={connectGmail}
                              disabled={connectingGmail || (!emailSettings?.gmailConnected && emailSettingsModified)}
                              className={emailSettings?.gmailConnected ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                            >
                            {connectingGmail ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                {emailSettings?.gmailConnected ? 'Disconnecting...' : 'Connecting...'}
                              </>
                            ) : emailSettings?.gmailConnected ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Disconnect Gmail
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Connect Gmail
                              </>
                            )}
                          </Button>
                          </div>
                          
                          {emailSettingsModified && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Save your settings first to test IMAP or connect Gmail
                            </p>
                          )}
                        </div>

                        {emailSettings?.gmailConnected && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-800 font-medium">Gmail connected successfully!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SMTP Configuration */}
                    <div className="p-6 border border-border rounded-lg bg-background/50">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Server className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">SMTP Configuration</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                              id="smtpHost"
                              placeholder="smtp.gmail.com"
                              value={emailSettings?.smtpHost || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, smtpHost: e.target.value } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                              id="smtpPort"
                              type="number"
                              placeholder="587"
                              value={emailSettings?.smtpPort?.toString() || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, smtpPort: e.target.value ? parseInt(e.target.value) : null } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input
                              id="smtpUser"
                              placeholder="your-email@gmail.com"
                              value={emailSettings?.smtpUser || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, smtpUser: e.target.value } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpPass">SMTP Password</Label>
                            <Input
                              id="smtpPass"
                              type="password"
                              placeholder="Your email password or app password"
                              value={emailSettings?.smtpPass || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, smtpPass: e.target.value } : s)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fromEmail">From Email Address</Label>
                            <Input
                              id="fromEmail"
                              type="email"
                              placeholder="your-email@gmail.com"
                              value={emailSettings?.email || ''}
                              onChange={(e) => setEmailSettings(s => s ? { ...s, email: e.target.value } : s)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="smtpSecure"
                            checked={emailSettings?.smtpSecure !== false}
                            onCheckedChange={(checked) => setEmailSettings(s => s ? { ...s, smtpSecure: checked } : s)}
                          />
                          <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={testSmtpConnection}
                            disabled={testingSmtp || !emailSettings?.smtpHost || !emailSettings?.smtpUser || !emailSettings?.smtpPass || emailSettingsModified}
                            className="w-fit"
                          >
                            {testingSmtp ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Test SMTP Connection
                              </>
                            )}
                          </Button>
                          {emailSettingsModified && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Save your settings first to test the connection
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Save Settings */}
                    <div className="flex justify-end pt-4">
                      <Button onClick={saveEmailSettings} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Email Settings'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SMS and Call Tab - Only show when activeTab is 'sms' */}
          {activeTab === 'sms' && (
            <div className="space-y-8">
              <Card className="border-0 shadow-none overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">SMS and Call Settings</h2>
                      <p className="text-muted-foreground mt-1">Configure your Twilio phone number for SMS messaging</p>
                    </div>
                  </div>

                  {loadingSmsSettings ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Loading SMS settings...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Phone Number Configuration */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Phone Number Configuration</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-sm font-medium">
                              Twilio Phone Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="phoneNumber"
                              placeholder="+1234567890"
                              value={smsSettings?.phoneNumber || ''}
                              onChange={(e) => setSmsSettings(prev => ({
                                ...prev,
                                phoneNumber: e.target.value
                              }))}
                              className="font-mono"
                              disabled={!isAdminOrManager}
                              readOnly={!isAdminOrManager}
                            />
                            <p className="text-xs text-muted-foreground">
                              {isAdminOrManager 
                                ? 'Enter your Twilio phone number in E.164 format (e.g., +1234567890)'
                                : 'Only admins can modify the phone number'}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-sm font-medium">
                              Display Name (Optional)
                            </Label>
                            <Input
                              id="displayName"
                              placeholder="My Business Number"
                              value={smsSettings?.displayName || ''}
                              onChange={(e) => setSmsSettings(prev => ({
                                ...prev,
                                displayName: e.target.value
                              }))}
                              disabled={!isAdminOrManager}
                              readOnly={!isAdminOrManager}
                            />
                            <p className="text-xs text-muted-foreground">
                              {isAdminOrManager 
                                ? 'Friendly name for this phone number'
                                : 'Only admins can modify the display name'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Voicemail Greeting */}
                      <div className="space-y-6 pt-6 border-t">
                        <div className="flex items-center gap-3">
                          <Mic className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Voicemail Greeting</h3>
                          {savedVoicemailAt && (
                            <Badge variant="secondary" className="text-xs">
                              Saved
                              <span className="ml-2 text-muted-foreground">
                                {new Date(savedVoicemailAt).toLocaleString()}
                              </span>
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Record a voicemail greeting for your phone number. Callers will hear this message when the call goes to voicemail.
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={isRecordingVoicemail ? 'destructive' : 'default'}
                            onClick={isRecordingVoicemail ? stopVoicemailRecording : startVoicemailRecording}
                            className="gap-2"
                          >
                            {isRecordingVoicemail ? (
                              <>
                                <Square className="w-4 h-4" />
                                Stop Recording
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4" />
                                Record Greeting
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={saveVoicemailGreeting}
                            disabled={!voicemailBlob || savingVoicemailGreeting}
                            className="gap-2"
                          >
                            {savingVoicemailGreeting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Save Greeting
                              </>
                            )}
                          </Button>
                        </div>

                        {voicemailUrl && (
                          <div className="rounded-lg border border-border bg-background/50 p-4">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-sm font-medium">Preview</div>
                              <div className="text-xs text-muted-foreground">WAV</div>
                            </div>
                            <audio controls src={voicemailUrl} className="w-full" />
                          </div>
                        )}
                      </div>

                      {/* Save Button - Admin Only */}
                      {isAdminOrManager && (
                        <div className="flex justify-end pt-6 border-t">
                          <Button
                            onClick={saveSmsSettings}
                            disabled={savingSmsSettings || !smsSettings?.phoneNumber?.trim()}
                            className="min-w-[120px]"
                          >
                            {savingSmsSettings ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Settings
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Agents Tab - Only show when activeTab is 'agents' */}
          {activeTab === 'agents' && (
            <div className="space-y-8">
              {!isAdminOrManager ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have the required permissions to access this page.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-red-600 mb-2">Error loading agents</div>
                      <div className="text-sm text-gray-600">{error}</div>
                      <Button onClick={refreshAgents} className="mt-4">
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Team Management</h2>
                      <p className="text-muted-foreground mt-1">Manage your team members and their roles</p>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Agent
                    </Button>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{agents.length}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {agents.filter(a => a.status === 'active').length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive Agents</CardTitle>
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-600">
                          {agents.filter(a => a.status === 'inactive').length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">With Leads</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {agents.filter(a => a._count.assignedLeads > 0).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Search and Filters */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="Search agents by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Agents Table */}
                  <Card>
                    <CardContent className="p-0">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <div className="text-gray-600">Loading agents...</div>
                          </div>
                        </div>
                      ) : filteredAgents.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <div className="text-gray-600 mb-2">
                              {searchTerm ? 'No agents found matching your search' : 'No agents found'}
                            </div>
                            {!searchTerm && (
                              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Agent
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Assigned Leads</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAgents.map((agent) => (
                                <TableRow key={agent.id} className="hover:bg-gray-50">
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {agent.firstName} {agent.lastName}
                                      </div>
                                    </div>
                                  </TableCell>
                                  
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Mail className="w-3 h-3 mr-1" />
                                        {agent.email}
                                      </div>
                                      {agent.phone && (
                                        <div className="flex items-center text-sm text-gray-600">
                                          <Phone className="w-3 h-3 mr-1" />
                                          {agent.phone}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  
                                  <TableCell>
                                    <Badge className={getStatusColor(agent.status)}>
                                      {agent.status}
                                    </Badge>
                                  </TableCell>
                                  
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {getRoleColors(agent.roles).map((role, index) => (
                                        <Badge key={index} variant="outline" className={role.color}>
                                          {role.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  
                                  <TableCell>
                                    <div className="text-center">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                                        {agent._count.assignedLeads}
                                      </span>
                                    </div>
                                  </TableCell>
                                  
                                  <TableCell className="text-gray-600">
                                    {formatDate(agent.createdAt)}
                                  </TableCell>
                                  
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(agent)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit Agent
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => handleDelete(agent)}
                                          className="text-red-600 focus:text-red-600"
                                          disabled={agent._count.assignedLeads > 0}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Agent
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Add Agent Dialog */}
              <AddAgentDialog 
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onAgentCreated={refreshAgents}
              />

              {/* Edit Agent Dialog */}
              {selectedAgent && (
                <EditAgentDialog 
                  agent={selectedAgent}
                  open={showEditDialog}
                  onOpenChange={setShowEditDialog}
                  onAgentUpdated={refreshAgents}
                />
              )}

              {/* Delete Confirmation Dialog */}
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{agentToDelete?.firstName} {agentToDelete?.lastName}</strong>? 
                      This action cannot be undone.
                      {agentToDelete?._count.assignedLeads > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                          This agent has {agentToDelete._count.assignedLeads} assigned lead(s). 
                          Please reassign these leads before deleting the agent.
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={agentToDelete?._count.assignedLeads > 0}
                    >
                      Delete Agent
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Marketing Platform Settings Tab - Only show when activeTab is 'marketing-platforms' */}
          {activeTab === 'marketing-platforms' && (
            <div className="space-y-8">
              {!isAdminOrManager ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have the required permissions to access this page.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <MarketingPlatformSettings userRoles={user?.roles || []} />
              )}
            </div>
          )}

          {/* Pipeline Settings Tab - Only show when activeTab is 'pipeline' */}
          {activeTab === 'pipeline' && (
            <div className="space-y-8 relative" style={{ overflow: 'visible', position: 'relative' }}>
              {!isAdminOrManager ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have the required permissions to access this page.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <PipelineSettings userRoles={user?.roles || []} />
              )}
            </div>
          )}

          {/* Lead Distribution Tab - Only show when activeTab is 'lead-distribution' */}
          {activeTab === 'lead-distribution' && (
            <div className="space-y-8">
              {!isAdminOrManager ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have the required permissions to access this page.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <LeadDistributionSettings />
              )}
            </div>
          )}

          {/* Google Sheets section removed */}

          {/* Lead Status Settings Tab - Only show when activeTab is 'lead-statuses' */}
          {activeTab === 'lead-statuses' && (
            <div className="space-y-8">
              {!isAdminOrManager ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have the required permissions to access this page.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <LeadStatusSettings />
              )}
            </div>
          )}

          {/* Lead Source Settings Tab - Only show when activeTab is 'lead-sources' */}
          {activeTab === 'lead-sources' && (
            <div className="space-y-8">
              {!isAdminOrManager ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have the required permissions to access this page.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <LeadSourceSettings />
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default Settings;