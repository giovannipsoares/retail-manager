// produtos.js

const produtos = {
  _dados: [],
  _categorias: [],

  async init() {
    await produtos._carregarCategorias();
    await produtos.carregar();
    document.getElementById('btn-novo-produto').onclick = produtos.novo;
    document.getElementById('busca-produto').oninput = produtos._filtrar;
    document.getElementById('filtro-ativo').onchange = produtos.carregar;
  },

  async _carregarCategorias() {
    try {
      produtos._categorias = await api.categorias.listar();
    } catch { produtos._categorias = []; }
  },

  async carregar() {
    const ativo = document.getElementById('filtro-ativo').value;
    const params = {};
    if (ativo !== '') params.ativo = ativo;
    try {
      produtos._dados = await api.produtos.listar(params);
      produtos._renderizar(produtos._dados);
    } catch (e) {
      ui.toast('Erro ao carregar produtos: ' + e.message, 'error');
    }
  },

  _filtrar() {
    const termo = document.getElementById('busca-produto').value.toLowerCase();
    const filtrados = produtos._dados.filter(p =>
      p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)
    );
    produtos._renderizar(filtrados);
  },

  _renderizar(lista) {
    const tbody = document.getElementById('tbody-produtos');
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum produto encontrado</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(p => `
      <tr>
        <td><code>${p.sku}</code></td>
        <td>${p.nome}</td>
        <td>${p.categorias?.nome || '—'}</td>
        <td>${ui.brl(p.preco_venda)}</td>
        <td>${ui.badge(p.ativo ? 'ativo' : 'inativo')}</td>
        <td>${ui.acoes(ui.btnEditar(p.id, 'produtos'), ui.btnExcluir(p.id, 'produtos', 'Desativar'))}</td>
      </tr>
    `).join('');
  },

  _form(p = {}) {
    const catOpts = produtos._categorias.map(c => ({ value: c.id, label: c.nome }));
    return `
      <div class="form-row">
        ${ui.campo('SKU *', 'sku', 'text', { required: true, value: p.sku || '' })}
        ${ui.campo('Nome *', 'nome', 'text', { required: true, value: p.nome || '' })}
      </div>
      ${ui.campo('Categoria', 'categoria_id', 'select', { value: p.categoria_id, options: catOpts })}
      <div class="form-row">
        ${ui.campo('Preço de custo (R$)', 'preco_custo', 'number', { value: p.preco_custo || 0 })}
        ${ui.campo('Preço de venda (R$)', 'preco_venda', 'number', { value: p.preco_venda || 0 })}
      </div>
      ${ui.campo('Estoque mínimo', 'estoque_minimo', 'number', { value: p.estoque_minimo || 5 })}
      ${ui.campo('Descrição', 'descricao', 'textarea', { value: p.descricao || '' })}
    `;
  },

  novo() {
    ui.modal.open('Novo produto', `<div class="modal-body">${produtos._form()}</div>`, {
      confirmLabel: 'Criar produto',
      onConfirm: async () => {
        const data = ui.formData();
        try {
          await api.produtos.criar(data);
          ui.modal.close();
          ui.toast('Produto criado com sucesso!');
          await produtos.carregar();
        } catch (e) { ui.toast(e.message, 'error'); }
      },
    });
  },

  async editar(id) {
    const p = produtos._dados.find(x => x.id === id);
    if (!p) return;
    ui.modal.open('Editar produto', `<div class="modal-body">${produtos._form(p)}</div>`, {
      confirmLabel: 'Salvar alterações',
      onConfirm: async () => {
        const data = ui.formData();
        try {
          await api.produtos.atualizar(id, data);
          ui.modal.close();
          ui.toast('Produto atualizado!');
          await produtos.carregar();
        } catch (e) { ui.toast(e.message, 'error'); }
      },
    });
  },

  async excluir(id) {
    const p = produtos._dados.find(x => x.id === id);
    if (!confirm(`Desativar "${p?.nome}"?`)) return;
    try {
      await api.produtos.excluir(id);
      ui.toast('Produto desativado');
      await produtos.carregar();
    } catch (e) { ui.toast(e.message, 'error'); }
  },
};
