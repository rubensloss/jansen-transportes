/**
 * Jansen Transportes e Serviços - Frontend Engine
 * Scrollytelling Showcase de 5 Veículos da Frota Real em Tela Cheia & Motor de Conversão WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollytelling();
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

  // Integração GSAP ScrollTrigger para 5 estágios
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
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
    const s = serviceSelect ? serviceSelect.value : 'executivo';
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

      const serviceVal = serviceSelect ? serviceSelect.value : 'executivo';
      const serviceName = serviceMap[serviceVal] || 'Transporte';
      const origin = originInput && originInput.value.trim() ? originInput.value.trim() : 'Vila Velha / Vitória';
      const dest = destInput && destInput.value.trim() ? destInput.value.trim() : 'A definir';
      const date = dateInput && dateInput.value ? dateInput.value.split('-').reverse().join('/') : 'A combinar';
      const pass = passSelect ? passSelect.options[passSelect.selectedIndex].text : 'A combinar';

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
