import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Users, Phone, Mail, MapPin, Calendar, TrendingUp, Target, 
  Sparkles, Clock, Star, Award, Crown, MessageCircle, User
} from "lucide-react";

const LeadsExecutive = () => {
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
      score: 95
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
      score: 78
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
      score: 45
    }
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'hot': 
        return { 
          className: 'bg-gradient-success border-0 text-success-foreground shadow-soft',
          icon: <Star className="w-3 h-3" />
        };
      case 'warm': 
        return { 
          className: 'bg-gradient-to-r from-warning/20 to-warning/10 text-warning border-warning/30',
          icon: <TrendingUp className="w-3 h-3" />
        };
      case 'cold': 
        return { 
          className: 'bg-muted/50 text-muted-foreground border-muted/40',
          icon: <Clock className="w-3 h-3" />
        };
      default: 
        return { 
          className: 'bg-muted/50 text-muted-foreground border-muted/40',
          icon: <Clock className="w-3 h-3" />
        };
    }
  };

  const getTypeConfig = (type: string) => {
    return type === 'buyer' 
      ? { 
          className: 'bg-primary/15 text-primary border-primary/30',
          label: 'Buyer'
        }
      : { 
          className: 'bg-accent/15 text-accent-foreground border-accent/30',
          label: 'Seller'
        };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Professional Header with Stats */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-medium">Leads</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lead Management</h1>
          <p className="text-sm text-muted-foreground">Manage your leads and track their progress through the sales pipeline.</p>
        </div>
        
        {/* Attractive Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Leads */}
          <div className="p-4 border-2 hover:shadow-xl transition-all duration-500 group relative overflow-hidden hover:scale-105 hover:-translate-y-1 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-100 hover:border-blue-300 rounded-xl">
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
              <div className="absolute inset-0 blur-xl bg-blue-400"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-blue-600 text-sm font-bold bg-blue-100 px-2 py-1 rounded-full">
                  <span>↗</span>
                  <span>+15%</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Leads</p>
                <p className="text-xl font-black tracking-tight text-blue-900">{leads.length}</p>
              </div>
            </div>
          </div>

          {/* Hot Leads */}
          <div className="p-4 border-2 hover:shadow-xl transition-all duration-500 group relative overflow-hidden hover:scale-105 hover:-translate-y-1 border-red-200 bg-gradient-to-br from-red-50 to-pink-100 hover:border-red-300 rounded-xl">
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
              <div className="absolute inset-0 blur-xl bg-red-400"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-red-500 to-pink-600 text-white">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-red-600 text-sm font-bold bg-red-100 px-2 py-1 rounded-full">
                  <span>🔥</span>
                  <span>Hot</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">Hot Leads</p>
                <p className="text-xl font-black tracking-tight text-red-900">{leads.filter(l => l.status === 'hot').length}</p>
              </div>
            </div>
          </div>

          {/* Warm Leads */}
          <div className="p-4 border-2 hover:shadow-xl transition-all duration-500 group relative overflow-hidden hover:scale-105 hover:-translate-y-1 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-100 hover:border-orange-300 rounded-xl">
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
              <div className="absolute inset-0 blur-xl bg-orange-400"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-orange-500 to-yellow-600 text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-orange-600 text-sm font-bold bg-orange-100 px-2 py-1 rounded-full">
                  <span>⚡</span>
                  <span>Warm</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Warm Leads</p>
                <p className="text-xl font-black tracking-tight text-orange-900">{leads.filter(l => l.status === 'warm').length}</p>
              </div>
            </div>
          </div>

          {/* Avg Score */}
          <div className="p-4 border-2 hover:shadow-xl transition-all duration-500 group relative overflow-hidden hover:scale-105 hover:-translate-y-1 border-green-200 bg-gradient-to-br from-green-50 to-emerald-100 hover:border-green-300 rounded-xl">
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
              <div className="absolute inset-0 blur-xl bg-green-400"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <Star className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-green-600 text-sm font-bold bg-green-100 px-2 py-1 rounded-full">
                  <span>⭐</span>
                  <span>{Math.round(leads.reduce((acc, lead) => acc + lead.score, 0) / leads.length)}%</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700">Avg Score</p>
                <p className="text-xl font-black tracking-tight text-green-900">{Math.round(leads.reduce((acc, lead) => acc + lead.score, 0) / leads.length)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">All Leads</h2>
          <p className="text-xs text-muted-foreground">View and manage all your leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Import
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <User className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Attractive Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {leads.map((lead) => (
          <Card key={lead.id} className={cn(
            "p-6 border-2 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group relative overflow-hidden hover:scale-[1.02] hover:-translate-y-1",
            lead.status === 'hot' && "border-red-200 bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 hover:border-red-300",
            lead.status === 'warm' && "border-orange-200 bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 hover:border-orange-300",
            lead.status === 'cold' && "border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 hover:border-slate-300"
          )}>
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
              <div className={cn(
                "absolute inset-0 blur-xl",
                lead.status === 'hot' && "bg-red-400",
                lead.status === 'warm' && "bg-orange-400",
                lead.status === 'cold' && "bg-blue-400"
              )}></div>
            </div>

            <div className="relative z-10 space-y-4">
              {/* Lead Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                      <div className="text-white font-bold text-lg">
                          {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg",
                      lead.score >= 80 ? "bg-green-500" : lead.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                    )}>
                      {lead.score}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors duration-300 truncate">
                      {lead.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={cn(
                        "text-xs px-3 py-1 rounded-full font-bold",
                        lead.type === 'buyer' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      )}>
                          {getTypeConfig(lead.type).label}
                      </div>
                      <div className={cn(
                        "text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1",
                        lead.status === 'hot' && "bg-red-100 text-red-700",
                        lead.status === 'warm' && "bg-orange-100 text-orange-700",
                        lead.status === 'cold' && "bg-slate-100 text-slate-700"
                      )}>
                          {getStatusConfig(lead.status).icon}
                          {lead.status}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full shadow-lg",
                  getPriorityColor(lead.priority)
                )}></div>
                </div>

              {/* Budget and Source */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-white/50 rounded-lg border border-white/30">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Budget</p>
                  <p className="font-bold text-sm text-slate-800">{lead.budget}</p>
                  </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Source</p>
                  <p className="font-bold text-sm text-blue-600">{lead.source}</p>
                </div>
                </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-slate-700">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-700 truncate">{lead.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-slate-600">{lead.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-slate-600">Last: {lead.lastContact}</span>
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" size="sm">
                  <Users className="w-4 h-4" />
                  </Button>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" size="sm">
                  <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default LeadsExecutive;