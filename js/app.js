/* ============================================
   Brain Rot Score - Scroll Addiction Simulator
   IIFE with try-catch for safe i18n loading
   ============================================ */
(async function () {
  try {
    await i18n.loadTranslations(i18n.currentLang);
    i18n.updateUI();
  } catch (e) {
    console.warn('i18n load failed:', e);
  }

  // -- Constants --
  const TOTAL_POSTS = 15;
  const WARNING_POSTS = [5, 10]; // show warning after these post indices
  const TIERS = [
    { id: 'champion',   min: 0,  max: 20, heroClass: 'tier-champion' },
    { id: 'casual',     min: 21, max: 40, heroClass: 'tier-casual' },
    { id: 'algorithm',  min: 41, max: 60, heroClass: 'tier-algorithm' },
    { id: 'chronic',    min: 61, max: 80, heroClass: 'tier-chronic' },
    { id: 'touchgrass', min: 81, max: 100, heroClass: 'tier-touchgrass' }
  ];

  function getScoreColor(pct) {
    if (pct <= 20) return '#06d6a0';
    if (pct <= 40) return '#48cae4';
    if (pct <= 60) return '#ffbe0b';
    if (pct <= 80) return '#ff006e';
    return '#9b5de5';
  }

  // -- State --
  let reactions = []; // 'like' | 'vibe' | 'skip' | null per post
  let scrollSpeeds = []; // scroll speed samples
  let postRevealTimes = []; // when each post became visible
  let postReactTimes = []; // time taken to react per post
  let warningsIgnored = 0;
  let warningsStopped = 0;
  let feedStartTime = 0;
  let feedEndTime = 0;
  let postsRevealed = 0;
  let currentWarningIdx = 0;

  // -- Helper: get i18n text --
  function t(key) {
    if (!window.i18n) return key;
    const val = window.i18n.t(key);
    return val !== key ? val : key;
  }

  // -- Theme Toggle --
  const themeToggle = document.getElementById('themeToggle');
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '\u2600\uFE0F';
    }
  }
  initTheme();

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = '\uD83C\uDF19';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '\u2600\uFE0F';
      localStorage.setItem('theme', 'light');
    }
  });

  // -- Language Selector --
  const LANG_NAMES = {
    ko: '\uD55C\uAD6D\uC5B4', en: 'English', zh: '\u4E2D\u6587', hi: '\u0939\u093F\u0928\u094D\u0926\u0940',
    ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', ja: '\u65E5\u672C\u8A9E', es: 'Espa\u00F1ol', pt: 'Portugu\u00EAs',
    id: 'Indonesia', tr: 'T\u00FCrk\u00E7e', de: 'Deutsch', fr: 'Fran\u00E7ais'
  };

  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');
  const currentLangSpan = document.getElementById('currentLang');
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
    });
  });

  document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
  });

  // -- Post data (avatar emojis, fake usernames, timestamps) --
  const AVATARS = ['\uD83E\uDD21', '\uD83D\uDC7B', '\uD83D\uDC80', '\uD83E\uDD16', '\uD83D\uDC7E',
                   '\uD83E\uDDDF', '\uD83E\uDD7A', '\uD83D\uDE08', '\uD83E\uDD2F', '\uD83E\uDD73',
                   '\uD83D\uDE4A', '\uD83D\uDC38', '\uD83E\uDD8A', '\uD83D\uDC09', '\uD83C\uDF1A'];
  const HANDLES = ['@brainrot_king', '@meme_dealer', '@doomscroller99', '@touch_grass_never',
                   '@sigma_grindset', '@chronically_online', '@no_cap_fr', '@slay_queen42',
                   '@algorithm_pet', '@3am_warrior', '@skibidi_stan', '@main_character',
                   '@npc_behavior', '@delulu_is_solulu', '@unhinged_poster'];
  const TIMES = ['2m', '5m', '8m', '12m', '15m', '18m', '22m', '27m', '30m', '35m', '40m', '45m', '50m', '1h', '1h'];
  const POST_IMAGES = ['\uD83D\uDC80\uD83D\uDCA5', '\uD83E\uDD21\u2728', null, '\uD83D\uDE31\uD83D\uDD25',
                       null, '\uD83D\uDC51\uD83D\uDCAF', null, '\uD83E\uDDE0\uD83D\uDCA8',
                       null, '\uD83C\uDF1A\uD83D\uDE48', null, '\uD83E\uDD2F\uD83D\uDCA3',
                       null, '\uD83D\uDE80\uD83C\uDF0C', '\uD83C\uDFC6\u2620\uFE0F'];
  const FAKE_STATS = [
    { likes: '4.2K', comments: '892', shares: '1.1K' },
    { likes: '12K', comments: '2.3K', shares: '5.6K' },
    { likes: '891', comments: '234', shares: '67' },
    { likes: '23K', comments: '4.5K', shares: '8.9K' },
    { likes: '2.1K', comments: '445', shares: '312' },
    { likes: '67K', comments: '12K', shares: '34K' },
    { likes: '345', comments: '89', shares: '23' },
    { likes: '8.8K', comments: '1.7K', shares: '2.2K' },
    { likes: '1.5K', comments: '312', shares: '189' },
    { likes: '45K', comments: '9.1K', shares: '22K' },
    { likes: '678', comments: '145', shares: '56' },
    { likes: '15K', comments: '3.2K', shares: '7.8K' },
    { likes: '3.3K', comments: '567', shares: '234' },
    { likes: '89K', comments: '18K', shares: '45K' },
    { likes: '5.5K', comments: '1.1K', shares: '890' }
  ];

  // -- Build Feed --
  function buildFeed() {
    const area = document.getElementById('feedScrollArea');
    area.innerHTML = '';

    for (let i = 0; i < TOTAL_POSTS; i++) {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.dataset.idx = i;

      const stats = FAKE_STATS[i];
      const imageHtml = POST_IMAGES[i]
        ? `<div class="post-image">${POST_IMAGES[i]}</div>`
        : '';

      card.innerHTML = `
        <div class="post-header">
          <div class="post-avatar">${AVATARS[i]}</div>
          <div class="post-user-info">
            <div class="post-username">${t('posts.p' + (i + 1) + '.user')}</div>
            <div class="post-handle">${HANDLES[i]}</div>
          </div>
          <div class="post-time">${TIMES[i]}</div>
        </div>
        <div class="post-content">${t('posts.p' + (i + 1) + '.text')}</div>
        ${imageHtml}
        <div class="post-stats">
          <span>\u2764\uFE0F ${stats.likes}</span>
          <span>\uD83D\uDCAC ${stats.comments}</span>
          <span>\uD83D\uDD01 ${stats.shares}</span>
        </div>
        <div class="reaction-btns">
          <button class="reaction-btn react-like" data-post="${i}" data-react="like" aria-label="Like">
            <span>\uD83D\uDE02</span>
            <span class="reaction-label">${t('feed.like')}</span>
          </button>
          <button class="reaction-btn react-vibe" data-post="${i}" data-react="vibe" aria-label="Vibe">
            <span>\uD83D\uDC80</span>
            <span class="reaction-label">${t('feed.vibe')}</span>
          </button>
          <button class="reaction-btn react-skip" data-post="${i}" data-react="skip" aria-label="Skip">
            <span>\u23ED\uFE0F</span>
            <span class="reaction-label">${t('feed.skip')}</span>
          </button>
        </div>
      `;
      area.appendChild(card);
    }

    // Attach reaction listeners
    area.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', handleReaction);
    });
  }

  // -- Handle Reaction --
  function handleReaction(e) {
    const btn = e.currentTarget;
    const postIdx = parseInt(btn.dataset.post);
    const reactType = btn.dataset.react;

    // Already reacted to this post? Allow change
    reactions[postIdx] = reactType;
    postReactTimes[postIdx] = Date.now() - (postRevealTimes[postIdx] || feedStartTime);

    // Update UI
    const card = btn.closest('.post-card');
    card.classList.add('reacted');
    card.querySelectorAll('.reaction-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.react === reactType);
    });

    // Update progress
    const reacted = reactions.filter(r => r !== null).length;
    document.getElementById('feedCurrent').textContent = reacted;
    document.getElementById('feedProgressBar').style.width =
      ((reacted / TOTAL_POSTS) * 100) + '%';

    // Check if all posts reacted
    if (reacted === TOTAL_POSTS) {
      feedEndTime = Date.now();
      setTimeout(() => startScan(), 600);
    }

    // Check for warning triggers
    if (WARNING_POSTS.includes(reacted) && currentWarningIdx < WARNING_POSTS.length) {
      const wIdx = WARNING_POSTS.indexOf(reacted);
      if (wIdx >= currentWarningIdx) {
        currentWarningIdx = wIdx + 1;
        setTimeout(() => showWarning(wIdx), 400);
      }
    }
  }

  // -- Scroll Speed Tracking --
  let lastScrollY = 0;
  let lastScrollTime = Date.now();
  let speedIndicator = null;

  function initSpeedIndicator() {
    speedIndicator = document.createElement('div');
    speedIndicator.className = 'speed-indicator';
    speedIndicator.innerHTML = `
      <span class="speed-label">${t('feed.scrollSpeed')}</span>
      <span class="speed-value" id="speedValue">0</span>
      <div class="speed-bar-wrap"><div class="speed-bar" id="speedBar" style="width:0%"></div></div>
    `;
    document.body.appendChild(speedIndicator);
  }

  function trackScroll() {
    const now = Date.now();
    const dt = now - lastScrollTime;
    if (dt < 50) return; // throttle

    const dy = Math.abs(window.scrollY - lastScrollY);
    const speed = Math.round((dy / dt) * 1000); // px/sec

    scrollSpeeds.push(speed);
    lastScrollY = window.scrollY;
    lastScrollTime = now;

    // Update speed indicator
    if (speedIndicator) {
      const display = Math.min(speed, 9999);
      const pct = Math.min((speed / 3000) * 100, 100);
      const sv = document.getElementById('speedValue');
      const sb = document.getElementById('speedBar');
      if (sv) sv.textContent = display;
      if (sb) {
        sb.style.width = pct + '%';
        sb.className = 'speed-bar' + (pct > 70 ? ' turbo' : pct > 40 ? ' fast' : '');
      }
    }

    // Reveal posts on scroll (intersection-like)
    revealPosts();
  }

  function revealPosts() {
    const cards = document.querySelectorAll('.post-card:not(.visible)');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        card.classList.add('visible');
        const idx = parseInt(card.dataset.idx);
        if (!postRevealTimes[idx]) {
          postRevealTimes[idx] = Date.now();
          postsRevealed++;
        }
      }
    });
  }

  // -- Warning Popup --
  function showWarning(wIdx) {
    const overlay = document.getElementById('warningOverlay');
    const titleEl = document.getElementById('warningTitle');
    const subEl = document.getElementById('warningSub');

    titleEl.textContent = t('warning.title' + (wIdx + 1));
    subEl.textContent = t('warning.sub' + (wIdx + 1));

    overlay.style.display = 'flex';
  }

  document.getElementById('warningIgnore').addEventListener('click', () => {
    warningsIgnored++;
    document.getElementById('warningOverlay').style.display = 'none';
  });

  document.getElementById('warningStop').addEventListener('click', () => {
    warningsStopped++;
    document.getElementById('warningOverlay').style.display = 'none';
    // Stopping still counts — fill remaining as null and finish
    feedEndTime = Date.now();
    setTimeout(() => startScan(), 300);
  });

  // -- Start Button --
  document.getElementById('startBtn').addEventListener('click', () => {
    // Reset state
    reactions = new Array(TOTAL_POSTS).fill(null);
    scrollSpeeds = [];
    postRevealTimes = new Array(TOTAL_POSTS).fill(null);
    postReactTimes = new Array(TOTAL_POSTS).fill(null);
    warningsIgnored = 0;
    warningsStopped = 0;
    postsRevealed = 0;
    currentWarningIdx = 0;
    feedStartTime = Date.now();
    feedEndTime = 0;

    document.getElementById('intro-screen').style.display = 'none';
    const fs = document.getElementById('feed-screen');
    fs.style.display = 'block';
    fs.classList.add('fade-in');

    buildFeed();
    initSpeedIndicator();
    speedIndicator.classList.add('active');

    // Reveal first few posts
    setTimeout(revealPosts, 100);

    // Start scroll tracking
    window.addEventListener('scroll', trackScroll);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof gtag !== 'undefined') {
      gtag('event', 'feed_start', { event_category: 'brainrot_score' });
    }
  });

  // -- Brain Scan Animation --
  function startScan() {
    window.removeEventListener('scroll', trackScroll);
    document.getElementById('feed-screen').style.display = 'none';
    if (speedIndicator) speedIndicator.classList.remove('active');

    const scanScreen = document.getElementById('scan-screen');
    scanScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      scanScreen.classList.remove('active');
      showResult();
    }, 2500);
  }

  // -- Calculate Score --
  function calculateScore() {
    let score = 0;

    // 1. Reaction pattern (max 30 pts)
    const likeCount = reactions.filter(r => r === 'like').length;
    const vibeCount = reactions.filter(r => r === 'vibe').length;
    const skipCount = reactions.filter(r => r === 'skip').length;
    const nullCount = reactions.filter(r => r === null).length;

    // Skips indicate mindless scrolling
    score += Math.min(skipCount * 2, 15);
    // Vibes (skull) = deep brainrot engagement
    score += Math.min(vibeCount * 1.5, 10);
    // Null (didn't react) = just scrolled past
    score += Math.min(nullCount * 2, 10);
    // Some likes are fine, too many = addicted
    if (likeCount > 10) score += 5;

    // 2. Scroll speed (max 25 pts)
    const avgSpeed = scrollSpeeds.length > 0
      ? scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length
      : 0;
    if (avgSpeed > 2000) score += 25;
    else if (avgSpeed > 1000) score += 20;
    else if (avgSpeed > 500) score += 15;
    else if (avgSpeed > 200) score += 10;
    else score += 5;

    // 3. Time spent (max 20 pts) — faster = more brainrotted
    const totalTime = ((feedEndTime || Date.now()) - feedStartTime) / 1000;
    if (totalTime < 30) score += 20; // blazed through
    else if (totalTime < 60) score += 15;
    else if (totalTime < 120) score += 10;
    else score += 5;

    // 4. Warnings ignored (max 15 pts)
    score += warningsIgnored * 8;
    // Stopped = slightly less brainrot
    if (warningsStopped > 0) score -= 5;

    // 5. React speed — fast reactions = doom scroll behavior (max 10 pts)
    const validReactTimes = postReactTimes.filter(t => t !== null && t > 0);
    const avgReactTime = validReactTimes.length > 0
      ? validReactTimes.reduce((a, b) => a + b, 0) / validReactTimes.length
      : 5000;
    if (avgReactTime < 1500) score += 10;
    else if (avgReactTime < 3000) score += 7;
    else if (avgReactTime < 5000) score += 4;
    else score += 1;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // -- Get Tier --
  function getTier(pct) {
    for (const tier of TIERS) {
      if (pct >= tier.min && pct <= tier.max) return tier;
    }
    return TIERS[TIERS.length - 1];
  }

  // -- Animate Counter --
  function animateCounter(element, target, duration) {
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // -- Show Result --
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
    const circumference = 2 * Math.PI * 88;
    const offset = circumference - (pct / 100) * circumference;
    meterFill.style.stroke = color;
    setTimeout(() => { meterFill.style.strokeDashoffset = offset; }, 100);

    // Animate number counter
    const meterNumber = document.getElementById('meterNumber');
    animateCounter(meterNumber, pct, 2000);

    if (pct > 60) meterNumber.classList.add('glitch-text');
    else meterNumber.classList.remove('glitch-text');

    // Tier description
    document.getElementById('tierDesc').innerHTML =
      '<strong>' + t('tiers.' + tier.id + '.name') + '</strong><br><br>' +
      t('tiers.' + tier.id + '.desc');

    // Stats grid
    const statsGrid = document.getElementById('statsGrid');
    const likeCount = reactions.filter(r => r === 'like').length;
    const vibeCount = reactions.filter(r => r === 'vibe').length;
    const skipCount = reactions.filter(r => r === 'skip').length;
    const totalTimeSec = Math.round(((feedEndTime || Date.now()) - feedStartTime) / 1000);
    const avgSpeed = scrollSpeeds.length > 0
      ? Math.round(scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length)
      : 0;

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-emoji">\uD83D\uDE02</div>
        <div class="stat-value">${likeCount}</div>
        <div class="stat-label">${t('stats.likes')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">\uD83D\uDC80</div>
        <div class="stat-value">${vibeCount}</div>
        <div class="stat-label">${t('stats.vibes')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">\u23ED\uFE0F</div>
        <div class="stat-value">${skipCount}</div>
        <div class="stat-label">${t('stats.skips')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">\u23F1\uFE0F</div>
        <div class="stat-value">${totalTimeSec}s</div>
        <div class="stat-label">${t('stats.totalTime')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">\u26A1</div>
        <div class="stat-value">${avgSpeed}</div>
        <div class="stat-label">${t('stats.avgSpeed')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">\uD83D\uDEA8</div>
        <div class="stat-value">${warningsIgnored}</div>
        <div class="stat-label">${t('stats.warningsIgnored')}</div>
      </div>
    `;

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

    // Percentile stat
    const percentileEl = document.getElementById('percentile-stat');
    if (percentileEl) {
      const percentile = pct <= 20 ? 95 : pct <= 40 ? 78 : pct <= 60 ? 55 : pct <= 80 ? 28 : 8;
      const statText = t('result.percentileStat')
        .replace('{percentile}', percentile);
      percentileEl.innerHTML = statText;
    }

    // Show result screen
    const rs = document.getElementById('result-screen');
    rs.classList.add('active');
    rs.classList.add('fade-in');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof gtag !== 'undefined') {
      gtag('event', 'feed_complete', {
        event_category: 'brainrot_score',
        score: pct,
        tier: tier.id,
        warnings_ignored: warningsIgnored
      });
    }
  }

  // -- Share Functions --
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

  // -- Retake --
  document.getElementById('retakeBtn').addEventListener('click', () => {
    document.getElementById('result-screen').classList.remove('active', 'fade-in');
    document.getElementById('feed-screen').style.display = 'none';
    document.getElementById('scan-screen').classList.remove('active');
    document.getElementById('intro-screen').style.display = 'block';

    // Reset meter
    document.getElementById('meterFill').style.strokeDashoffset = '553';
    document.getElementById('meterNumber').textContent = '0';
    document.getElementById('meterNumber').classList.remove('glitch-text');

    // Remove speed indicator
    if (speedIndicator) {
      speedIndicator.remove();
      speedIndicator = null;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // -- App Loader --
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
      }
    }, 600);
  });
})();
