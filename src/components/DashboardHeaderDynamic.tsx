import { Search, Building2, TrendingUp, Users, DollarSign, Menu, Zap, Activity, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface DynamicKPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  color: "blue" | "purple" | "orange" | "green";
  className?: string;
}

const DynamicKPICard = ({ title, value, icon, trend = 0, color, className }: DynamicKPICardProps) => {
  const colorConfig = {
    blue: {
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
      glow: "shadow-blue-500/25",
      ring: "ring-blue-500/20"
    },
    purple: {
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600", 
      glow: "shadow-purple-500/25",
      ring: "ring-purple-500/20"
    },
    orange: {
      gradient: "bg-gradient-to-br from-orange-500 to-orange-600",
      glow: "shadow-orange-500/25", 
      ring: "ring-orange-500/20"
    },
    green: {
      gradient: "bg-gradient-to-br from-green-500 to-green-600",
      glow: "shadow-green-500/25",
      ring: "ring-green-500/20"
    }
  };

  const config = colorConfig[color];

  return (
    <Card className={cn(
      "dynamic-card p-6 border-2 border-white/20 bg-white/90 backdrop-blur-xl relative group overflow-hidden",
      className
    )}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-current to-transparent"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "stats-ring p-3 rounded-2xl shadow-2xl",
            config.gradient,
            config.glow
          )}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          
          {trend !== 0 && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold",
              trend > 0 
                ? "bg-green-100 text-green-800 border border-green-200" 
                : "bg-red-100 text-red-800 border border-red-200"
            )}>
              <Activity className="w-3 h-3" />
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              config.gradient
            )}
            style={{ width: `${Math.min(Math.abs(trend) + 60, 100)}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
};

export const DashboardHeaderDynamic = () => {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b-2 border-gray-100 sticky top-0 z-50 shadow-xl shadow-blue-500/5">
      <div className="container mx-auto px-6 py-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          {/* Dynamic branding */}
          <div className="flex items-center space-x-6 min-w-fit">
            <SidebarTrigger className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 rounded-2xl shadow-2xl shadow-blue-500/25 hover:shadow-purple-500/25 hover:scale-105 transition-all duration-300">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl shadow-blue-500/30 float-dynamic">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg pulse-dynamic">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="gradient-text-dynamic text-3xl font-black tracking-tight">Local Homes Buyers</h1>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Dynamic Intelligence Hub</p>
              </div>
            </div>
          </div>

          {/* Dynamic search */}
          <div className="flex-1 max-w-2xl mx-auto xl:mx-8 order-3 xl:order-2">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
              <Input
                type="search"
                placeholder="Search leads, properties, analytics..."
                className="pl-14 pr-6 py-4 w-full bg-white/90 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 rounded-2xl shadow-xl text-lg font-medium placeholder:text-gray-400 transition-all duration-300"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300"></div>
            </div>
          </div>

          {/* Dynamic KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 order-2 xl:order-3 min-w-fit">
            <DynamicKPICard
              title="Active Deals"
              value="24"
              icon={<Users className="w-6 h-6" />}
              trend={15}
              color="blue"
              className="min-w-[180px]"
            />
            <DynamicKPICard
              title="Revenue"
              value="$485K"
              icon={<DollarSign className="w-6 h-6" />}
              trend={23}
              color="green"
              className="min-w-[180px]"
            />
            <DynamicKPICard
              title="Conversion"
              value="24.5%"
              icon={<Target className="w-6 h-6" />}
              trend={8}
              color="purple"
              className="min-w-[180px]"
            />
          </div>
        </div>
      </div>
    </header>
  );
};