// dashboard.js

const dashboard = {
  async init() {
    await dashboard.carregar();
  },

  async carregar() {
    await Promise.allSettled([
      dashboard._kpis(),
      dashboard._pedidos(),
      dashboard._alertas(),
    ]);
  },

  async _kpis() {
    try {
      const [alertas, pedidosAbertos] = await Promise.all([
        api.estoque.alertas(),
        api.pedidos.listar({ status: 'confirmado' }),
      ]);
      document.getElementById('kpi-grid').innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Pedidos confirmados</div>
          <div class="kpi-value">${pedidosAbertos.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Estoque crítico/zerado</div>
          <div class="kpi-value" style="color:var(--color-err)">${alertas.length}</div>
          <div class="kpi-delta dn">${alertas.length > 0 ? 'requer atenção' : 'tudo ok'}</div>
        </div>
      `;
    } catch { /* silencioso em modo offline */ }
  },

  async _pedidos() {
    try {
      const lista = await api.pedidos.listar({ limit: 5 });
      const el = document.getElementById('dash-pedidos');
      if (!lista.length) { el.innerHTML = '<p class="empty">Nenhum pedido</p>'; return; }
      el.innerHTML = `<table>
        <thead><tr><th>Nº</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${lista.map(p => `
          <tr>
            <td>${p.numero}</td>
            <td>${ui.brl(p.total)}</td>
            <td>${ui.badge(p.status)}</td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { document.getElementById('dash-pedidos').innerHTML = '<p class="empty">—</p>'; }
  },

  async _alertas() {
    try {
      const lista = await api.estoque.alertas();
      const el = document.getElementById('dash-alertas');
      if (!lista.length) { el.innerHTML = '<p class="empty" style="color:var(--color-ok)">✅ Nenhum alerta</p>'; return; }
      el.innerHTML = `<table>
        <thead><tr><th>Produto</th><th>Qtd</th><th>Status</th></tr></thead>
        <tbody>${lista.map(e => `
          <tr>
            <td>${e.produto}</td>
            <td style="font-weight:500;color:var(--color-err)">${e.total_estoque}</td>
            <td>${ui.badge(e.status_estoque)}</td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { document.getElementById('dash-alertas').innerHTML = '<p class="empty">—</p>'; }
  },
};
