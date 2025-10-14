import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Clock, 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  Edit,
  TrendingUp,
  FileText,
  CheckCircle2,
  ArrowRight,
  Activity as ActivityIcon
} from "lucide-react";
import { API_BASE } from "@/config/api";

interface StageHistoryItem {
  id: string;
  leadId: string;
  fromStageId: string | null;
  toStageId: string;
  changedById: string | null;
  changedAt: string;
  fromStage?: {
    id: string;
    name: string;
  };
  toStage: {
    id: string;
    name: string;
  };
  changedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ActivityItem {
  id: string;
  type: 'stage_change' | 'created' | 'updated' | 'assigned';
  timestamp: string;
  description: string;
  user?: {
    name: string;
    email: string;
  };
  details?: {
    from?: string;
    to?: string;
  };
}

interface LeadActivityTabProps {
  leadId: string;
  leadCreatedAt: string;
  leadUpdatedAt: string;
}

export const LeadActivityTab: React.FC<LeadActivityTabProps> = ({
  leadId,
  leadCreatedAt,
  leadUpdatedAt
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [leadId]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      
      // Fetch stage history
      const response = await fetch(`${API_BASE}/leads/${leadId}/stage-history`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const history: StageHistoryItem[] = data.data || data || [];
        
        // Convert stage history to activities
        const stageActivities: ActivityItem[] = history.map((item) => ({
          id: item.id,
          type: 'stage_change',
          timestamp: item.changedAt,
          description: item.fromStage 
            ? `Pipeline stage changed from "${item.fromStage.name}" to "${item.toStage.name}"`
            : `Lead added to "${item.toStage.name}" stage`,
          user: item.changedBy ? {
            name: `${item.changedBy.firstName} ${item.changedBy.lastName}`,
            email: item.changedBy.email
          } : undefined,
          details: {
            from: item.fromStage?.name,
            to: item.toStage.name
          }
        }));

        // Add lead creation activity
        const createdActivity: ActivityItem = {
          id: 'created',
          type: 'created',
          timestamp: leadCreatedAt,
          description: 'Lead created',
          details: {}
        };

        // Combine and sort activities by timestamp (newest first)
        const allActivities = [createdActivity, ...stageActivities].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stage_change':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'created':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-orange-600" />;
      case 'assigned':
        return <User className="w-4 h-4 text-purple-600" />;
      default:
        return <ActivityIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'stage_change':
        return 'bg-blue-100 border-blue-200';
      case 'created':
        return 'bg-green-100 border-green-200';
      case 'updated':
        return 'bg-orange-100 border-orange-200';
      case 'assigned':
        return 'bg-purple-100 border-purple-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading activity...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Timeline
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'} recorded
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gray-200"></div>

          {activities.map((activity, index) => (
            <div key={activity.id} className="relative pl-12">
              {/* Timeline dot */}
              <div className={`absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity content */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{activity.description}</p>
                    </div>
                    
                    {activity.details?.from && activity.details?.to && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {activity.details.from}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {activity.details.to}
                        </Badge>
                      </div>
                    )}

                    {activity.user && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <User className="w-3 h-3" />
                        <span>{activity.user.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{activity.user.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                    <Calendar className="w-3 h-3" />
                    <span>{formatTimestamp(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

