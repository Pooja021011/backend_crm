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
  UserCog,
  Mail,
  MessageSquare,
  FileSpreadsheet,
  Tags
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
  { title: "Pipeline", url: "/pipeline", icon: TrendingUp },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Metrics", url: "/metrics", icon: BarChart3 },
  { 
    title: "Settings", 
    icon: Settings, 
    hasSubmenu: true,
    subItems: [
      { title: "Profile", url: "/settings?tab=profile", icon: User },
      { title: "Email Sync", url: "/settings?tab=email", icon: Mail },
      { title: "SMS and Call", url: "/settings?tab=sms", icon: MessageSquare },
      { title: "Agents", url: "/settings?tab=agents", icon: UserCog, adminOnly: true },
      { title: "Lead Distribution", url: "/settings?tab=lead-distribution", icon: Users, adminOnly: true },
      { title: "Lead Statuses", url: "/settings?tab=lead-statuses", icon: Tags, adminOnly: true },
      { title: "Lead Sources", url: "/settings?tab=lead-sources", icon: Tags, adminOnly: true },
      { title: "Marketing Platforms", url: "/settings?tab=marketing-platforms", icon: Building2, adminOnly: true },
      { title: "Pipeline Statuses", url: "/settings?tab=pipeline", icon: TrendingUp, adminOnly: true },
    ]
  },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]); // No menus expanded by default

  const isCollapsed = state === "collapsed";
  const isAdmin = user?.roles?.some(role => ['ADMIN', 'MANAGER'].includes(role)) || false;

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "User";
  const orgName = "Real Estate Buyers";
  const initials = (() => {
    const first = user?.firstName?.trim()?.[0] || '';
    const last = user?.lastName?.trim()?.[0] || '';
    const combo = `${first}${last}`.toUpperCase();
    return combo || (user?.email?.trim()?.[0] || 'U').toUpperCase();
  })();

  const isActive = (path: string) => {
    if (path === "/inbox" && (currentPath === "/inbox" || currentPath === "/")) return true;
    if (path !== "/inbox" && path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const isSubItemActive = (url: string) => {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const tab = urlParams.get('tab');
    const currentParams = new URLSearchParams(location.search);
    const currentTab = currentParams.get('tab');
    return currentPath === '/settings' && tab === currentTab;
  };

  const toggleSubmenu = (menuTitle: string) => {
    if (isCollapsed) return; // Don't toggle when collapsed
    setExpandedMenus(prev => 
      prev.includes(menuTitle) 
        ? prev.filter(item => item !== menuTitle)
        : [...prev, menuTitle]
    );
  };

  const getNavClassName = (path: string) =>
    cn(
      "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg group",
      isCollapsed ? "justify-center" : "justify-start",
      isActive(path) 
        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground shadow-sm" 
        : ""
    );

  const getSubNavClassName = (url: string) =>
    cn(
      "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg group text-sm pl-0 h-auto py-2",
      isSubItemActive(url) 
        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground shadow-sm" 
        : ""
    );

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border bg-sidebar",
        isCollapsed ? "w-16" : "w-56"
      )}
      collapsible="icon"
    >
      <SidebarContent className="flex flex-col h-full">
        {/* User Info Section - Dark Header */}
        <div className={cn(
          "bg-sidebar-accent/20 border-b border-sidebar-border/50",
          isCollapsed ? "px-0 py-3" : "p-4"
        )}>
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
            <Avatar className={cn(
              "border-2 border-sidebar-border/30",
              isCollapsed ? "w-8 h-8" : "w-10 h-10"
            )}>
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</h3>
                    <p className="text-xs text-sidebar-foreground/70 truncate">{orgName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className={cn("flex-1 py-4", isCollapsed ? "px-0" : "px-2")}>
          <SidebarGroup className={isCollapsed ? "p-0" : ""}>
            <SidebarGroupContent>
              <SidebarMenu className={cn("space-y-1", isCollapsed && "items-center")}>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.hasSubmenu ? (
                      <>
                        {/* Main menu item with submenu */}
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => toggleSubmenu(item.title)}
                            className={cn(
                              "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg group",
                              isCollapsed ? "justify-center" : "justify-between",
                              currentPath === '/settings' 
                                ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground shadow-sm" 
                                : ""
                            )}
                          >
                            <div className={cn("flex items-center", isCollapsed && "justify-center")}>
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              {!isCollapsed && (
                                <span className="ml-3 font-medium">{item.title}</span>
                              )}
                            </div>
                            {!isCollapsed && (
                              <ChevronDown 
                                className={cn(
                                  "w-4 h-4",
                                  expandedMenus.includes(item.title) ? "rotate-180" : ""
                                )} 
                              />
                            )}
                          </button>
                        </SidebarMenuButton>
                        
                        {/* Submenu items */}
                        {!isCollapsed && expandedMenus.includes(item.title) && item.subItems && (
                          <div className="ml-2 mt-1 space-y-1">
                            {item.subItems
                              .filter((subItem) => !subItem.adminOnly || isAdmin)
                              .map((subItem) => (
                              <SidebarMenuButton key={subItem.title} asChild>
                                <NavLink 
                                  to={subItem.url} 
                                  className={getSubNavClassName(subItem.url)}
                                >
                                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="ml-2 font-medium text-sm whitespace-normal leading-tight">{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Regular menu item without submenu */
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          className={getNavClassName(item.url)}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && (
                            <span className="ml-3 font-medium">{item.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Collapse/Expand Toggle Button */}
        <div className={cn(
          "border-t border-sidebar-border/50",
          isCollapsed ? "px-0 py-2" : "p-3"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed ? "justify-center" : "justify-start"
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