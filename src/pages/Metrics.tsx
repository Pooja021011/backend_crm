import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Clock, BarChart3, Activity, Zap, Trophy, Award, FileText, MessageSquare, Phone, CheckSquare, MessageCircle, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { API_BASE } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

const Metrics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showRevenue, setShowRevenue] = useState(true);
  const [showLeads, setShowLeads] = useState(true);
  const [showConversion, setShowConversion] = useState(true);
  const [activeTab, setActiveTab] = useState('company');
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
  const marketingMetrics = [
    { title: 'Website Visitors', value: '12,847', change: '+22%', trend: 'up' },
    { title: 'Lead Generation', value: '342', change: '+15%', trend: 'up' },
    { title: 'Email Open Rate', value: '28%', change: '+5%', trend: 'up' },
    { title: 'Click-through Rate', value: '4.2%', change: '+8%', trend: 'up' },
    { title: 'Cost per Lead', value: '$45', change: '-12%', trend: 'up' },
    { title: 'Social Media Reach', value: '8.5K', change: '+18%', trend: 'up' },
  ];

  const { user } = useAuth();
  const [flowData, setFlowData] = useState<{ name: string; totalLeads: number; contractedLeads: number; soldLeads: number; closedLeads: number }[]>([]);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoadingFlow(true);
      setFlowError(null);
      try {
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/metrics/lead-deal-flow`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
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
          const accessToken = localStorage.getItem('accessToken');
          const res = await fetch(`${API_BASE}/metrics/lead-sources`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
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

  // Pipeline dynamic components
  const PipelineFunnel: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [stages, setStages] = useState<{ name: string; count: number; color: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const accessToken = localStorage.getItem('accessToken');
          const res = await fetch(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          const json = await res.json();
          setStages((json?.data?.stages || []).map((s: any) => ({ name: s.name, count: s.count, color: s.color })));
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
                const height = (stage.count / maxCount) * 180;
                return (
                  <div key={index} className="flex flex-col items-center space-y-2 min-w-[100px]">
                    <Badge className={`text-white text-xs px-2 py-1 font-medium uppercase tracking-wide whitespace-nowrap ${stage.color}`}>
                      {stage.name.split(' ').slice(0, 2).join(' ').toUpperCase()}
                    </Badge>
                    <div className="text-xl font-bold text-gray-900">{stage.count}</div>
                    <div className="relative flex flex-col items-center">
                      <div className={`${stage.color} rounded-t-lg relative`} style={{ width: '50px', height: `${Math.max(30, height)}px`, minHeight: '30px' }}>
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white rounded-full border-2 border-gray-200"></div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-gray-800 text-white text-xs px-2 py-1 font-bold">—</Badge>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-2 px-4">💡 Scroll horizontally to view all pipeline stages</div>
        </div>
      </div>
    );
  };

  const PipelineTable: React.FC<{ selectedPeriod: string }> = ({ selectedPeriod }) => {
    const [rows, setRows] = useState<{ name: string; count: number; value: string; weightedValue: string; avgTimeToAdvance: string; conversionRate: string; lost: number }[]>([]);
    useEffect(() => {
      const load = async () => {
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
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
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
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

  // Fetch communications overview when tab is communications or when period changes
  useEffect(() => {
    if (activeTab !== 'communications') return;
    const load = async () => {
      setCommLoading(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/metrics/communications-overview?timeframe=${encodeURIComponent(selectedPeriod)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
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
  }, [activeTab, selectedPeriod]);

  // Fetch Team pipelines on tab switch
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const fetchPipe = async (pipeline: 'ACQUISITIONS'|'DISPOSITIONS'|'TRANSACTION') => {
      const res = await fetch(`${API_BASE}/metrics/pipeline-overview?timeframe=${encodeURIComponent(selectedPeriod)}&pipeline=${pipeline}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const json = await res.json();
      return json?.data?.stages as { name: string; count: number }[] || [];
    };
    const load = async () => {
      // Fetch team KPIs in one call
      try {
        const kpiRes = await fetch(`${API_BASE}/metrics/team-kpis?timeframe=${encodeURIComponent(selectedPeriod)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
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
        const accessToken = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/metrics/company-kpis?timeframe=${encodeURIComponent(selectedPeriod)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
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
              <ContractsSignedCard />
            </Card>

            {/* Contracts Sold */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-green-200 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+8%</div>
              </div>
              <ContractsSoldCard />
            </Card>

            {/* Projected Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+15%</div>
              </div>
              <ProjectedProfitCard />
            </Card>

            {/* Closed Profit */}
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+22%</div>
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
                <div className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">+18%</div>
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
          <PipelineFunnel selectedPeriod={selectedPeriod} />

          {/* Pipeline Table Container */}
          <PipelineTable selectedPeriod={selectedPeriod} />

          {/* Timeline Metrics */}
          <PipelineTimeline selectedPeriod={selectedPeriod} />
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
                  <div className="text-2xl font-black text-blue-600">{acqTotal}</div>
                  <div className="text-xs text-gray-600 font-medium">Total</div>
                </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-900">{acqTotal}</div>
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
                      <div className="text-2xl font-black text-green-600">{tranClearToClose}</div>
                      <div className="text-xs text-gray-600 font-medium">Clear to Close</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-900">{tranTotal}</div>
                <p className="text-xs text-green-600">In Transaction</p>
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
                      strokeDasharray={`${(projProfit && projProfit > 0 ? Math.min(projProfit, 1000000) / 1000000 : 0) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-black text-orange-600">${Math.round((projProfit||0)/1000)}K</div>
                      <div className="text-xs text-gray-600 font-medium">of $1M</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-orange-900">{projProfit ? Math.round((projProfit/1000000)*100) : 0}%</div>
                <p className="text-xs text-orange-600">${new Intl.NumberFormat().format(projProfit||0)}</p>
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
                      strokeDasharray={`${(closedProfit && closedProfit > 0 ? Math.min(closedProfit, 800000) / 800000 : 0) * 314} 314`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-black text-blue-600">${Math.round((closedProfit||0)/1000)}K</div>
                      <div className="text-xs text-gray-600 font-medium">of $800K</div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-900">{closedProfit ? Math.round((closedProfit/800000)*100) : 0}%</div>
                <p className="text-xs text-blue-600">${new Intl.NumberFormat().format(closedProfit||0)}</p>
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
                  <p className="text-lg font-bold text-gray-900">{dispTotal}</p>
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
                  <p className="text-lg font-bold text-gray-900">{dispClosed}</p>
                  <p className="text-xs text-gray-500">Closed this period</p>
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