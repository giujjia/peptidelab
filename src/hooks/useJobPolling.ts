import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Job } from '../types';

export function useJobPolling(isAuthenticated: boolean) {
  const [jobs, setJobs] = useState<Job[]>([]);
  // Lista pertence a identidade que a pediu; troca de identidade descarta respostas pendentes
  const generationRef = useRef(0);

  const fetchJobs = useCallback(async () => {
    if (!isAuthenticated) return;
    const generation = generationRef.current;
    try {
      const response = await api.get('/jobs/');
      if (generation === generationRef.current) setJobs(response.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    generationRef.current += 1;
    if (!isAuthenticated) setJobs([]);
  }, [isAuthenticated]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return { jobs, fetchJobs };
}
