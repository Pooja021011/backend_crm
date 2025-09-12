import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Shield,
  Key
} from "lucide-react";
import { useAgents, type Agent } from "@/hooks/useAgents";
import { useToast } from "@/hooks/use-toast";
import { AddAgentDialog } from "@/components/AddAgentDialog";
import { EditAgentDialog } from "@/components/EditAgentDialog";
import { format } from "date-fns";

const Agents = () => {
  const { agents, isLoading, error, deleteAgent, refreshAgents } = useAgents();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Filter agents based on search term
  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agent.firstName.toLowerCase().includes(searchLower) ||
      agent.lastName.toLowerCase().includes(searchLower) ||
      agent.email.toLowerCase().includes(searchLower) ||
      (agent.phone && agent.phone.includes(searchTerm))
    );
  });

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowEditDialog(true);
  };

  const handleDelete = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;

    try {
      await deleteAgent(agentToDelete.id);
      toast({
        title: "Agent Deleted",
        description: `${agentToDelete.firstName} ${agentToDelete.lastName} has been deleted successfully.`,
      });
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getRoleColors = (roles: { role: { name: string } }[]) => {
    const roleColorMap: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'ACQ': 'bg-green-100 text-green-800',
      'DISP': 'bg-purple-100 text-purple-800',
      'TC': 'bg-orange-100 text-orange-800',
    };

    return roles.map(({ role }) => ({
      name: role.name,
      color: roleColorMap[role.name] || 'bg-gray-100 text-gray-800'
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-red-600 mb-2">Error loading agents</div>
              <div className="text-sm text-gray-600">{error}</div>
              <Button onClick={refreshAgents} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agents Management</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their roles</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {agents.filter(a => a.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Agents</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {agents.filter(a => a.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Leads</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {agents.filter(a => a._count.assignedLeads > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search agents by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-gray-600">Loading agents...</div>
              </div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600 mb-2">
                  {searchTerm ? 'No agents found matching your search' : 'No agents found'}
                </div>
                {!searchTerm && (
                  <Button onClick={() => setShowAddDialog(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Agent
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Assigned Leads</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {agent.firstName} {agent.lastName}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            {agent.email}
                          </div>
                          {agent.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-3 h-3 mr-1" />
                              {agent.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getRoleColors(agent.roles).map((role, index) => (
                            <Badge key={index} variant="outline" className={role.color}>
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                            {agent._count.assignedLeads}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-gray-600">
                        {formatDate(agent.createdAt)}
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(agent)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Agent
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(agent)}
                              className="text-red-600 focus:text-red-600"
                              disabled={agent._count.assignedLeads > 0}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Agent
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Agent Dialog */}
      <AddAgentDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAgentCreated={refreshAgents}
      />

      {/* Edit Agent Dialog */}
      {selectedAgent && (
        <EditAgentDialog 
          agent={selectedAgent}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onAgentUpdated={refreshAgents}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{agentToDelete?.firstName} {agentToDelete?.lastName}</strong>? 
              This action cannot be undone.
              {agentToDelete?._count.assignedLeads > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  This agent has {agentToDelete._count.assignedLeads} assigned lead(s). 
                  Please reassign these leads before deleting the agent.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={agentToDelete?._count.assignedLeads > 0}
            >
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agents;
