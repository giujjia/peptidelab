const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

interface ApiConfig extends Omit<RequestInit, 'headers'> {
  responseType?: 'json' | 'text' | 'blob';
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

async function request(method: string, endpoint: string, data?: any, config: ApiConfig = {}) {
  let url = `${BASE_URL}${endpoint}`;
  
  if (config.params) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers = new Headers(config.headers || {});
  
  // Handling FormData and Content-Type correctly like axios does
  if (data instanceof FormData) {
    if (headers.get('Content-Type') === 'multipart/form-data') {
      headers.delete('Content-Type'); // Browser sets correct boundary automatically
    }
  } else if (!headers.has('Content-Type') && data !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const { responseType, headers: _ignore, params: _ignoreParams, ...fetchConfig } = config;
  const options: RequestInit = {
    method,
    headers,
    ...fetchConfig,
  };

  if (data !== undefined) {
    options.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      const errorText = await response.text().catch(() => '');
      errorData = errorText || `HTTP error ${response.status}`;
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    
    // Simulate axios error structure with detailed message
    const detailMsg = typeof errorData === 'object' && errorData?.detail 
      ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail))
      : `Request failed with status code ${response.status}`;
    const error = new Error(detailMsg);
    (error as any).response = { data: errorData, status: response.status };
    throw error;
  }

  const type = responseType || 'json';
  let responseData;
  
  if (type === 'blob') {
    responseData = await response.blob();
  } else if (type === 'text') {
    responseData = await response.text();
  } else {
    if (response.status === 204) {
      responseData = {};
    } else {
      const text = await response.text();
      responseData = text ? JSON.parse(text) : {};
    }
  }

  return { data: responseData, status: response.status };
}

export const api = {
  get: (url: string, config?: ApiConfig) => request('GET', url, undefined, config),
  post: (url: string, data?: any, config?: ApiConfig) => request('POST', url, data, config),
  put: (url: string, data?: any, config?: ApiConfig) => request('PUT', url, data, config),
  patch: (url: string, data?: any, config?: ApiConfig) => request('PATCH', url, data, config),
  delete: (url: string, config?: ApiConfig) => request('DELETE', url, undefined, config),
};
