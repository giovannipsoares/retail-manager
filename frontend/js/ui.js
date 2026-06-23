// ui.js — Utilitários de interface

const ui = {

  // ── Toast ──────────────────────────────────────────────────
  toast(msg, type = 'success', duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    clearTimeout(ui._toastTimer);
    ui._toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  },

  // ── Modal ──────────────────────────────────────────────────
  modal: {
    open(title, bodyHTML, { onConfirm, confirmLabel = 'Salvar', showFooter = true } = {}) {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = bodyHTML;
      if (showFooter) {
        let footer = document.getElementById('modal-footer');
        if (!footer) {
          footer = document.createElement('div');
          footer.id = 'modal-footer';
          footer.className = 'modal-footer';
          document.getElementById('modal-box').appendChild(footer);
        }
        footer.innerHTML = `
          <button class="btn" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-confirm">${confirmLabel}</button>
        `;
        document.getElementById('modal-cancel').onclick = ui.modal.close;
        if (onConfirm) document.getElementById('modal-confirm').onclick = onConfirm;
      } else {
        document.getElementById('modal-footer')?.remove();
      }
      document.getElementById('modal-overlay').classList.remove('hidden');
    },
    close() {
      document.getElementById('modal-overlay').classList.add('hidden');
    },
  },

  // ── Badges ─────────────────────────────────────────────────
  badge(texto, tipo) {
    const map = {
      ativo: 'ok', true: 'ok',
      inativo: 'warn', false: 'warn',
      entregue: 'ok',
      confirmado: 'ok',
      em_transito: 'warn',
      rascunho: 'gray',
      cancelado: 'err',
      pendente: 'err',
      normal: 'ok',
      baixo: 'warn',
      critico: 'err',
      zerado: 'err',
    };
    const cls = tipo || map[String(texto).toLowerCase()] || 'gray';
    const label = String(texto).replace('_', ' ');
    return `<span class="badge badge-${cls}">${label}</span>`;
  },

  // ── Formatos ────────────────────────────────────────────────
  brl(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },
  data(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  },

  // ── Botões de ação ──────────────────────────────────────────
  acoes(...btns) {
    return `<div style="display:flex;gap:4px">${btns.join('')}</div>`;
  },
  btnEditar(id, modulo) {
    return `<button class="icon-btn" title="Editar" onclick="${modulo}.editar(${id})">✏️</button>`;
  },
  btnExcluir(id, modulo, label = 'Excluir') {
    return `<button class="icon-btn btn-danger" title="${label}" onclick="${modulo}.excluir(${id})">🗑️</button>`;
  },
  btnVer(id, modulo) {
    return `<button class="icon-btn" title="Ver detalhes" onclick="${modulo}.ver(${id})">👁️</button>`;
  },

  // ── Formulário genérico ─────────────────────────────────────
  campo(label, name, tipo = 'text', opts = {}) {
    const { required, value = '', placeholder = '', options } = opts;
    const req = required ? 'required' : '';
    if (tipo === 'select' && options) {
      const opts_html = options.map(o =>
        `<option value="${o.value}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label}</option>`
      ).join('');
      return `<div class="form-group"><label>${label}</label>
        <select name="${name}" ${req}><option value="">Selecione...</option>${opts_html}</select></div>`;
    }
    if (tipo === 'textarea') {
      return `<div class="form-group"><label>${label}</label>
        <textarea name="${name}" rows="3" placeholder="${placeholder}" ${req}>${value}</textarea></div>`;
    }
    return `<div class="form-group"><label>${label}</label>
      <input type="${tipo}" name="${name}" value="${value}" placeholder="${placeholder}" ${req} /></div>`;
  },

  formData(selector = '#modal-body') {
    const form = document.querySelector(selector);
    const data = {};
    form.querySelectorAll('[name]').forEach(el => {
      const v = el.value.trim();
      if (v !== '') data[el.name] = el.type === 'number' ? Number(v) : v;
    });
    return data;
  },
};

// Fechar modal ao clicar fora
document.getElementById('modal-close').addEventListener('click', ui.modal.close);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') ui.modal.close();
});
