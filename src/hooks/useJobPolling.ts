import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Job, AsyncTaskItem } from '../types';

// identity muda a cada login, inclusive na troca direta de uma conta para outra
export function useJobPolling(identity: string | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [analysisTasks, setAnalysisTasks] = useState<AsyncTaskItem[]>([]);
  // Lista pertence a identidade que a pediu; troca de identidade descarta respostas pendentes
  const generationRef = useRef(0);
  const requestSeqRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastVisibilityFetchRef = useRef(0);

  const fetchJobs = useCallback(async () => {
    if (!identity || inFlightRef.current) return;
    const generation = generationRef.current;
    const seq = ++requestSeqRef.current;
    inFlightRef.current = true;
    try {
      const [jobsRes, tasksRes] = await Promise.all([
        api.get('/jobs/'),
        api.get('/analysis/tasks').catch(() => null),
      ]);
      if (generation === generationRef.current && seq === requestSeqRef.current) {
        setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
        if (tasksRes && Array.isArray(tasksRes.data)) {
          setAnalysisTasks(tasksRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      if (seq === requestSeqRef.current) inFlightRef.current = false;
    }
  }, [identity]);

  useEffect(() => {
    generationRef.current += 1;
    requestSeqRef.current += 1;
    inFlightRef.current = false;
    setJobs([]);
    setAnalysisTasks([]);
    return () => {
      generationRef.current += 1;
    };
  }, [identity]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const hasActive =
    jobs.some((j) => j.status === 'PENDING' || j.status === 'PROCESSING') ||
    analysisTasks.some((t) => t.status === 'pending' || t.status === 'running');

  useEffect(() => {
    if (!identity) return;
    const delay = hasActive ? 5000 : 30000;
    const interval = setInterval(() => {
      if (!document.hidden) fetchJobs();
    }, delay);
    const onVisibility = () => {
      const now = Date.now();
      if (!document.hidden && now - lastVisibilityFetchRef.current >= 2000) {
        lastVisibilityFetchRef.current = now;
        fetchJobs();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [identity, hasActive, fetchJobs]);

  return { jobs, analysisTasks, fetchJobs };
}
