import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, Calendar, TrendingUp, Home, BarChart3, MessageSquare, Phone, Mail, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import SMSWidget from "@/components/SMSWidget";
import CallWidget from "@/components/CallWidget";

const Index = () => {
  return (
    <div className="space-y-4">
      {/* Compact Widget Grid - Command Center Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Active Properties Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Building className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">+5%</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Properties</p>
            <p className="text-2xl font-black text-blue-900">124</p>
            <p className="text-xs text-blue-600">Vacant: <span className="font-semibold">3</span> • Needs Attention: <span className="font-semibold text-orange-600">2</span></p>
          </div>
        </Card>

        {/* Active Leads Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-green-200/50 bg-gradient-to-br from-green-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">+8%</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Active Leads</p>
            <p className="text-2xl font-black text-green-900">89</p>
            <p className="text-xs text-green-600">New This Week: <span className="font-semibold">12</span> • Hot: <span className="font-semibold text-red-600">8</span></p>
          </div>
        </Card>

        {/* Performance Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">+15%</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Closed This Month</p>
            <p className="text-2xl font-black text-purple-900">47</p>
            {/* Mini Bar Chart */}
            <div className="flex items-end gap-1 h-6">
              <div className="w-1 bg-purple-300 h-3"></div>
              <div className="w-1 bg-purple-400 h-4"></div>
              <div className="w-1 bg-purple-500 h-5"></div>
              <div className="w-1 bg-purple-600 h-6"></div>
              <div className="w-1 bg-purple-700 h-4"></div>
            </div>
          </div>
        </Card>

        {/* Pipeline Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">Pipeline</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Lead Pipeline</p>
            <p className="text-2xl font-black text-orange-900">156</p>
            <p className="text-xs text-orange-600">Prospects: <span className="font-semibold">15</span> • Qualified: <span className="font-semibold text-green-600">8</span></p>
          </div>
        </Card>

      </div>

      {/* Second Row - More Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Property Management Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Home className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-600 font-bold">→</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Property Mgmt</p>
            <p className="text-sm font-bold text-blue-900">Track & Manage</p>
            <p className="text-xs text-blue-600">Portfolio Overview</p>
          </div>
        </Card>

        {/* Communication Hub Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-green-200/50 bg-gradient-to-br from-green-50/80 to-white cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-bold text-red-600">3</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Communications</p>
            <p className="text-sm font-bold text-green-900">Messages & Calls</p>
            <p className="text-xs text-green-600">Unread: <span className="font-semibold text-red-600">3</span> • Appointments: <span className="font-semibold">1</span></p>
          </div>
        </Card>

        {/* Communication Widgets - SMS & Call */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-indigo-200/50 bg-gradient-to-br from-indigo-50/80 to-white">
          <Tabs defaultValue="sms" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="sms" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="call" className="text-xs">
                <Phone className="w-3 h-3 mr-1" />
                Call
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sms" className="mt-0">
              <SMSWidget />
            </TabsContent>
            
            <TabsContent value="call" className="mt-0">
              <CallWidget />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Alerts Widget */}
        <Card className="p-3 hover:shadow-lg transition-all duration-300 group border border-orange-200/50 bg-gradient-to-br from-orange-50/80 to-white">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-xs font-bold text-yellow-600">2</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Alerts</p>
            <p className="text-sm font-bold text-orange-900">Needs Attention</p>
            <p className="text-xs text-orange-600">Due Today: <span className="font-semibold text-red-600">2</span> • Overdue: <span className="font-semibold text-red-700">0</span></p>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Index;