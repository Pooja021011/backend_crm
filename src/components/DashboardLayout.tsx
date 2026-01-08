import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IncomingCallPopup } from "@/components/IncomingCallPopup";
import { CallWaitingPopup } from "@/components/CallWaitingPopup";
import { ActiveCallWidget } from "@/components/ActiveCallWidget";
import { useTwilioContext } from "@/contexts/TwilioContext";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const { isAuthenticated } = useAuth();
  const { 
    incomingCall, 
    answerCall, 
    rejectCall, 
    initializeDevice,
    activeCall,
    callStatus,
    hangUp,
    toggleMute,
    isMuted,
    currentCallNumber
  } = useTwilioContext();

  // Initialize Twilio device when component mounts
  useEffect(() => {
    if (!isAuthenticated) return;
    console.log('🎤 Initializing Twilio Device for incoming calls...');
    initializeDevice().catch(err => {
      console.error('Failed to initialize Twilio device:', err);
    });
  }, [initializeDevice, isAuthenticated]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-primary/5 via-content to-success/3 overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col transition-all duration-300 min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6 w-full">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-soft border border-white/20">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Global Incoming Call Popup - Only show if no active call */}
        {incomingCall && !activeCall && callStatus.status === 'idle' && (
          <IncomingCallPopup
            incomingCall={incomingCall}
            onAnswer={answerCall}
            onReject={rejectCall}
          />
        )}

        {/* Call Waiting Popup - Show when incoming call arrives during active call */}
        {incomingCall && activeCall && (
          <CallWaitingPopup
            incomingCall={incomingCall}
            onSendToVoicemail={rejectCall}
            onIgnore={() => {
              // Just close the popup, let call keep ringing
              // User can answer from notification or let it go to voicemail after timeout
              console.log('User chose to ignore call waiting');
            }}
            currentCallDuration={callStatus.duration}
          />
        )}

        {/* Active Call Widget - Shows when call is connected */}
        {activeCall && !incomingCall && (
          <ActiveCallWidget
            callStatus={callStatus}
            isMuted={isMuted}
            onHangUp={hangUp}
            onToggleMute={toggleMute}
            contactInfo={{
              phoneNumber: currentCallNumber || 'Unknown'
            }}
          />
        )}
      </div>
    </SidebarProvider>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}