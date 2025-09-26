import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  DndContext, 
  closestCenter, 
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings, Plus, Edit, Trash2, GripVertical, Workflow, Target, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { API_BASE } from '@/config/api';

interface PipelineStage {
  id: string;
  name: string;
  orderIndex: number;
  color?: string;
  description?: string;
  isDefault: boolean;
  requiresAction: boolean;
  attentionThresholdHours?: number;
}

interface Pipeline {
  id: string;
  key: string;
  name: string;
  active: boolean;
  stages: PipelineStage[];
}

interface PipelineSettingsProps {
  userRoles: string[];
}

export const PipelineSettings: React.FC<PipelineSettingsProps> = ({ userRoles }) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
  const [showEditStageDialog, setShowEditStageDialog] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [activeTab, setActiveTab] = useState('ACQUISITIONS');
  const [activeId, setActiveId] = useState<string | null>(null);

  // New stage form
  const [newStage, setNewStage] = useState({
    name: '',
    color: 'blue',
    description: '',
    requiresAction: false,
    attentionThresholdHours: 24
  });

  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stageColors = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' }
  ];

  // Check if user is admin
  const isAdmin = userRoles.includes('ADMIN');

  useEffect(() => {
    if (isAdmin) {
      loadPipelines();
    }
  }, [isAdmin]);

  const loadPipelines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/settings/pipelines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newPipelines = data.data || [];
        setPipelines(newPipelines);
        
        // Update selectedPipeline if it exists, otherwise set first pipeline
        if (selectedPipeline) {
          const updatedSelectedPipeline = newPipelines.find(p => p.id === selectedPipeline.id);
          if (updatedSelectedPipeline) {
            setSelectedPipeline(updatedSelectedPipeline);
          } else if (newPipelines.length > 0) {
            setSelectedPipeline(newPipelines[0]);
            setActiveTab(newPipelines[0].key);
          }
        } else if (newPipelines.length > 0) {
          setSelectedPipeline(newPipelines[0]);
          setActiveTab(newPipelines[0].key);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pipelines",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createStage = async () => {
    if (!selectedPipeline || !newStage.name.trim()) {
      toast({
        title: "Error",
        description: "Stage name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const nextOrderIndex = Math.max(...selectedPipeline.stages.map(s => s.orderIndex), 0) + 1;
      
      const response = await fetch(`${API_BASE}/settings/pipelines/${selectedPipeline.id}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          name: newStage.name,
          orderIndex: nextOrderIndex,
          color: newStage.color,
          description: newStage.description,
          requiresAction: newStage.requiresAction,
          attentionThresholdHours: newStage.requiresAction ? newStage.attentionThresholdHours : null
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        const newStageData = responseData.data;
        
        // Update pipelines state
        const updatedPipelines = pipelines.map(pipeline => {
          if (pipeline.id === selectedPipeline.id) {
            return {
              ...pipeline,
              stages: [...pipeline.stages, newStageData]
            };
          }
          return pipeline;
        });
        
        // Update selectedPipeline state
        const updatedSelectedPipeline = {
          ...selectedPipeline,
          stages: [...selectedPipeline.stages, newStageData]
        };
        
        setPipelines(updatedPipelines);
        setSelectedPipeline(updatedSelectedPipeline);
        
        setShowCreateStageDialog(false);
        setNewStage({
          name: '',
          color: 'blue',
          description: '',
          requiresAction: false,
          attentionThresholdHours: 24
        });
        toast({
          title: "Success",
          description: "Pipeline stage created successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create pipeline stage",
        variant: "destructive"
      });
    }
  };

  const updateStage = async (stage: PipelineStage, updates: Partial<PipelineStage>) => {
    if (!selectedPipeline) return;

    try {
      const response = await fetch(`${API_BASE}/settings/pipelines/${selectedPipeline.id}/stages/${stage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedStageData = responseData.data;
        
        // Update pipelines state
        const updatedPipelines = pipelines.map(pipeline => {
          if (pipeline.id === selectedPipeline.id) {
            return {
              ...pipeline,
              stages: pipeline.stages.map(s => 
                s.id === stage.id ? updatedStageData : s
              )
            };
          }
          return pipeline;
        });
        
        // Update selectedPipeline state
        const updatedSelectedPipeline = {
          ...selectedPipeline,
          stages: selectedPipeline.stages.map(s => 
            s.id === stage.id ? updatedStageData : s
          )
        };
        
        setPipelines(updatedPipelines);
        setSelectedPipeline(updatedSelectedPipeline);
        
        toast({
          title: "Success",
          description: "Pipeline stage updated successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pipeline stage",
        variant: "destructive"
      });
    }
  };

  const deleteStage = async (stage: PipelineStage) => {
    if (!selectedPipeline) return;

    if (!confirm(`Are you sure you want to delete the "${stage.name}" stage?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/settings/pipelines/${selectedPipeline.id}/stages/${stage.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        // Update pipelines state
        const updatedPipelines = pipelines.map(pipeline => {
          if (pipeline.id === selectedPipeline.id) {
            return {
              ...pipeline,
              stages: pipeline.stages.filter(s => s.id !== stage.id)
            };
          }
          return pipeline;
        });
        
        // Update selectedPipeline state
        const updatedSelectedPipeline = {
          ...selectedPipeline,
          stages: selectedPipeline.stages.filter(s => s.id !== stage.id)
        };
        
        setPipelines(updatedPipelines);
        setSelectedPipeline(updatedSelectedPipeline);
        
        toast({
          title: "Success",
          description: "Pipeline stage deleted successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete pipeline stage",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !selectedPipeline) return;

    const activeIndex = selectedPipeline.stages.findIndex(stage => stage.id === active.id);
    const overIndex = selectedPipeline.stages.findIndex(stage => stage.id === over.id);

    if (activeIndex !== overIndex) {
      const newStages = arrayMove(selectedPipeline.stages, activeIndex, overIndex);
      
      // Optimistically update the local state first
      const updatedPipelines = pipelines.map(pipeline => {
        if (pipeline.id === selectedPipeline.id) {
          return {
            ...pipeline,
            stages: newStages.map((stage, index) => ({
              ...stage,
              orderIndex: index
            }))
          };
        }
        return pipeline;
      });
      
      setPipelines(updatedPipelines);
      setSelectedPipeline({
        ...selectedPipeline,
        stages: newStages.map((stage, index) => ({
          ...stage,
          orderIndex: index
        }))
      });
      
      // Update order indices for API call
      const reorderItems = newStages.map((stage, index) => ({
        id: stage.id,
        orderIndex: index
      }));

      try {
        const response = await fetch(`${API_BASE}/settings/pipelines/${selectedPipeline.id}/stages/reorder`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({ items: reorderItems })
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Pipeline stages reordered successfully"
          });
        } else {
          // If API fails, revert the optimistic update
          await loadPipelines();
          toast({
            title: "Error",
            description: "Failed to reorder pipeline stages",
            variant: "destructive"
          });
        }
      } catch (error) {
        // If API fails, revert the optimistic update
        await loadPipelines();
        toast({
          title: "Error",
          description: "Failed to reorder pipeline stages",
          variant: "destructive"
        });
      }
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'blue': 'bg-blue-500',
      'orange': 'bg-orange-500',
      'yellow': 'bg-yellow-500',
      'purple': 'bg-purple-500',
      'indigo': 'bg-indigo-500',
      'pink': 'bg-pink-500',
      'red': 'bg-red-500',
      'green': 'bg-green-500',
      'emerald': 'bg-emerald-500',
      'gray': 'bg-gray-500'
    };
    return colorMap[color] || 'bg-gray-500';
  };

  // Sortable Stage Item Component
  const SortableStageItem = ({ stage }: { stage: PipelineStage }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: stage.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: 1, // Keep full opacity
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`dnd-sortable-item flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm ${
          isDragging ? 'shadow-lg border-blue-500 bg-blue-50 scale-105' : 'hover:shadow-md'
        }`}
        {...attributes}
      >
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        <div className={`w-4 h-4 rounded ${getColorClass(stage.color || 'gray')}`} />

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{stage.name}</h4>
            {stage.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
            {stage.requiresAction && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Target className="h-3 w-3" />
                Action Required
              </Badge>
            )}
          </div>
          {stage.description && (
            <p className="text-sm text-muted-foreground">{stage.description}</p>
          )}
          {stage.attentionThresholdHours && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Attention after {stage.attentionThresholdHours}h
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedStage(stage);
              setShowEditStageDialog(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {!stage.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteStage(stage)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500">Admin access required to manage pipeline settings</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Pipeline Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading pipelines...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Pipeline Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure pipeline stages for different workflows. Drag and drop to reorder stages.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          const pipeline = pipelines.find(p => p.key === value);
          setSelectedPipeline(pipeline || null);
        }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ACQUISITIONS">Acquisitions</TabsTrigger>
            <TabsTrigger value="TRANSACTION">Transaction</TabsTrigger>
            <TabsTrigger value="DISPOSITIONS">Dispositions</TabsTrigger>
          </TabsList>

          {pipelines.map(pipeline => (
            <TabsContent key={pipeline.key} value={pipeline.key} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{pipeline.name} Pipeline</h3>
                  <p className="text-sm text-muted-foreground">
                    {pipeline.stages.length} stages configured
                  </p>
                </div>
                <Dialog open={showCreateStageDialog} onOpenChange={setShowCreateStageDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => setSelectedPipeline(pipeline)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stage
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Pipeline Stage</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="stage-name">Stage Name</Label>
                        <Input
                          id="stage-name"
                          value={newStage.name}
                          onChange={(e) => setNewStage(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Due Diligence"
                        />
                      </div>

                      <div>
                        <Label htmlFor="stage-color">Color</Label>
                        <Select
                          value={newStage.color}
                          onValueChange={(value) => setNewStage(prev => ({ ...prev, color: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stageColors.map(color => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded ${color.class}`} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="stage-description">Description (optional)</Label>
                        <Input
                          id="stage-description"
                          value={newStage.description}
                          onChange={(e) => setNewStage(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of this stage"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="requires-action"
                          checked={newStage.requiresAction}
                          onChange={(e) => setNewStage(prev => ({ ...prev, requiresAction: e.target.checked }))}
                        />
                        <Label htmlFor="requires-action">Requires Action (shows in "Needs Attention")</Label>
                      </div>

                      {newStage.requiresAction && (
                        <div>
                          <Label htmlFor="attention-threshold">Attention Threshold (hours)</Label>
                          <Input
                            id="attention-threshold"
                            type="number"
                            value={newStage.attentionThresholdHours}
                            onChange={(e) => setNewStage(prev => ({ ...prev, attentionThresholdHours: parseInt(e.target.value) }))}
                            placeholder="24"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateStageDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createStage}>
                        Create Stage
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <style>
                  {`
                    /* Fix drag overlay positioning */
                    [data-dnd-context] {
                      position: relative !important;
                    }
                    
                    /* Ensure proper stacking context */
                    .dnd-sortable-item {
                      position: relative !important;
                      z-index: 1 !important;
                      transition: all 0.2s ease !important;
                    }
                    
                    /* Dragging state styling */
                    .dnd-sortable-item.dragging {
                      transform: scale(1.05) !important;
                      border-color: #3b82f6 !important;
                      background-color: #eff6ff !important;
                      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                    }
                    
                    /* Drag overlay fixes */
                    [data-dnd-overlay] {
                      position: fixed !important;
                      top: 0 !important;
                      left: 0 !important;
                      z-index: 9999 !important;
                      pointer-events: none !important;
                    }
                    
                    /* Fix for @dnd-kit overlay positioning */
                    .dnd-kit-drag-overlay {
                      position: fixed !important;
                      z-index: 999999 !important;
                      pointer-events: none !important;
                      transform-origin: 0 0 !important;
                    }
                    
                    /* Ensure proper positioning context */
                    body {
                      position: relative !important;
                    }
                    
                    /* Fix container positioning */
                    .pipeline-settings-container {
                      position: relative !important;
                      transform: none !important;
                    }
                  `}
                </style>
                <SortableContext
                  items={pipeline.stages.map(stage => stage.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 pipeline-settings-container">
                    {pipeline.stages.map((stage) => (
                      <SortableStageItem key={stage.id} stage={stage} />
                    ))}
                  </div>
                </SortableContext>

              </DndContext>

              {pipeline.stages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Workflow className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No stages configured for this pipeline.</p>
                  <p className="text-sm">Add your first stage to get started.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
