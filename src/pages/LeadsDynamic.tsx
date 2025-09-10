import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Users, Phone, Mail, MapPin, Calendar, TrendingUp, Target, 
  Plus, Upload, Zap, ArrowUpRight, Clock, Star, Activity, 
  Flame, Snowflake, Eye, MessageCircle
} from "lucide-react";

const LeadsDynamic = () => {
  const leads = [
    {
      id: 1,
      name: "Jennifer Martinez",
      type: "buyer",
      phone: "(555) 123-4567",
      email: "j.martinez@email.com",
      location: "Downtown District",
      budget: "$450K - $650K",
      status: "hot",
      lastContact: "Today",
      source: "Website",
      priority: "high",
      score: 95,
      engagementScore: 88,
      responseTime: "2 min"
    },
    {
      id: 2,
      name: "Robert Thompson",
      type: "seller",
      phone: "(555) 987-6543", 
      email: "r.thompson@email.com",
      location: "Oakwood Heights",
      budget: "Selling for $850K",
      status: "warm",
      lastContact: "2 days ago",
      source: "Referral",
      priority: "medium",
      score: 78,
      engagementScore: 72,
      responseTime: "4 hours"
    },
    {
      id: 3,
      name: "Emily Davis",
      type: "buyer",
      phone: "(555) 456-7890",
      email: "emily.davis@email.com", 
      location: "Riverside Area",
      budget: "$300K - $400K",
      status: "cold",
      lastContact: "1 week ago",
      source: "Social Media",
      priority: "low",
      score: 45,
      engagementScore: 35,
      responseTime: "2 days"
    }
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'hot': 
        return { 
          className: 'bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-lg shadow-red-500/30',
          icon: <Flame className="w-4 h-4" />,
          pulse: true
        };
      case 'warm': 
        return { 
          className: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg shadow-yellow-500/30',
          icon: <TrendingUp className="w-4 h-4" />,
          pulse: false
        };
      case 'cold': 
        return { 
          className: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white border-0 shadow-lg shadow-blue-500/30',
          icon: <Snowflake className="w-4 h-4" />,
          pulse: false
        };
      default: 
        return { 
          className: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0',
          icon: <Clock className="w-4 h-4" />,
          pulse: false
        };
    }
  };

  const getTypeConfig = (type: string) => {
    return type === 'buyer' 
      ? { 
          className: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-lg shadow-blue-500/30',
          label: 'BUYER'
        }
      : { 
          className: 'bg-gradient-to-r from-green-500 to-teal-500 text-white border-0 shadow-lg shadow-green-500/30',
          label: 'SELLER'
        };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-green-500/30';
    if (score >= 60) return 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-yellow-500/30';
    return 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/30';
  };

  return (
    <div className="concept2 dynamic-bg min-h-screen">
      <div className="relative z-10 space-y-8 p-8">
        {/* Dynamic Hero Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="stats-ring p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl shadow-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="gradient-text-dynamic text-5xl font-black tracking-tight mb-2 text-balance">
                  Dynamic Lead Hub
                </h1>
                <p className="text-xl font-bold text-gray-600 uppercase tracking-wider text-shadow-soft">
                  Real-time intelligence & engagement
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-8 py-4 rounded-2xl shadow-2xl shadow-purple-500/25 hover:scale-105 transition-all duration-300">
              <Upload className="w-5 h-5 mr-3" />
              Bulk Import
            </Button>
            <Button className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white border-0 px-8 py-4 rounded-2xl shadow-2xl shadow-green-500/25 hover:scale-105 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center">
                <Plus className="w-5 h-5 mr-3" />
                Add High-Value Lead
              </div>
            </Button>
          </div>
        </div>

        {/* Dynamic Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <Card className="dynamic-card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <ArrowUpRight className="w-4 h-4" />
                +12%
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Total Leads</p>
              <p className="text-4xl font-black text-blue-900">{leads.length}</p>
            </div>
          </Card>

          <Card className="dynamic-card p-6 bg-gradient-to-br from-red-50 to-orange-100 border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div className="stats-ring p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg shadow-red-500/25 pulse-dynamic">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-sm font-bold text-red-600 uppercase tracking-wider mb-1">Hot Leads</p>
              <p className="text-4xl font-black text-red-900">{leads.filter(l => l.status === 'hot').length}</p>
            </div>
          </Card>

          <Card className="dynamic-card p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/25 glow-pulse">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <TrendingUp className="w-4 h-4" />
                +8%
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-1">Convert Rate</p>
              <p className="text-4xl font-black text-purple-900">24.5%</p>
            </div>
          </Card>

          <Card className="dynamic-card p-6 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/25">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <Zap className="w-4 h-4" />
                Live
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-4xl font-black text-green-900">
                {Math.round(leads.reduce((acc, lead) => acc + lead.score, 0) / leads.length)}
              </p>
            </div>
          </Card>

          <Card className="dynamic-card p-6 bg-gradient-to-br from-orange-50 to-yellow-100 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl shadow-lg shadow-orange-500/25 float-dynamic">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-orange-600 text-sm font-bold">2 min</div>
            </div>
            <div>
              <p className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-1">Avg Response</p>
              <p className="text-4xl font-black text-orange-900">Fast</p>
            </div>
          </Card>
        </div>

        {/* Dynamic Leads Gallery */}
        <div className="space-y-8">
          {leads.map((lead, index) => {
            const statusConfig = getStatusConfig(lead.status);
            const typeConfig = getTypeConfig(lead.type);
            
            return (
              <Card 
                key={lead.id} 
                className="dynamic-card bg-white/95 backdrop-blur-xl border-2 border-gray-200 overflow-hidden relative group shadow-xl"
                style={{
                  animationDelay: `${index * 150}ms`
                }}
              >
                {/* Score indicator bar */}
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-2 transition-all duration-1000 ease-out shadow-lg",
                    getScoreColor(lead.score)
                  )}
                  style={{ width: `${lead.score}%` }}
                ></div>

                <div className="p-8 pt-10">
                  <div className="flex flex-col xl:flex-row gap-8">
                    
                    {/* Dynamic Profile Section */}
                    <div className="flex items-start gap-6 min-w-fit">
                      <div className="relative">
                        <Avatar className="w-24 h-24 border-4 border-white shadow-2xl ring-4 ring-gray-100">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-black">
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Dynamic score badge */}
                        <div className={cn(
                          "absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl flex items-center justify-center shadow-xl font-black text-white text-sm",
                          getScoreColor(lead.score)
                        )}>
                          {lead.score}
                        </div>
                        
                        {/* Status indicator */}
                        <div className={cn(
                          "absolute -top-2 -left-2 w-6 h-6 rounded-xl flex items-center justify-center shadow-lg",
                          statusConfig.className
                        )}>
                          {statusConfig.icon}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <h3 className="text-3xl font-black text-gray-900 tracking-tight text-shadow-soft">{lead.name}</h3>
                          <div className="flex flex-wrap gap-3">
                            <Badge className={`${typeConfig.className} font-bold px-5 py-2 text-sm rounded-xl shadow-lg uppercase tracking-wider`}>
                              {typeConfig.label}
                            </Badge>
                            <Badge className={cn(
                              `${statusConfig.className} font-bold px-5 py-2 text-sm rounded-xl flex items-center gap-2 uppercase tracking-wider`,
                              statusConfig.pulse && "animate-pulse"
                            )}>
                              {statusConfig.icon}
                              {lead.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-2xl font-black text-gray-900">{lead.budget}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-bold text-gray-600">
                              <span className="font-black">Source:</span> {lead.source}
                            </span>
                            <span className="font-bold text-gray-600">
                              <span className="font-black">Response:</span> {lead.responseTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Contact Matrix */}
                    <div className="flex-1 xl:ml-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border-2 border-blue-200 dynamic-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                              <Phone className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Phone</p>
                          </div>
                          <p className="text-sm font-bold text-blue-900">{lead.phone}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-2xl border-2 border-purple-200 dynamic-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                              <Mail className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs font-black text-purple-600 uppercase tracking-wider">Email</p>
                          </div>
                          <p className="text-sm font-bold text-purple-900">{lead.email}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-2xl border-2 border-green-200 dynamic-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                              <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs font-black text-green-600 uppercase tracking-wider">Location</p>
                          </div>
                          <p className="text-sm font-bold text-green-900">{lead.location}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-orange-50 to-yellow-100 p-4 rounded-2xl border-2 border-orange-200 dynamic-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl shadow-lg">
                              <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs font-black text-orange-600 uppercase tracking-wider">Last Contact</p>
                          </div>
                          <p className="text-sm font-bold text-orange-900">{lead.lastContact}</p>
                        </div>
                      </div>

                      {/* Dynamic Action Center */}
                      <div className="flex flex-wrap gap-4">
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300">
                          <Phone className="w-4 h-4 mr-2" />
                          Contact Now
                        </Button>
                        <Button className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white border-0 px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300">
                          <Eye className="w-4 h-4 mr-2" />
                          View Analytics
                        </Button>
                        <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300">
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Meeting
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeadsDynamic;