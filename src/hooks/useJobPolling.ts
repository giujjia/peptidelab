import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { Job } from '../types';

export function useJobPolling(isAuthenticated: boolean) {
  const [jobs, setJobs] = useState<Job[]>([]);

  const fetchJobs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/jobs/');
      setJobs(response.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return { jobs, fetchJobs };
}
