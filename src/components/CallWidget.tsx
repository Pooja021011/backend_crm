import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, makeApiCall } from "@/config/api";

interface CallHistoryEntry {
  id: string;
  contactName?: string;
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'completed' | 'missed' | 'busy' | 'no-answer';
  duration: number; // in seconds
  timestamp: string;
}

const CallWidget: React.FC = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [testCallNumber, setTestCallNumber] = useState('');
  const [makingTestCall, setMakingTestCall] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);

  // Load call history
  const loadCallHistory = async () => {
    setLoadingCallHistory(true);
    try {
      const response = await makeApiCall(`${API_BASE}/calls/history`);
      const result = await response.json();
      
      if (result.success) {
        setCallHistory(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load call history');
      }
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoadingCallHistory(false);
    }
  };

  // Make test call
  const makeTestCall = async () => {
    if (!testCallNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a phone number to test call.",
        variant: "destructive",
      });
      return;
    }

    setMakingTestCall(true);
    try {
      const response = await makeApiCall(`${API_BASE}/calls/make`, {
        method: 'POST',
        body: JSON.stringify({
          to: testCallNumber,
          from: '', // Will be determined by backend from user settings
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Test Call Initiated",
          description: `Call initiated to ${testCallNumber}`,
        });
        setTestCallNumber('');
        // Reload call history after a short delay
        setTimeout(() => {
          loadCallHistory();
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to initiate call');
      }
    } catch (error: any) {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMakingTestCall(false);
    }
  };

  // Load call history on component mount
  useEffect(() => {
    loadCallHistory();
  }, []);

  // Reload call history when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadCallHistory();
    }
  }, [isOpen]);

  return (
    <div className="space-y-4">
      {/* Call Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
            <Phone className="w-3 h-3" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Voice Calls</p>
            <p className="text-sm font-bold text-purple-900">Call History</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Phone className="w-3 h-3 mr-1" />
              Manage
            </Button>
          </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-purple-600" />
            Call Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Test Call Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Test Call Functionality</h3>
            </div>
            
            <div className="flex gap-3">
              <Input
                placeholder="Enter phone number (e.g., +1234567890)"
                value={testCallNumber}
                onChange={(e) => setTestCallNumber(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={makeTestCall}
                disabled={makingTestCall || !testCallNumber.trim()}
                className="min-w-[120px]"
              >
                {makingTestCall ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Calling...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Test Call
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Call History Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">Recent Call History</h3>
              </div>
              <Button
                onClick={loadCallHistory}
                variant="ghost"
                size="sm"
                disabled={loadingCallHistory}
              >
                {loadingCallHistory ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              {loadingCallHistory ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Loading call history...</p>
                </div>
              ) : callHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm text-muted-foreground">No call history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Make your first test call to see history here
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callHistory.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {call.contactName || 'Unknown'}
                            </div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {call.phoneNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={call.direction === 'OUTBOUND' ? 'default' : 'secondary'}
                            className={call.direction === 'OUTBOUND' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                          >
                            {call.direction === 'OUTBOUND' ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              call.status === 'completed' ? 'default' :
                              call.status === 'missed' ? 'destructive' : 'secondary'
                            }
                          >
                            {call.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {call.duration > 0 ? (
                            <span className="font-mono">
                              {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(call.timestamp).toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
        </Dialog>
      </div>

      {/* Quick Call History Preview */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Recent calls:</p>
        {loadingCallHistory ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Loading...
          </div>
        ) : callHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent calls</p>
        ) : (
          <div className="space-y-1">
            {callHistory.slice(0, 2).map((call) => (
              <div key={call.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={call.direction === 'OUTBOUND' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                    {call.direction === 'OUTBOUND' ? 'Out' : 'In'}
                  </Badge>
                  <span className="font-mono">{call.phoneNumber}</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(call.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
            {callHistory.length > 2 && (
              <p className="text-xs text-center text-muted-foreground">
                +{callHistory.length - 2} more calls
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallWidget;
