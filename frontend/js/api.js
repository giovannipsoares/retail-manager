// api.js — Camada de acesso à API REST
// Troque API_BASE pela URL do seu backend em produção

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://SEU-BACKEND.railway.app';   // ← substituir após deploy

const api = {

  async _fetch(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Erro na requisição');
    }
    if (res.status === 204) return null;
    return res.json();
  },

  get:    (path)        => api._fetch('GET',    path),
  post:   (path, body)  => api._fetch('POST',   path, body),
  patch:  (path, body)  => api._fetch('PATCH',  path, body),
  delete: (path)        => api._fetch('DELETE', path),

  // ── Produtos
  produtos: {
    listar: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/produtos?${q}`);
    },
    buscar:   (id)   => api.get(`/produtos/${id}`),
    criar:    (data) => api.post('/produtos', data),
    atualizar:(id, d)=> api.patch(`/produtos/${id}`, d),
    excluir:  (id)   => api.delete(`/produtos/${id}`),
  },

  // ── Fornecedores
  fornecedores: {
    listar: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/fornecedores?${q}`);
    },
    criar:    (data) => api.post('/fornecedores', data),
    atualizar:(id, d)=> api.patch(`/fornecedores/${id}`, d),
    excluir:  (id)   => api.delete(`/fornecedores/${id}`),
  },

  // ── Estoque
  estoque: {
    listar:       (params = {}) => api.get(`/estoque?${new URLSearchParams(params)}`),
    consolidado:  ()            => api.get('/estoque/consolidado'),
    alertas:      ()            => api.get('/estoque/alertas'),
    ajustar:      (data)        => api.post('/estoque/ajuste', data),
  },

  // ── Pedidos
  pedidos: {
    listar: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/pedidos?${q}`);
    },
    buscar:         (id)     => api.get(`/pedidos/${id}`),
    criar:          (data)   => api.post('/pedidos', data),
    atualizarStatus:(id, st) => api.patch(`/pedidos/${id}/status`, { status: st }),
    cancelar:       (id)     => api.delete(`/pedidos/${id}`),
  },

  // ── Categorias
  categorias: {
    listar: () => api.get('/categorias'),
  },
};
