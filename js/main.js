/**
 * Jansen Transportes e Serviços - Frontend Engine
 * Scrollytelling Showcase de 5 Veículos da Frota Real em Tela Cheia & Motor de Conversão WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollytelling();
  initMobileVehicleShowcase();
  initQuoteSimulator();
  initSmoothScroll();
  initMobileMenu();
  initCounterAnimation();
});

let currentSlideIndex = 0;
const bgLayers = document.querySelectorAll('.hero-bg-layer');
const captions = document.querySelectorAll('.slide-caption-item');
const stepNumbers = document.querySelectorAll('.step-number');
const thumbCards = document.querySelectorAll('.vehicle-thumb-card');
const indicatorProgress = document.querySelector('.vertical-indicator-progress');
const heroMainCta = document.getElementById('hero-main-cta');

const slideData = [
  {
    title: "Toyota Corolla Executivo e BYD Song Plus",
    subtitle: "Sedans Executivos e Carros de Luxo",
    ctaText: "Cotar Sedan Executivo",
    serviceType: "casamento",
    passengers: "1-4"
  },
  {
    title: "Vans VIP para Viagens e Grupos",
    subtitle: "Mercedes Sprinter e Renault Master",
    ctaText: "Reservar Van Executiva",
    serviceType: "van",
    passengers: "5-15"
  },
  {
    title: "Micro-ônibus Volare DW9 e Ônibus",
    subtitle: "Fretamento, Turismo e Excursões",
    ctaText: "Cotar Micro-ônibus / Ônibus",
    serviceType: "onibus",
    passengers: "16-46"
  },
  {
    title: "Caminhões Baú e Furgões de Carga",
    subtitle: "Mercedes Accelo 1016 Baú e Furgões",
    ctaText: "Cotar Transporte de Carga",
    serviceType: "carga",
    passengers: "carga"
  },
  {
    title: "Auto Socorro e Guincho Plataforma",
    subtitle: "Volkswagen Delivery 9.170 com Asa Delta",
    ctaText: "Solicitar Guincho 24h",
    serviceType: "guincho",
    passengers: "carga"
  }
];

function setSlide(index) {
  if (index < 0 || index >= bgLayers.length) return;
  currentSlideIndex = index;

  // Atualizar Camadas em Tela Cheia
  bgLayers.forEach((layer, i) => {
    layer.classList.toggle('active', i === index);
  });

  // Atualizar Textos
  captions.forEach((caption, i) => {
    caption.classList.toggle('active', i === index);
  });

  // Atualizar Marcador Numérico Lateral (01 a 05)
  stepNumbers.forEach((step, i) => {
    step.classList.toggle('active', i === index);
  });

  // Atualizar Barra Vertical de Progresso
  if (indicatorProgress) {
    indicatorProgress.style.transform = `translateY(${index * 100}%)`;
  }

  // Atualizar Cards Inferiores
  thumbCards.forEach((card, i) => {
    card.classList.toggle('active', i === index);
  });

  // Atualizar CTA principal do Hero
  if (heroMainCta && slideData[index]) {
    heroMainCta.innerHTML = `<span>${slideData[index].ctaText}</span> <i class="fa-solid fa-arrow-right ml-2"></i>`;
  }
}

function initScrollytelling() {
  // Cliques manuais nos cards inferiores da frota
  thumbCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      setSlide(index);
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialSlide = urlParams.get('slide');
  if (initialSlide !== null) {
    const sIndex = parseInt(initialSlide, 10);
    setTimeout(() => {
      setSlide(sIndex);
    }, 300);
    setTimeout(() => {
      setSlide(sIndex);
    }, 800);
  }

  // Cliques nos números laterais
  stepNumbers.forEach((step, index) => {
    step.addEventListener('click', () => {
      setSlide(index);
    });
  });

  // Conexão do botão Hero com o Simulador
  if (heroMainCta) {
    heroMainCta.addEventListener('click', (e) => {
      e.preventDefault();
      const current = slideData[currentSlideIndex];
      const serviceSelect = document.getElementById('sim-service');
      const passSelect = document.getElementById('sim-passengers');

      if (serviceSelect && current) {
        serviceSelect.value = current.serviceType;
        serviceSelect.dispatchEvent(new Event('change'));
      }
      if (passSelect && current && current.passengers !== 'carga') {
        passSelect.value = current.passengers;
        passSelect.dispatchEvent(new Event('change'));
      }

      const simSection = document.getElementById('cotacao');
      if (simSection) {
        simSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Integração GSAP ScrollTrigger para 5 estágios (Exclusivo para Desktop > 1024px)
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && window.innerWidth > 1024) {
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
      trigger: "#hero-scrolly",
      start: "top top",
      end: "+=3000",
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => {
        const progress = self.progress;
        let targetIndex = 0;
        if (progress >= 0.80) {
          targetIndex = 4;
        } else if (progress >= 0.60) {
          targetIndex = 3;
        } else if (progress >= 0.40) {
          targetIndex = 2;
        } else if (progress >= 0.20) {
          targetIndex = 1;
        } else {
          targetIndex = 0;
        }
        if (targetIndex !== currentSlideIndex) {
          setSlide(targetIndex);
        }
      }
    });
  }
}

// Simulador de Cotação Dinâmico
function initQuoteSimulator() {
  const serviceSelect = document.getElementById('sim-service');
  const passSelect = document.getElementById('sim-passengers');
  const destInput = document.getElementById('sim-destination');
  const originInput = document.getElementById('sim-origin');
  const dateInput = document.getElementById('sim-date');
  const form = document.getElementById('quote-calculator-form');
  const recElem = document.getElementById('sim-recommended-vehicle');

  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  function updateRecommendation() {
    if (!recElem) return;
    const s = serviceSelect ? serviceSelect.value : '';
    
    if (!s) {
      recElem.innerHTML = `
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 backdrop-blur-md">
          <i class="fa-solid fa-hand-pointer text-blue-400"></i>
          <span>Selecione a modalidade e volume nos seletores acima</span>
        </div>
      `;
      return;
    }

    let label = '';
    let badgeClass = 'bg-blue-900/60 border-blue-500/40 text-blue-300';

    if (s === 'casamento') {
      label = 'Veículo Sugerido: Toyota Corolla Executivo (Noivas e Cerimônias)';
    } else if (s === 'byd') {
      label = 'Veículo Sugerido: SUV BYD Song Plus Híbrido Silencioso';
      badgeClass = 'bg-cyan-900/60 border-cyan-500/40 text-cyan-300';
    } else if (s === 'executivo') {
      label = 'Veículo Sugerido: Toyota Corolla ou BYD Song Plus';
    } else if (s === 'van') {
      label = 'Veículo Sugerido: Mercedes-Benz Sprinter / Master VIP (15 Lugares)';
    } else if (s === 'onibus') {
      label = 'Veículo Sugerido: Micro-ônibus Volare DW9 (31 Lugares) ou Ônibus';
    } else if (s === 'carga') {
      label = 'Veículo Sugerido: Caminhão Mercedes Accelo Baú / Furgão';
      badgeClass = 'bg-amber-900/60 border-amber-500/40 text-amber-300';
    } else if (s === 'guincho') {
      label = 'Veículo Sugerido: Guincho Plataforma VW Delivery (Asa Delta 24h)';
      badgeClass = 'bg-red-900/60 border-red-500/40 text-red-300';
    }

    recElem.innerHTML = `
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${badgeClass} text-xs font-semibold backdrop-blur-md">
        <i class="fa-solid fa-circle-check"></i>
        <span>${label}</span>
      </div>
    `;
  }

  // Chamar estado inicial
  updateRecommendation();

  if (serviceSelect) {
    serviceSelect.addEventListener('change', () => {
      if (passSelect) {
        if (serviceSelect.value === 'carga' || serviceSelect.value === 'guincho') {
          passSelect.value = 'carga';
        } else if (serviceSelect.value === 'van') {
          passSelect.value = '5-15';
        } else if (serviceSelect.value === 'onibus') {
          passSelect.value = '16-46';
        } else if (serviceSelect.value === 'casamento' || serviceSelect.value === 'executivo' || serviceSelect.value === 'byd') {
          passSelect.value = '1-4';
        }
      }
      updateRecommendation();
    });
  }

  if (passSelect) {
    passSelect.addEventListener('change', () => {
      if (serviceSelect && !serviceSelect.value) {
        if (passSelect.value === '1-4') serviceSelect.value = 'executivo';
        else if (passSelect.value === '5-15') serviceSelect.value = 'van';
        else if (passSelect.value === '16-46') serviceSelect.value = 'onibus';
        else if (passSelect.value === 'carga') serviceSelect.value = 'carga';
        updateRecommendation();
      }
    });
  }

  document.querySelectorAll('.dest-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (destInput) {
        destInput.value = pill.getAttribute('data-dest');
        destInput.focus();
      }
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const serviceMap = {
        'casamento': 'Carro para Casamento e Noivas (Toyota Corolla)',
        'byd': 'SUV Premium Híbrido (BYD Song Plus)',
        'executivo': 'Transporte Executivo / Transfer Aeroporto (Corolla / BYD)',
        'van': 'Van Executiva VIP (Mercedes Sprinter / Master)',
        'onibus': 'Micro-ônibus Volare DW9 / Ônibus de Turismo',
        'carga': 'Transporte de Cargas (Caminhão Mercedes Accelo Baú)',
        'guincho': 'Auto Socorro / Guincho Plataforma 24h'
      };

      const serviceVal = serviceSelect ? serviceSelect.value : '';
      const serviceName = serviceMap[serviceVal] || 'Transporte (A definir modalidade)';
      const origin = originInput && originInput.value.trim() ? originInput.value.trim() : 'A combinar';
      const dest = destInput && destInput.value.trim() ? destInput.value.trim() : 'A definir';
      const date = dateInput && dateInput.value ? dateInput.value.split('-').reverse().join('/') : 'A combinar';
      const pass = passSelect && passSelect.value ? passSelect.options[passSelect.selectedIndex].text : 'A combinar';

      const whatsappNumber = "5527997392787";
      const message = `Olá! Vim pelo site da Jansen Transportes e gostaria de uma cotação:

📋 *Modalidade:* ${serviceName}
📍 *Origem:* ${origin}
🏁 *Destino:* ${dest}
📅 *Data Prevista:* ${date}
👥 *Capacidade / Carga:* ${pass}

Poderia me informar valores e disponibilidade?`;

      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, '_blank');
    });
  }

  updateRecommendation();
}

// Efeito de Contador Animado para Métricas de Autoridade
function initCounterAnimation() {
  const counterSection = document.getElementById('counter-section');
  if (!counterSection) return;

  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.2 });

  observer.observe(counterSection);

  function animateCounters() {
    const items = document.querySelectorAll('.counter-item');
    items.forEach(el => {
      const target = parseFloat(el.getAttribute('data-target'));
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const separator = el.getAttribute('data-separator') || '';
      const duration = 2000;
      const startTime = performance.now();

      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: easeOutExpo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = ease * target;

        let formatted = '';
        if (decimals > 0) {
          formatted = current.toFixed(decimals);
        } else {
          let intVal = Math.floor(current);
          if (separator) {
            formatted = intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
          } else {
            formatted = intVal.toString();
          }
        }

        el.innerText = `${prefix}${formatted}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          let finalFormatted = decimals > 0 ? target.toFixed(decimals) : (separator ? Math.floor(target).toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator) : Math.floor(target).toString());
          el.innerText = `${prefix}${finalFormatted}${suffix}`;
        }
      }

      requestAnimationFrame(update);
    });
  }
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId.startsWith('#')) return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const dropdown = document.getElementById('mobile-menu-dropdown');

  if (toggle && dropdown) {
    toggle.addEventListener('click', () => {
      dropdown.classList.toggle('hidden');
    });

    dropdown.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        dropdown.classList.add('hidden');
      });
    });
  }
}

// =========================================================================
// Showcase Touch de Veículos para Mobile / Tablet (< 1024px)
// =========================================================================
const mobileVehicles = [
  {
    title: "Toyota Corolla Executivo e BYD Song Plus",
    category: "01 // Sedans Executivos e Casamentos",
    capacity: "1 a 4 Lugares",
    specs: ["Motorista a Rigor", "Dia da Noiva", "Traslado Aeroporto", "Wi-Fi & Ar Digital"],
    desc: "Transporte executivo com motorista a rigor. Especialistas no dia da noiva, cerimônias, traslados ao Aeroporto de Vitória e viagens corporativas com discrição absoluta.",
    cta: "Cotar Sedan",
    waMsg: "Olá! Gostaria de cotar um Sedan Executivo / SUV com motorista da Jansen."
  },
  {
    title: "Mercedes Sprinter e Renault Master VIP",
    category: "02 // Vans Executivas com Motorista",
    capacity: "5 a 15 Lugares",
    specs: ["15 Passageiros", "Poltronas Reclináveis", "Wi-Fi & Tomadas", "Ar Duplo"],
    desc: "Vans executivas com poltronas reclináveis personalizadas, ar duplo, tomadas e wi-fi. O máximo de conforto para passeios em Pedra Azul, Domingos Martins e eventos corporativos.",
    cta: "Cotar Van VIP",
    waMsg: "Olá! Gostaria de cotar uma Van Executiva VIP com motorista da Jansen."
  },
  {
    title: "Micro-ônibus Volare DW9 e Ônibus",
    category: "03 // Fretamento, Turismo e Excursões",
    capacity: "16 a 46 Lugares",
    specs: ["31 Lugares", "Ar Central", "Bagageiro Amplo", "ANTT / Cadastur"],
    desc: "Micro-ônibus Volare DW9 executivo e ônibus rodoviários para congressos, viagens em grupo, excursões escolares e fretamento contínuo com seguro total.",
    cta: "Cotar Ônibus e Micro",
    waMsg: "Olá! Gostaria de cotar um Micro-ônibus / Ônibus com a Jansen."
  },
  {
    title: "Caminhões Mercedes Accelo Baú e Furgões",
    category: "04 // Logística e Cargas Fechadas",
    capacity: "Cargas e Fretes",
    specs: ["Baú Fechado", "Coleta Ágil", "Frota Rastreada", "Faturamento PJ"],
    desc: "Distribuição urbana de cargas no Espírito Santo, transporte comercial seguro e fretes diretos com pontualidade e integridade garantida da mercadoria.",
    cta: "Cotar Frete e Cargas",
    waMsg: "Olá! Gostaria de cotar transporte de cargas com caminhão baú / furgão da Jansen."
  },
  {
    title: "Guincho Plataforma Volkswagen Delivery",
    category: "05 // Auto Socorro e Reboque 24h",
    capacity: "Socorro 24 Horas",
    specs: ["Plataforma Hidráulica", "Asa Delta", "Atendimento 24h", "Grande Vitória"],
    desc: "Caminhão Volkswagen Delivery 9.170 Prime equipado com plataforma hidráulica e asa delta para remoção ágil de veículos leves, utilitários e máquinas.",
    cta: "Cotar Guincho 24 Horas",
    waMsg: "Olá! Preciso de um Guincho Plataforma 24h da Jansen com urgência."
  }
];

function initMobileVehicleShowcase() {
  const tabs = document.querySelectorAll('.mobile-tab-btn');
  const slides = document.querySelectorAll('.mobile-photo-slide');
  const dots = document.querySelectorAll('.mobile-dot');
  const titleEl = document.getElementById('mobile-vehicle-title');
  const catEl = document.getElementById('mobile-vehicle-category');
  const capEl = document.getElementById('mobile-vehicle-capacity');
  const specsEl = document.getElementById('mobile-vehicle-specs');
  const descEl = document.getElementById('mobile-vehicle-desc');
  const ctaBtn = document.getElementById('mobile-cta-whatsapp');
  const ctaText = document.getElementById('mobile-cta-text');
  const prevBtn = document.getElementById('mobile-prev-btn');
  const nextBtn = document.getElementById('mobile-next-btn');
  const photoViewport = document.getElementById('mobile-photo-viewport');

  if (!tabs.length || !slides.length) return;

  let currentMobileIndex = 0;

  function setMobileSlide(index) {
    if (index < 0) index = mobileVehicles.length - 1;
    if (index >= mobileVehicles.length) index = 0;
    currentMobileIndex = index;

    // Atualiza Abas Touch
    tabs.forEach((tab, i) => {
      const isActive = i === index;
      tab.classList.toggle('active', isActive);
      if (isActive) {
        tab.classList.remove('bg-white/5', 'text-slate-300', 'border-white/10');
        tab.classList.add('bg-blue-600', 'text-white', 'border-blue-400/50');
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        tab.classList.remove('bg-blue-600', 'text-white', 'border-blue-400/50');
        tab.classList.add('bg-white/5', 'text-slate-300', 'border-white/10');
      }
    });

    // Atualiza Foto com Transição Suave
    slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.remove('opacity-0', 'pointer-events-none');
        slide.classList.add('opacity-100', 'active');
      } else {
        slide.classList.add('opacity-0', 'pointer-events-none');
        slide.classList.remove('opacity-100', 'active');
      }
    });

    // Atualiza Pontos (Dots)
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active', 'w-4', 'bg-blue-500');
        dot.classList.remove('w-1.5', 'bg-white/40');
      } else {
        dot.classList.remove('active', 'w-4', 'bg-blue-500');
        dot.classList.add('w-1.5', 'bg-white/40');
      }
    });

    // Atualiza Dados do Veículo
    const data = mobileVehicles[index];
    if (data) {
      if (titleEl) titleEl.textContent = data.title;
      if (catEl) catEl.textContent = data.category;
      if (capEl) capEl.textContent = data.capacity;
      if (descEl) descEl.textContent = data.desc;
      if (ctaText) ctaText.textContent = data.cta;
      if (ctaBtn) {
        ctaBtn.href = `https://wa.me/5527992733774?text=${encodeURIComponent(data.waMsg)}`;
      }

      if (specsEl) {
        specsEl.innerHTML = data.specs
          .map(s => `<span class="px-2 py-0.5 rounded bg-blue-900/40 border border-blue-500/30 text-[10px] text-blue-200 font-semibold">${s}</span>`)
          .join('');
      }
    }
  }

  // Cliques nas Abas
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.getAttribute('data-index'), 10);
      setMobileSlide(idx);
    });
  });

  // Botões Prev e Next
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMobileSlide(currentMobileIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMobileSlide(currentMobileIndex + 1);
    });
  }

  // Gestos de Deslizar (Touch Swipe Horizontal)
  if (photoViewport) {
    let touchStartX = 0;
    let touchEndX = 0;

    photoViewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    photoViewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const swipeDistance = touchEndX - touchStartX;
      if (Math.abs(swipeDistance) > 40) {
        if (swipeDistance < 0) {
          // Swipe para esquerda -> próximo
          setMobileSlide(currentMobileIndex + 1);
        } else {
          // Swipe para direita -> anterior
          setMobileSlide(currentMobileIndex - 1);
        }
      }
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab');
  if (initialTab !== null) {
    setMobileSlide(parseInt(initialTab, 10));
  }
}

