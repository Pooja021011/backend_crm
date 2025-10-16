import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  RefreshCw, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Info,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { API_BASE } from "@/config/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DistributionSettings {
  receiveLeads: boolean;
  distributionPercentage: number;
  isActive: boolean;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roles: string[];
  distributionSettings: DistributionSettings;
}

export const LeadDistributionSettings = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [useEqualDistribution, setUseEqualDistribution] = useState(true);
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});

  // Helper function for API calls
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  // Load agents and their distribution settings
  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const response = await makeApiCall(`${API_BASE}/lead-distribution/agents`);
      
      if (response.success) {
        const agentsData = response.data || [];
        setAgents(agentsData);

        // Initialize custom percentages
        const percentages: Record<string, number> = {};
        agentsData.forEach((agent: Agent) => {
          percentages[agent.id] = agent.distributionSettings.distributionPercentage || 0;
        });
        setCustomPercentages(percentages);

        // Check if using equal distribution
        const activeAgents = agentsData.filter(
          (a: Agent) => a.distributionSettings.receiveLeads
        );
        if (activeAgents.length > 0) {
          const expectedEqual = Math.floor(100 / activeAgents.length);
          const isEqual = activeAgents.every(
            (a: Agent) =>
              Math.abs(a.distributionSettings.distributionPercentage - expectedEqual) <= 1
          );
          setUseEqualDistribution(isEqual);
        }
      }
    } catch (error: any) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Toggle agent's receiveLeads status
  const toggleAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              distributionSettings: {
                ...agent.distributionSettings,
                receiveLeads: !agent.distributionSettings.receiveLeads,
              },
            }
          : agent
      )
    );
  };

  // Update custom percentage for an agent
  const updatePercentage = (agentId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    setCustomPercentages((prev) => ({
      ...prev,
      [agentId]: clampedValue,
    }));
  };

  // Calculate total percentage
  const calculateTotalPercentage = () => {
    return agents
      .filter((agent) => agent.distributionSettings.receiveLeads)
      .reduce((sum, agent) => sum + (customPercentages[agent.id] || 0), 0);
  };

  // Save distribution settings
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Prepare agent data
      const agentData = agents.map((agent) => ({
        userId: agent.id,
        receiveLeads: agent.distributionSettings.receiveLeads,
        distributionPercentage: useEqualDistribution
          ? 0 // Backend will calculate
          : customPercentages[agent.id] || 0,
      }));

      // Validate custom percentages if not using equal distribution
      if (!useEqualDistribution) {
        const total = calculateTotalPercentage();
        if (Math.abs(total - 100) > 1) {
          toast({
            title: "Validation Error",
            description: `Total percentage must equal 100% (current: ${total}%)`,
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      const response = await makeApiCall(`${API_BASE}/lead-distribution/update`, {
        method: 'POST',
        body: JSON.stringify({
          agents: agentData,
          useEqualDistribution,
        }),
      });

      if (response.success) {
        toast({
          title: "Settings Saved",
          description: "Lead distribution settings have been updated successfully",
        });
        
        // Reload agents to get updated percentages
        await loadAgents();
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save distribution settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeAgentsCount = agents.filter(
    (agent) => agent.distributionSettings.receiveLeads
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Lead Distribution Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure how leads from Google Sheets are automatically assigned to acquisitions agents
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Leads from Google Sheets integration will be automatically assigned to acquisitions agents based on these settings.
          You can choose equal distribution or set custom percentages for each agent.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ACQ Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receiving Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAgentsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribution Method</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {useEqualDistribution ? "Equal" : "Custom"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Method Selection */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Distribution Method</CardTitle>
          <CardDescription>
            Choose how leads should be distributed among agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Equal Distribution</Label>
              <p className="text-sm text-muted-foreground">
                All active agents receive an equal percentage of leads
              </p>
            </div>
            <Switch
              checked={useEqualDistribution}
              onCheckedChange={setUseEqualDistribution}
            />
          </div>

          {!useEqualDistribution && (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Custom Distribution:</strong> Set specific percentages for each agent. Total must equal 100%.
                Current total: <strong>{calculateTotalPercentage()}%</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Acquisitions Agents</CardTitle>
          <CardDescription>
            Configure which agents receive leads and their distribution percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading agents...</span>
              </div>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No acquisitions agents found</p>
              <p className="text-sm text-gray-400 mt-1">
                Add agents with ACQ role to configure lead distribution
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg transition-all",
                    agent.distributionSettings.receiveLeads
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Switch
                      checked={agent.distributionSettings.receiveLeads}
                      onCheckedChange={() => toggleAgent(agent.id)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {agent.firstName} {agent.lastName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ACQ
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.email}</p>
                    </div>
                  </div>

                  {agent.distributionSettings.receiveLeads && (
                    <div className="flex items-center gap-4">
                      {useEqualDistribution ? (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {activeAgentsCount > 0
                              ? Math.floor(100 / activeAgentsCount)
                              : 0}
                            %
                          </div>
                          <div className="text-xs text-muted-foreground">Equal share</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={customPercentages[agent.id] || 0}
                            onChange={(e) => updatePercentage(agent.id, e.target.value)}
                            className="w-20 text-center font-semibold"
                          />
                          <span className="text-sm font-medium">%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Alert */}
      {!useEqualDistribution && calculateTotalPercentage() !== 100 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Total distribution percentage must equal 100% (currently {calculateTotalPercentage()}%)
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={loadAgents}
          disabled={isLoading || isSaving}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
        
        <Button
          onClick={saveSettings}
          disabled={isSaving || isLoading || (!useEqualDistribution && calculateTotalPercentage() !== 100)}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
