// fornecedores.js

const fornecedores = {
  _dados: [],

  async init() {
    await fornecedores.carregar();
    document.getElementById('btn-novo-fornecedor').onclick = fornecedores.novo;
    document.getElementById('busca-fornecedor').oninput = fornecedores._filtrar;
  },

  async carregar() {
    try {
      fornecedores._dados = await api.fornecedores.listar({ ativo: true });
      fornecedores._renderizar(fornecedores._dados);
    } catch (e) { ui.toast('Erro ao carregar fornecedores: ' + e.message, 'error'); }
  },

  _filtrar() {
    const t = document.getElementById('busca-fornecedor').value.toLowerCase();
    fornecedores._renderizar(fornecedores._dados.filter(f => f.nome.toLowerCase().includes(t)));
  },

  _renderizar(lista) {
    const tbody = document.getElementById('tbody-fornecedores');
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum fornecedor</td></tr>'; return; }
    tbody.innerHTML = lista.map(f => `
      <tr>
        <td>${f.nome}</td>
        <td>${f.cnpj || '—'}</td>
        <td>${f.email || '—'}</td>
        <td>${f.prazo_entrega} dias</td>
        <td>${ui.badge(f.ativo ? 'ativo' : 'inativo')}</td>
        <td>${ui.acoes(ui.btnEditar(f.id, 'fornecedores'), ui.btnExcluir(f.id, 'fornecedores', 'Desativar'))}</td>
      </tr>
    `).join('');
  },

  _form(f = {}) {
    return `<div class="modal-body">
      ${ui.campo('Nome *', 'nome', 'text', { required: true, value: f.nome || '' })}
      <div class="form-row">
        ${ui.campo('CNPJ', 'cnpj', 'text', { value: f.cnpj || '', placeholder: '00.000.000/0001-00' })}
        ${ui.campo('Prazo de entrega (dias)', 'prazo_entrega', 'number', { value: f.prazo_entrega || 7 })}
      </div>
      <div class="form-row">
        ${ui.campo('E-mail', 'email', 'text', { value: f.email || '' })}
        ${ui.campo('Telefone', 'telefone', 'text', { value: f.telefone || '' })}
      </div>
    </div>`;
  },

  novo() {
    ui.modal.open('Novo fornecedor', fornecedores._form(), {
      confirmLabel: 'Cadastrar',
      onConfirm: async () => {
        try {
          await api.fornecedores.criar(ui.formData());
          ui.modal.close(); ui.toast('Fornecedor cadastrado!');
          await fornecedores.carregar();
        } catch (e) { ui.toast(e.message, 'error'); }
      },
    });
  },

  async editar(id) {
    const f = fornecedores._dados.find(x => x.id === id);
    if (!f) return;
    ui.modal.open('Editar fornecedor', fornecedores._form(f), {
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        try {
          await api.fornecedores.atualizar(id, ui.formData());
          ui.modal.close(); ui.toast('Fornecedor atualizado!');
          await fornecedores.carregar();
        } catch (e) { ui.toast(e.message, 'error'); }
      },
    });
  },

  async excluir(id) {
    const f = fornecedores._dados.find(x => x.id === id);
    if (!confirm(`Desativar "${f?.nome}"?`)) return;
    try {
      await api.fornecedores.excluir(id);
      ui.toast('Fornecedor desativado');
      await fornecedores.carregar();
    } catch (e) { ui.toast(e.message, 'error'); }
  },
};
