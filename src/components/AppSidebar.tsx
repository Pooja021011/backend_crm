import { useState } from "react";
import { 
  Inbox, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  User,
  ChevronDown,
  UserCog
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigationItems = [
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: TrendingUp },
  { title: "Metrics", url: "/metrics", icon: BarChart3 },
  { title: "Agents", url: "/agents", icon: UserCog, adminOnly: true },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";
  const isAdmin = user?.roles?.includes('ADMIN') || false;

  const isActive = (path: string) => {
    if (path === "/inbox" && (currentPath === "/inbox" || currentPath === "/")) return true;
    if (path !== "/inbox" && path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavClassName = (path: string) =>
    cn(
      "w-full justify-start transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg group",
      isActive(path) 
        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground shadow-sm" 
        : ""
    );

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarContent className="flex flex-col h-full">
        {/* User Info Section - Dark Header */}
        <div className={cn(
          "bg-sidebar-accent/20 border-b border-sidebar-border/50 transition-all duration-300",
          isCollapsed ? "p-3" : "p-4"
        )}>
          <div className="flex items-center gap-3">
            <Avatar className={cn(
              "border-2 border-sidebar-border/30 transition-all duration-300",
              isCollapsed ? "w-8 h-8" : "w-10 h-10"
            )}>
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                CH
              </AvatarFallback>
            </Avatar>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-sidebar-foreground truncate">Chris Harris</h3>
                    <p className="text-xs text-sidebar-foreground/70 truncate">Real Estate Buyers</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 flex-shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-2 py-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavClassName(item.url)}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="ml-3 animate-fade-in font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Collapse/Expand Toggle Button */}
        <div className={cn(
          "border-t border-sidebar-border/50 transition-all duration-300",
          isCollapsed ? "p-2" : "p-3"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200",
              isCollapsed ? "px-2" : "justify-start"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-2 text-sm font-medium">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}