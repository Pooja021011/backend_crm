import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface PipelineNavMeta {
  pipelineKey?: string;
  pipelineKeys?: string[];
  transactionPipelineView?: boolean;
  needsAttentionView?: boolean;
  leadSourceId?: string;
  assignedUserId?: string;
}

export interface PipelineNavState {
  leadIds: string[];
  meta: PipelineNavMeta;
  updatedAt: number;
}

interface PipelineNavContextValue {
  state: PipelineNavState | null;
  setFromPipelineView: (leadIds: string[], meta: PipelineNavMeta) => void;
  getPrevNext: (currentLeadId: string) => { prevLeadId: string | null; nextLeadId: string | null };
  clear: () => void;
}

const PipelineNavContext = createContext<PipelineNavContextValue | undefined>(undefined);

export const PipelineNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PipelineNavState | null>(null);

  const setFromPipelineView = useCallback((leadIds: string[], meta: PipelineNavMeta) => {
    setState({
      leadIds,
      meta,
      updatedAt: Date.now(),
    });
  }, []);

  const clear = useCallback(() => setState(null), []);

  const getPrevNext = useCallback(
    (currentLeadId: string) => {
      if (!state?.leadIds?.length) return { prevLeadId: null, nextLeadId: null };
      const idx = state.leadIds.indexOf(currentLeadId);
      if (idx === -1) return { prevLeadId: null, nextLeadId: null };
      return {
        prevLeadId: idx > 0 ? state.leadIds[idx - 1] : null,
        nextLeadId: idx < state.leadIds.length - 1 ? state.leadIds[idx + 1] : null,
      };
    },
    [state]
  );

  const value = useMemo(
    () => ({
      state,
      setFromPipelineView,
      getPrevNext,
      clear,
    }),
    [state, setFromPipelineView, getPrevNext, clear]
  );

  return <PipelineNavContext.Provider value={value}>{children}</PipelineNavContext.Provider>;
};

export const usePipelineNav = (): PipelineNavContextValue => {
  const ctx = useContext(PipelineNavContext);
  if (!ctx) throw new Error('usePipelineNav must be used within a PipelineNavProvider');
  return ctx;
};


