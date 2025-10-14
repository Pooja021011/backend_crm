import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-primary/5 via-content to-success/3">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col transition-all duration-300">
          <DashboardHeader />
          
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6" style={{ maxWidth: '90rem', padding: '0px', margin: '0px' }}>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-soft border border-white/20">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}