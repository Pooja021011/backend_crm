import React from "react";
import { DocumentManager } from "./DocumentManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, FolderOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  
  // Determine user permissions based on roles
  const isAdmin = user?.roles?.includes('ADMIN') || false;
  const canEdit = isAdmin || user?.roles?.includes('MANAGER') || user?.id === lead.assignedUserId;
  const canDelete = isAdmin || user?.roles?.includes('MANAGER');
  const canUpload = canEdit;

  return (
    <div className={className}>
      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents & Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-semibold text-gray-900">--</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recent Uploads</p>
                  <p className="text-2xl font-semibold text-gray-900">--</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-semibold text-gray-900">--</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Document Categories</h4>
            <div className="flex flex-wrap gap-2">
              {[
                'Purchase Agreements',
                'Appraisal Reports', 
                'Inspection Reports',
                'Title Documents',
                'Financial Documents',
                'Property Photos',
                'Marketing Materials'
              ].map((category) => (
                <span 
                  key={category}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Manager */}
      <DocumentManager
        leadId={lead.id}
        canEdit={canEdit}
        canDelete={canDelete}
        canUpload={canUpload}
      />
    </div>
  );
};
