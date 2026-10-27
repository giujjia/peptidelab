// Converte o detalhe de erro da API em texto exibivel, inclusive a lista de validacao do FastAPI
export function detailToText(detail: unknown): string | null {
  if (detail === null || detail === undefined || detail === '') return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (item && typeof item === 'object' && 'msg' in item) {
        const loc = Array.isArray((item as any).loc)
          ? (item as any).loc.filter((p: unknown) => p !== 'body').join('.')
          : '';
        return loc ? `${loc}: ${(item as any).msg}` : String((item as any).msg);
      }
      return typeof item === 'string' ? item : JSON.stringify(item);
    });
    return parts.join('; ') || null;
  }
  if (typeof detail === 'object') {
    return 'msg' in (detail as any) ? String((detail as any).msg) : JSON.stringify(detail);
  }
  return String(detail);
}

// Mensagem para o usuario a partir de qualquer erro de chamada
export function errorMessage(err: any, fallback: string): string {
  return detailToText(err?.response?.data?.detail)
    || (typeof err?.response?.data === 'string' && err.response.data ? err.response.data : null)
    || (typeof err?.message === 'string' && err.message ? err.message : null)
    || fallback;
}
