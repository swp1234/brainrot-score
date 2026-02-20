/* ============================================
   Brain Rot Score - Main App Logic
   IIFE with try-catch for safe i18n loading
   ============================================ */
(async function () {
  try {
    await i18n.loadTranslations(i18n.currentLang);
    i18n.updateUI();
  } catch (e) {
    console.warn('i18n load failed:', e);
  }

  // ── Constants ──
  const TOTAL_QUESTIONS = 12;
  const MAX_POINTS_PER_Q = 3;
  const MAX_TOTAL = TOTAL_QUESTIONS * MAX_POINTS_PER_Q;

  // Tier thresholds (percentage based)
  const TIERS = [
    { id: 'champion',   min: 0,  max: 20, heroClass: 'tier-champion' },
    { id: 'casual',     min: 21, max: 40, heroClass: 'tier-casual' },
    { id: 'algorithm',  min: 41, max: 60, heroClass: 'tier-algorithm' },
    { id: 'chronic',    min: 61, max: 80, heroClass: 'tier-chronic' },
    { id: 'touchgrass', min: 81, max: 100, heroClass: 'tier-touchgrass' }
  ];

  // Score color gradient: green → yellow → orange → red → purple
  function getScoreColor(pct) {
    if (pct <= 20) return '#06d6a0';
    if (pct <= 40) return '#48cae4';
    if (pct <= 60) return '#ffbe0b';
    if (pct <= 80) return '#ff006e';
    return '#9b5de5';
  }

  // ── State ──
  let currentQ = 0;
  let answers = new Array(TOTAL_QUESTIONS).fill(null);

  // ── Helper: get i18n text ──
  function t(key) {
    if (!window.i18n) return key;
    const val = window.i18n.t(key);
    return val !== key ? val : key;
  }

  // ── Theme Toggle ──
  const themeToggle = document.getElementById('themeToggle');
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
    }
  }
  initTheme();

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = '🌙';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'light');
    }
  });

  // ── Language Selector ──
  const LANG_NAMES = {
    ko: '한국어', en: 'English', zh: '中文', hi: 'हिन्दी',
    ru: 'Русский', ja: '日本語', es: 'Español', pt: 'Português',
    id: 'Indonesia', tr: 'Türkçe', de: 'Deutsch', fr: 'Français'
  };

  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');
  const currentLangSpan = document.getElementById('currentLang');

  // Set initial language name
  currentLangSpan.textContent = LANG_NAMES[i18n.currentLang] || 'English';

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
  });

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      if (window.i18n) {
        await window.i18n.setLanguage(lang);
        currentLangSpan.textContent = LANG_NAMES[lang] || lang;
      }
      langDropdown.classList.remove('open');
      // Re-render current question if quiz is active
      if (document.getElementById('quiz-screen').style.display !== 'none') {
        showQuestion(currentQ);
      }
    });
  });

  document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
  });

  // ── Start Button ──
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('intro-screen').style.display = 'none';
    const qs = document.getElementById('quiz-screen');
    qs.style.display = 'block';
    qs.classList.add('fade-in');
    showQuestion(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof gtag !== 'undefined') {
      gtag('event', 'quiz_start', { event_category: 'brainrot_score' });
    }
  });

  // ── Show Question ──
  function showQuestion(idx) {
    currentQ = idx;
    const qCard = document.getElementById('questionCard');
    qCard.classList.remove('slide-in');
    void qCard.offsetWidth; // force reflow
    qCard.classList.add('slide-in');

    document.getElementById('qNumber').textContent = 'Q ' + (idx + 1);
    document.getElementById('currentQ').textContent = idx + 1;
    document.getElementById('qText').textContent = t('questions.q' + (idx + 1) + '.text');
    document.getElementById('progressBar').style.width =
      ((idx / TOTAL_QUESTIONS) * 100) + '%';

    // Build options
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (answers[idx] === i) btn.classList.add('selected');
      btn.setAttribute('aria-pressed', answers[idx] === i ? 'true' : 'false');
      btn.innerHTML =
        '<span class="option-label option-label-' + i + '" aria-hidden="true">' + labels[i] + '</span>' +
        '<span>' + t('questions.q' + (idx + 1) + '.o' + (i + 1)) + '</span>';
      btn.addEventListener('click', () => selectOption(idx, i));
      container.appendChild(btn);
    }
  }

  // ── Select Option ──
  function selectOption(qIdx, optIdx) {
    answers[qIdx] = optIdx;

    // Update button states
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
      btn.classList.toggle('selected', i === optIdx);
      btn.setAttribute('aria-pressed', i === optIdx ? 'true' : 'false');
    });

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQ < TOTAL_QUESTIONS - 1) {
        showQuestion(currentQ + 1);
      } else {
        startScan();
      }
    }, 350);
  }

  // ── Brain Scan Animation ──
  function startScan() {
    document.getElementById('quiz-screen').style.display = 'none';
    const scanScreen = document.getElementById('scan-screen');
    scanScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Show scan for 2.5 seconds then reveal results
    setTimeout(() => {
      scanScreen.classList.remove('active');
      showResult();
    }, 2500);
  }

  // ── Calculate Score ──
  function calculateScore() {
    let total = 0;
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      // Each option: 0=0pts, 1=1pt, 2=2pts, 3=3pts
      total += (answers[i] !== null ? answers[i] : 0);
    }
    return Math.round((total / MAX_TOTAL) * 100);
  }

  // ── Get Tier ──
  function getTier(pct) {
    for (const tier of TIERS) {
      if (pct >= tier.min && pct <= tier.max) return tier;
    }
    return TIERS[TIERS.length - 1];
  }

  // ── Animate Counter ──
  function animateCounter(element, target, duration) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      element.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // ── Show Result ──
  function showResult() {
    const pct = calculateScore();
    const tier = getTier(pct);
    const color = getScoreColor(pct);

    // Hero section
    const hero = document.getElementById('resultHero');
    hero.className = 'result-hero ' + tier.heroClass;
    document.getElementById('resultIcon').textContent = t('tiers.' + tier.id + '.emoji');
    document.getElementById('resultTitle').textContent = t('tiers.' + tier.id + '.name');
    document.getElementById('resultSubtitle').textContent =
      t('result.brainrotLevel') + ': ' + pct + '%';

    // Meter animation
    const meterFill = document.getElementById('meterFill');
    const circumference = 2 * Math.PI * 88; // ~553
    const offset = circumference - (pct / 100) * circumference;
    meterFill.style.stroke = color;

    // Delay meter animation slightly
    setTimeout(() => {
      meterFill.style.strokeDashoffset = offset;
    }, 100);

    // Animate number counter
    const meterNumber = document.getElementById('meterNumber');
    animateCounter(meterNumber, pct, 2000);

    // Glitch effect for high scores
    if (pct > 60) {
      meterNumber.classList.add('glitch-text');
    } else {
      meterNumber.classList.remove('glitch-text');
    }

    // Tier description
    document.getElementById('tierDesc').innerHTML =
      '<strong>' + t('tiers.' + tier.id + '.name') + '</strong><br><br>' +
      t('tiers.' + tier.id + '.desc');

    // Symptoms list
    const symptomsList = document.getElementById('symptomsList');
    symptomsList.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const symptom = t('tiers.' + tier.id + '.symptom' + i);
      if (symptom && symptom !== 'tiers.' + tier.id + '.symptom' + i) {
        const div = document.createElement('div');
        div.className = 'symptom-item fade-in';
        div.style.animationDelay = (i * 0.1) + 's';
        div.textContent = symptom;
        symptomsList.appendChild(div);
      }
    }

    // Show result screen
    const rs = document.getElementById('result-screen');
    rs.classList.add('active');
    rs.classList.add('fade-in');
    document.getElementById('progressBar').style.width = '100%';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof gtag !== 'undefined') {
      gtag('event', 'quiz_complete', {
        event_category: 'brainrot_score',
        score: pct,
        tier: tier.id
      });
    }
  }

  // ── Share Functions ──
  document.getElementById('shareTwitterBtn').addEventListener('click', () => {
    const pct = calculateScore();
    const tier = getTier(pct);
    const text = t('share.twitterText')
      .replace('{score}', pct)
      .replace('{tier}', t('tiers.' + tier.id + '.name'));
    const url = encodeURIComponent(window.location.href);
    window.open(
      'https://twitter.com/intent/tweet?url=' + url + '&text=' + encodeURIComponent(text),
      '_blank', 'noopener'
    );
  });

  document.getElementById('shareCopyBtn').addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('shareCopyBtn');
        const original = btn.textContent;
        btn.textContent = t('share.copied');
        setTimeout(() => { btn.textContent = original; }, 2000);
      }).catch(() => { prompt('Copy:', url); });
    } else {
      prompt('Copy:', url);
    }
  });

  // ── Retake ──
  document.getElementById('retakeBtn').addEventListener('click', () => {
    currentQ = 0;
    answers = new Array(TOTAL_QUESTIONS).fill(null);
    document.getElementById('result-screen').classList.remove('active', 'fade-in');
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('scan-screen').classList.remove('active');
    document.getElementById('intro-screen').style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';

    // Reset meter
    document.getElementById('meterFill').style.strokeDashoffset = '553';
    document.getElementById('meterNumber').textContent = '0';
    document.getElementById('meterNumber').classList.remove('glitch-text');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── App Loader ──
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
      }
    }, 600);
  });

  // ── Service Worker ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
