import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { API_BASE, makeApiCall } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

interface LeadDetail {
  leadId: string;
  rules: string[];
  ruleCount: number;
  conditions?: Record<string, string>;
}

interface MishandledBreakdown {
  slaBreachLeadIds: string[];
  stale48hLeadIds: string[];
  tasksPastDueLeadIds: string[];
  allMishandledLeadIds: string[];
  leadDetails: LeadDetail[];
}

interface KPIData {
  leadsMishandled?: number;
  slaBreaches?: number;
  stale48h?: number;
  tasksPastDue6h?: number;
  mishandledColor?: 'green' | 'yellow' | 'orange' | 'red';
  mishandledBreakdown?: MishandledBreakdown;
  // For ACQ agents
  leadsMishandledPersonal?: number;
  slaBreachesPersonal?: number;
  stale48hPersonal?: number;
  mishandledBreakdownPersonal?: MishandledBreakdown;
}

interface LeadInfo {
  id: string;
  leadStatus?: {
    name: string;
  };
  pipelineStage?: {
    name: string;
  };
  assignedUser?: {
    firstName: string;
    lastName: string;
  };
}

const MishandledLeads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [leadsInfo, setLeadsInfo] = useState<Map<string, LeadInfo>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await makeApiCall(`${API_BASE}/metrics/major-kpis?timeframe=This Month`);
        const json = await res.json();
        console.log('📊 KPI Data:', json?.data);
        setKpiData(json?.data || null);
        
        // Fetch lead details for all mishandled leads
        const breakdown = json?.data?.mishandledBreakdown || json?.data?.mishandledBreakdownPersonal;
        console.log('📋 Breakdown:', breakdown);
        if (breakdown?.allMishandledLeadIds?.length > 0) {
          const leadIds = breakdown.allMishandledLeadIds;
          
          // Fetch all leads and filter by IDs
          try {
            const leadsRes = await makeApiCall(`${API_BASE}/leads?take=10000`);
            const leadsJson = await leadsRes.json();
            if (leadsJson?.data) {
              const allLeads: LeadInfo[] = leadsJson.data;
              const leadsMap = new Map<string, LeadInfo>();
              
              // Filter to only mishandled leads
              leadIds.forEach((id: string) => {
                const lead = allLeads.find(l => l.id === id);
                if (lead) {
                  leadsMap.set(lead.id, lead);
                }
              });
              
              setLeadsInfo(leadsMap);
            }
          } catch (error) {
            console.error('Error fetching lead details:', error);
            // Try fetching individual leads if batch fails
            try {
              const leadsMap = new Map<string, LeadInfo>();
              for (const id of leadIds) {
                try {
                  const leadRes = await makeApiCall(`${API_BASE}/leads/${id}`);
                  const leadJson = await leadRes.json();
                  if (leadJson?.data) {
                    leadsMap.set(id, leadJson.data);
                  }
                } catch (err) {
                  console.error(`Error fetching lead ${id}:`, err);
                }
              }
              setLeadsInfo(leadsMap);
            } catch (err) {
              console.error('Error fetching individual leads:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching mishandled leads:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const breakdown = kpiData?.mishandledBreakdown || kpiData?.mishandledBreakdownPersonal;
  const totalMishandled = kpiData?.leadsMishandled || kpiData?.leadsMishandledPersonal || 0;
  const slaBreaches = kpiData?.slaBreaches || kpiData?.slaBreachesPersonal || 0;
  const stale48h = kpiData?.stale48h || kpiData?.stale48hPersonal || 0;
  const tasksPastDue = kpiData?.tasksPastDue6h || 0;

  const getRuleBadge = (rule: string) => {
    switch (rule) {
      case 'SLA_BREACH':
        return <Badge variant="destructive" className="mr-1">SLA Breach</Badge>;
      case 'STALE_48H':
        return <Badge variant="outline" className="mr-1 bg-orange-50 text-orange-700 border-orange-300">Stale 48h</Badge>;
      case 'TASKS_PAST_DUE_6H':
        return <Badge variant="outline" className="mr-1 bg-yellow-50 text-yellow-700 border-yellow-300">Tasks Past Due</Badge>;
      default:
        return null;
    }
  };

  const leadDetails = breakdown?.leadDetails || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Mishandled Leads</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Mishandled</p>
                  <p className="text-2xl font-bold text-gray-900">{totalMishandled}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-gray-600">SLA Breaches</p>
                <p className="text-2xl font-bold text-orange-600">{slaBreaches}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-gray-600">Stale 48h</p>
                <p className="text-2xl font-bold text-blue-600">{stale48h}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-gray-600">Tasks Past Due</p>
                <p className="text-2xl font-bold text-yellow-600">{tasksPastDue}</p>
              </div>
            </Card>
          </div>

          {/* Lead Details Table */}
          <Card>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">All Mishandled Leads</h2>
              <p className="text-sm text-gray-600">
                {leadDetails.length} total mishandled leads
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matched Rules</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leadDetails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No mishandled leads found
                      </td>
                    </tr>
                  ) : (
                    leadDetails.map((lead) => {
                      const leadInfo = leadsInfo.get(lead.leadId);
                      const status = leadInfo?.leadStatus?.name || leadInfo?.pipelineStage?.name || 'Unknown';
                      const assignedAgent = leadInfo?.assignedUser 
                        ? `${leadInfo.assignedUser.firstName} ${leadInfo.assignedUser.lastName}`.trim()
                        : 'Unassigned';
                      
                      // Get conditions for all matched rules
                      const conditions = lead.conditions || {};
                      const conditionTexts = lead.rules.map(rule => {
                        const condition = conditions[rule];
                        return condition ? `${rule}: ${condition}` : rule;
                      });
                      
                      return (
                        <tr key={lead.leadId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <a
                              href={`/leads/${lead.leadId}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {lead.leadId}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {assignedAgent}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {status}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {lead.rules.map((rule, idx) => (
                                <React.Fragment key={idx}>
                                  {getRuleBadge(rule)}
                                </React.Fragment>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-700 space-y-1">
                              {conditionTexts.map((text, idx) => (
                                <div key={idx} className="text-xs">
                                  {text}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default MishandledLeads;

