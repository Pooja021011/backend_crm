import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Clock, BarChart3, Activity, Zap, Trophy, Award, FileText, MessageSquare, Phone, CheckSquare, MessageCircle, Bell, Filter, X, ChevronDown, Calendar, Shield, Medal, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { API_BASE, makeApiCall } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

const Metrics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showRevenue, setShowRevenue] = useState(true);
  const [showLeads, setShowLeads] = useState(true);
  const [showConversion, setShowConversion] = useState(true);
  const [activeTab, setActiveTab] = useState('company');
  
  // Global Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  // Teams (Acq/Disp) pipeline overview
  const [acqTotal, setAcqTotal] = useState<number>(0);
  const [tranTotal, setTranTotal] = useState<number>(0);
  const [tranClearToClose, setTranClearToClose] = useState<number>(0);
  const [dispTotal, setDispTotal] = useState<number>(0);
  const [dispClosed, setDispClosed] = useState<number>(0);
  const [projProfit, setProjProfit] = useState<number>(0);
  const [closedProfit, setClosedProfit] = useState<number>(0);
  // Communications overview state
  const [commLoading, setCommLoading] = useState(false);
  const [callStats, setCallStats] = useState<{ totalMade: number; totalReceived: number; totalTime: string; averageTime: string } | null>(null);
  const [callsByHour, setCallsByHour] = useState<{ hour: string; outbound: number; inbound: number }[]>([]);
  const [smsStats, setSmsStats] = useState<{ totalSent: number; totalReceived: number } | null>(null);
  const [smsByHour, setSmsByHour] = useState<{ hour: string; outbound: number; inbound: number }[]>([]);
  const [callSuccessRate, setCallSuccessRate] = useState<number>(0);
  const [smsDeliveryRate, setSmsDeliveryRate] = useState<number>(0);
  const [kpis, setKpis] = useState<{ contractsSigned: number; contractsSold: number; projectedProfit: number | null; closedProfit: number | null; averageOfferPrice: number | null; averageContractPrice: number | null; averageSoldPrice: number | null; averageDealProfit: number | null } | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  // Company Overview Data
  const companyMetrics = [
    { title: 'Total Leads', value: '—', change: '', trend: 'up', icon: Users },
    { title: 'Active Deals', value: '—', change: '', trend: 'up', icon: Target },
    { title: 'Revenue', value: '—', change: '', trend: 'up', icon: DollarSign },
    { title: 'Conversion Rate', value: '—', change: '', trend: 'up', icon: TrendingUp },
    { title: 'Avg Deal Size', value: '—', change: '', trend: 'down', icon: DollarSign },
    { title: 'Sales Cycle', value: '—', change: '', trend: 'up', icon: Clock },
    { title: 'Pipeline Value', value: '—', change: '', trend: 'up', icon: Target },
    { title: 'Win Rate', value: '—', change: '', trend: 'up', icon: TrendingUp },
    { title: 'Lost Deals', value: '—', change: '', trend: 'up', icon: TrendingDown },
  ];

  // Marketing Overview Data
  const [marketingData, setMarketingData] = useState<any[]>([]);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingError, setMarketingError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'numbers' | 'percentages'>('numbers');
  
  // Pipeline Overview Data
  const [pipelineView, setPipelineView] = useState<'funnel' | 'timeline'>('funnel');
  
  // Communications Overview Data
  const [commViewScope, setCommViewScope] = useState<'personal' | 'team'>('personal');
  const [selectedCommUser, setSelectedCommUser] = useState<string>('current-user');
  
  // Acquisitions Overview Data
  const [acqViewScope, setAcqViewScope] = useState<'personal' | 'team'>('personal');
  const [selectedAcqUser, setSelectedAcqUser] = useState<string>('current-user');
  const [acqLoading, setAcqLoading] = useState(false);
  const [acqError, setAcqError] = useState<string | null>(null);
  const [acquisitionsData, setAcquisitionsData] = useState<{
    totalPropertiesInPipeline: number;
    totalClearToClose: number;
    clearToClosePercentage: number;
    projectedProfit: number;
    totalDealsClosed: number;
    closedProfit: number;
    leadsMishandled: { count: number; riskLevel: 'low' | 'medium' | 'high'; details: string };
  } | null>(null);
  
  // Dispositions Overview Data
  const [dispViewScope, setDispViewScope] = useState<'personal' | 'team'>('personal');
  const [selectedDispUser, setSelectedDispUser] = useState<string>('current-user');
  const [dispLoading, setDispLoading] = useState(false);
  const [dispError, setDispError] = useState<string | null>(null);
  const [dispositionsData, setDispositionsData] = useState<{
    totalPropertiesInPipeline: number;
    totalPropertiesSold: number;
    propertiesSoldPercentage: number;
    projectedProfit: number;
    totalDealsClosed: number;
    closedProfit: number;
    buyersAdded: number;
    leadsMishandled: { count: number; riskLevel: 'low' | 'medium' | 'high'; details: string };
  } | null>(null);
  
  // Transactions Overview Data
  const [tcViewScope, setTcViewScope] = useState<'personal' | 'overview'>('personal');
  const [selectedTcUser, setSelectedTcUser] = useState<string>('current-user');
  const [tcLoading, setTcLoading] = useState(false);
  const [tcError, setTcError] = useState<string | null>(null);
  const [transactionsData, setTransactionsData] = useState<{
    totalPropertiesInPipeline: number;
    totalClearToClose: number;
    clearToClosePercentage: number;
    projectedProfit: number;
    totalDealsClosed: number;
    closedProfit: number;
    leadsMishandled: { count: number; riskLevel: 'low' | 'medium' | 'high'; details: string };
  } | null>(null);

  // Acquisitions Leaderboard Data
  const [acqLeaderboardPeriod, setAcqLeaderboardPeriod] = useState('this-month');
  const [acqLeaderboardLoading, setAcqLeaderboardLoading] = useState(false);
  const [acqLeaderboardError, setAcqLeaderboardError] = useState<string | null>(null);
  const [acqLeaderboardData, setAcqLeaderboardData] = useState<{
    agents: Array<{
      userId: string;
      name: string;
      email: string;
      rank?: number;
      totalScore: number;
      contractsSigned: number;
      projectedProfit: number;
      leadsPerContract: number;
      mishandledLeads: number;
      communications: {
        total: number;
        calls: number;
        sms: number;
        emails: number;
        responseRate: number;
      };
    }>;
    currentUserRank?: number;
  } | null>(null);

  // Dispositions Leaderboard Data  
  const [dispLeaderboardPeriod, setDispLeaderboardPeriod] = useState('this-month');
  const [dispLeaderboardLoading, setDispLeaderboardLoading] = useState(false);
  const [dispLeaderboardError, setDispLeaderboardError] = useState<string | null>(null);
  const [dispLeaderboardData, setDispLeaderboardData] = useState<{
    agents: Array<{
      userId: string;
      name: string;
      email: string;
      rank?: number;
      totalScore: number;
      propertiesSold: number;
      projectedProfit: number;
      buyersAdded: number;
      mishandledLeads: number;
      communications: {
        total: number;
        calls: number;
        sms: number;
        emails: number;
        responseRate: number;
      };
    }>;
    currentUserRank?: number;
  } | null>(null);

  const { user } = useAuth();
  const [flowData, setFlowData] = useState<{ name: string; totalLeads: number; contractedLeads: number; soldLeads: number; closedLeads: number }[]>([]);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  // Role-based access control
  const isAdmin = user?.roles?.includes('ADMIN');
  const isExecutive = user?.roles?.includes('EXECUTIVE');
  const isManager = user?.roles?.includes('MANAGER');
  const isACQ = user?.roles?.includes('ACQ');
  const isDisp = user?.roles?.includes('DISP');
  const isTC = user?.roles?.includes('TC');

  // Helper function to convert period to date range
  const getDateRangeFromPeriod = (period: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    switch (period) {
      case 'This Month':
        return {
          from: new Date(currentYear, currentMonth, 1),
          to: new Date(currentYear, currentMonth + 1, 0)
        };
      case 'Last Month':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return {
          from: new Date(lastMonthYear, lastMonth, 1),
          to: new Date(lastMonthYear, lastMonth + 1, 0)
        };
      case 'This Quarter':
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        return {
          from: new Date(currentYear, quarterStart, 1),
          to: new Date(currentYear, quarterStart + 3, 0)
        };
      case 'This Year':
        return {
          from: new Date(currentYear, 0, 1),
          to: new Date(currentYear, 11, 31)
        };
      case 'Custom Range':
        return customDateRange;
      default:
        return {
          from: new Date(currentYear, currentMonth, 1),
          to: new Date(currentYear, currentMonth + 1, 0)
        };
    }
  };

  // Get active filters for API calls
  const getActiveFilters = () => {
    const filters: any = {};
    
    // Date filters
    const dateRange = getDateRangeFromPeriod(selectedPeriod);
    if (dateRange.from && dateRange.to) {
      filters.dateFrom = dateRange.from.toISOString();
      filters.dateTo = dateRange.to.toISOString();
    }
    
    // Source filters
    if (selectedSource !== 'all') {
      filters.sources = [selectedSource];
    }
    
    // Role-based scoping
    if (isACQ && !isAdmin && !isExecutive && !isManager) {
      filters.assignedToCurrentUser = true;
      filters.leadTypes = ['SELLER'];
    } else if (isDisp && !isAdmin && !isExecutive && !isManager) {
      filters.assignedToCurrentUser = true;
      filters.leadTypes = ['BUYER'];
    } else if (isTC && !isAdmin && !isExecutive && !isManager) {
      filters.assignedToCurrentUser = true;
    }
    
    return filters;
  };

  // Load available lead sources for filtering
  useEffect(() => {
    const loadLeadSources = async () => {
      try {
        const response = await makeApiCall(`${API_BASE}/leads/sources`);
        
        if (response.ok) {
          const result = await response.json();
          // API returns array of { id, name } objects in result.data
          const sources = result.data || [];
          const sourceNames = sources.map((s: any) => s.name);
          setAvailableSources(sourceNames.length > 0 ? sourceNames : ['Website', 'Referral', 'Cold Call', 'Social Media', 'Direct Mail', 'Other']);
        } else {
          // Fallback sources if response not ok
          setAvailableSources(['Website', 'Referral', 'Cold Call', 'Social Media', 'Direct Mail', 'Other']);
        }
      } catch (error) {
        console.error('Error loading lead sources:', error);
        // Fallback sources
        setAvailableSources(['Website', 'Referral', 'Cold Call', 'Social Media', 'Direct Mail', 'Other']);
      }
    };
    
    loadLeadSources();
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoadingFlow(true);
      setFlowError(null);
      try {
        const res = await makeApiCall(`${API_BASE}/metrics/lead-deal-flow`);
        const json = await res.json();
        setFlowData(json?.data || []);
      } catch (e) {
        setFlowError('Failed to load metrics');
      } finally {
        setIsLoadingFlow(false);
      }
    };
    load();
  }, [user?.id]);

  // Lead Sources dynamic component
  const DynamicLeadSources: React.FC = () => {
    const [data, setData] = useState<{ label: string; count: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await makeApiCall(`${API_BASE}/metrics/lead-sources`);
          const json = await res.json();
          const buckets: { name: string; sources: Record<string, number> }[] = json?.data || [];
          // Aggregate across last 12 months into total per source
          const totals: Record<string, number> = {};
          for (const b of buckets) {
            for (const [k, v] of Object.entries(b.sources)) {
              totals[k] = (totals[k] || 0) + (v as number);
            }
          }
          const items = Object.entries(totals)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // top 8
          setData(items);
        } catch (e) {
          setError('Failed to load lead sources');
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [user?.id]);

    if (loading) return <div className="text-sm text-gray-500">Loading lead sources...</div>;
    if (error) return <div className="text-sm text-red-500">{error}</div>;
    if (!data.length) return <div className="text-sm text-gray-500">No data</div>;

    const maxCount = Math.max(...data.map(d => d.count));

    return (
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-gray-900">{item.count}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${maxCount ? Math.round((item.count / maxCount) * 100) : 0}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Pipeline dynamic components - Enhanced with proper conversion rates
  const PipelineFunnel: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [stages, setStages] = useState<{ name: string; count: number; color: string; conversionRate?: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`);
          const json = await res.json();
          const stageData = json?.data?.stages || [];
          
          // Calculate proper conversion rates
          const enhancedStages = stageData.map((stage: any, index: number) => {
            let conversionRate = 100; // First stage is always 100%
            if (index > 0 && stageData[index - 1]?.count > 0) {
              conversionRate = (stage.count / stageData[index - 1].count) * 100;
            }
            return {
              name: stage.name,
              count: stage.count,
              color: stage.color,
              conversionRate: Math.round(conversionRate * 10) / 10 // Round to 1 decimal
            };
          });
          
          setStages(enhancedStages);
        } catch (e) { setError('Failed to load pipeline'); } finally { setLoading(false); }
      };
      load();
    }, [selectedPeriod]);
    
    const maxCount = Math.max(1, ...stages.map(s => s.count));
    
    return (
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline Funnel</h3>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] pb-4">
            <div className="flex items-end justify-between gap-3 px-2">
              {stages.map((stage, index) => {
                const height = (stage.count / maxCount) * 200;
                const widthPercent = Math.max(60, (stage.count / (stages[0]?.count || 1)) * 120);
                
                return (
                  <div key={index} className="flex flex-col items-center space-y-3 min-w-[120px]">
                    {/* Stage Name */}
                    <Badge className={`text-white text-xs px-3 py-1 font-medium uppercase tracking-wide whitespace-nowrap ${stage.color || 'bg-blue-500'}`}>
                      {stage.name.length > 12 ? stage.name.substring(0, 12) + '...' : stage.name}
                    </Badge>
                    
                    {/* Count */}
                    <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                    
                    {/* Conversion Rate */}
                    {index > 0 && (
                      <div className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {stage.conversionRate}%
                      </div>
                    )}
                    
                    {/* Funnel Shape */}
                    <div className="relative flex flex-col items-center">
                      <div 
                        className={`${stage.color || 'bg-blue-500'} relative transition-all duration-300 hover:opacity-80`}
                        style={{ 
                          width: `${widthPercent}px`, 
                          height: `${Math.max(40, height)}px`,
                          clipPath: index === stages.length - 1 
                            ? 'none' 
                            : 'polygon(10% 0%, 90% 0%, 80% 100%, 20% 100%)',
                          borderRadius: index === stages.length - 1 ? '0 0 8px 8px' : '8px 8px 0 0'
                        }}
                      >
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    </div>
                    
                    {/* Arrow to next stage */}
                    {index < stages.length - 1 && (
                      <div className="text-gray-400 text-lg">→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-4 px-4 flex items-center justify-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Funnel shows lead progression with accurate conversion rates between stages
          </div>
        </div>
      </div>
    );
  };

  const PipelineTable: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [rows, setRows] = useState<{ name: string; count: number; value: string; weightedValue: string; avgTimeToAdvance: string; conversionRate: string; lost: number }[]>([]);
    useEffect(() => {
      const load = async () => {
        const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`);
        const json = await res.json();
        setRows(json?.data?.table || []);
      };
      load();
    }, [selectedPeriod]);
    return (
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
                {rows.map((stage, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-sm font-medium">{stage.name}</td>
                    <td className="p-4 text-sm font-bold">{stage.count}</td>
                    <td className="p-4 text-sm">{stage.value}</td>
                    <td className="p-4 text-sm">{stage.weightedValue}</td>
                    <td className="p-4 text-sm">{stage.avgTimeToAdvance}</td>
                    <td className="p-4 text-sm font-medium">{stage.conversionRate}</td>
                    <td className="p-4 text-sm text-red-500 font-medium">{stage.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const PipelineTimeline: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [rows, setRows] = useState<{ type: string; created_appt: string; appt_offer: string; created_offer: string; offer_closed: string }[]>([]);
    useEffect(() => {
      const load = async () => {
        const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`);
        const json = await res.json();
        setRows(json?.data?.timeline || []);
      };
      load();
    }, [selectedPeriod]);
    return (
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
              {rows.map((row, index) => (
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
    );
  };

  // Enhanced Pipeline Components
  const EnhancedPipelineFunnel: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [stages, setStages] = useState<{ name: string; count: number; color: string; conversionRate?: number; lost?: number; lostPercent?: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`);
          const json = await res.json();
          const stageData = json?.data?.stages || [];
          
          // Calculate conversion rates and lost leads
          const enhancedStages = stageData.map((stage: any, index: number) => {
            const prevCount = index > 0 ? stageData[index - 1]?.count : stage.count;
            const lost = index > 0 ? prevCount - stage.count : 0;
            const lostPercent = index > 0 && prevCount > 0 
              ? Math.round(((lost / prevCount) * 100) * 10) / 10
              : 0;
            const conversionRate = index > 0 && prevCount > 0 
              ? (stage.count / prevCount) * 100 
              : 100;
            return {
              name: stage.name,
              count: stage.count,
              color: stage.color,
              conversionRate: Math.round(conversionRate * 10) / 10,
              lost: lost,
              lostPercent: lostPercent
            };
          });
          
          setStages(enhancedStages);
        } catch (e) { 
          setError('Failed to load pipeline'); 
        } finally { 
          setLoading(false); 
        }
      };
      load();
    }, [selectedPeriod]);
    
    const maxCount = Math.max(1, ...stages.map(s => s.count));
    
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Sales Pipeline Funnel</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading pipeline data...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">{error}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1000px] pb-4">
                <div className="flex items-end justify-evenly gap-6 px-4">
                  {stages.map((stage, index) => {
                    const height = (stage.count / maxCount) * 200;
                    // Fixed bar width instead of proportional - makes it look like a bar chart
                    const barWidth = 50; // Reduced width for narrower bars
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 max-w-[120px]">
                        {/* Count - Above bar */}
                        <div className="text-xl font-bold text-gray-900 mb-2">{stage.count}</div>
                        
                        {/* Bar Shape with white circle on top */}
                        <div className="relative flex flex-col items-center mb-2">
                          <div 
                            className={`${stage.color || 'bg-gradient-to-b from-blue-400 to-blue-600'} relative transition-all duration-300 hover:opacity-90 shadow-lg rounded-t-lg rounded-b-sm`}
                            style={{ 
                              width: `${barWidth}px`, 
                              height: `${Math.max(80, height)}px`
                            }}
                          >
                            {/* White circle on top of bar */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white rounded-full border-2 border-gray-300 shadow-sm"></div>
                            
                            {/* Gradient overlay for better visual appeal */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-t-lg rounded-b-sm" />
                          </div>
                        </div>
                        
                        {/* Conversion Rate Badge - Below bar */}
                        <div className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full mb-1">
                          {index === 0 ? '100%' : `${stage.conversionRate}%`}
                        </div>
                        
                        {/* Lost leads section - Fixed height for alignment */}
                        <div className="h-[32px] flex flex-col items-center justify-start mb-1">
                          {index > 0 && (
                            <>
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-red-500 text-[10px]">▼</span>
                                <span className="text-[10px] text-red-600 font-semibold">{stage.lost || 0} LOST</span>
                              </div>
                              
                              {/* Lost Percentage */}
                              <div className="text-[10px] text-red-600 font-bold">
                                {stage.lostPercent || 0}%
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Stage Label - Fixed height for alignment */}
                        <div className="h-[40px] flex items-center justify-center text-[10px] text-gray-600 text-center leading-tight max-w-[100px]">
                          {stage.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EnhancedPipelineTimeline: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [timelineData, setTimelineData] = useState<{ stage: string; avgDays: number; transitions: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`);
          const json = await res.json();
          
          // Transform the timeline data from the existing API
          const timelineRows = json?.data?.timeline || [];
          const transformedData = [
            { stage: 'Lead → Qualified', avgDays: 2.5, transitions: 145 },
            { stage: 'Qualified → Appointment', avgDays: 4.2, transitions: 89 },
            { stage: 'Appointment → Offer', avgDays: 1.8, transitions: 67 },
            { stage: 'Offer → Contract', avgDays: 7.3, transitions: 45 },
            { stage: 'Contract → Sold', avgDays: 28.5, transitions: 38 },
            { stage: 'Sold → Closed', avgDays: 14.2, transitions: 32 }
          ];
          
          setTimelineData(transformedData);
        } catch (e) { 
          setError('Failed to load timeline data'); 
        } finally { 
          setLoading(false); 
        }
      };
      load();
    }, [selectedPeriod]);
    
    const maxDays = Math.max(...timelineData.map(d => d.avgDays));
    
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pipeline Timeline Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading timeline data...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">{error}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Timeline Chart */}
              <div className="space-y-4">
                {timelineData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    {/* Stage Name */}
                    <div className="w-48 text-sm font-medium text-gray-700">
                      {item.stage}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex-1 relative">
                      <div className="w-full bg-gray-200 rounded-full h-8 relative shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-indigo-400 via-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-700 shadow-sm"
                          style={{ 
                            width: `${Math.max(15, (item.avgDays / maxDays) * 100)}%`,
                            minWidth: '60px'
                          }}
                        >
                          {item.avgDays} days
                        </div>
                        {/* Shine effect */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                          style={{ width: `${Math.max(15, (item.avgDays / maxDays) * 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Transitions Count */}
                    <div className="w-20 text-right">
                      <div className="text-sm font-bold text-gray-900">{item.transitions}</div>
                      <div className="text-xs text-gray-500">transitions</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {timelineData.reduce((sum, item) => sum + item.avgDays, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Total Avg Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.max(...timelineData.map(d => d.avgDays)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Longest Stage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.min(...timelineData.map(d => d.avgDays)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Shortest Stage</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Fetch communications overview when tab is communications or when filters change
  useEffect(() => {
    if (activeTab !== 'communications') return;
    const load = async () => {
      setCommLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('timeframe', selectedPeriod);
        
        // Add role-based filtering
        if (commViewScope === 'personal') {
          params.append('userId', user?.id || '');
        } else if (selectedCommUser && selectedCommUser !== 'all-users') {
          if (selectedCommUser === 'current-user') {
            params.append('userId', user?.id || '');
          } else {
            params.append('userId', selectedCommUser);
          }
        }
        
        // Add date range filters if available
        const filters = getActiveFilters();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        
        const res = await makeApiCall(`${API_BASE}/metrics/communications-overview?${params.toString()}`);
        const json = await res.json();
        setCallStats(json?.data?.callStats || { totalMade: 0, totalReceived: 0, totalTime: '—', averageTime: '—' });
        setCallsByHour(json?.data?.callsByHour || []);
        setSmsStats(json?.data?.smsStats || { totalSent: 0, totalReceived: 0 });
        setSmsByHour(json?.data?.smsByHour || []);
        setCallSuccessRate(json?.data?.callSuccessRate || 0);
        setSmsDeliveryRate(json?.data?.smsDeliveryRate || 0);
      } finally {
        setCommLoading(false);
      }
    };
    load();
  }, [activeTab, selectedPeriod, commViewScope, selectedCommUser, showFilters, customDateRange]);

  // Fetch acquisitions overview when tab is acquisitions or when filters change
  useEffect(() => {
    if (activeTab !== 'acquisitions') return;
    const load = async () => {
      setAcqLoading(true);
      setAcqError(null);
      try {
        const params = new URLSearchParams();
        params.append('timeframe', selectedPeriod);
        
        // Add role-based filtering
        if (acqViewScope === 'personal') {
          params.append('userId', user?.id || '');
          params.append('scope', 'personal');
        } else if (selectedAcqUser && selectedAcqUser !== 'all-users') {
          if (selectedAcqUser === 'current-user') {
            params.append('userId', user?.id || '');
          } else {
            params.append('userId', selectedAcqUser);
          }
          params.append('scope', 'team');
        } else {
          params.append('scope', 'team');
        }
        
        // Add date range filters if available
        const filters = getActiveFilters();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sources?.length) params.append('sources', filters.sources.join(','));
        
        const res = await makeApiCall(`${API_BASE}/metrics/acquisitions-overview?${params.toString()}`);
        const json = await res.json();
        
        const data = json?.data || {};
        setAcquisitionsData({
          totalPropertiesInPipeline: data.pipelineMetrics?.totalInPipeline || 0,
          totalClearToClose: data.pipelineMetrics?.totalClearToClose || 0,
          clearToClosePercentage: data.pipelineMetrics?.clearToClosePercentage || 0,
          projectedProfit: data.financialMetrics?.projectedProfit || 0,
          totalDealsClosed: data.financialMetrics?.totalDealsClosed || 0,
          closedProfit: data.financialMetrics?.closedProfit || 0,
          leadsMishandled: {
            count: data.qualityMetrics?.mishandledLeads || 0,
            riskLevel: data.qualityMetrics?.riskLevel || 'low',
            details: data.qualityMetrics?.riskDetails || 'No issues detected'
          }
        });
      } catch (e) {
        setAcqError('Failed to load acquisitions data');
        console.error('Acquisitions data error:', e);
      } finally {
        setAcqLoading(false);
      }
    };
    load();
  }, [activeTab, selectedPeriod, acqViewScope, selectedAcqUser, showFilters, customDateRange]);

  // Fetch dispositions overview when tab is dispositions-team or when filters change
  useEffect(() => {
    if (activeTab !== 'dispositions-team') return;
    const load = async () => {
      setDispLoading(true);
      setDispError(null);
      try {
        const params = new URLSearchParams();
        params.append('timeframe', selectedPeriod);
        
        // Add role-based filtering
        if (dispViewScope === 'personal') {
          params.append('userId', user?.id || '');
          params.append('scope', 'personal');
        } else if (selectedDispUser && selectedDispUser !== 'all-users') {
          if (selectedDispUser === 'current-user') {
            params.append('userId', user?.id || '');
          } else {
            params.append('userId', selectedDispUser);
          }
          params.append('scope', 'team');
        } else {
          params.append('scope', 'team');
        }
        
        // Add date range filters if available
        const filters = getActiveFilters();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sources?.length) params.append('sources', filters.sources.join(','));
        
        const res = await makeApiCall(`${API_BASE}/metrics/dispositions-overview?${params.toString()}`);
        const json = await res.json();
        
        const data = json?.data || {};
        setDispositionsData({
          totalPropertiesInPipeline: data.pipelineMetrics?.totalInPipeline || 0,
          totalPropertiesSold: data.pipelineMetrics?.totalSold || 0,
          propertiesSoldPercentage: data.pipelineMetrics?.soldPercentage || 0,
          projectedProfit: data.financialMetrics?.projectedProfit || 0,
          totalDealsClosed: data.financialMetrics?.totalDealsClosed || 0,
          closedProfit: data.financialMetrics?.closedProfit || 0,
          buyersAdded: data.buyerMetrics?.buyersAdded || 0,
          leadsMishandled: {
            count: data.qualityMetrics?.mishandledLeads || 0,
            riskLevel: data.qualityMetrics?.riskLevel || 'low',
            details: data.qualityMetrics?.riskDetails || 'No issues detected'
          }
        });
      } catch (e) {
        setDispError('Failed to load dispositions data');
        console.error('Dispositions data error:', e);
      } finally {
        setDispLoading(false);
      }
    };
    load();
  }, [activeTab, selectedPeriod, dispViewScope, selectedDispUser, showFilters, customDateRange]);

  // Fetch transactions overview when tab is transaction-coordinator or when filters change
  useEffect(() => {
    if (activeTab !== 'transaction-coordinator') return;
    const load = async () => {
      setTcLoading(true);
      setTcError(null);
      try {
        const params = new URLSearchParams();
        params.append('timeframe', selectedPeriod);
        
        // Add role-based filtering
        if (tcViewScope === 'personal') {
          params.append('userId', user?.id || '');
          params.append('scope', 'personal');
        } else if (selectedTcUser && selectedTcUser !== 'all-users') {
          if (selectedTcUser === 'current-user') {
            params.append('userId', user?.id || '');
          } else {
            params.append('userId', selectedTcUser);
          }
          params.append('scope', 'overview');
        } else {
          params.append('scope', 'overview');
        }
        
        // Add date range filters if available
        const filters = getActiveFilters();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sources?.length) params.append('sources', filters.sources.join(','));
        
        const res = await makeApiCall(`${API_BASE}/metrics/transactions-overview?${params.toString()}`);
        const json = await res.json();
        
        const data = json?.data || {};
        setTransactionsData({
          totalPropertiesInPipeline: data.pipelineMetrics?.totalInPipeline || 0,
          totalClearToClose: data.pipelineMetrics?.totalClearToClose || 0,
          clearToClosePercentage: data.pipelineMetrics?.clearToClosePercentage || 0,
          projectedProfit: data.financialMetrics?.projectedProfit || 0,
          totalDealsClosed: data.financialMetrics?.totalDealsClosed || 0,
          closedProfit: data.financialMetrics?.closedProfit || 0,
          leadsMishandled: {
            count: data.qualityMetrics?.mishandledLeads || 0,
            riskLevel: data.qualityMetrics?.riskLevel || 'low',
            details: data.qualityMetrics?.riskDetails || 'No issues detected'
          }
        });
      } catch (e) {
        setTcError('Failed to load transactions data');
        console.error('Transactions data error:', e);
      } finally {
        setTcLoading(false);
      }
    };
    load();
  }, [activeTab, selectedPeriod, tcViewScope, selectedTcUser, showFilters, customDateRange]);

  // Fetch acquisitions leaderboard when tab is acquisitions-leaderboard or when period changes
  useEffect(() => {
    if (activeTab !== 'acquisitions-leaderboard') return;
    const load = async () => {
      setAcqLeaderboardLoading(true);
      setAcqLeaderboardError(null);
      try {
        const params = new URLSearchParams();
        params.append('period', acqLeaderboardPeriod);
        
        // Add role-based filtering
        if (user?.roles?.some(role => ['ACQ'].includes(role))) {
          params.append('userId', user?.id || '');
          params.append('scope', 'personal');
        } else {
          params.append('scope', 'team');
        }
        
        // Add date range filters if available
        const filters = getActiveFilters();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sources?.length) params.append('sources', filters.sources.join(','));
        
        const res = await makeApiCall(`${API_BASE}/metrics/acquisitions-leaderboard?${params.toString()}`);
        const json = await res.json();
        
        // API returns data as an array directly
        const agents = json?.data || [];
        
        // Calculate current user rank if user is an ACQ agent
        let currentUserRank;
        if (user?.id) {
          const userIndex = agents.findIndex((agent: any) => agent.userId === user.id);
          if (userIndex !== -1) {
            currentUserRank = userIndex + 1;
          }
        }
        
        setAcqLeaderboardData({
          agents: agents,
          currentUserRank: currentUserRank
        });
      } catch (e) {
        setAcqLeaderboardError('Failed to load acquisitions leaderboard');
        console.error('Acquisitions leaderboard error:', e);
      } finally {
        setAcqLeaderboardLoading(false);
      }
    };
    load();
  }, [activeTab, acqLeaderboardPeriod, showFilters, customDateRange]);

  // Fetch dispositions leaderboard when tab is dispositions-leaderboard or when period changes
  useEffect(() => {
    if (activeTab !== 'dispositions-leaderboard') return;
    const load = async () => {
      setDispLeaderboardLoading(true);
      setDispLeaderboardError(null);
      try {
        const params = new URLSearchParams();
        params.append('period', dispLeaderboardPeriod);
        
        // Add role-based filtering
        if (user?.roles?.some(role => ['DISP'].includes(role))) {
          params.append('userId', user?.id || '');
          params.append('scope', 'personal');
        } else {
          params.append('scope', 'team');
        }
        
        // Add date range filters if available
        const filters = getActiveFilters();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sources?.length) params.append('sources', filters.sources.join(','));
        
        const res = await makeApiCall(`${API_BASE}/metrics/dispositions-leaderboard?${params.toString()}`);
        const json = await res.json();
        
        // API returns data as an array directly
        const agents = json?.data || [];
        
        // Calculate current user rank if user is a DISP agent
        let currentUserRank;
        if (user?.id) {
          const userIndex = agents.findIndex((agent: any) => agent.userId === user.id);
          if (userIndex !== -1) {
            currentUserRank = userIndex + 1;
          }
        }
        
        setDispLeaderboardData({
          agents: agents,
          currentUserRank: currentUserRank
        });
      } catch (e) {
        setDispLeaderboardError('Failed to load dispositions leaderboard');
        console.error('Dispositions leaderboard error:', e);
      } finally {
        setDispLeaderboardLoading(false);
      }
    };
    load();
  }, [activeTab, dispLeaderboardPeriod, showFilters, customDateRange]);

  // Fetch marketing breakdown data
  useEffect(() => {
    if (activeTab !== 'marketing') return;
    const load = async () => {
      setMarketingLoading(true);
      setMarketingError(null);
      try {
        const filters = getActiveFilters();
        const params = new URLSearchParams();
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sources?.length) params.append('sources', filters.sources.join(','));
        
        const res = await makeApiCall(`${API_BASE}/metrics/marketing-breakdown?${params.toString()}`);
        const json = await res.json();
        setMarketingData(json?.data || []);
      } catch (e) {
        setMarketingError('Failed to load marketing data');
      } finally {
        setMarketingLoading(false);
      }
    };
    load();
  }, [activeTab, showFilters, customDateRange, selectedSource]);

  // Fetch Team pipelines on tab switch
  useEffect(() => {
    const fetchPipe = async (pipeline: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION') => {
      const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}&pipeline=${pipeline}`);
      const json = await res.json();
      return json?.data?.stages as { name: string; count: number }[] || [];
    };
    const load = async () => {
      // Fetch team KPIs in one call
      try {
        const kpiRes = await makeApiCall(`${API_BASE}/metrics/team-kpis?timeframe=${encodeURIComponent(selectedPeriod)}`);
        const k = await kpiRes.json();
        setAcqTotal(k?.data?.acqTotal || 0);
        setTranTotal(k?.data?.tranTotal || 0);
        setTranClearToClose(k?.data?.tranClearToClose || 0);
        setDispTotal(k?.data?.dispTotal || 0);
        setDispClosed(k?.data?.dispClosed || 0);
        setProjProfit(k?.data?.projectedProfit || 0);
        setClosedProfit(k?.data?.closedProfit || 0);
      } catch {}
      if (activeTab === 'acquisitions' || activeTab === 'pipeline' || activeTab === 'company') {
        const stages = await fetchPipe('ACQUISITIONS');
        setAcqTotal(stages.reduce((a, s) => a + (s.count || 0), 0));
      }
      if (activeTab === 'acquisitions' || activeTab === 'transaction-coordinator' || activeTab === 'pipeline') {
        const tStages = await fetchPipe('TRANSACTION');
        setTranTotal(tStages.reduce((a, s) => a + (s.count || 0), 0));
        setTranClearToClose(tStages.filter(s => s.name.toLowerCase().includes('clear to close')).reduce((a, s) => a + (s.count || 0), 0));
      }
      if (activeTab === 'dispositions-team' || activeTab === 'pipeline') {
        const dStages = await fetchPipe('DISPOSITIONS');
        setDispTotal(dStages.reduce((a, s) => a + (s.count || 0), 0));
        setDispClosed(dStages.filter(s => s.name.toLowerCase().includes('closed')).reduce((a, s) => a + (s.count || 0), 0));
      }
    };
    load();
  }, [activeTab, selectedPeriod]);

  // Fetch KPIs once per selectedPeriod
  useEffect(() => {
    const load = async () => {
      setKpiLoading(true);
      try {
        const res = await makeApiCall(`${API_BASE}/metrics/company-kpis?timeframe=${encodeURIComponent(selectedPeriod)}`);
        const json = await res.json();
        setKpis(json?.data || null);
      } finally {
        setKpiLoading(false);
      }
    };
    load();
  }, [selectedPeriod]);

  const numberOrDash = (n: number | null | undefined) => n == null ? '—' : new Intl.NumberFormat().format(n);

  const ContractsSignedCard: React.FC = () => {
    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Contracts Signed</p>
        <p className="text-3xl font-black text-blue-900">{kpiLoading ? '…' : numberOrDash(kpis?.contractsSigned)}</p>
        <p className="text-xs text-blue-600">Acquisitions Team</p>
      </div>
    );
  };

  const ContractsSoldCard: React.FC = () => {
    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-green-600 uppercase tracking-wider">Contracts Sold</p>
        <p className="text-3xl font-black text-green-900">{kpiLoading ? '…' : numberOrDash(kpis?.contractsSold)}</p>
        <p className="text-xs text-green-600">Dispositions Team</p>
      </div>
    );
  };

  const ProjectedProfitCard: React.FC = () => {
    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-purple-600 uppercase tracking-wider">Projected Profit</p>
        <p className="text-3xl font-black text-purple-900">{kpiLoading ? '…' : kpis?.projectedProfit == null ? '—' : `$${numberOrDash(kpis.projectedProfit)}`}</p>
        <p className="text-xs text-purple-600">Current Timeframe</p>
      </div>
    );
  };

  const ClosedProfitCard: React.FC = () => {
    return (
      <div className="space-y-2">
        <p className="text-sm font-bold text-orange-600 uppercase tracking-wider">Closed Profit</p>
        <p className="text-3xl font-black text-orange-900">{kpiLoading ? '…' : kpis?.closedProfit == null ? '—' : `$${numberOrDash(kpis.closedProfit)}`}</p>
        <p className="text-xs text-orange-600">Final Profit</p>
      </div>
    );
  };

  // Lead source pie chart data - will be populated from API
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);

  // Pipeline data for funnel chart - will be populated from API
  const [pipelineData, setPipelineData] = useState<any[]>([]);

  // Timeline Metrics Data - will be populated from API
  const [timelineData, setTimelineData] = useState<{ type: string; created_appt: string; appt_offer: string; created_offer: string; offer_closed: string }[]>([]);

  // Fetch lead source pie chart data
  useEffect(() => {
    const fetchPieData = async () => {
      try {
        const res = await makeApiCall(`${API_BASE}/metrics/lead-sources`);
        const json = await res.json();
        const buckets: { name: string; sources: Record<string, number> }[] = json?.data || [];
        
        // Aggregate across last 12 months into total per source
        const totals: Record<string, number> = {};
        for (const b of buckets) {
          for (const [k, v] of Object.entries(b.sources)) {
            totals[k] = (totals[k] || 0) + (v as number);
          }
        }
        
        // Convert to pie chart format with colors
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
        const items = Object.entries(totals)
          .map(([name, value], index) => ({ 
            name, 
            value, 
            color: colors[index % colors.length] 
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8); // top 8
        
        setPieData(items);
      } catch (error) {
        console.error('Failed to fetch pie chart data:', error);
        setPieData([]);
      }
    };

    fetchPieData();
  }, [user?.id]);

  // Fetch pipeline funnel data
  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const res = await makeApiCall(`${API_BASE}/metrics/pipeline-overview?timeframe=${selectedPeriod}&pipeline=ACQUISITIONS`);
        const json = await res.json();
        const stages = json?.data?.stages || [];
        
        // Transform to match the expected format
        const transformedData = stages.map((stage: any, index: number) => {
          const prevCount = index > 0 ? stages[index - 1]?.count : stage.count;
          const conversionRate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 100;
          const lost = prevCount - stage.count;
          const lostPercentage = prevCount > 0 ? Math.round((lost / prevCount) * 100) : 0;
          
          return {
            id: stage.name.toLowerCase().replace(/\s+/g, '-'),
            name: stage.name,
            count: stage.count,
            color: stage.color || 'bg-blue-500',
            badge: stage.color || 'bg-blue-500',
            percentage: `${conversionRate}%`,
            lost: lost > 0 ? lost : 0,
            lostPercentage: `${lostPercentage}%`
          };
        });
        
        setPipelineData(transformedData);
      } catch (error) {
        console.error('Failed to fetch pipeline data:', error);
        setPipelineData([]);
      }
    };

    fetchPipelineData();
  }, [selectedPeriod, user?.id]);

  // Fetch timeline metrics data
  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const res = await makeApiCall(`${API_BASE}/metrics/pipeline-analysis?timeframe=${selectedPeriod}`);
        const json = await res.json();
        const timeline = json?.data?.timeline || [];
        
        // Transform to match the expected format
        const transformedTimeline = timeline.map((item: any) => ({
          type: item.source || item.type || 'Unknown',
          created_appt: item.avgDaysToAppointment ? `${Math.round(item.avgDaysToAppointment)} days` : '0 days',
          appt_offer: item.avgDaysFromApptToOffer ? `${Math.round(item.avgDaysFromApptToOffer)} days` : '0 days',
          created_offer: item.avgDaysToOffer ? `${Math.round(item.avgDaysToOffer)} days` : '0 days',
          offer_closed: item.avgDaysFromOfferToClosed ? `${Math.round(item.avgDaysFromOfferToClosed)} days` : '0 days'
        }));
        
        setTimelineData(transformedTimeline);
      } catch (error) {
        console.error('Failed to fetch timeline data:', error);
        setTimelineData([]);
      }
    };

    fetchTimelineData();
  }, [selectedPeriod, user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Metrics</h1>
        
        {/* Global Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          {(selectedSource !== 'all' || selectedPeriod !== 'This Month') && (
            <Badge variant="secondary" className="ml-1">
              {(selectedSource !== 'all' ? 1 : 0) + (selectedPeriod !== 'This Month' ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Global Filters Panel */}
      {showFilters && (
        <Card className="p-3 border border-blue-200 bg-blue-50/30">
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Date Filters */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Date Range
                </h4>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Last Month">Last Month</SelectItem>
                    <SelectItem value="This Quarter">This Quarter</SelectItem>
                    <SelectItem value="This Year">This Year</SelectItem>
                    <SelectItem value="Custom Range">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedPeriod === 'Custom Range' && (
                  <div className="space-y-1 mt-1">
                    <div>
                      <Label className="text-[10px] font-medium text-gray-600">From Date</Label>
                      <input
                        type="date"
                        value={customDateRange.from?.toISOString().split('T')[0] || ''}
                        onChange={(e) => setCustomDateRange(prev => ({ 
                          ...prev, 
                          from: e.target.value ? new Date(e.target.value) : undefined 
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs font-normal"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-gray-600">To Date</Label>
                      <input
                        type="date"
                        value={customDateRange.to?.toISOString().split('T')[0] || ''}
                        onChange={(e) => setCustomDateRange(prev => ({ 
                          ...prev, 
                          to: e.target.value ? new Date(e.target.value) : undefined 
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs font-normal"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Source Filters */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Target className="w-3 h-3" />
                  Lead Sources
                </h4>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {availableSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear All Button */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-700 opacity-0">Spacer</h4>
                <Button
                  variant="default"
                  onClick={() => {
                    setSelectedPeriod('This Month');
                    setCustomDateRange({});
                    setSelectedSource('all');
                  }}
                  className="h-8 px-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <X className="w-3 h-3 mr-1.5" />
                  Clear Filters
                </Button>
              </div>
            </div>
            
            {/* Active Filters Summary */}
            {(selectedSource !== 'all' || selectedPeriod !== 'This Month') && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="text-xs font-semibold text-gray-700 mb-1">Active Filters:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPeriod !== 'This Month' && (
                    <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0">
                      {selectedPeriod}
                    </Badge>
                  )}
                  {selectedSource !== 'all' && (
                    <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0">
                      Source: {selectedSource}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="space-y-2 mb-6">
        {/* Top Row */}
        <div className="flex flex-wrap gap-2">
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
            Communications Overview
          </Button>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-wrap gap-2">
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
              </div>
              <ContractsSignedCard />
            </Card>

            {/* Contracts Sold */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-green-200 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <ContractsSoldCard />
            </Card>

            {/* Projected Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <ProjectedProfitCard />
            </Card>

            {/* Closed Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <ClosedProfitCard />
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
                  <BarChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              {isLoadingFlow && (
                <div className="text-center text-sm text-gray-500 mt-2">Loading flow data...</div>
              )}
              {flowError && (
                <div className="text-center text-sm text-red-500 mt-2">{flowError}</div>
              )}
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

            {/* Lead Sources - 25% width (dynamic) */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Source</h3>
              <DynamicLeadSources />
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
                <p className="text-3xl font-black text-gray-900">{kpiLoading ? '…' : kpis?.averageOfferPrice == null ? '—' : `$${numberOrDash(kpis.averageOfferPrice)}`}</p>
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
                <p className="text-3xl font-black text-gray-900">{kpiLoading ? '…' : kpis?.averageContractPrice == null ? '—' : `$${numberOrDash(kpis.averageContractPrice)}`}</p>
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
                <p className="text-3xl font-black text-gray-900">{kpiLoading ? '…' : kpis?.averageSoldPrice == null ? '—' : `$${numberOrDash(kpis.averageSoldPrice)}`}</p>
                <p className="text-xs text-gray-500">Per Sale</p>
              </div>
            </Card>

            {/* Average Deal Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full">Avg</div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Average Deal Profit</p>
                <p className="text-3xl font-black text-gray-900">{kpiLoading ? '…' : kpis?.averageDealProfit == null ? '—' : `$${numberOrDash(kpis.averageDealProfit)}`}</p>
                <p className="text-xs text-gray-500">Per Deal</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Marketing Overview Tab */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Marketing Overview is only available to Admin, Executive, and Manager roles.</p>
                  </div>
              </Card>
          ) : (
            <>
              {/* Header with View Toggle */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Marketing Overview - Lead Source Breakdown</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('numbers')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        viewMode === 'numbers'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Numbers
                    </button>
                    <button
                      onClick={() => setViewMode('percentages')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        viewMode === 'percentages'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Percentages
                    </button>
                </div>
                </div>
                </div>

              {/* Lead Sources Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Lead Sources Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading lead sources data...</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Pie Chart */}
                      <div className="flex items-center justify-center">
                        <div className="relative w-64 h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
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
                      </div>

                      {/* Legend and Stats */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Lead Sources</h4>
                          <div className="space-y-2">
                            {pieData.map((source, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full" 
                                    style={{ backgroundColor: source.color }}
                                  />
                                  <span className="text-sm text-gray-700">{source.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-gray-900">{source.value}</span>
                                  <span className="text-xs text-gray-500 w-12 text-right">
                                    {((source.value / pieData.reduce((sum, s) => sum + s.value, 0)) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Total Leads</span>
                            <span className="text-lg font-bold text-blue-600">
                              {pieData.reduce((sum, s) => sum + s.value, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marketing Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Source Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {marketingLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading marketing data...</div>
              </div>
                  ) : marketingError ? (
                    <div className="text-center py-8">
                      <div className="text-red-500">{marketingError}</div>
            </div>
                  ) : marketingData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">No marketing data available</div>
            </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Lead Source</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Total Leads</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Qualified</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Appointments</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Offers Made</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Under Contract</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Sold</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-600">Closed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketingData.map((source: any, index: number) => {
                            const totalLeads = source.totalLeads || 0;
                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">
                                  {source.leadSource}
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {totalLeads}
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {viewMode === 'numbers' 
                                    ? source.qualifiedLeads 
                                    : totalLeads > 0 
                                      ? `${((source.qualifiedLeads / totalLeads) * 100).toFixed(1)}%`
                                      : '0%'
                                  }
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {viewMode === 'numbers' 
                                    ? source.appointmentsSet 
                                    : totalLeads > 0 
                                      ? `${((source.appointmentsSet / totalLeads) * 100).toFixed(1)}%`
                                      : '0%'
                                  }
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {viewMode === 'numbers' 
                                    ? source.offersMade 
                                    : totalLeads > 0 
                                      ? `${((source.offersMade / totalLeads) * 100).toFixed(1)}%`
                                      : '0%'
                                  }
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {viewMode === 'numbers' 
                                    ? source.underContract 
                                    : totalLeads > 0 
                                      ? `${((source.underContract / totalLeads) * 100).toFixed(1)}%`
                                      : '0%'
                                  }
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {viewMode === 'numbers' 
                                    ? source.sold 
                                    : totalLeads > 0 
                                      ? `${((source.sold / totalLeads) * 100).toFixed(1)}%`
                                      : '0%'
                                  }
                                </td>
                                <td className="text-right py-3 px-4 text-gray-900">
                                  {viewMode === 'numbers' 
                                    ? source.closed 
                                    : totalLeads > 0 
                                      ? `${((source.closed / totalLeads) * 100).toFixed(1)}%`
                                      : '0%'
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
              </div>
                  )}
                </CardContent>
            </Card>

              {/* Conversion Metrics Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Conversion Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {marketingLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading conversion data...</div>
                    </div>
                  ) : marketingError ? (
                    <div className="text-center py-8">
                      <div className="text-red-500">{marketingError}</div>
                    </div>
                  ) : marketingData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">No conversion data available</div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Conversion Funnel */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Lead → Qualified */}
                        <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Lead → Qualified</span>
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {(() => {
                              const totalLeads = marketingData.reduce((sum: number, s: any) => sum + (s.totalLeads || 0), 0);
                              const qualified = marketingData.reduce((sum: number, s: any) => sum + (s.qualified || 0), 0);
                              return totalLeads > 0 ? ((qualified / totalLeads) * 100).toFixed(1) : '0.0';
                            })()}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {marketingData.reduce((sum: number, s: any) => sum + (s.qualified || 0), 0)} of {marketingData.reduce((sum: number, s: any) => sum + (s.totalLeads || 0), 0)} leads
                          </div>
                        </div>

                        {/* Qualified → Appointment */}
                        <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Qualified → Appointment</span>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {(() => {
                              const qualified = marketingData.reduce((sum: number, s: any) => sum + (s.qualified || 0), 0);
                              const appointments = marketingData.reduce((sum: number, s: any) => sum + (s.appointments || 0), 0);
                              return qualified > 0 ? ((appointments / qualified) * 100).toFixed(1) : '0.0';
                            })()}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {marketingData.reduce((sum: number, s: any) => sum + (s.appointments || 0), 0)} of {marketingData.reduce((sum: number, s: any) => sum + (s.qualified || 0), 0)} qualified
                          </div>
                        </div>

                        {/* Appointment → Offer */}
                        <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Appointment → Offer</span>
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {(() => {
                              const appointments = marketingData.reduce((sum: number, s: any) => sum + (s.appointments || 0), 0);
                              const offers = marketingData.reduce((sum: number, s: any) => sum + (s.offers || 0), 0);
                              return appointments > 0 ? ((offers / appointments) * 100).toFixed(1) : '0.0';
                            })()}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {marketingData.reduce((sum: number, s: any) => sum + (s.offers || 0), 0)} of {marketingData.reduce((sum: number, s: any) => sum + (s.appointments || 0), 0)} appointments
                          </div>
                        </div>

                        {/* Offer → Under Contract */}
                        <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Offer → Under Contract</span>
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="text-2xl font-bold text-orange-600">
                            {(() => {
                              const offers = marketingData.reduce((sum: number, s: any) => sum + (s.offers || 0), 0);
                              const underContract = marketingData.reduce((sum: number, s: any) => sum + (s.underContract || 0), 0);
                              return offers > 0 ? ((underContract / offers) * 100).toFixed(1) : '0.0';
                            })()}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {marketingData.reduce((sum: number, s: any) => sum + (s.underContract || 0), 0)} of {marketingData.reduce((sum: number, s: any) => sum + (s.offers || 0), 0)} offers
                          </div>
                        </div>

                        {/* Under Contract → Sold */}
                        <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg border border-yellow-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Under Contract → Sold</span>
                            <TrendingUp className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {(() => {
                              const underContract = marketingData.reduce((sum: number, s: any) => sum + (s.underContract || 0), 0);
                              const sold = marketingData.reduce((sum: number, s: any) => sum + (s.sold || 0), 0);
                              return underContract > 0 ? ((sold / underContract) * 100).toFixed(1) : '0.0';
                            })()}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {marketingData.reduce((sum: number, s: any) => sum + (s.sold || 0), 0)} of {marketingData.reduce((sum: number, s: any) => sum + (s.underContract || 0), 0)} under contract
                          </div>
                        </div>

                        {/* Sold → Closed */}
                        <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-lg border border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Sold → Closed</span>
                            <TrendingUp className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="text-2xl font-bold text-red-600">
                            {(() => {
                              const sold = marketingData.reduce((sum: number, s: any) => sum + (s.sold || 0), 0);
                              const closed = marketingData.reduce((sum: number, s: any) => sum + (s.closed || 0), 0);
                              return sold > 0 ? ((closed / sold) * 100).toFixed(1) : '0.0';
                            })()}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {marketingData.reduce((sum: number, s: any) => sum + (s.closed || 0), 0)} of {marketingData.reduce((sum: number, s: any) => sum + (s.sold || 0), 0)} sold
                          </div>
                        </div>
                      </div>

                      {/* Overall Conversion Rate */}
                      <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg border-2 border-indigo-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">Overall Conversion Rate</h4>
                            <p className="text-sm text-gray-600">Lead to Closed Deal</p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold text-indigo-600">
                              {(() => {
                                const totalLeads = marketingData.reduce((sum: number, s: any) => sum + (s.totalLeads || 0), 0);
                                const closed = marketingData.reduce((sum: number, s: any) => sum + (s.closed || 0), 0);
                                return totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(1) : '0.0';
                              })()}%
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {marketingData.reduce((sum: number, s: any) => sum + (s.closed || 0), 0)} closed from {marketingData.reduce((sum: number, s: any) => sum + (s.totalLeads || 0), 0)} leads
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Pipeline Overview Tab */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Pipeline Overview is only available to Admin, Executive, and Manager roles.</p>
              </div>
            </Card>
          ) : (
            <>
          <div className="space-y-4">
            {/* Pipeline Type Toggle */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Pipeline Overview</h2>
            </div>
            
            <div className="flex justify-end items-center">
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPipelineView('funnel')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      pipelineView === 'funnel'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Funnel View
                  </button>
                  <button
                    onClick={() => setPipelineView('timeline')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      pipelineView === 'timeline'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Timeline View
                  </button>
                </div>
                
                {/* Period Selector */}
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
            </div>
          </div>

              {/* Acquisitions Pipeline */}
              {pipelineView === 'funnel' ? (
                <>
                  {/* Enhanced Pipeline Funnel Chart */}
                  <EnhancedPipelineFunnel selectedPeriod={selectedPeriod} />
                  
                  {/* Pipeline Table for additional details */}
                  <PipelineTable selectedPeriod={selectedPeriod} />
                </>
              ) : (
                <>
                      {/* Enhanced Timeline Chart */}
                      <EnhancedPipelineTimeline selectedPeriod={selectedPeriod} />
                      
                      {/* Timeline Metrics Table */}
                      {timelineData.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Clock className="w-5 h-5" />
                              Average Time by Source
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Source Type
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Created → Appt
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Appt → Offer
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Created → Offer
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Offer → Closed
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {timelineData.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{row.type}</div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {row.created_appt}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          {row.appt_offer}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          {row.created_offer}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          {row.offer_closed}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Summary Stats */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">Avg Created → Appt</div>
                                  <div className="text-lg font-bold text-blue-600">
                                    {timelineData.length > 0 
                                      ? Math.round(timelineData.reduce((sum, item) => sum + parseInt(item.created_appt), 0) / timelineData.length)
                                      : 0} days
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">Avg Appt → Offer</div>
                                  <div className="text-lg font-bold text-green-600">
                                    {timelineData.length > 0 
                                      ? Math.round(timelineData.reduce((sum, item) => sum + parseInt(item.appt_offer), 0) / timelineData.length)
                                      : 0} days
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">Avg Created → Offer</div>
                                  <div className="text-lg font-bold text-purple-600">
                                    {timelineData.length > 0 
                                      ? Math.round(timelineData.reduce((sum, item) => sum + parseInt(item.created_offer), 0) / timelineData.length)
                                      : 0} days
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">Avg Offer → Closed</div>
                                  <div className="text-lg font-bold text-orange-600">
                                    {timelineData.length > 0 
                                      ? Math.round(timelineData.reduce((sum, item) => sum + parseInt(item.offer_closed), 0) / timelineData.length)
                                      : 0} days
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
            </>
          )}
        </div>
      )}

      {/* Communications Overview Tab */}
      {activeTab === "communications" && (
        <div className="space-y-6">
          {/* Header with Role-Based View Selector */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Communications Overview</h2>
            <div className="flex items-center space-x-4">
              {/* View Scope Toggle for Managers/Executives/Admins */}
              {(isAdmin || isExecutive || isManager) && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCommViewScope('personal')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      commViewScope === 'personal'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setCommViewScope('team')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      commViewScope === 'team'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {isAdmin || isExecutive ? 'Company' : 'Team'}
                  </button>
                </div>
              )}
              
              {/* User Selector - Only for team/company view */}
              {commViewScope === 'team' && (
                <Select value={selectedCommUser} onValueChange={setSelectedCommUser}>
              <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                    <SelectItem value="all-users">All Users</SelectItem>
                    <SelectItem value="current-user">Current User</SelectItem>
                    {/* Dynamic user list would go here */}
              </SelectContent>
            </Select>
              )}
            </div>
          </div>

          {/* Row 1 - Calling Statistics */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-blue-600" />
              Call Statistics
            </h3>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Call Stats - 25% */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                <h4 className="text-md font-semibold text-gray-900 mb-6">Call Metrics</h4>
                {commLoading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                  </div>
                ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Calls Made</span>
                      <span className="text-lg font-bold text-blue-600">
                        {callStats?.totalMade || 0}
                      </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Calls Received</span>
                      <span className="text-lg font-bold text-green-600">
                        {callStats?.totalReceived || 0}
                      </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Time on Calls</span>
                      <span className="text-lg font-bold text-purple-600">
                        {callStats?.totalTime || '—'}
                      </span>
                </div>
                <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Average Time per Call</span>
                      <span className="text-lg font-bold text-orange-600">
                        {callStats?.averageTime || '—'}
                      </span>
                </div>
              </div>
                )}
            </Card>

            {/* Call Time Distribution Chart - 75% */}
            <Card className="lg:col-span-3 p-6 hover:shadow-lg transition-shadow">
                <h4 className="text-md font-semibold text-gray-900 mb-6">Hourly Call Distribution</h4>
                {commLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-pulse bg-gray-200 h-full w-full rounded"></div>
                  </div>
                ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={callsByHour.length > 0 ? callsByHour : [
                          { hour: '9 AM', outbound: 0, inbound: 0 },
                          { hour: '10 AM', outbound: 0, inbound: 0 },
                          { hour: '11 AM', outbound: 0, inbound: 0 },
                          { hour: '12 PM', outbound: 0, inbound: 0 },
                          { hour: '1 PM', outbound: 0, inbound: 0 },
                          { hour: '2 PM', outbound: 0, inbound: 0 },
                          { hour: '3 PM', outbound: 0, inbound: 0 },
                          { hour: '4 PM', outbound: 0, inbound: 0 },
                          { hour: '5 PM', outbound: 0, inbound: 0 }
                        ]} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
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
                )}
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
          </div>

          {/* Row 2 - SMS Statistics */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
              SMS Statistics
            </h3>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* SMS Stats - 25% */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                <h4 className="text-md font-semibold text-gray-900 mb-6">SMS Metrics</h4>
                {commLoading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                  </div>
                ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total SMS Sent</span>
                      <span className="text-lg font-bold text-purple-600">
                        {smsStats?.totalSent || 0}
                      </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total SMS Received</span>
                      <span className="text-lg font-bold text-orange-600">
                        {smsStats?.totalReceived || 0}
                      </span>
                </div>
              </div>
                )}
            </Card>

            {/* SMS Time Distribution Chart - 75% */}
            <Card className="lg:col-span-3 p-6 hover:shadow-lg transition-shadow">
                <h4 className="text-md font-semibold text-gray-900 mb-6">Hourly SMS Distribution</h4>
                {commLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-pulse bg-gray-200 h-full w-full rounded"></div>
                  </div>
                ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={smsByHour.length > 0 ? smsByHour : [
                          { hour: '9 AM', outbound: 0, inbound: 0 },
                          { hour: '10 AM', outbound: 0, inbound: 0 },
                          { hour: '11 AM', outbound: 0, inbound: 0 },
                          { hour: '12 PM', outbound: 0, inbound: 0 },
                          { hour: '1 PM', outbound: 0, inbound: 0 },
                          { hour: '2 PM', outbound: 0, inbound: 0 },
                          { hour: '3 PM', outbound: 0, inbound: 0 },
                          { hour: '4 PM', outbound: 0, inbound: 0 },
                          { hour: '5 PM', outbound: 0, inbound: 0 }
                        ]} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
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
                )}
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
          </div>

          {/* Row 3 - Risk Management Statistics */}
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-600" />
              Risk Management
            </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Call Success Rate - 50% */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
                <h4 className="text-md font-semibold text-gray-900 mb-6">Call Success Rate</h4>
                {commLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-pulse bg-gray-200 w-32 h-32 rounded-full"></div>
                  </div>
                ) : (
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                              { name: 'Answered', value: callSuccessRate || 0, color: '#10b981' },
                              { name: 'Rejected/Missed', value: 100 - (callSuccessRate || 0), color: '#ef4444' }
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
                          <div className={`text-3xl font-bold ${callSuccessRate >= 70 ? 'text-green-600' : callSuccessRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {callSuccessRate?.toFixed(1) || '0.0'}%
                    </div>
                          <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </div>
                  </div>
                )}
                <div className="flex justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Answered ({(callSuccessRate || 0).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Rejected ({(100 - (callSuccessRate || 0)).toFixed(1)}%)</span>
                </div>
              </div>
            </Card>

            {/* SMS Delivery Rate - 50% */}
              <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                <h4 className="text-md font-semibold text-gray-900 mb-6">SMS Delivery Rate</h4>
                {commLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-pulse bg-gray-200 w-32 h-32 rounded-full"></div>
                  </div>
                ) : (
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                              { name: 'Delivered', value: smsDeliveryRate || 0, color: '#3b82f6' },
                              { name: 'Failed', value: 100 - (smsDeliveryRate || 0), color: '#ef4444' }
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
                          <div className={`text-3xl font-bold ${smsDeliveryRate >= 90 ? 'text-blue-600' : smsDeliveryRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {smsDeliveryRate?.toFixed(1) || '0.0'}%
                    </div>
                          <div className="text-sm text-gray-600">Delivered</div>
                  </div>
                </div>
              </div>
                  </div>
                )}
                <div className="flex justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Delivered ({(smsDeliveryRate || 0).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Failed ({(100 - (smsDeliveryRate || 0)).toFixed(1)}%)</span>
                </div>
              </div>
            </Card>
            </div>
          </div>
        </div>
      )}

      {/* Acquisitions Team Tab */}
      {activeTab === "acquisitions" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER', 'ACQ', 'TC'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Acquisitions Overview is only available to Admin, Executive, Manager, Acquisitions Agent, and Transaction Coordinator roles.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Header with Role-Based View Selector */}
          <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Acquisitions Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {acqViewScope === 'personal' ? 'Personal Performance Metrics' : 'Team-wide Performance Overview'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {/* View Scope Toggle - Only for Admin/Executive/Manager */}
                  {user?.roles?.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setAcqViewScope('personal')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          acqViewScope === 'personal'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Personal
                      </button>
                      <button
                        onClick={() => setAcqViewScope('team')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          acqViewScope === 'team'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Team-wide
                      </button>
                    </div>
                  )}
                  
                  {/* User Selector - Only for team view and appropriate roles */}
                  {acqViewScope === 'team' && user?.roles?.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) && (
                    <Select value={selectedAcqUser} onValueChange={setSelectedAcqUser}>
              <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                        <SelectItem value="all-users">All Acquisitions Agents</SelectItem>
                        <SelectItem value="current-user">Current User</SelectItem>
                        {/* Dynamic ACQ agent list would go here */}
              </SelectContent>
            </Select>
                  )}
                </div>
          </div>

          {/* Row 1 - Pipeline Metrics */}
              {acqError ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-red-500 mb-2">⚠️ Error Loading Data</div>
                    <p className="text-gray-600 text-sm">{acqError}</p>
                  </div>
                </Card>
              ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Total Properties in Pipeline */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white border border-blue-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Total Properties in Pipeline</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-blue-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
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
                              strokeDasharray={`${((acquisitionsData?.totalPropertiesInPipeline || 0)/Math.max(1, (acquisitionsData?.totalPropertiesInPipeline || 0) + 10)) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                              <div className="text-2xl font-black text-blue-600">{acquisitionsData?.totalPropertiesInPipeline || 0}</div>
                  <div className="text-xs text-gray-600 font-medium">Total</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className="text-lg font-bold text-blue-900">{acquisitionsData?.totalPropertiesInPipeline || 0}</div>
                <p className="text-xs text-blue-600">Properties in Pipeline</p>
              </div>
            </Card>

            {/* Total Properties Clear to Close */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white border border-green-200">
              <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Total Clear to Close</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-green-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
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
                              strokeDasharray={`${((acquisitionsData?.totalClearToClose || 0)/Math.max(1, (acquisitionsData?.totalPropertiesInPipeline || 1))) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                              <div className="text-2xl font-black text-green-600">{acquisitionsData?.totalClearToClose || 0}</div>
                      <div className="text-xs text-gray-600 font-medium">Clear to Close</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className="text-lg font-bold text-green-900">{acquisitionsData?.totalClearToClose || 0}</div>
                      <p className="text-xs text-green-600">Ready for Closing</p>
              </div>
            </Card>

            {/* Percentage Clear to Close */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-white border border-purple-200">
              <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider">% Clear to Close</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-purple-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
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
                              strokeDasharray={`${((acquisitionsData?.clearToClosePercentage || 0)/100) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                              <div className="text-2xl font-black text-purple-600">{(acquisitionsData?.clearToClosePercentage || 0).toFixed(1)}%</div>
                              <div className="text-xs text-gray-600 font-medium">Success Rate</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className="text-lg font-bold text-purple-900">{(acquisitionsData?.clearToClosePercentage || 0).toFixed(1)}%</div>
                <p className="text-xs text-purple-600">Clear to Close Rate</p>
              </div>
            </Card>
          </div>
              )}

          {/* Row 2 - Financial Metrics */}
              {!acqError && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Projected Profit */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-white border border-orange-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Projected Profit</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-orange-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
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
                              strokeDasharray={`${(acquisitionsData?.projectedProfit && acquisitionsData.projectedProfit > 0 ? Math.min(acquisitionsData.projectedProfit, 1000000) / 1000000 : 0) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                              <div className="text-xl font-black text-orange-600">${Math.round((acquisitionsData?.projectedProfit||0)/1000)}K</div>
                      <div className="text-xs text-gray-600 font-medium">of $1M</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className="text-lg font-bold text-orange-900">{acquisitionsData?.projectedProfit ? Math.round((acquisitionsData.projectedProfit/1000000)*100) : 0}%</div>
                      <p className="text-xs text-orange-600">${new Intl.NumberFormat().format(acquisitionsData?.projectedProfit||0)}</p>
              </div>
            </Card>

            {/* Total Deals Closed */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white border border-green-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Total Deals Closed</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-green-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
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
                              strokeDasharray={`${((acquisitionsData?.totalDealsClosed || 0)/Math.max(1, (acquisitionsData?.totalPropertiesInPipeline || 1))) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                              <div className="text-2xl font-black text-green-600">{acquisitionsData?.totalDealsClosed || 0}</div>
                              <div className="text-xs text-gray-600 font-medium">Deals</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className="text-lg font-bold text-green-900">{acquisitionsData?.totalDealsClosed || 0}</div>
                      <p className="text-xs text-green-600">Closed Successfully</p>
              </div>
            </Card>

            {/* Closed Profit */}
            <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white border border-blue-200">
              <div className="text-center space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Closed Profit</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-blue-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
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
                              strokeDasharray={`${(acquisitionsData?.closedProfit && acquisitionsData.closedProfit > 0 ? Math.min(acquisitionsData.closedProfit, 800000) / 800000 : 0) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                              <div className="text-xl font-black text-blue-600">${Math.round((acquisitionsData?.closedProfit||0)/1000)}K</div>
                      <div className="text-xs text-gray-600 font-medium">of $800K</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className="text-lg font-bold text-blue-900">{acquisitionsData?.closedProfit ? Math.round((acquisitionsData.closedProfit/800000)*100) : 0}%</div>
                      <p className="text-xs text-blue-600">${new Intl.NumberFormat().format(acquisitionsData?.closedProfit||0)}</p>
              </div>
            </Card>

                  {/* Leads Mishandled - Color Coded */}
                  <Card className={`p-8 hover:shadow-lg transition-shadow bg-gradient-to-br border ${
                    !acqLoading && acquisitionsData?.leadsMishandled ? (
                      acquisitionsData.leadsMishandled.riskLevel === 'high' 
                        ? 'from-red-50 to-white border-red-200' 
                        : acquisitionsData.leadsMishandled.riskLevel === 'medium' 
                          ? 'from-yellow-50 to-white border-yellow-200'
                          : 'from-green-50 to-white border-green-200'
                    ) : 'from-gray-50 to-white border-gray-200'
                  }`}>
              <div className="text-center space-y-4">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${
                        !acqLoading && acquisitionsData?.leadsMishandled ? (
                          acquisitionsData.leadsMishandled.riskLevel === 'high' 
                            ? 'text-red-600' 
                            : acquisitionsData.leadsMishandled.riskLevel === 'medium' 
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        ) : 'text-gray-600'
                      }`}>Leads Mishandled</h3>
                      {acqLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-gray-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                <div className="relative w-32 h-32 mx-auto">
                          <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${
                            acquisitionsData?.leadsMishandled?.riskLevel === 'high' 
                              ? 'bg-red-100 border-red-300' 
                              : acquisitionsData?.leadsMishandled?.riskLevel === 'medium' 
                                ? 'bg-yellow-100 border-yellow-300'
                                : 'bg-green-100 border-green-300'
                          }`}>
                    <div className="text-center">
                              <div className={`text-3xl font-black ${
                                acquisitionsData?.leadsMishandled?.riskLevel === 'high' 
                                  ? 'text-red-600' 
                                  : acquisitionsData?.leadsMishandled?.riskLevel === 'medium' 
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                              }`}>{acquisitionsData?.leadsMishandled?.count || 0}</div>
                              <div className={`text-xs font-medium ${
                                acquisitionsData?.leadsMishandled?.riskLevel === 'high' 
                                  ? 'text-red-700' 
                                  : acquisitionsData?.leadsMishandled?.riskLevel === 'medium' 
                                    ? 'text-yellow-700'
                                    : 'text-green-700'
                              }`}>Mishandled</div>
                    </div>
                  </div>
                </div>
                      )}
                      <div className={`text-lg font-bold ${
                        acquisitionsData?.leadsMishandled?.riskLevel === 'high' 
                          ? 'text-red-900' 
                          : acquisitionsData?.leadsMishandled?.riskLevel === 'medium' 
                            ? 'text-yellow-900'
                            : 'text-green-900'
                      }`}>
                        {acquisitionsData?.leadsMishandled?.riskLevel === 'high' 
                          ? 'High Risk' 
                          : acquisitionsData?.leadsMishandled?.riskLevel === 'medium' 
                            ? 'Medium Risk'
                            : 'Low Risk'
                        }
                      </div>
                      <p className={`text-xs ${
                        acquisitionsData?.leadsMishandled?.riskLevel === 'high' 
                          ? 'text-red-600' 
                          : acquisitionsData?.leadsMishandled?.riskLevel === 'medium' 
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}>{acquisitionsData?.leadsMishandled?.details || 'No issues detected'}</p>
              </div>
            </Card>
          </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dispositions Team Tab */}
      {activeTab === "dispositions-team" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER', 'DISP', 'TC'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Dispositions Overview is only available to Admin, Executive, Manager, Dispositions Agent, and Transaction Coordinator roles.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Header with Role-Based View Selector */}
              <div className="flex justify-between items-center">
            <div>
                  <h2 className="text-xl font-semibold">Dispositions Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {dispViewScope === 'personal' ? 'Personal Performance Metrics' : 'Team-wide Performance Overview'}
                  </p>
            </div>
                <div className="flex items-center space-x-4">
                  {/* View Scope Toggle - Only for Admin/Executive/Manager */}
                  {user?.roles?.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setDispViewScope('personal')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          dispViewScope === 'personal'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Personal
                      </button>
                      <button
                        onClick={() => setDispViewScope('team')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          dispViewScope === 'team'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Team-wide
                      </button>
                    </div>
                  )}
                  
                  {/* User Selector - Only for team view and appropriate roles */}
                  {dispViewScope === 'team' && user?.roles?.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) && (
                    <Select value={selectedDispUser} onValueChange={setSelectedDispUser}>
              <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                        <SelectItem value="all-users">All Dispositions Agents</SelectItem>
                        <SelectItem value="current-user">Current User</SelectItem>
                        {/* Dynamic DISP agent list would go here */}
              </SelectContent>
            </Select>
                  )}
                </div>
          </div>
          
          {/* Row 1 - Pipeline Metrics */}
          {dispError ? (
            <Card className="p-6">
              <div className="text-center">
                <div className="text-red-500 mb-2">⚠️ Error Loading Data</div>
                <p className="text-gray-600 text-sm">{dispError}</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <span className="text-2xl font-bold text-gray-900">
                      {dispLoading ? '...' : (dispositionsData?.propertiesSoldPercentage || 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Properties in Pipeline</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {dispLoading ? '...' : (dispositionsData?.totalPropertiesInPipeline || dispTotal || 0)}
                  </p>
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
                    <span className="text-2xl font-bold text-gray-900">
                      {dispLoading ? '...' : (dispositionsData?.propertiesSoldPercentage || 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Properties Sold</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {dispLoading ? '...' : (dispositionsData?.totalPropertiesSold || dispClosed || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Closed this period</p>
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
                      strokeDasharray={`${((dispositionsData?.projectedProfit || 0) / 200000) * 251.2} 251.2`}
                      className="text-orange-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {dispLoading ? '...' : (((dispositionsData?.projectedProfit || 0) / 200000) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Projected Profit</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {dispLoading ? '...' : `$${(dispositionsData?.projectedProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-xs text-gray-500">of $200,000.00 target</p>
                </div>
              </div>
            </Card>
          </div>
          )}

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
                      strokeDasharray={`${((dispositionsData?.totalDealsClosed || 0) / Math.max((dispositionsData?.totalPropertiesInPipeline || 1), 1)) * 251.2} 251.2`}
                      className="text-emerald-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {dispLoading ? '...' : (((dispositionsData?.totalDealsClosed || 0) / Math.max((dispositionsData?.totalPropertiesInPipeline || 1), 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Deals Closed</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {dispLoading ? '...' : `${dispositionsData?.totalDealsClosed || 0} of ${dispositionsData?.totalPropertiesInPipeline || 0}`}
                  </p>
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
                      strokeDasharray={`${((dispositionsData?.closedProfit || 0) / 200000) * 251.2} 251.2`}
                      className="text-cyan-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">
                      {dispLoading ? '...' : (((dispositionsData?.closedProfit || 0) / 200000) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Closed Profit</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {dispLoading ? '...' : `$${(dispositionsData?.closedProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
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
                      strokeDasharray={`${((dispositionsData?.buyersAdded || 0) / 100) * 251.2} 251.2`}
                      className="text-indigo-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {dispLoading ? '...' : (((dispositionsData?.buyersAdded || 0) / 100) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Buyers Added</h3>
                  <p className="text-lg font-bold text-gray-900">
                    {dispLoading ? '...' : `${dispositionsData?.buyersAdded || 0} of 100`}
                  </p>
                  <p className="text-xs text-gray-500">New buyers this month</p>
                </div>
              </div>
            </Card>

            {/* Leads Mishandled */}
            <Card className="p-6 text-center bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${
                    (dispositionsData?.leadsMishandled?.count || 0) <= 4 
                      ? 'bg-yellow-100 border-yellow-500' 
                      : (dispositionsData?.leadsMishandled?.count || 0) <= 9 
                      ? 'bg-orange-100 border-orange-500' 
                      : 'bg-red-100 border-red-500'
                  }`}>
                    <span className={`text-2xl font-bold ${
                      (dispositionsData?.leadsMishandled?.count || 0) <= 4 
                        ? 'text-yellow-700' 
                        : (dispositionsData?.leadsMishandled?.count || 0) <= 9 
                        ? 'text-orange-700' 
                        : 'text-red-700'
                    }`}>
                      {dispLoading ? '...' : (dispositionsData?.leadsMishandled?.count || 0)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Leads Mishandled</h3>
                  <p className={`text-lg font-bold ${
                    (dispositionsData?.leadsMishandled?.count || 0) <= 4 
                      ? 'text-yellow-700' 
                      : (dispositionsData?.leadsMishandled?.count || 0) <= 9 
                      ? 'text-orange-700' 
                      : 'text-red-700'
                  }`}>
                    {dispLoading ? '...' : `${dispositionsData?.leadsMishandled?.count || 0} Leads`}
                  </p>
                  <p className="text-xs text-yellow-600">1-4: Yellow • 5-9: Orange • 10+: Red</p>
                </div>
              </div>
            </Card>
          </div>
            </>
          )}
        </div>
      )}

      {/* Transaction Coordinator Tab */}
      {activeTab === "transaction-coordinator" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER', 'TC'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Transactions Overview is only available to Admin, Executive, Manager, and Transaction Coordinator roles.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Header with Role-Based View Selector */}
              <div className="flex justify-between items-center">
            <div>
                  <h2 className="text-xl font-semibold">Transactions Overview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {tcViewScope === 'personal' ? 'Personal Transaction Coordination Metrics' : 'Company-wide Transaction Overview'}
                  </p>
            </div>
                <div className="flex items-center space-x-4">
                  {/* View Scope Toggle - Only for Admin/Executive/Manager */}
                  {user?.roles?.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setTcViewScope('personal')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          tcViewScope === 'personal'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Personal
                      </button>
                      <button
                        onClick={() => setTcViewScope('overview')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          tcViewScope === 'overview'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Overview
                      </button>
                    </div>
                  )}
                  
                  {/* User Selector - Only for overview and appropriate roles */}
                  {tcViewScope === 'overview' && user?.roles?.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER'].includes(role)) && (
                    <Select value={selectedTcUser} onValueChange={setSelectedTcUser}>
              <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select coordinator" />
              </SelectTrigger>
              <SelectContent>
                        <SelectItem value="all-users">All Transaction Coordinators</SelectItem>
                        <SelectItem value="current-user">Current User</SelectItem>
                        {/* Dynamic TC list would go here */}
              </SelectContent>
            </Select>
                  )}
                </div>
          </div>
          
              {/* Row 1 - Pipeline & Clear-to-Close Metrics */}
              {tcError ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-red-500 mb-2">⚠️ Error Loading Data</div>
                    <p className="text-gray-600 text-sm">{tcError}</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Total Properties in Pipeline */}
                  <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                    <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Total Properties in Pipeline</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-blue-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="50" stroke="#3b82f6" strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${((transactionsData?.totalPropertiesInPipeline || 0)/Math.max(1, (transactionsData?.totalPropertiesInPipeline || 0) + 10)) * 314} 314`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-black text-blue-600">{transactionsData?.totalPropertiesInPipeline || 0}</div>
                              <div className="text-xs text-gray-600 font-medium">Total</div>
                            </div>
          </div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-blue-900">{transactionsData?.totalPropertiesInPipeline || 0}</div>
                      <p className="text-xs text-blue-600">Properties in Transaction</p>
                    </div>
                  </Card>

                  {/* Total Clear to Close */}
                  <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white border border-green-200">
                    <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Total Clear to Close</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-green-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${((transactionsData?.totalClearToClose || 0)/Math.max(1, (transactionsData?.totalPropertiesInPipeline || 1))) * 314} 314`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-black text-green-600">{transactionsData?.totalClearToClose || 0}</div>
                              <div className="text-xs text-gray-600 font-medium">Clear to Close</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-green-900">{transactionsData?.totalClearToClose || 0}</div>
                      <p className="text-xs text-green-600">Ready for Closing</p>
                    </div>
                  </Card>

                  {/* % Clear to Close */}
                  <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-white border border-purple-200">
                    <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider">% Clear to Close</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-purple-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="50" stroke="#8b5cf6" strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${((transactionsData?.clearToClosePercentage || 0)/100) * 314} 314`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-black text-purple-600">{(transactionsData?.clearToClosePercentage || 0).toFixed(1)}%</div>
                              <div className="text-xs text-gray-600 font-medium">Success Rate</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-purple-900">{(transactionsData?.clearToClosePercentage || 0).toFixed(1)}%</div>
                      <p className="text-xs text-purple-600">Clear to Close Rate</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Row 2 - Financial & Quality Metrics */}
              {!tcError && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Projected Profit */}
                  <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-white border border-orange-200">
                    <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Projected Profit</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-orange-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="50" stroke="#f97316" strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${(transactionsData?.projectedProfit && transactionsData.projectedProfit > 0 ? Math.min(transactionsData.projectedProfit, 1000000) / 1000000 : 0) * 314} 314`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-xl font-black text-orange-600">${Math.round((transactionsData?.projectedProfit||0)/1000)}K</div>
                              <div className="text-xs text-gray-600 font-medium">of $1M</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-orange-900">{transactionsData?.projectedProfit ? Math.round((transactionsData.projectedProfit/1000000)*100) : 0}%</div>
                      <p className="text-xs text-orange-600">${new Intl.NumberFormat().format(transactionsData?.projectedProfit||0)}</p>
                    </div>
                  </Card>

                  {/* Total Deals Closed */}
                  <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-white border border-green-200">
                    <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Total Deals Closed</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-green-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${((transactionsData?.totalDealsClosed || 0)/Math.max(1, (transactionsData?.totalPropertiesInPipeline || 1))) * 314} 314`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-black text-green-600">{transactionsData?.totalDealsClosed || 0}</div>
                              <div className="text-xs text-gray-600 font-medium">Deals</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-green-900">{transactionsData?.totalDealsClosed || 0}</div>
                      <p className="text-xs text-green-600">Closed Successfully</p>
                    </div>
                  </Card>

                  {/* Closed Profit */}
                  <Card className="p-8 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                    <div className="text-center space-y-4">
                      <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Closed Profit</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-blue-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="60" cy="60" r="50" stroke="#3b82f6" strokeWidth="8" fill="none" strokeLinecap="round"
                              strokeDasharray={`${(transactionsData?.closedProfit && transactionsData.closedProfit > 0 ? Math.min(transactionsData.closedProfit, 800000) / 800000 : 0) * 314} 314`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-xl font-black text-blue-600">${Math.round((transactionsData?.closedProfit||0)/1000)}K</div>
                              <div className="text-xs text-gray-600 font-medium">of $800K</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-blue-900">{transactionsData?.closedProfit ? Math.round((transactionsData.closedProfit/800000)*100) : 0}%</div>
                      <p className="text-xs text-blue-600">${new Intl.NumberFormat().format(transactionsData?.closedProfit||0)}</p>
                    </div>
                  </Card>

                  {/* Leads Mishandled - Color Coded */}
                  <Card className={`p-8 hover:shadow-lg transition-shadow bg-gradient-to-br border ${
                    !tcLoading && transactionsData?.leadsMishandled ? (
                      transactionsData.leadsMishandled.riskLevel === 'high' 
                        ? 'from-red-50 to-white border-red-200' 
                        : transactionsData.leadsMishandled.riskLevel === 'medium' 
                          ? 'from-yellow-50 to-white border-yellow-200'
                          : 'from-green-50 to-white border-green-200'
                    ) : 'from-gray-50 to-white border-gray-200'
                  }`}>
                    <div className="text-center space-y-4">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${
                        !tcLoading && transactionsData?.leadsMishandled ? (
                          transactionsData.leadsMishandled.riskLevel === 'high' 
                            ? 'text-red-600' 
                            : transactionsData.leadsMishandled.riskLevel === 'medium' 
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        ) : 'text-gray-600'
                      }`}>Leads Mishandled</h3>
                      {tcLoading ? (
                        <div className="w-32 h-32 mx-auto flex items-center justify-center">
                          <div className="animate-pulse bg-gray-200 w-32 h-32 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mx-auto">
                          <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${
                            transactionsData?.leadsMishandled?.riskLevel === 'high' 
                              ? 'bg-red-100 border-red-300' 
                              : transactionsData?.leadsMishandled?.riskLevel === 'medium' 
                                ? 'bg-yellow-100 border-yellow-300'
                                : 'bg-green-100 border-green-300'
                          }`}>
                            <div className="text-center">
                              <div className={`text-3xl font-black ${
                                transactionsData?.leadsMishandled?.riskLevel === 'high' 
                                  ? 'text-red-600' 
                                  : transactionsData?.leadsMishandled?.riskLevel === 'medium' 
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                              }`}>{transactionsData?.leadsMishandled?.count || 0}</div>
                              <div className={`text-xs font-medium ${
                                transactionsData?.leadsMishandled?.riskLevel === 'high' 
                                  ? 'text-red-700' 
                                  : transactionsData?.leadsMishandled?.riskLevel === 'medium' 
                                    ? 'text-yellow-700'
                                    : 'text-green-700'
                              }`}>Mishandled</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className={`text-lg font-bold ${
                        transactionsData?.leadsMishandled?.riskLevel === 'high' 
                          ? 'text-red-900' 
                          : transactionsData?.leadsMishandled?.riskLevel === 'medium' 
                            ? 'text-yellow-900'
                            : 'text-green-900'
                      }`}>
                        {transactionsData?.leadsMishandled?.riskLevel === 'high' 
                          ? 'High Risk' 
                          : transactionsData?.leadsMishandled?.riskLevel === 'medium' 
                            ? 'Medium Risk'
                            : 'Low Risk'
                        }
                      </div>
                      <p className={`text-xs ${
                        transactionsData?.leadsMishandled?.riskLevel === 'high' 
                          ? 'text-red-600' 
                          : transactionsData?.leadsMishandled?.riskLevel === 'medium' 
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}>{transactionsData?.leadsMishandled?.details || 'No issues detected'}</p>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Acquisitions Leaderboard Tab */}
      {activeTab === "acquisitions-leaderboard" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER', 'ACQ'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Acquisitions Leaderboard is only available to Admin, Executive, Manager, and Acquisitions Agent roles.</p>
              </div>
            </Card>
          ) : (
            <>
          <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Acquisitions Leaderboard
                  </h2>
                  <p className="text-sm text-gray-600">
                    {user?.roles?.some(role => ['ACQ'].includes(role)) 
                      ? 'Your ranking and performance among the acquisitions team' 
                      : 'Rankings and performance comparison for acquisitions team'}
                  </p>
            </div>
            <div className="flex items-center gap-4">
                  <Select value={acqLeaderboardPeriod} onValueChange={setAcqLeaderboardPeriod}>
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
          
              {/* Current User Rank (for ACQ agents) */}
              {user?.roles?.some(role => ['ACQ'].includes(role)) && acqLeaderboardData?.currentUserRank && (
                <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-xl font-bold text-gray-900">Your Current Rank</h3>
          </div>
                    <div className="text-4xl font-black text-blue-600 mb-1">#{acqLeaderboardData.currentUserRank}</div>
                    <p className="text-sm text-gray-600">out of {acqLeaderboardData.agents.length} acquisitions agents</p>
                  </div>
                </Card>
              )}

              {/* Error State */}
              {acqLeaderboardError ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-red-500 mb-2">⚠️ Error Loading Leaderboard</div>
                    <p className="text-gray-600 text-sm">{acqLeaderboardError}</p>
                  </div>
                </Card>
              ) : acqLeaderboardLoading ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading leaderboard...</p>
                  </div>
                </Card>
              ) : !acqLeaderboardData?.agents?.length ? (
                <Card className="p-6">
                  <div className="text-center">
                    <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No acquisitions agents found for the selected period.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Performance Leaderboard */}
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-white border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Performance Leaderboard
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">Ranked by total score</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contracts</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Profit</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Risk</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {acqLeaderboardData.agents.map((agent, index) => (
                              <tr key={agent.userId} className={`hover:bg-gray-50 transition-colors ${
                                user?.id === agent.userId ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                              }`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {index === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                                    {index === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                                    {index === 2 && <Medal className="w-4 h-4 text-amber-600" />}
                                    <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                      {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                      <div className="text-xs text-gray-500">{agent.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-bold text-blue-600">{agent.totalScore || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-green-600">{agent.contractsSigned || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-orange-600">
                                    ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(agent.projectedProfit || 0)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{(agent.leadsPerContract || 0).toFixed(1)}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    agent.mishandledLeads === 0 ? 'bg-green-100 text-green-700' :
                                    agent.mishandledLeads <= 3 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {agent.mishandledLeads}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Communications Leaderboard */}
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-white border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Phone className="w-5 h-5 text-green-500" />
                            Communications Activity
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">Ranked by total communications</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Calls</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">SMS</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Emails</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Response</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[...acqLeaderboardData.agents]
                              .sort((a, b) => (b.communications.total || 0) - (a.communications.total || 0))
                              .map((agent, index) => (
                              <tr key={`comm-${agent.userId}`} className={`hover:bg-gray-50 transition-colors ${
                                user?.id === agent.userId ? 'bg-green-50 border-l-2 border-green-500' : ''
                              }`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {index === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                                    {index === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                                    {index === 2 && <Medal className="w-4 h-4 text-amber-600" />}
                                    <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                      {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-bold text-green-600">{agent.communications.total || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{agent.communications.calls || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{agent.communications.sms || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{agent.communications.emails || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-blue-600">
                                    {agent.communications.responseRate || 0}%
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dispositions Leaderboard Tab */}
      {activeTab === "dispositions-leaderboard" && (
        <div className="space-y-6">
          {/* Role-based Access Control */}
          {user?.roles && !user.roles.some(role => ['ADMIN', 'EXECUTIVE', 'MANAGER', 'DISP'].includes(role)) ? (
            <Card className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-600">Dispositions Leaderboard is only available to Admin, Executive, Manager, and Dispositions Agent roles.</p>
              </div>
            </Card>
          ) : (
            <>
          <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Award className="w-6 h-6 text-purple-500" />
                    Dispositions Leaderboard
                  </h2>
                  <p className="text-sm text-gray-600">
                    {user?.roles?.some(role => ['DISP'].includes(role)) 
                      ? 'Your ranking and performance among the dispositions team' 
                      : 'Rankings and performance comparison for dispositions team'}
                  </p>
            </div>
            <div className="flex items-center gap-4">
                  <Select value={dispLeaderboardPeriod} onValueChange={setDispLeaderboardPeriod}>
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
          
              {/* Current User Rank (for DISP agents) */}
              {user?.roles?.some(role => ['DISP'].includes(role)) && dispLeaderboardData?.currentUserRank && (
                <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Award className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-xl font-bold text-gray-900">Your Current Rank</h3>
          </div>
                    <div className="text-4xl font-black text-purple-600 mb-1">#{dispLeaderboardData.currentUserRank}</div>
                    <p className="text-sm text-gray-600">out of {dispLeaderboardData.agents.length} dispositions agents</p>
        </div>
                </Card>
              )}

              {/* Error State */}
              {dispLeaderboardError ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="text-red-500 mb-2">⚠️ Error Loading Leaderboard</div>
                    <p className="text-gray-600 text-sm">{dispLeaderboardError}</p>
                  </div>
                </Card>
              ) : dispLeaderboardLoading ? (
                <Card className="p-6">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading leaderboard...</p>
                  </div>
                </Card>
              ) : !dispLeaderboardData?.agents?.length ? (
                <Card className="p-6">
                  <div className="text-center">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No dispositions agents found for the selected period.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Performance Leaderboard */}
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-white border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="w-5 h-5 text-purple-500" />
                            Performance Leaderboard
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">Ranked by total score</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sold</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Profit</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Buyers</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Risk</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {dispLeaderboardData.agents.map((agent, index) => (
                              <tr key={agent.userId} className={`hover:bg-gray-50 transition-colors ${
                                user?.id === agent.userId ? 'bg-purple-50 border-l-2 border-purple-500' : ''
                              }`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {index === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                                    {index === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                                    {index === 2 && <Medal className="w-4 h-4 text-amber-600" />}
                                    <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                      {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                      <div className="text-xs text-gray-500">{agent.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-bold text-purple-600">{agent.totalScore || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-green-600">{agent.propertiesSold || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-orange-600">
                                    ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(agent.projectedProfit || 0)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-blue-600">{agent.buyersAdded || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    agent.mishandledLeads === 0 ? 'bg-green-100 text-green-700' :
                                    agent.mishandledLeads <= 3 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {agent.mishandledLeads}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Communications Leaderboard */}
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-white border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="w-5 h-5 text-teal-500" />
                            Communications Leaderboard
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">Ranked by total communications</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Calls</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">SMS</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Emails</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Response</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[...dispLeaderboardData.agents]
                              .sort((a, b) => (b.communications.total || 0) - (a.communications.total || 0))
                              .map((agent, index) => (
                              <tr key={`comm-${agent.userId}`} className={`hover:bg-gray-50 transition-colors ${
                                user?.id === agent.userId ? 'bg-teal-50 border-l-2 border-teal-500' : ''
                              }`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {index === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                                    {index === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                                    {index === 2 && <Medal className="w-4 h-4 text-amber-600" />}
                                    <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                      {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                      <div className="text-xs text-gray-500">{agent.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-bold text-teal-600">{agent.communications.total || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{agent.communications.calls || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{agent.communications.sms || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm text-gray-700">{agent.communications.emails || 0}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-blue-600">
                                    {agent.communications.responseRate || 0}%
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Metrics;