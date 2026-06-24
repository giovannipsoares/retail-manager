// pedidos.js

const pedidos = {
  _dados: [],

  async init() {
    await pedidos.carregar();
    document.getElementById('btn-novo-pedido').onclick = pedidos.novo;
    document.getElementById('filtro-status-pedido').onchange = pedidos.carregar;
  },

  async carregar() {
    const status = document.getElementById('filtro-status-pedido').value;
    const params = {};
    if (status) params.status = status;
    try {
      pedidos._dados = await api.pedidos.listar(params);
      pedidos._renderizar(pedidos._dados);
    } catch (e) { ui.toast('Erro ao carregar pedidos: ' + e.message, 'error'); }
  },

  _renderizar(lista) {
    const tbody = document.getElementById('tbody-pedidos');
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhum pedido encontrado</td></tr>'; return; }
    tbody.innerHTML = lista.map(p => `
      <tr>
        <td><strong>${p.numero}</strong></td>
        <td>${ui.badge(p.tipo)}</td>
        <td>${p.fornecedores?.nome || p.lojas?.nome || '—'}</td>
        <td>${ui.brl(p.total)}</td>
        <td>${ui.badge(p.status)}</td>
        <td>${ui.data(p.criado_em)}</td>
        <td>${ui.acoes(
          ui.btnVer(p.id, 'pedidos'),
          p.status !== 'entregue' && p.status !== 'cancelado'
            ? `<button class="icon-btn" title="Avançar status" onclick="pedidos.avancar(${p.id})">▶️</button>`
            : '',
          ui.btnExcluir(p.id, 'pedidos', 'Cancelar')
        )}</td>
      </tr>
    `).join('');
  },

  async ver(id) {
    try {
      const p = await api.pedidos.buscar(id);
      const itensHTML = p.itens?.length
        ? `<table style="width:100%;font-size:12px;margin-top:8px">
            <thead><tr><th>Produto</th><th>Qtd</th><th>Preço unit.</th><th>Subtotal</th></tr></thead>
            <tbody>${p.itens.map(i => `
              <tr>
                <td>${i.produtos?.nome || i.produto_id}</td>
                <td>${i.quantidade}</td>
                <td>${ui.brl(i.preco_unit)}</td>
                <td>${ui.brl(i.quantidade * i.preco_unit)}</td>
              </tr>`).join('')}
            </tbody>
           </table>`
        : '<p style="color:var(--color-muted);font-size:13px">Sem itens cadastrados</p>';

      ui.modal.open(`Pedido ${p.numero}`, `
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem">
            <div><label style="font-size:11px;color:var(--color-muted)">Status</label><br>${ui.badge(p.status)}</div>
            <div><label style="font-size:11px;color:var(--color-muted)">Total</label><br><strong>${ui.brl(p.total)}</strong></div>
          </div>
          <p style="font-size:13px;font-weight:500;margin-bottom:4px">Itens do pedido</p>
          ${itensHTML}
        </div>`, { showFooter: false });
    } catch (e) { ui.toast(e.message, 'error'); }
  },

  novo() {
    const body = `<div class="modal-body">
      ${ui.campo('Tipo *', 'tipo', 'select', { required: true, options: [
        { value: 'compra',        label: 'Compra (de fornecedor)' },
        { value: 'venda',         label: 'Venda (para loja/cliente)' },
        { value: 'transferencia', label: 'Transferência entre lojas' },
      ]})}
      ${ui.campo('ID do fornecedor (se compra)', 'fornecedor_id', 'number')}
      ${ui.campo('ID da loja', 'loja_id', 'number')}
      ${ui.campo('Observações', 'observacoes', 'textarea')}
    </div>`;
    ui.modal.open('Novo pedido', body, {
      confirmLabel: 'Criar pedido',
      onConfirm: async () => {
        try {
          await api.pedidos.criar({ ...ui.formData(), itens: [] });
          ui.modal.close(); ui.toast('Pedido criado!');
          await pedidos.carregar();
        } catch (e) { ui.toast(e.message, 'error'); }
      },
    });
  },

  async avancar(id) {
    const p = pedidos._dados.find(x => x.id === id);
    if (!p) return;
    const fluxo = { rascunho: 'confirmado', confirmado: 'em_transito', em_transito: 'entregue' };
    const proximo = fluxo[p.status];
    if (!proximo) return;
    try {
      await api.pedidos.atualizarStatus(id, proximo);
      ui.toast(`Status atualizado para: ${proximo}`);
      await pedidos.carregar();
    } catch (e) { ui.toast(e.message, 'error'); }
  },

  async excluir(id) {
    if (!confirm('Cancelar este pedido?')) return;
    try {
      await api.pedidos.cancelar(id);
      ui.toast('Pedido cancelado');
      await pedidos.carregar();
    } catch (e) { ui.toast(e.message, 'error'); }
  },
};
