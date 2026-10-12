const TOKEN_KEY = 'lifesci_hub_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function qs(params = {}) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const str = s.toString();
  return str ? `?${str}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败，请稍后重试');
  return data;
}

export const api = {
  stats: () => request('/api/stats'),
  articles: (params) => request(`/api/articles${qs(params)}`),
  article: (id) => request(`/api/articles/${id}`),
  publishArticle: (payload) => request('/api/articles', { method: 'POST', body: payload }),
  likeArticle: (id) => request(`/api/articles/${id}/like`, { method: 'POST' }),
  commentArticle: (id, payload) => request(`/api/articles/${id}/comments`, { method: 'POST', body: payload }),

  communities: () => request('/api/communities'),
  community: (idOrSlug) => request(`/api/communities/${idOrSlug}`),
  createCommunity: (payload) => request('/api/communities', { method: 'POST', body: payload }),
  joinCommunity: (id) => request(`/api/communities/${id}/join`, { method: 'POST' }),

  createPost: (communityId, payload) =>
    request(`/api/communities/${communityId}/posts`, { method: 'POST', body: payload }),
  post: (id) => request(`/api/posts/${id}`),
  likePost: (id) => request(`/api/posts/${id}/like`, { method: 'POST' }),
  commentPost: (id, payload) => request(`/api/posts/${id}/comments`, { method: 'POST', body: payload }),

  recruit: (params) => request(`/api/recruit${qs(params)}`),

  competitions: (params) => request(`/api/competitions${qs(params)}`),
  competition: (id) => request(`/api/competitions/${id}`),
  createCompetition: (payload) => request('/api/competitions', { method: 'POST', body: payload }),
  updateCompetition: (id, payload) => request(`/api/competitions/${id}`, { method: 'PUT', body: payload }),
  deleteCompetition: (id) => request(`/api/competitions/${id}`, { method: 'DELETE' }),
  commentCompetition: (id, payload) => request(`/api/competitions/${id}/comments`, { method: 'POST', body: payload }),
  syncStatus: () => request('/api/admin/sync'),
  syncNow: () => request('/api/admin/sync', { method: 'POST' }),
  translateStatus: (probe) => request(`/api/admin/translate/status${probe ? '?probe=1' : ''}`),
  translateBackfill: (limit = 100, opts = {}) =>
    request(`/api/admin/translate/backfill${qs({ limit, force: opts.force ? 1 : '', scope: opts.scope || '' })}`, { method: 'POST' }),
  translateAbstracts: (limit = 10, budget = 60000) =>
    request(`/api/admin/translate/abstracts${qs({ limit, budget })}`, { method: 'POST' }),

  repo: (params) => request(`/api/repo${qs(params)}`),
  repoItem: (id) => request(`/api/repo/${id}`),
  submitRepo: (payload) => request('/api/repo', { method: 'POST', body: payload }),
  downloadRepo: (id) => request(`/api/repo/${id}/download`, { method: 'POST' }),
  favoriteRepo: (id) => request(`/api/repo/${id}/favorite`, { method: 'POST' }),
  deleteRepo: (id) => request(`/api/repo/${id}`, { method: 'DELETE' }),
  updateRepo: (id, payload) => request(`/api/repo/${id}`, { method: 'PUT', body: payload }),

  adminStats: () => request('/api/admin/stats'),
  adminUsers: () => request('/api/admin/users'),
  setUserRole: (id, role) => request(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminPosts: () => request('/api/admin/posts'),
  adminComments: () => request('/api/admin/comments'),

  updateArticle: (id, payload) => request(`/api/articles/${id}`, { method: 'PUT', body: payload }),
  deleteArticle: (id) => request(`/api/articles/${id}`, { method: 'DELETE' }),

  omTopics: () => request('/api/om/topics'),
  omTopic: (id) => request(`/api/om/topics/${id}`),
  createOmTopic: (payload) => request('/api/om/topics', { method: 'POST', body: payload }),
  updateOmTopic: (id, payload) => request(`/api/om/topics/${id}`, { method: 'PUT', body: payload }),
  deleteOmTopic: (id) => request(`/api/om/topics/${id}`, { method: 'DELETE' }),
  omFollow: (id) => request(`/api/om/topics/${id}/follow`, { method: 'POST' }),
  omScore: (id, score) => request(`/api/om/topics/${id}/score`, { method: 'POST', body: { score } }),
  omParticipate: (id, payload) => request(`/api/om/topics/${id}/participate`, { method: 'POST', body: payload }),
  omClaim: (id, payload) => request(`/api/om/topics/${id}/claim`, { method: 'POST', body: payload }),
  omSponsor: (id, payload) => request(`/api/om/topics/${id}/sponsor`, { method: 'POST', body: payload }),
  omWithdraw: (id, kind) => request(`/api/om/topics/${id}/withdraw`, { method: 'POST', body: { kind } }),
  omReview: (id, recordId, kind, approved) =>
    request(`/api/om/topics/${id}/review`, { method: 'POST', body: { recordId, kind, approved } }),
  updateCommunity: (id, payload) => request(`/api/communities/${id}`, { method: 'PUT', body: payload }),
  deleteCommunity: (id) => request(`/api/communities/${id}`, { method: 'DELETE' }),
  deletePost: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
  deleteComment: (id) => request(`/api/comments/${id}`, { method: 'DELETE' }),

  ophReports: () => request('/api/oph/reports'),
  ophJournals: () => request('/api/oph/journals'),

  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me')
};
