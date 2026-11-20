import { useEffect, useRef } from 'react';
import { api } from '../services/api';

// Tarefa acompanhada junto com o contexto que a criou
export interface TrackedTask {
  taskId: string;
  sessionId: string;
  sheetName?: string;
  statusUrl: string;
}

export type TaskOutcome = 'done' | 'error' | 'cancelled' | 'lost';

const TERMINAL = ['done', 'error', 'cancelled'];

/**
 * Acompanha uma tarefa ate um estado terminal e chama onFinish uma unica vez
 * O intervalo e encerrado ao terminar, ao trocar de tarefa e no unmount
 */
export function useTaskPolling(
  task: TrackedTask | null,
  onFinish: (task: TrackedTask, outcome: TaskOutcome, data: any) => void,
  intervalMs = 2000,
  maxFailures = 5,
  onProgress?: (task: TrackedTask, data: any) => void
) {
  // Callback mais recente sem reiniciar o acompanhamento a cada render
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!task) return;
    let stopped = false;
    let inFlight = false;
    let failures = 0;

    const finish = (outcome: TaskOutcome, data: any) => {
      stopped = true;
      clearInterval(timer);
      onFinishRef.current(task, outcome, data);
    };

    const tick = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const { data } = await api.get(task.statusUrl);
        if (stopped) return;
        failures = 0;
        if (TERMINAL.includes(data?.status)) {
          finish(data.status, data);
        } else if (onProgressRef.current) {
          onProgressRef.current(task, data);
        }
      } catch {
        if (stopped) return;
        failures += 1;
        if (failures >= maxFailures) finish('lost', null);
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [task, intervalMs, maxFailures]);
}
