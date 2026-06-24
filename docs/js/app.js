// app.js — Inicialização e roteamento da SPA

const modulos = { dashboard, produtos, estoque, fornecedores, pedidos };
const paginasInicializadas = new Set();

async function navegarPara(pagina) {
  // Oculta todas as páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Ativa a página e o link
  document.getElementById(`page-${pagina}`)?.classList.add('active');
  document.querySelector(`[data-page="${pagina}"]`)?.classList.add('active');

  // Inicializa o módulo apenas na primeira visita
  if (!paginasInicializadas.has(pagina) && modulos[pagina]) {
    paginasInicializadas.add(pagina);
    await modulos[pagina].init();
  }
}

// Navegação via links do menu
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const pagina = link.dataset.page;
    history.pushState({ pagina }, '', `#${pagina}`);
    navegarPara(pagina);
  });
});

// Suporte ao botão Voltar do navegador
window.addEventListener('popstate', e => {
  const pagina = e.state?.pagina || 'dashboard';
  navegarPara(pagina);
});

// Inicialização ao carregar
const paginaInicial = location.hash.replace('#', '') || 'dashboard';
navegarPara(paginaInicial);
