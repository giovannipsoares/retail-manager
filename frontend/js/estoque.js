// estoque.js

const estoque = {
  async init() {
    await estoque.carregar();
    document.getElementById('btn-ajustar-estoque').onclick = estoque.abrirAjuste;
  },

  async carregar() {
    try {
      const dados = await api.estoque.consolidado();
      const tbody = document.getElementById('tbody-estoque');
      if (!dados.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhum dado de estoque</td></tr>'; return; }
      tbody.innerHTML = dados.map(e => `
        <tr>
          <td><code>${e.sku}</code></td>
          <td>${e.produto}</td>
          <td style="font-weight:500">${e.total_estoque}</td>
          <td>${e.estoque_minimo}</td>
          <td>${ui.badge(e.status_estoque)}</td>
        </tr>
      `).join('');
    } catch (err) { ui.toast('Erro ao carregar estoque: ' + err.message, 'error'); }
  },

  abrirAjuste() {
    const body = `<div class="modal-body">
      ${ui.campo('ID do produto', 'produto_id', 'number', { required: true })}
      ${ui.campo('ID da loja', 'loja_id', 'number', { required: true })}
      ${ui.campo('Quantidade', 'quantidade', 'number', { required: true })}
      ${ui.campo('Tipo', 'tipo', 'select', { required: true, options: [
        { value: 'entrada', label: 'Entrada' },
        { value: 'saida',   label: 'Saída' },
        { value: 'ajuste',  label: 'Ajuste direto' },
      ]})}
      ${ui.campo('Referência (opcional)', 'referencia', 'text', { placeholder: 'ex: PED-20260618' })}
    </div>`;
    ui.modal.open('Ajustar estoque', body, {
      confirmLabel: 'Aplicar ajuste',
      onConfirm: async () => {
        try {
          await api.estoque.ajustar(ui.formData());
          ui.modal.close(); ui.toast('Estoque ajustado!');
          await estoque.carregar();
        } catch (e) { ui.toast(e.message, 'error'); }
      },
    });
  },
};
