// Utilitarios comuns dos testes de frontend

export const jwt = (sub: string, expOffsetSeconds = 3600) =>
  `h.${btoa(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }))}.s`;

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Promessa resolvida manualmente para controlar a ordem das respostas
export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const urlOf = (input: RequestInfo | URL) => (typeof input === 'string' ? input : input.toString());
