export function onRequest(context) {
  const headers = new Headers(context.request.headers);
  headers.set('X-Forwarded-For', context.request.headers.get('CF-Connecting-IP') || '127.0.0.1');
  return context.env.LIFESCI_BACKEND.fetch(new Request(context.request, { headers }));
}
