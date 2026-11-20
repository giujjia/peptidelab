const TASK_LABELS: Record<string, string> = {
  esm: 'ESM-1v Scoring',
  id_mapping: 'UniProt ID Mapping',
  compare: 'Dataset Intersection',
  crossval: 'Cross-Validation',
};

export function getTaskTypeLabel(type: string): string {
  return TASK_LABELS[type] || type.toUpperCase();
}

export function getTaskStatusMeta(status: string): { label: string; color: 'success' | 'error' | 'info' | 'warning' } {
  switch (status) {
    case 'done': return { label: 'Completed', color: 'success' };
    case 'error': return { label: 'Failed', color: 'error' };
    case 'running': return { label: 'Running', color: 'info' };
    case 'cancelled': return { label: 'Cancelled', color: 'warning' };
    default: return { label: 'Pending', color: 'warning' };
  }
}
