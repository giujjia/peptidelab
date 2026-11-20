import { api } from '../services/api';

export function downloadBlob(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function downloadSessionWorkbook(sessionId: string) {
  const res = await api.get(`/analysis/download/${encodeURIComponent(sessionId)}`, { responseType: 'blob' });
  downloadBlob(res.data, `analysis_${sessionId.slice(0, 8)}.xlsx`);
}
