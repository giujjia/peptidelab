import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface AnalysisDrawerHandlers {
  onLoadJobAsSession: (jobId: string) => Promise<boolean | void>;
  onConnectJobToSession?: (jobId: string) => Promise<boolean | void>;
  currentSessionId?: string;
  connectedJobId?: string;
  onRefreshActiveSheet?: () => void;
  onOpenSession?: (sessionId: string) => Promise<boolean | void>;
}

interface JobsDrawerContextValue {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  handlers: AnalysisDrawerHandlers | null;
  setHandlers: (handlers: AnalysisDrawerHandlers | null) => void;
}

const JobsDrawerContext = createContext<JobsDrawerContextValue | null>(null);

export const JobsDrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [handlers, setHandlersState] = useState<AnalysisDrawerHandlers | null>(null);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const setHandlers = useCallback((next: AnalysisDrawerHandlers | null) => {
    setHandlersState(next);
  }, []);

  return (
    <JobsDrawerContext.Provider value={{ open, openDrawer, closeDrawer, handlers, setHandlers }}>
      {children}
    </JobsDrawerContext.Provider>
  );
};

export const useJobsDrawer = () => useContext(JobsDrawerContext);

export function useRegisterAnalysisDrawer(handlers: AnalysisDrawerHandlers) {
  const ctx = useJobsDrawer();
  const ref = useRef(handlers);
  ref.current = handlers;
  const setHandlers = ctx?.setHandlers;

  React.useEffect(() => {
    if (!setHandlers) return;
    setHandlers({
      onLoadJobAsSession: (jobId) => ref.current.onLoadJobAsSession(jobId),
      onConnectJobToSession: async (jobId) => ref.current.onConnectJobToSession?.(jobId),
      currentSessionId: handlers.currentSessionId,
      connectedJobId: handlers.connectedJobId,
      onRefreshActiveSheet: () => ref.current.onRefreshActiveSheet?.(),
      onOpenSession: async (sid) => ref.current.onOpenSession?.(sid),
    });
    return () => setHandlers(null);
  }, [setHandlers, handlers.currentSessionId, handlers.connectedJobId]);
}
