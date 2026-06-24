// analises.js — Módulo completo de análises

const analises = {
  _filtros: {},
  _dadosAbc: [],

  async init() {
    await analises._carregarFiltros();
    analises._bindEventos();
    document.getElementById('btn-importar-csv').onclick = analises.abrirImportador;
  },

  async _carregarFiltros() {
    try {
      const f = await api.get('/analises/filtros');
      analises._filtros = f;
      analises._popularSelect('filtro-abc-loja', f.lojas, 'codigo', 'nome', 'Todas as lojas');
      analises._popularSelect('filtro-abc-grupo', f.grupos.map(g => ({v: g, l: g})), 'v', 'l', 'Todos os grupos');
      analises._popularSelect('filtro-giro-loja', f.lojas, 'codigo', 'nome', 'Todas as lojas');
      analises._popularSelect('filtro-sugestao-loja', f.lojas, 'codigo', 'nome', 'Todas as lojas');

      // Preenche selects de período
      const selIni = document.getElementById('filtro-abc-periodo-ini');
      const selFim = document.getElementById('filtro-abc-periodo-fim');
      f.periodos.forEach(p => {
        selIni.innerHTML += `<option value="${p.ano}-${p.mes}">${p.label}</option>`;
        selFim.innerHTML += `<option value="${p.ano}-${p.mes}">${p.label}</option>`;
      });
    } catch { /* sem histórico ainda */ }
  },

  _popularSelect(id, lista, campoValor, campoLabel, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>`;
    lista.forEach(item => {
      el.innerHTML += `<option value="${item[campoValor]}">${item[campoLabel]}</option>`;
    });
  },

  _bindEventos() {
    document.getElementById('btn-gerar-abc')?.addEventListener('click', analises.gerarAbc);
    document.getElementById('btn-gerar-giro')?.addEventListener('click', analises.gerarGiro);
    document.getElementById('btn-gerar-ruptura')?.addEventListener('click', analises.gerarRuptura);
    document.getElementById('btn-gerar-sugestao')?.addEventListener('click', analises.gerarSugestao);
    document.getElementById('tab-abc')?.addEventListener('click', () => analises._ativarTab('abc'));
    document.getElementById('tab-giro')?.addEventListener('click', () => analises._ativarTab('giro'));
    document.getElementById('tab-ruptura')?.addEventListener('click', () => analises._ativarTab('ruptura'));
    document.getElementById('tab-sugestao')?.addEventListener('click', () => analises._ativarTab('sugestao'));
  },

  _ativarTab(tab) {
    ['abc','giro','ruptura','sugestao'].forEach(t => {
      document.getElementById(`painel-${t}`)?.classList.toggle('hidden', t !== tab);
      document.getElementById(`tab-${t}`)?.classList.toggle('tab-ativa', t === tab);
    });
  },

  // ── Importador ────────────────────────────────────────────

  abrirImportador() {
    ui.modal.open('Importar histórico de vendas', `
      <div class="modal-body">
        <p style="font-size:13px;color:var(--color-muted);margin-bottom:1rem">
          Selecione o arquivo CSV exportado do Onixx. O sistema aceita o formato padrão com as colunas:<br>
          <code style="font-size:11px">CODIGO, DESCRICAO, MÊS, LOJA, GRUPO, FORNECEDOR, QUANTIDADE, TOTAL VENDA, CUSTO, MARKUP</code>
        </p>
        <div class="form-group">
          <label>Arquivo CSV</label>
          <input type="file" id="input-csv" accept=".csv,.xlsx" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:8px" />
        </div>
        <div id="import-resultado" style="margin-top:8px;font-size:13px"></div>
      </div>
    `, {
      confirmLabel: 'Importar',
      onConfirm: analises._executarImportacao,
    });
  },

  async _executarImportacao() {
    const input = document.getElementById('input-csv');
    const resultado = document.getElementById('import-resultado');
    if (!input.files.length) { ui.toast('Selecione um arquivo', 'error'); return; }

    resultado.textContent = '⏳ Importando...';
    const formData = new FormData();
    formData.append('arquivo', input.files[0]);

    try {
      const res = await fetch(API_BASE + '/analises/importar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erro na importação');
      resultado.innerHTML = `✅ <strong>${data.inseridos}</strong> registros importados com sucesso.${data.erros > 0 ? ` ⚠️ ${data.erros} linhas ignoradas.` : ''}`;
      setTimeout(() => { ui.modal.close(); analises._carregarFiltros(); }, 2000);
    } catch(e) {
      resultado.textContent = '❌ ' + e.message;
    }
  },

  // ── Curva ABC ─────────────────────────────────────────────

  async gerarAbc() {
    const base = document.getElementById('filtro-abc-base').value;
    const loja = document.getElementById('filtro-abc-loja').value;
    const grupo = document.getElementById('filtro-abc-grupo').value;
    const periIni = document.getElementById('filtro-abc-periodo-ini').value;
    const periFim = document.getElementById('filtro-abc-periodo-fim').value;

    const params = { base };
    if (loja) params.loja = loja;
    if (grupo) params.grupo = grupo;
    if (periIni) { const [a,m] = periIni.split('-'); params.ano_ini = a; params.mes_ini = m; }
    if (periFim) { const [a,m] = periFim.split('-'); params.ano_fim = a; params.mes_fim = m; }

    const tbody = document.getElementById('tbody-abc');
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Calculando...</td></tr>';

    try {
      const dados = await api.get('/analises/curva-abc?' + new URLSearchParams(params));
      analises._dadosAbc = dados;
      analises._renderizarAbc(dados, base);
      analises._renderizarGraficoAbc(dados);
    } catch(e) { ui.toast('Erro ao calcular curva ABC: ' + e.message, 'error'); }
  },

  _renderizarAbc(lista, base) {
    const labels = { faturamento: 'Faturamento (R$)', quantidade: 'Quantidade', margem: 'Margem (R$)' };
    document.getElementById('abc-label-valor').textContent = labels[base] || 'Valor';

    const tbody = document.getElementById('tbody-abc');
    if (!lista.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">Sem dados</td></tr>'; return; }

    const total = lista.reduce((s, p) => s + p.valor_base, 0);
    tbody.innerHTML = lista.map((p, i) => `
      <tr>
        <td>${i+1}</td>
        <td><code>${p.codigo}</code></td>
        <td>${p.descricao}</td>
        <td>${p.grupo || '—'}</td>
        <td style="text-align:right">${p.valor_base.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
        <td style="text-align:right">${p.pct_acumulado}%</td>
        <td><span class="badge badge-${p.classe === 'A' ? 'ok' : p.classe === 'B' ? 'warn' : 'gray'}">${p.classe}</span></td>
      </tr>
    `).join('');

    // Resumo
    const contA = lista.filter(p => p.classe === 'A').length;
    const contB = lista.filter(p => p.classe === 'B').length;
    const contC = lista.filter(p => p.classe === 'C').length;
    document.getElementById('abc-resumo').innerHTML = `
      <span class="badge badge-ok">A: ${contA} produtos</span>
      <span class="badge badge-warn">B: ${contB} produtos</span>
      <span class="badge badge-gray">C: ${contC} produtos</span>
      <span style="font-size:12px;color:var(--color-muted)">Total: ${lista.length} produtos</span>
    `;
  },

  _renderizarGraficoAbc(dados) {
    const canvas = document.getElementById('grafico-abc');
    if (!canvas || !dados.length) return;
    const ctx = canvas.getContext('2d');
    if (window._chartAbc) window._chartAbc.destroy();

    const cores = dados.map(p => p.classe === 'A' ? '#3B6D11' : p.classe === 'B' ? '#854F0B' : '#888780');
    window._chartAbc = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.slice(0, 30).map(p => p.codigo),
        datasets: [{
          label: 'Valor',
          data: dados.slice(0, 30).map(p => p.valor_base),
          backgroundColor: cores.slice(0, 30),
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  },

  // ── Giro ──────────────────────────────────────────────────

  async gerarGiro() {
    const loja = document.getElementById('filtro-giro-loja').value;
    const meses = document.getElementById('filtro-giro-meses').value;
    const params = { meses };
    if (loja) params.loja = loja;

    const tbody = document.getElementById('tbody-giro');
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Calculando...</td></tr>';

    try {
      const dados = await api.get('/analises/giro?' + new URLSearchParams(params));
      if (!dados.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Sem dados</td></tr>'; return; }
      tbody.innerHTML = dados.map(p => `
        <tr>
          <td><code>${p.codigo}</code></td>
          <td>${p.descricao}</td>
          <td style="text-align:right">${p.estoque_atual}</td>
          <td style="text-align:right">${p.venda_media_diaria}/dia</td>
          <td style="text-align:right;font-weight:500">${p.dias_cobertura === 999 ? '∞' : p.dias_cobertura + ' dias'}</td>
          <td>${ui.badge(p.status)}</td>
        </tr>
      `).join('');
    } catch(e) { ui.toast('Erro: ' + e.message, 'error'); }
  },

  // ── Ruptura ───────────────────────────────────────────────

  async gerarRuptura() {
    const tbody = document.getElementById('tbody-ruptura');
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Carregando...</td></tr>';
    try {
      const dados = await api.get('/analises/ruptura');
      if (!dados.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty" style="color:var(--color-ok)">✅ Nenhuma ruptura encontrada!</td></tr>';
        return;
      }
      tbody.innerHTML = dados.map(p => `
        <tr>
          <td><code>${p.sku}</code></td>
          <td>${p.produto}</td>
          <td style="font-weight:500;color:var(--color-err)">${p.total_estoque}</td>
          <td>${p.estoque_minimo}</td>
          <td>${ui.badge(p.status_estoque)}</td>
        </tr>
      `).join('');
    } catch(e) { ui.toast('Erro: ' + e.message, 'error'); }
  },

  // ── Sugestão de compra ────────────────────────────────────

  async gerarSugestao() {
    const loja = document.getElementById('filtro-sugestao-loja').value;
    const meses = document.getElementById('filtro-sugestao-meses').value;
    const cobertura = document.getElementById('filtro-sugestao-cobertura').value;
    const params = { meses, cobertura_alvo: cobertura };
    if (loja) params.loja = loja;

    const tbody = document.getElementById('tbody-sugestao');
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Calculando...</td></tr>';

    try {
      const dados = await api.get('/analises/sugestao-compra?' + new URLSearchParams(params));
      if (!dados.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">Sem sugestões para os filtros selecionados</td></tr>'; return; }

      const totalValor = dados.reduce((s, p) => s + (p.valor_estimado || 0), 0);
      document.getElementById('sugestao-total').textContent =
        'Total estimado: R$ ' + totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2});

      tbody.innerHTML = dados.map(p => `
        <tr>
          <td><code>${p.codigo}</code></td>
          <td>${p.descricao}</td>
          <td>${p.fornecedor || '—'}</td>
          <td style="text-align:right">${p.estoque_atual}</td>
          <td style="text-align:right">${p.venda_media_diaria}/dia</td>
          <td style="text-align:right;font-weight:500;color:var(--color-primary)">${p.qtd_sugerida}</td>
          <td style="text-align:right">${p.valor_estimado ? 'R$ ' + p.valor_estimado.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '—'}</td>
        </tr>
      `).join('');
    } catch(e) { ui.toast('Erro: ' + e.message, 'error'); }
  },
};
