/**
 * JANSEN TRANSPORTES - Motor de Conteúdo Dinâmico do Blog (OmniCity)
 * Gerencia persistência, renderização dinâmica na Home e na página de Artigo Completo.
 */

const JANSEN_POSTS_STORAGE_KEY = 'jansen_blog_posts';
const DEFAULT_POSTS_PATH = 'data/posts.json';

// Carregar posts (do LocalStorage ou fallback para data/posts.json)
async function fetchBlogPosts() {
  const cached = localStorage.getItem(JANSEN_POSTS_STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler posts do cache:', e);
    }
  }

  try {
    const res = await fetch(DEFAULT_POSTS_PATH);
    if (res.ok) {
      const posts = await res.json();
      localStorage.setItem(JANSEN_POSTS_STORAGE_KEY, JSON.stringify(posts));
      return posts;
    }
  } catch (err) {
    console.error('Erro ao buscar data/posts.json:', err);
  }

  return [];
}

// Salvar novos posts ou atualizar base
function saveBlogPosts(posts) {
  localStorage.setItem(JANSEN_POSTS_STORAGE_KEY, JSON.stringify(posts));
}

// Renderizar artigos na Home (seção #guias)
async function renderHomeArticles() {
  const container = document.getElementById('guias-articles-grid');
  if (!container) return;

  const posts = await fetchBlogPosts();
  if (!posts || posts.length === 0) return;

  container.innerHTML = '';

  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'glass-card rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-blue-400/50 transition-all shadow-xl';

    const whatsappUrl = `https://wa.me/5527997392787?text=${encodeURIComponent(post.whatsappText || 'Olá! Gostaria de um orçamento.')}`;

    article.innerHTML = `
      <div>
        <a href="artigo.html?id=${post.id}" class="block h-48 overflow-hidden relative group">
          <img src="${post.coverImage}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0d1733] via-transparent to-transparent"></div>
          <span class="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
            ${post.category || 'Guia'}
          </span>
        </a>
        <div class="p-6">
          <span class="text-[11px] text-blue-400 font-semibold block mb-1.5">${post.categoryTag || 'Dica e Roteiro'}</span>
          <h3 class="text-lg font-bold text-white mb-2 font-heading leading-snug hover:text-blue-300 transition-colors">
            <a href="artigo.html?id=${post.id}">${post.title}</a>
          </h3>
          <p class="text-slate-300 text-xs leading-relaxed line-clamp-3">
            ${post.summary}
          </p>
        </div>
      </div>
      <div class="p-6 pt-0 border-t border-white/5 flex items-center justify-between gap-3 mt-4">
        <span class="text-[11px] text-slate-400 flex items-center gap-1">
          <i class="fa-regular fa-clock text-blue-400"></i> ${post.readTime || '3 min'}
        </span>
        <div class="flex items-center gap-2">
          <a href="artigo.html?id=${post.id}" class="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            Ler Mais
          </a>
          <a href="${whatsappUrl}" target="_blank" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all">
            <i class="fa-brands fa-whatsapp"></i>
            <span>Cotar</span>
          </a>
        </div>
      </div>
    `;

    container.appendChild(article);
  });
}

// Renderizar Leitura de Artigo Completo (artigo.html)
async function renderSingleArticlePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  const posts = await fetchBlogPosts();
  if (!posts || posts.length === 0) return;

  const currentPost = posts.find(p => p.id === postId || p.slug === postId) || posts[0];

  // Atualizar título da página e metadados
  document.title = `${currentPost.title} • Jansen Transportes`;

  // Preencher elementos no DOM
  const titleEl = document.getElementById('article-title');
  const catEl = document.getElementById('article-category');
  const tagEl = document.getElementById('article-tag');
  const dateEl = document.getElementById('article-date');
  const timeEl = document.getElementById('article-read-time');
  const coverEl = document.getElementById('article-cover');
  const contentEl = document.getElementById('article-content');
  const recVehEl = document.getElementById('article-recommended-vehicle');
  const ctaBtn = document.getElementById('article-whatsapp-cta');
  const breadcrumbEl = document.getElementById('article-breadcrumb-title');

  if (titleEl) titleEl.innerText = currentPost.title;
  if (breadcrumbEl) breadcrumbEl.innerText = currentPost.title;
  if (catEl) catEl.innerText = currentPost.category;
  if (tagEl) tagEl.innerText = currentPost.categoryTag;
  if (dateEl) dateEl.innerText = currentPost.date;
  if (timeEl) timeEl.innerText = currentPost.readTime || '3 min de leitura';
  if (coverEl) {
    coverEl.src = currentPost.coverImage;
    coverEl.alt = currentPost.title;
  }
  if (contentEl) {
    contentEl.innerHTML = currentPost.content;
  }
  if (recVehEl) {
    recVehEl.innerText = currentPost.recommendedVehicle || 'Frota Executiva Jansen Transportes';
  }
  if (ctaBtn) {
    const encoded = encodeURIComponent(currentPost.whatsappText || `Olá! Li o artigo "${currentPost.title}" e gostaria de solicitar uma cotação.`);
    ctaBtn.href = `https://wa.me/5527997392787?text=${encoded}`;
  }

  // Renderizar outros artigos sugeridos no rodapé
  const relatedGrid = document.getElementById('related-articles-grid');
  if (relatedGrid) {
    relatedGrid.innerHTML = '';
    const otherPosts = posts.filter(p => p.id !== currentPost.id).slice(0, 3);
    otherPosts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'glass-card rounded-2xl p-5 border border-white/10 hover:border-blue-400/40 transition-all flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <span class="text-[10px] uppercase tracking-wider font-bold text-blue-400 block mb-1">${p.category}</span>
          <h4 class="text-sm font-bold text-white mb-2 font-heading leading-snug">
            <a href="artigo.html?id=${p.id}" class="hover:text-blue-300 transition-colors">${p.title}</a>
          </h4>
          <p class="text-slate-400 text-xs line-clamp-2 mb-3">${p.summary}</p>
        </div>
        <a href="artigo.html?id=${p.id}" class="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1.5 self-start transition-colors">
          <span>Ler Artigo</span>
          <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </a>
      `;
      relatedGrid.appendChild(card);
    });
  }
}

// Inicializador conforme a página
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('guias-articles-grid')) {
    renderHomeArticles();
  }
  if (document.getElementById('article-content')) {
    renderSingleArticlePage();
  }
});
