import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Clock, BarChart3, Activity, Zap, Trophy, Award, FileText, MessageSquare, Phone, CheckSquare, MessageCircle, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Metrics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showRevenue, setShowRevenue] = useState(true);
  const [showLeads, setShowLeads] = useState(true);
  const [showConversion, setShowConversion] = useState(true);
  const [activeTab, setActiveTab] = useState('company');

  // Company Overview Data
  const companyMetrics = [
    { title: 'Total Leads', value: '1,247', change: '+12%', trend: 'up', icon: Users },
    { title: 'Active Deals', value: '89', change: '+8%', trend: 'up', icon: Target },
    { title: 'Revenue', value: '$485K', change: '+15%', trend: 'up', icon: DollarSign },
    { title: 'Conversion Rate', value: '24%', change: '+3%', trend: 'up', icon: TrendingUp },
    { title: 'Avg Deal Size', value: '$12.5K', change: '-2%', trend: 'down', icon: DollarSign },
    { title: 'Sales Cycle', value: '45 days', change: '-5%', trend: 'up', icon: Clock },
    { title: 'Pipeline Value', value: '$2.1M', change: '+18%', trend: 'up', icon: Target },
    { title: 'Win Rate', value: '32%', change: '+7%', trend: 'up', icon: TrendingUp },
    { title: 'Lost Deals', value: '156', change: '-12%', trend: 'up', icon: TrendingDown },
  ];

  // Marketing Overview Data
  const marketingMetrics = [
    { title: 'Website Visitors', value: '12,847', change: '+22%', trend: 'up' },
    { title: 'Lead Generation', value: '342', change: '+15%', trend: 'up' },
    { title: 'Email Open Rate', value: '28%', change: '+5%', trend: 'up' },
    { title: 'Click-through Rate', value: '4.2%', change: '+8%', trend: 'up' },
    { title: 'Cost per Lead', value: '$45', change: '-12%', trend: 'up' },
    { title: 'Social Media Reach', value: '8.5K', change: '+18%', trend: 'up' },
  ];

  // Chart data for Marketing Overview
  const chartData = [
    { name: 'Jan', revenue: 4000, leads: 240, conversion: 18, totalLeads: 240, contractedLeads: 45, soldLeads: 38, closedLeads: 32 },
    { name: 'Feb', revenue: 3000, leads: 198, conversion: 22, totalLeads: 198, contractedLeads: 42, soldLeads: 35, closedLeads: 28 },
    { name: 'Mar', revenue: 2000, leads: 180, conversion: 25, totalLeads: 180, contractedLeads: 38, soldLeads: 32, closedLeads: 25 },
    { name: 'Apr', revenue: 2780, leads: 220, conversion: 28, totalLeads: 220, contractedLeads: 48, soldLeads: 42, closedLeads: 35 },
    { name: 'May', revenue: 1890, leads: 160, conversion: 24, totalLeads: 160, contractedLeads: 35, soldLeads: 28, closedLeads: 22 },
    { name: 'Jun', revenue: 2390, leads: 200, conversion: 26, totalLeads: 200, contractedLeads: 42, soldLeads: 36, closedLeads: 30 },
    { name: 'Jul', revenue: 3200, leads: 280, conversion: 30, totalLeads: 280, contractedLeads: 58, soldLeads: 48, closedLeads: 42 },
    { name: 'Aug', revenue: 3800, leads: 320, conversion: 32, totalLeads: 320, contractedLeads: 68, soldLeads: 58, closedLeads: 48 },
    { name: 'Sep', revenue: 4200, leads: 350, conversion: 35, totalLeads: 350, contractedLeads: 75, soldLeads: 65, closedLeads: 55 },
    { name: 'Oct', revenue: 4800, leads: 380, conversion: 38, totalLeads: 380, contractedLeads: 82, soldLeads: 72, closedLeads: 62 },
    { name: 'Nov', revenue: 5200, leads: 420, conversion: 42, totalLeads: 420, contractedLeads: 92, soldLeads: 78, closedLeads: 68 },
    { name: 'Dec', revenue: 5800, leads: 480, conversion: 45, totalLeads: 480, contractedLeads: 105, soldLeads: 88, closedLeads: 75 },
  ];

  const pieData = [
    { name: 'Website', value: 35, color: '#3b82f6' },
    { name: 'Referrals', value: 25, color: '#10b981' },
    { name: 'Social Media', value: 20, color: '#f59e0b' },
    { name: 'Direct Mail', value: 15, color: '#ef4444' },
    { name: 'Other', value: 5, color: '#8b5cf6' },
  ];

  // Pipeline data for funnel chart
  const pipelineData = [
    { id: 'new-lead', name: 'New Lead', count: 160, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '100%', lost: 0, lostPercentage: '0%' },
    { id: 'no-contact', name: 'No Contact Made', count: 140, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '88%', lost: 20, lostPercentage: '12%' },
    { id: 'contact-made', name: 'Contact Made', count: 120, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '86%', lost: 20, lostPercentage: '14%' },
    { id: 'appointment-set', name: 'Appointment Set', count: 95, color: 'bg-blue-500', badge: 'bg-blue-500', percentage: '79%', lost: 25, lostPercentage: '21%' },
    { id: 'appointment-complete', name: 'Appointment Complete', count: 80, color: 'bg-blue-500', badge: 'bg-blue-500', percentage: '84%', lost: 15, lostPercentage: '16%' },
    { id: 'due-diligence', name: 'Due Diligence Complete', count: 65, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '81%', lost: 15, lostPercentage: '19%' },
    { id: 'offer-made', name: 'Offer Made', count: 50, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '77%', lost: 15, lostPercentage: '23%' },
    { id: 'contract-sent', name: 'Contract Sent', count: 40, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '80%', lost: 10, lostPercentage: '20%' },
    { id: 'under-contract', name: 'Under Contract', count: 30, color: 'bg-blue-500', badge: 'bg-blue-500', percentage: '75%', lost: 10, lostPercentage: '25%' },
    { id: 'processing', name: 'Processing', count: 25, color: 'bg-blue-500', badge: 'bg-blue-500', percentage: '83%', lost: 5, lostPercentage: '17%' },
    { id: 'for-sale', name: 'For Sale', count: 20, color: 'bg-orange-500', badge: 'bg-orange-500', percentage: '80%', lost: 5, lostPercentage: '20%' },
    { id: 'under-contract-sale', name: 'Under Contract (Sale)', count: 15, color: 'bg-blue-500', badge: 'bg-blue-500', percentage: '75%', lost: 5, lostPercentage: '25%' },
    { id: 'closed', name: 'Closed', count: 12, color: 'bg-green-500', badge: 'bg-green-500', percentage: '80%', lost: 3, lostPercentage: '20%' }
  ];

  // Timeline Metrics Data
  const timelineData = [
    { type: 'Cold Calling', created_appt: '5 days', appt_offer: '2 days', created_offer: '7 days', offer_closed: '3 days' },
    { type: 'Direct Mail', created_appt: '8 days', appt_offer: '1 days', created_offer: '9 days', offer_closed: '5 days' },
    { type: 'SMS Blast', created_appt: '3 days', appt_offer: '1 days', created_offer: '4 days', offer_closed: '2 days' },
    { type: 'Website', created_appt: '0 days', appt_offer: '0 days', created_offer: '12 days', offer_closed: '8 days' },
    { type: 'Total', created_appt: '0 days', appt_offer: '0 days', created_offer: '4 days', offer_closed: '2 days' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Metrics</h1>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          onClick={() => setActiveTab("company")}
          variant={activeTab === "company" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Company Overview
        </Button>
        
        <Button
          onClick={() => setActiveTab("marketing")}
          variant={activeTab === "marketing" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Marketing Overview
        </Button>
        
        <Button
          onClick={() => setActiveTab("pipeline")}
          variant={activeTab === "pipeline" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          Pipeline Overview
        </Button>
        
        <Button
          onClick={() => setActiveTab("communications")}
          variant={activeTab === "communications" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Communications View
        </Button>
        
        <Button
          onClick={() => setActiveTab("acquisitions")}
          variant={activeTab === "acquisitions" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Acquisitions Team
        </Button>
        
        <Button
          onClick={() => setActiveTab("dispositions-team")}
          variant={activeTab === "dispositions-team" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Dispositions Team
        </Button>
        
        <Button
          onClick={() => setActiveTab("transaction-coordinator")}
          variant={activeTab === "transaction-coordinator" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Transaction Coordinator
        </Button>
        
        <Button
          onClick={() => setActiveTab("acquisitions-leaderboard")}
          variant={activeTab === "acquisitions-leaderboard" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          Acquisitions Leaderboard
        </Button>
        
        <Button
          onClick={() => setActiveTab("dispositions-leaderboard")}
          variant={activeTab === "dispositions-leaderboard" ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Award className="w-4 h-4" />
          Dispositions Leaderboard
        </Button>
      </div>

      {/* Company Overview Tab */}
      {activeTab === "company" && (
        <div className="space-y-6">
          {/* Row 1 - Main KPIs (4 metrics) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Contracts Signed */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+12%</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Contracts Signed</p>
                <p className="text-3xl font-black text-blue-900">24</p>
                <p className="text-xs text-blue-600">Acquisitions Team</p>
              </div>
            </Card>

            {/* Contracts Sold */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-green-200 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+8%</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-green-600 uppercase tracking-wider">Contracts Sold</p>
                <p className="text-3xl font-black text-green-900">18</p>
                <p className="text-xs text-green-600">Dispositions Team</p>
              </div>
            </Card>

            {/* Projected Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+15%</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-purple-600 uppercase tracking-wider">Projected Profit</p>
                <p className="text-3xl font-black text-purple-900">$485K</p>
                <p className="text-xs text-purple-600">Current Timeframe</p>
              </div>
            </Card>

            {/* Closed Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+22%</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-orange-600 uppercase tracking-wider">Closed Profit</p>
                <p className="text-3xl font-black text-orange-900">$342K</p>
                <p className="text-xs text-orange-600">Final Profit</p>
              </div>
            </Card>
          </div>

          {/* Row 2 - Timeline Chart (75%) + Lead Sources (25%) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Timeline Chart - 75% width */}
            <Card className="lg:col-span-3 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Lead and Deal Flow for Last 12 Months</h3>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Last Month">Last Month</SelectItem>
                    <SelectItem value="This Quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="totalLeads" fill="#3b82f6" name="Total Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="contractedLeads" fill="#10b981" name="Contracted Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="soldLeads" fill="#f59e0b" name="Sold Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="closedLeads" fill="#ef4444" name="Closed Leads" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Total Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Contracted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Sold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Closed</span>
                </div>
              </div>
            </Card>

            {/* Lead Sources - 25% width */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Source</h3>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Cold Calling</span>
                    <span className="text-sm font-bold text-gray-900">32</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Direct Mail</span>
                    <span className="text-sm font-bold text-gray-900">28</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">SMS Blast</span>
                    <span className="text-sm font-bold text-gray-900">15</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Website</span>
                    <span className="text-sm font-bold text-gray-900">12</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 3 - Average Metrics (4 boxes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Average Offer Price */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full">Avg</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Average Offer Price</p>
                <p className="text-3xl font-black text-gray-900">$285,000.00</p>
                <p className="text-xs text-gray-500">Per Property</p>
              </div>
            </Card>

            {/* Average Contract Price */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full">Avg</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Average Contract Price</p>
                <p className="text-3xl font-black text-gray-900">$315,000.00</p>
                <p className="text-xs text-gray-500">Per Contract</p>
              </div>
            </Card>

            {/* Average Sold Price */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full">Avg</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Average Sold Price</p>
                <p className="text-3xl font-black text-gray-900">$425,000.00</p>
                <p className="text-xs text-gray-500">Per Sale</p>
              </div>
            </Card>

            {/* Average Deal Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+18%</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Average Deal Profit</p>
                <p className="text-3xl font-black text-gray-900">$110,000.00</p>
                <p className="text-xs text-gray-500">Per Deal</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Marketing Overview Tab */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          {/* Marketing Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketingMetrics.map((metric, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center space-x-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">{metric.change}</span>
                    <span className="text-gray-500">from last month</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart Controls */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Performance Trends</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch id="revenue" checked={showRevenue} onCheckedChange={setShowRevenue} />
                  <Label htmlFor="revenue" className="text-sm">Revenue</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="leads" checked={showLeads} onCheckedChange={setShowLeads} />
                  <Label htmlFor="leads" className="text-sm">Leads</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="conversion" checked={showConversion} onCheckedChange={setShowConversion} />
                  <Label htmlFor="conversion" className="text-sm">Conversion</Label>
                </div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  {showRevenue && <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />}
                  {showLeads && <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} />}
                  {showConversion && <Line type="monotone" dataKey="conversion" stroke="#f59e0b" strokeWidth={2} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Lead Sources Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Lead Sources</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Pipeline Overview Tab */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sales Funnel</h2>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="Last Month">Last Month</SelectItem>
                <SelectItem value="This Quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pipeline Funnel Chart Container */}
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline Funnel</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[1400px] pb-4">
                {/* Pipeline Funnel Chart */}
                <div className="flex items-end justify-between gap-3 px-2">
                  {pipelineData.map((stage, index) => {
                    const maxCount = Math.max(...pipelineData.map(s => s.count));
                    const height = (stage.count / maxCount) * 180;
                    
                    return (
                      <div key={index} className="flex flex-col items-center space-y-2 min-w-[100px]">
                        {/* Status Badge */}
                        <Badge className={`${stage.badge} text-white text-xs px-2 py-1 font-medium uppercase tracking-wide whitespace-nowrap`}>
                          {stage.name.split(' ').slice(0, 2).join(' ').toUpperCase()}
                        </Badge>
                        
                        {/* Count Number */}
                        <div className="text-xl font-bold text-gray-900">
                          {stage.count}
                        </div>
                        
                        {/* Vertical Bar with Circle */}
                        <div className="relative flex flex-col items-center">
                          <div 
                            className={`${stage.color} rounded-t-lg relative`}
                            style={{ 
                              width: '50px', 
                              height: `${height}px`,
                              minHeight: '30px'
                            }}
                          >
                            {/* White Circle on top */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white rounded-full border-2 border-gray-200"></div>
                          </div>
                        </div>
                        
                        {/* Conversion Percentage */}
                        <Badge variant="secondary" className="bg-gray-800 text-white text-xs px-2 py-1 font-bold">
                          {stage.percentage}
                        </Badge>
                        
                        {/* Lost Indicator */}
                        {stage.lost > 0 && (
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center space-x-1 text-red-500 text-xs font-medium">
                              <span>↘</span>
                              <span>{stage.lost} LOST</span>
                            </div>
                            <div className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded font-medium">
                              {stage.lostPercentage}
                            </div>
                          </div>
                        )}
                        
                        {/* Stage Label */}
                        <div className="text-xs text-gray-600 text-center font-medium mt-2 max-w-[90px] leading-tight">
                          {stage.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center mt-2 px-4">
                💡 Scroll horizontally to view all pipeline stages
              </div>
            </div>
          </div>

          {/* Pipeline Table Container */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[180px]">Stage</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[80px]">Count</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[100px]">Value</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[120px]">Weighted Value</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[140px]">Avg Time to Advance</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[120px]">Conversion Rate</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600 min-w-[80px]">Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineData.map((stage, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-sm font-medium">{stage.name}</td>
                        <td className="p-4 text-sm font-bold">{stage.count}</td>
                        <td className="p-4 text-sm">${(stage.count * 12.5).toFixed(0)}K</td>
                        <td className="p-4 text-sm">${(stage.count * 8.5).toFixed(0)}K</td>
                        <td className="p-4 text-sm">{Math.floor(Math.random() * 10) + 3} days</td>
                        <td className="p-4 text-sm font-medium">{stage.percentage}</td>
                        <td className="p-4 text-sm text-red-500 font-medium">{stage.lost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Timeline Metrics */}
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold">PIPELINE TIMELINE METRICS</h3>
              <Badge className="bg-blue-500 text-white">Average Days Between Stages</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="p-4 text-sm font-medium text-gray-600 min-w-[140px]">Marketing Type</th>
                    <th className="p-4 text-sm font-medium text-gray-600 min-w-[140px]">Created → Appt. Set</th>
                    <th className="p-4 text-sm font-medium text-gray-600 min-w-[140px]">Appt. Set → Offer Made</th>
                    <th className="p-4 text-sm font-medium text-gray-600 min-w-[140px]">Created → Offer Made</th>
                    <th className="p-4 text-sm font-medium text-gray-600 min-w-[140px]">Offer Made → Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {timelineData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-sm flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className={row.type === 'Total' ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}>
                          {row.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium">{row.created_appt}</td>
                      <td className="p-4 text-sm font-medium">{row.appt_offer}</td>
                      <td className="p-4 text-sm font-medium">{row.created_offer}</td>
                      <td className="p-4 text-sm font-medium">{row.offer_closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Communications View Tab */}
      {activeTab === "communications" && (
        <div className="space-y-6">
          {/* User Filter */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Communications Overview</h2>
            <Select defaultValue="all-users">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-users">All Users (Default)</SelectItem>
                <SelectItem value="chris-harris">Chris Harris</SelectItem>
                <SelectItem value="john-smith">John Smith</SelectItem>
                <SelectItem value="jane-doe">Jane Doe</SelectItem>
                <SelectItem value="mike-wilson">Mike Wilson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 1 - Calling Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Call Stats - 25% */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Call Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Calls Made</span>
                  <span className="text-lg font-bold text-blue-600">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Calls Received</span>
                  <span className="text-lg font-bold text-green-600">892</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Time on Calls</span>
                  <span className="text-lg font-bold text-purple-600">42h 15m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Average Time on Calls</span>
                  <span className="text-lg font-bold text-orange-600">3m 24s</span>
                </div>
              </div>
            </Card>

            {/* Call Time Distribution Chart - 75% */}
            <Card className="lg:col-span-3 p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Calls by Time of Day</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { hour: '6 AM', outbound: 5, inbound: 2 },
                    { hour: '7 AM', outbound: 12, inbound: 8 },
                    { hour: '8 AM', outbound: 25, inbound: 15 },
                    { hour: '9 AM', outbound: 45, inbound: 32 },
                    { hour: '10 AM', outbound: 65, inbound: 48 },
                    { hour: '11 AM', outbound: 78, inbound: 52 },
                    { hour: '12 PM', outbound: 85, inbound: 45 },
                    { hour: '1 PM', outbound: 72, inbound: 38 },
                    { hour: '2 PM', outbound: 88, inbound: 55 },
                    { hour: '3 PM', outbound: 92, inbound: 62 },
                    { hour: '4 PM', outbound: 75, inbound: 48 },
                    { hour: '5 PM', outbound: 58, inbound: 35 },
                    { hour: '6 PM', outbound: 35, inbound: 22 },
                    { hour: '7 PM', outbound: 18, inbound: 12 },
                    { hour: '8 PM', outbound: 8, inbound: 5 },
                  ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="hour" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="outbound" fill="#3b82f6" name="Outbound Calls" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inbound" fill="#10b981" name="Inbound Calls" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Outbound Calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Inbound Calls</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2 - SMS Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* SMS Stats - 25% */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">SMS Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total SMS Sent</span>
                  <span className="text-lg font-bold text-blue-600">3,456</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total SMS Received</span>
                  <span className="text-lg font-bold text-green-600">2,189</span>
                </div>
              </div>
            </Card>

            {/* SMS Time Distribution Chart - 75% */}
            <Card className="lg:col-span-3 p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">SMS by Time of Day</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { hour: '6 AM', outbound: 8, inbound: 3 },
                    { hour: '7 AM', outbound: 15, inbound: 12 },
                    { hour: '8 AM', outbound: 32, inbound: 18 },
                    { hour: '9 AM', outbound: 58, inbound: 35 },
                    { hour: '10 AM', outbound: 75, inbound: 52 },
                    { hour: '11 AM', outbound: 88, inbound: 65 },
                    { hour: '12 PM', outbound: 95, inbound: 58 },
                    { hour: '1 PM', outbound: 82, inbound: 45 },
                    { hour: '2 PM', outbound: 98, inbound: 68 },
                    { hour: '3 PM', outbound: 105, inbound: 75 },
                    { hour: '4 PM', outbound: 85, inbound: 55 },
                    { hour: '5 PM', outbound: 68, inbound: 42 },
                    { hour: '6 PM', outbound: 45, inbound: 28 },
                    { hour: '7 PM', outbound: 25, inbound: 18 },
                    { hour: '8 PM', outbound: 12, inbound: 8 },
                  ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="hour" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="outbound" fill="#8b5cf6" name="Outbound SMS" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inbound" fill="#f59e0b" name="Inbound SMS" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Outbound SMS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Inbound SMS</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 3 - Risk Management Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Call Success Rate - 50% */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Call Success Rate</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Answered', value: 78.5, color: '#10b981' },
                          { name: 'Rejected/Missed', value: 21.5, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-black text-green-600">78.5%</div>
                      <div className="text-sm text-gray-600 font-medium">Not Rejected</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Answered (78.5%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Rejected (21.5%)</span>
                </div>
              </div>
            </Card>

            {/* SMS Delivery Rate - 50% */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">SMS Delivery Rate</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Delivered', value: 95.2, color: '#3b82f6' },
                          { name: 'Failed', value: 4.8, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ef4444" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-black text-blue-600">95.2%</div>
                      <div className="text-sm text-gray-600 font-medium">Delivered</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Delivered (95.2%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Failed (4.8%)</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Acquisitions Team Tab */}
      {activeTab === "acquisitions" && (
        <div className="space-y-6">
          {/* User Filter */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Acquisitions Team Performance</h2>
            <Select defaultValue="all-users">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-users">All Users (Default)</SelectItem>
                <SelectItem value="chris-harris">Chris Harris</SelectItem>
                <SelectItem value="john-smith">John Smith</SelectItem>
                <SelectItem value="jane-doe">Jane Doe</SelectItem>
                <SelectItem value="mike-wilson">Mike Wilson</SelectItem>
                <SelectItem value="sarah-lee">Sarah Lee</SelectItem>
                <SelectItem value="tom-anderson">Tom Anderson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 1 - Pipeline Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Total Properties in Pipeline */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white border border-blue-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Total Properties in Pipeline</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(32/40) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-black text-blue-600">32</div>
                      <div className="text-xs text-gray-600 font-medium">of 40</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-900">80%</div>
                <p className="text-xs text-blue-600">Properties in Pipeline</p>
              </div>
            </Card>

            {/* Total Properties Clear to Close */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white border border-green-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Properties Clear to Close</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#10b981"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(28/38) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-600">28</div>
                      <div className="text-xs text-gray-600 font-medium">of 38</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-900">74%</div>
                <p className="text-xs text-green-600">Clear to Close</p>
              </div>
            </Card>

            {/* Percentage Clear to Close */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-white border border-purple-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider">Clear to Close Rate</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#8b5cf6"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(87.5/95) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-black text-purple-600">87.5%</div>
                      <div className="text-xs text-gray-600 font-medium">of 95%</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-purple-900">87.5%</div>
                <p className="text-xs text-purple-600">Clear to Close Rate</p>
              </div>
            </Card>
          </div>

          {/* Row 2 - Financial Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Projected Profit */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-white border border-orange-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Projected Profit</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#f97316"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(750000/1000000) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-black text-orange-600">$750K</div>
                      <div className="text-xs text-gray-600 font-medium">of $1M</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-orange-900">75%</div>
                <p className="text-xs text-orange-600">$750,000.00</p>
              </div>
            </Card>

            {/* Total Deals Closed */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white border border-green-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Total Deals Closed</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#10b981"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(20/32) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-600">20</div>
                      <div className="text-xs text-gray-600 font-medium">of 32</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-900">63%</div>
                <p className="text-xs text-green-600">Deals Closed</p>
              </div>
            </Card>

            {/* Closed Profit */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white border border-blue-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Closed Profit</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(620000/800000) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-black text-blue-600">$620K</div>
                      <div className="text-xs text-gray-600 font-medium">of $800K</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-900">78%</div>
                <p className="text-xs text-blue-600">$620,000.00</p>
              </div>
            </Card>

            {/* Leads Mishandled */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-white border border-yellow-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-wider">Leads Mishandled</h3>
                <div className="relative w-32 h-32 mx-auto">
                  <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center border-4 border-yellow-300">
                    <div className="text-center">
                      <div className="text-3xl font-black text-yellow-600">3</div>
                      <div className="text-xs text-yellow-700 font-medium">Mishandled</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-yellow-900">Low Risk</div>
                <p className="text-xs text-yellow-600">Response Time Issues</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Dispositions Team Tab */}
      {activeTab === "dispositions-team" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dispositions Team Metrics</h2>
              <p className="text-sm text-gray-600">Track dispositions team performance and metrics</p>
            </div>
            <Select defaultValue="all-users">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-users">All Users (Default)</SelectItem>
                <SelectItem value="john-smith">John Smith</SelectItem>
                <SelectItem value="jane-doe">Jane Doe</SelectItem>
                <SelectItem value="mike-wilson">Mike Wilson</SelectItem>
                <SelectItem value="sarah-lee">Sarah Lee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Row 1 - Pipeline Metrics (4 circular charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Properties in Pipeline */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(28/40) * 251.2} 251.2`}
                      className="text-blue-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">70%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Properties in Pipeline</h3>
                  <p className="text-lg font-bold text-gray-900">28 of 40</p>
                  <p className="text-xs text-gray-500">Properties in dispositions pipeline</p>
                </div>
              </div>
            </Card>

            {/* Total Properties Sold */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(7/10) * 251.2} 251.2`}
                      className="text-green-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">70%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Properties Sold</h3>
                  <p className="text-lg font-bold text-gray-900">7 of 10</p>
                  <p className="text-xs text-gray-500">Properties sold this month</p>
                </div>
              </div>
            </Card>

            {/* Percentage of Properties Sold */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(25/25) * 251.2} 251.2`}
                      className="text-purple-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">100%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Percentage of Properties Sold</h3>
                  <p className="text-lg font-bold text-gray-900">25% of 25%</p>
                  <p className="text-xs text-gray-500">Sales conversion rate</p>
                </div>
              </div>
            </Card>

            {/* Projected Profit */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(150000/200000) * 251.2} 251.2`}
                      className="text-orange-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">75%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Projected Profit</h3>
                  <p className="text-lg font-bold text-gray-900">$150,000.00</p>
                  <p className="text-xs text-gray-500">of $200,000.00 target</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2 - Performance & Risk Metrics (4 circular charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Deals Closed */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(6/8) * 251.2} 251.2`}
                      className="text-emerald-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">75%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Deals Closed</h3>
                  <p className="text-lg font-bold text-gray-900">6 of 8</p>
                  <p className="text-xs text-gray-500">Deals closed this month</p>
                </div>
              </div>
            </Card>

            {/* Closed Profit */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(145000/200000) * 251.2} 251.2`}
                      className="text-cyan-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">73%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Closed Profit</h3>
                  <p className="text-lg font-bold text-gray-900">$145,000.00</p>
                  <p className="text-xs text-gray-500">of $200,000.00 target</p>
                </div>
              </div>
            </Card>

            {/* Buyers Added */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(42/100) * 251.2} 251.2`}
                      className="text-indigo-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">42%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Buyers Added</h3>
                  <p className="text-lg font-bold text-gray-900">42 of 100</p>
                  <p className="text-xs text-gray-500">New buyers this month</p>
                </div>
              </div>
            </Card>

            {/* Leads Mishandled */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="w-24 h-24 rounded-full bg-yellow-100 border-4 border-yellow-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-yellow-700">3</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Leads Mishandled</h3>
                  <p className="text-lg font-bold text-yellow-700">3 Leads</p>
                  <p className="text-xs text-yellow-600">1-4: Yellow • 5-9: Orange • 10+: Red</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Transaction Coordinator Tab */}
      {activeTab === "transaction-coordinator" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Transaction Coordinator Metrics</h2>
              <p className="text-sm text-gray-600">Track transaction coordination performance</p>
            </div>
            <Select defaultValue="all-users">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-users">All Users (Default)</SelectItem>
                <SelectItem value="coordinator-1">Transaction Coordinator 1</SelectItem>
                <SelectItem value="coordinator-2">Transaction Coordinator 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-center py-12">
            <p className="text-gray-500">Transaction Coordinator metrics will be configured here</p>
          </div>
        </div>
      )}

      {/* Acquisitions Leaderboard Tab */}
      {activeTab === "acquisitions-leaderboard" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Acquisitions Leaderboard</h2>
              <p className="text-sm text-gray-600">Rankings and performance comparison for acquisitions team</p>
            </div>
            <div className="flex items-center gap-4">
              <Select defaultValue="this-month">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-center py-12">
            <p className="text-gray-500">Acquisitions Leaderboard will be configured here</p>
          </div>
        </div>
      )}

      {/* Dispositions Leaderboard Tab */}
      {activeTab === "dispositions-leaderboard" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dispositions Leaderboard</h2>
              <p className="text-sm text-gray-600">Rankings and performance comparison for dispositions team</p>
            </div>
            <div className="flex items-center gap-4">
              <Select defaultValue="this-month">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-center py-12">
            <p className="text-gray-500">Dispositions Leaderboard will be configured here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Metrics;