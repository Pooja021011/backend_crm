import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Agent } from "@/hooks/useAgents";

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  agents: Agent[];
  onConfirm: (options?: { reassignToAgentId?: string | null }) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteAgentDialog: React.FC<DeleteAgentDialogProps> = ({
  open,
  onOpenChange,
  agent,
  agents,
  onConfirm,
  isDeleting = false,
}) => {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [reassignToId, setReassignToId] = useState<string>("");

  const leadCount = agent?._count?.assignedLeads ?? 0;
  const hasLeads = leadCount > 0;
  const otherAgents = agents.filter((a) => a.id !== agent?.id);

  const reset = () => {
    setChoice(null);
    setReassignToId("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!agent) return;
    if (hasLeads && choice === "yes" && !reassignToId) return;
    try {
      if (!hasLeads) {
        await onConfirm();
      } else if (choice === "yes") {
        await onConfirm({ reassignToAgentId: reassignToId });
      } else {
        await onConfirm({ reassignToAgentId: null });
      }
      handleOpenChange(false);
    } catch {
      // Caller handles toast
    }
  };

  const submitDisabled = isDeleting || (hasLeads && choice === "yes" && !reassignToId);

  if (!agent) return null;

  const name = `${agent.firstName} ${agent.lastName}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Agent</DialogTitle>
          <DialogDescription>
            {!hasLeads ? (
              <>
                Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
              </>
            ) : choice === null ? (
              <>
                This agent has <strong>{leadCount}</strong> assigned lead{leadCount !== 1 ? "s" : ""}. Would you like to assign these leads to another agent?
              </>
            ) : choice === "yes" ? (
              <>Select an agent to reassign the leads to, then confirm.</>
            ) : (
              <>Leads will be unassigned. Do you want to continue and delete this agent?</>
            )}
          </DialogDescription>
        </DialogHeader>

        {hasLeads && choice === null && (
          <div className="flex gap-2 py-2">
            <Button variant="default" onClick={() => setChoice("yes")} disabled={isDeleting}>
              Yes
            </Button>
            <Button variant="outline" onClick={() => setChoice("no")} disabled={isDeleting}>
              No
            </Button>
          </div>
        )}

        {hasLeads && choice === "yes" && (
          <div className="space-y-2 py-2">
            <Label>Assign leads to</Label>
            <Select value={reassignToId} onValueChange={setReassignToId} disabled={isDeleting}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {otherAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(!hasLeads || choice !== null) && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitDisabled}
            >
              {isDeleting
                ? "Deleting..."
                : hasLeads && choice === "yes"
                  ? "Reassign & Delete Agent"
                  : "Delete Agent"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
