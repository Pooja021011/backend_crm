import React, { useState, useEffect } from "react";
import { DocumentManager } from "./DocumentManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, FolderOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/config/api";
import type { Lead } from "@/hooks/useLeads";

interface LeadDocumentsTabProps {
  lead: Lead;
  className?: string;
}

export const LeadDocumentsTab: React.FC<LeadDocumentsTabProps> = ({
  lead,
  className
}) => {
  const { user } = useAuth();
  const [documentStats, setDocumentStats] = useState({
    totalCount: 0,
    recentCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Determine user permissions based on roles
  const isAdmin = user?.roles?.includes('ADMIN') || false;
  const canEdit = isAdmin || user?.roles?.includes('MANAGER') || user?.id === lead.assignedUserId;
  const canDelete = isAdmin || user?.roles?.includes('MANAGER');

  // Fetch document statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE}/files/lead/${lead.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const files = data.files || data.data || [];

          // Documents tab should not count photos (they appear in the Photos section).
          const docsOnly = files.filter((f: any) => {
            const category = (f?.category || '').toString().toLowerCase();
            const isPhotoCategory = category === 'photos' || category === 'photo';
            return !isPhotoCategory;
          });
          
          // Calculate stats
          const totalCount = docsOnly.length;
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentCount = docsOnly.filter((f: any) => 
            new Date(f.uploadedAt) >= sevenDaysAgo
          ).length;
          
          setDocumentStats({ totalCount, recentCount });
        }
      } catch (error) {
        console.error('Error fetching document stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [lead.id]);

  return (
    <div className={className}>
      {/* Stats Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? '...' : documentStats.totalCount}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recent Uploads (7 days)</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? '...' : documentStats.recentCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Manager */}
      <DocumentManager
        leadId={lead.id}
        canEdit={canEdit}
        canDelete={canDelete}
        canUpload={false}
      />
    </div>
  );
};
