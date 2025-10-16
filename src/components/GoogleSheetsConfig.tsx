import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  FileSpreadsheet, 
  Save, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Play,
  Info,
  TrendingUp,
  Clock
} from "lucide-react";
import { API_BASE } from "@/config/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GoogleSheetsConfig {
  credentials?: { configured: boolean } | null;
  spreadsheetId?: string;
  sheetName?: string;
  syncEnabled: boolean;
  syncInterval: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  totalLeadsSynced: number;
}

interface SyncStats {
  processed: number;
  created: number;
  duplicates: number;
  errors: number;
}

export const GoogleSheetsConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [credentialsJson, setCredentialsJson] = useState("");
  
  // Form fields
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);

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
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Load configuration
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await makeApiCall(`${API_BASE}/google-sheets/config`);
      if (response.success) {
        setConfig(response.data);
        setSpreadsheetId(response.data.spreadsheetId || "");
        setSheetName(response.data.sheetName || "Sheet1");
        setSyncEnabled(response.data.syncEnabled || false);
        setSyncInterval(response.data.syncInterval || 60);
      }
    } catch (error: any) {
      console.error('Error loading config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Save configuration
  const saveConfig = async () => {
    setIsSaving(true);
    try {
      let credentials = null;
      
      // Parse credentials JSON if provided
      if (credentialsJson.trim()) {
        try {
          credentials = JSON.parse(credentialsJson);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Service Account credentials must be valid JSON",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      const response = await makeApiCall(`${API_BASE}/google-sheets/config`, {
        method: 'POST',
        body: JSON.stringify({
          credentials: credentials || undefined,
          spreadsheetId,
          sheetName,
          syncEnabled,
          syncInterval,
        }),
      });

      if (response.success) {
        toast({
          title: "Settings Saved",
          description: "Google Sheets configuration updated successfully",
        });
        setCredentialsJson(""); // Clear credentials field after saving
        await loadConfig();
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await makeApiCall(`${API_BASE}/google-sheets/test-connection`, {
        method: 'POST',
      });

      if (response.success) {
        toast({
          title: "Connection Successful!",
          description: `Connected to: ${response.data.title}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Manual sync
  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const response = await makeApiCall(`${API_BASE}/google-sheets/sync`, {
        method: 'POST',
      });

      if (response.success) {
        const stats: SyncStats = response.data;
        toast({
          title: "Sync Completed!",
          description: `Created: ${stats.created} | Duplicates: ${stats.duplicates} | Errors: ${stats.errors}`,
        });
        await loadConfig();
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync leads",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Google Sheets Sync</h2>
        <p className="text-muted-foreground mt-1">
          Automatically sync leads from Google Sheets every hour
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Automated Sync</AlertTitle>
        <AlertDescription>
          Configure your Google Sheets and enable sync. Leads will be automatically imported every hour and assigned to agents based on distribution settings. Duplicates are automatically detected and skipped.
        </AlertDescription>
      </Alert>

      {/* Stats Card */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sync Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  {config.syncEnabled ? (
                    <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Total Synced</Label>
                <div className="text-2xl font-bold">{config.totalLeadsSynced}</div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Last Sync</Label>
                <div className="text-sm">
                  {config.lastSyncAt 
                    ? new Date(config.lastSyncAt).toLocaleString()
                    : 'Never'
                  }
                </div>
                {config.lastSyncStatus === 'error' && config.lastSyncError && (
                  <p className="text-xs text-red-600">{config.lastSyncError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Card */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Set up your Google Sheets connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Account Credentials */}
          <div className="space-y-2">
            <Label>Service Account Credentials (JSON)</Label>
            <Textarea
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={credentialsJson}
              onChange={(e) => setCredentialsJson(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {config?.credentials?.configured 
                ? "✅ Credentials configured. Leave empty to keep existing credentials."
                : "⚠️ No credentials configured. Paste your Google Service Account JSON here."
              }
            </p>
          </div>

          {/* Spreadsheet ID */}
          <div className="space-y-2">
            <Label>Google Spreadsheet ID</Label>
            <Input
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Found in your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
            </p>
          </div>

          {/* Sheet Name */}
          <div className="space-y-2">
            <Label>Sheet Name</Label>
            <Input
              placeholder="Sheet1"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The name of the tab/sheet containing your leads
            </p>
          </div>

          {/* Sync Settings */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Auto-Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync leads every hour
                </p>
              </div>
              <Switch
                checked={syncEnabled}
                onCheckedChange={setSyncEnabled}
              />
            </div>

            {syncEnabled && (
              <div className="space-y-2">
                <Label>Sync Interval (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="15"
                    max="1440"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(parseInt(e.target.value) || 60)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    Current: Every {syncInterval} minutes
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 60 minutes (1 hour)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={testConnection}
              disabled={isTesting || !config?.credentials?.configured || !spreadsheetId}
              variant="outline"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            <Button
              onClick={triggerSync}
              disabled={isSyncing || !syncEnabled || !config?.credentials?.configured}
              variant="outline"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>

            <Button
              onClick={saveConfig}
              disabled={isSaving}
              className="ml-auto"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Required Columns Alert */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertTitle>Required Google Sheet Columns</AlertTitle>
        <AlertDescription>
          <div className="mt-2">
            Your first row must include these columns:
            <div className="flex flex-wrap gap-2 mt-2">
              {['leadType', 'firstName', 'lastName', 'email', 'phone'].map((col) => (
                <Badge key={col} variant="outline">{col}</Badge>
              ))}
            </div>
            <p className="mt-2 text-xs">
              <strong>leadType</strong> must be: SELLER, BUYER, or VENDOR
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
