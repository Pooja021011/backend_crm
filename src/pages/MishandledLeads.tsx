import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { API_BASE, makeApiCall } from '@/config/api';

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
  leadsMishandledPersonal?: number;
  slaBreachesPersonal?: number;
  stale48hPersonal?: number;
  mishandledBreakdownPersonal?: MishandledBreakdown;
}

interface LeadAddress {
  address1?: string;
  city?: string;
  state?: string;
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
  address?: LeadAddress;
}

function formatLeadAddress(lead: LeadInfo | undefined): string {
  if (!lead?.address) return 'Unknown, Unknown';
  const a = lead.address;
  const parts = [a.address1, a.city, a.state].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown, Unknown';
}

function formatReason(leadDetail: LeadDetail): string {
  const conditions = leadDetail.conditions || {};
  const texts = leadDetail.rules
    .map((rule) => {
      if (rule === 'SLA_BREACH') return conditions['SLA_BREACH'] || 'SLA Breach';
      if (rule === 'STALE_48H') return conditions['STALE_48H'] || 'Stale 48h';
      if (rule === 'TASKS_PAST_DUE_6H') return conditions['TASKS_PAST_DUE_6H'] || 'Task overdue 6h+';
      return conditions[rule] || rule;
    })
    .filter(Boolean);
  return texts.join(' • ') || 'Mishandled';
}

const MishandledLeads = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [leadsInfo, setLeadsInfo] = useState<Map<string, LeadInfo>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await makeApiCall(`${API_BASE}/metrics/major-kpis?timeframe=This Month`);
      const json = await res.json();
      setKpiData(json?.data || null);

      const breakdown = json?.data?.mishandledBreakdown || json?.data?.mishandledBreakdownPersonal;
      if (breakdown?.allMishandledLeadIds?.length > 0) {
        const leadIds = breakdown.allMishandledLeadIds;
        try {
          const leadsRes = await makeApiCall(`${API_BASE}/leads?take=10000`);
          const leadsJson = await leadsRes.json();
          if (leadsJson?.data) {
            const allLeads: LeadInfo[] = leadsJson.data;
            const leadsMap = new Map<string, LeadInfo>();
            leadIds.forEach((id: string) => {
              const lead = allLeads.find((l: LeadInfo) => l.id === id);
              if (lead) leadsMap.set(lead.id, lead);
            });
            setLeadsInfo(leadsMap);
          }
        } catch {
          const leadsMap = new Map<string, LeadInfo>();
          for (const id of leadIds) {
            try {
              const leadRes = await makeApiCall(`${API_BASE}/leads/${id}`);
              const leadJson = await leadRes.json();
              if (leadJson?.data) leadsMap.set(id, leadJson.data);
            } catch {
              // skip
            }
          }
          setLeadsInfo(leadsMap);
        }
      } else {
        setLeadsInfo(new Map());
      }
    } catch (error) {
      console.error('Error fetching mishandled leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const breakdown = kpiData?.mishandledBreakdown || kpiData?.mishandledBreakdownPersonal;
  const leadDetails = breakdown?.leadDetails || [];

  return (
    <div className="space-y-0">
      {/* Header - same pattern as Inbox Reminders */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Mishandled Leads</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">{loading ? 'Loading...' : 'Refresh Mishandled'}</span>
        </Button>
      </div>

      {/* List - same pattern as Inbox Reminders */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading mishandled leads...</p>
        </div>
      ) : leadDetails.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-500">No mishandled leads</p>
          <p className="text-sm text-gray-400 mt-2">All caught up! Check back later.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {leadDetails.map((lead) => {
            const leadInfo = leadsInfo.get(lead.leadId);
            const addressLine = formatLeadAddress(leadInfo);
            const reasonLine = formatReason(lead);
            return (
              <div
                key={lead.leadId}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/leads/${lead.leadId}/edit`)}
              >
                {/* Icon - red alert style like reminder priority */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  <div className="w-6 h-6 rounded border-2 border-red-500 bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  </div>
                </div>
                {/* Content - primary line (address), secondary line (reason) */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {addressLine}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 truncate">
                    {reasonLine}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MishandledLeads;
