/**
 * Lumpini Condotown Rattanathibet - Web Application Logic
 * Mobile-First Interactive Gallery, Smooth Slider & Lightbox
 */

// 1. Force window to always start at top on page refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  initHeaderScroll();
  initStickyContactBar();
  initHeroIntroAlignment();
  initHeroSlider();
  initGallery();
  initGalleryScrollControls();
  initLightbox();
  initVlogPlayer();
  initDropboxMotion();
  initLiquidGlassRefraction();
  initGalleryAutoScroll();
});

/* ==========================================================================
   Hero Intro Text Alignment:
   - Left edge equals "ห้อง 1 Bedroom (Celida)"
   - Right edge does not exceed "Scandinavian Warm Minimal • Renovated 100%"
   ========================================================================== */
function initHeroIntroAlignment() {
  const titleEl = document.querySelector('.hero-title');
  const descEl = document.querySelector('.hero-desc');
  const roomTitle = document.getElementById('heroDetailTitle');
  const subText = document.querySelector('.hero-subtitle-text') || document.querySelector('.hero-subtitle-tag');
  const column = document.querySelector('.hero-floating-column');

  if (!titleEl || !descEl || !roomTitle || !column) return;

  const updateAlignment = () => {
    if (window.innerWidth > 900) {
      const columnRect = column.getBoundingClientRect();
      const roomTitleRect = roomTitle.getBoundingClientRect();

      // 1. Left edge: Exactly matches 'ห้อง 1 Bedroom (Celida)'
      const targetLeftOffset = Math.max(0, Math.round(roomTitleRect.left - columnRect.left));
      titleEl.style.paddingLeft = `${targetLeftOffset}px`;
      descEl.style.paddingLeft = `${targetLeftOffset}px`;

      // 2. Right edge: Must NOT exceed 'Scandinavian Warm Minimal • Renovated 100%'
      if (subText) {
        const subTextRect = subText.getBoundingClientRect();
        const maxAllowedContentWidth = Math.max(240, Math.round(subTextRect.right - roomTitleRect.left));
        titleEl.style.maxWidth = `${maxAllowedContentWidth + targetLeftOffset}px`;
        descEl.style.maxWidth = `${maxAllowedContentWidth + targetLeftOffset}px`;
      }
    } else {
      titleEl.style.paddingLeft = '';
      descEl.style.paddingLeft = '';
      titleEl.style.maxWidth = '';
      descEl.style.maxWidth = '';
    }
  };

  updateAlignment();
  window.addEventListener('resize', updateAlignment, { passive: true });
}


/* ==========================================================================
   Dynamic Transparent / Liquid Glass Navbar Scroll
   ========================================================================== */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  const slider = document.querySelector('.hero-slider-container');
  if (!header) return;

  const updateHeader = () => {
    // When the bottom of the slideshow reaches near the header, transition to liquid glass bar
    const sliderBottom = slider ? slider.getBoundingClientRect().bottom : 300;
    const headerHeight = header.offsetHeight || 60;

    if (sliderBottom <= headerHeight + 10) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }
  };

  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
  updateHeader();
}

/* ==========================================================================
   Sticky Bottom Contact Dock (Show immediately unless obstructing slideshow)
   ========================================================================== */
function checkStickyBarVisibility() {
  const stickyBar = document.querySelector('.sticky-contact-bar');
  if (!stickyBar) return;

  // If user scrolled down past the hero section, always show
  if (window.scrollY > 200) {
    stickyBar.classList.add('is-visible');
    return;
  }

  // When near the top, check whether floating bar overlaps with active slideshow photo
  const activeImg = document.querySelector('.hero-slide.is-active .hero-slide-fg-img') || document.querySelector('.hero-slide-fg-img');
  if (activeImg) {
    const barRect = stickyBar.getBoundingClientRect();
    const imgRect = activeImg.getBoundingClientRect();

    // Check geometric bounding-box overlap between floating bar and active photo
    const horizontalOverlap = !(barRect.right < imgRect.left || barRect.left > imgRect.right);
    const verticalOverlap = !(barRect.bottom < imgRect.top || barRect.top > imgRect.bottom);

    if (horizontalOverlap && verticalOverlap) {
      stickyBar.classList.remove('is-visible');
      return;
    }
  }

  // No obstruction detected with slideshow -> show immediately!
  stickyBar.classList.add('is-visible');
}

function initStickyContactBar() {
  window.addEventListener('scroll', checkStickyBarVisibility, { passive: true });
  window.addEventListener('resize', checkStickyBarVisibility, { passive: true });
  checkStickyBarVisibility();
  requestAnimationFrame(checkStickyBarVisibility);
  setTimeout(checkStickyBarVisibility, 300);
}

/* ==========================================================================
   Hero Highlights Slideshow (Pure Soft Focus Transition & Ambient Fade)
   ========================================================================== */
let currentHeroSlide = 0; // Real slide index: 0..9
let currentHeroTrackIndex = 10; // Track index in 3-set architecture (0..29; Set 2 is 10..19)
let heroSlideTimer = null;
let slideMotionTimeout = null;
let slideSettleTimeout = null;
let ambientCrossfadeTimeout = null;
let ambientDebounceTimer = null;
let currentAmbientTarget = 'A';
let currentAmbientSrc = '';
let lastUserSlideTime = 0;
let lastMoveTime = 0;
const heroSlides = ROOMS_DATA.heroHighlights;

function scrollToHeroDetails() {
  const target = document.getElementById('featureBanner') || document.querySelector('.feature-banner') || document.querySelector('.hero-banner-container');
  if (!target) return;
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.offsetHeight : 62;
  const targetRect = target.getBoundingClientRect();
  const targetTop = targetRect.top + window.pageYOffset - headerHeight - 16;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth'
  });
}

function initHeroSlider() {
  const track = document.getElementById('heroTrack');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');
  const sliderContainer = document.querySelector('.hero-slider-container');
  const ambientA = document.getElementById('heroAmbientA');
  const ambientB = document.getElementById('heroAmbientB');

  if (!track || !heroSlides || heroSlides.length === 0) return;

  // Preload all slideshow images for instant, flicker-free rendering
  heroSlides.forEach(s => {
    const preImg = new Image();
    preImg.src = s.src;
  });

  // Initialize Stationary Ambient Blur Backdrop (Layer A active on top)
  if (ambientA) {
    ambientA.style.backgroundImage = `url("${heroSlides[0].src}")`;
    ambientA.style.opacity = '1';
    ambientA.style.zIndex = '2';
    ambientA.style.transition = 'none';
    currentAmbientSrc = heroSlides[0].src;
  }
  if (ambientB) {
    ambientB.style.opacity = '0';
    ambientB.style.zIndex = '1';
    ambientB.style.transition = 'none';
  }
  currentAmbientTarget = 'A';

  // 3-Set Infinite Track Architecture (30 slides: Set 1 [0..9], Set 2 [10..19], Set 3 [20..29])
  // Allows unlimited rapid clicking/swiping in either direction with zero stutter or edge clipping!
  track.innerHTML = '';
  const totalReal = heroSlides.length; // 10

  const slideItems = [];
  for (let set = 0; set < 3; set++) {
    heroSlides.forEach((s, idx) => {
      slideItems.push({
        slide: s,
        realIndex: idx,
        trackIdx: set * totalReal + idx
      });
    });
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  let hasSwiped = false;

  slideItems.forEach((item) => {
    const slide = item.slide;
    const trackIdx = item.trackIdx;
    const slideEl = document.createElement('div');
    slideEl.className = trackIdx === totalReal ? 'hero-slide is-active' : 'hero-slide';
    slideEl.setAttribute('role', 'button');
    slideEl.setAttribute('tabindex', '0');
    slideEl.setAttribute('data-track-idx', trackIdx);
    slideEl.setAttribute('data-real-idx', item.realIndex);
    slideEl.setAttribute('aria-label', `ภาพห้อง ${slide.unitNameTh} - แตะเพื่อดูรายละเอียดด้านล่าง`);
    slideEl.innerHTML = `
      <div class="hero-slide-fg-wrap">
        <img class="hero-slide-fg-img" src="${slide.src}" alt="${slide.captionTh}" loading="${(trackIdx >= totalReal && trackIdx <= totalReal + 2) ? 'eager' : 'lazy'}">
      </div>
    `;
    // Clicking/tapping photo scrolls down to feature details banner
    slideEl.addEventListener('click', () => {
      if (hasSwiped) return;
      scrollToHeroDetails();
    });
    slideEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToHeroDetails();
      }
    });
    track.appendChild(slideEl);
  });

  // Start at track index 10 (Real Slide 1 of Set 2)
  currentHeroTrackIndex = totalReal;
  currentHeroSlide = 0;
  track.style.transition = 'none';
  track.style.transform = `translateX(-${totalReal * 100}%)`;
  void track.offsetWidth;
  track.style.transition = '';

  // Ensure non-adjacent slides are hidden initially when settled
  const initialSlides = track.querySelectorAll('.hero-slide');
  initialSlides.forEach((s, idx) => {
    if (Math.abs(idx - totalReal) > 1) {
      s.style.visibility = 'hidden';
    } else {
      s.style.visibility = 'visible';
    }
  });

  // Initial update of room details bar below photo
  updateHeroDetails();

  // Buttons: Manual click resets timer from 0 & allows rapid clicks
  if (prevBtn) prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prevSlide(true);
  });
  if (nextBtn) nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nextSlide(true);
  });

  // Auto slide
  startSlideShow();

  if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', stopSlideShow);
    sliderContainer.addEventListener('mouseleave', startSlideShow);

    // Mobile Touch Swipe Handling (Supports rapid swiping without stutter)
    sliderContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      hasSwiped = false;
      isSwiping = true;
      stopSlideShow();
    }, { passive: true });

    sliderContainer.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      if (Math.abs(currentX - touchStartX) > 10 || Math.abs(currentY - touchStartY) > 10) {
        hasSwiped = true;
      }
    }, { passive: true });

    sliderContainer.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;

      // Only trigger if horizontal swipe is dominant and > 30px
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
        hasSwiped = true;
        if (diffX > 0) {
          nextSlide(true);
        } else {
          prevSlide(true);
        }
      } else {
        startSlideShow();
      }
      setTimeout(() => { hasSwiped = false; }, 250);
    }, { passive: true });
  }
}

function updateHeroAmbientBackdrop(slide, isRapid = false) {
  const ambientA = document.getElementById('heroAmbientA');
  const ambientB = document.getElementById('heroAmbientB');
  if (!ambientA || !ambientB || !slide) return;

  clearTimeout(ambientDebounceTimer);

  if (isRapid) {
    // Coalesce rapid clicks so decoders don't choke; crossfade smoothly to latest slide
    ambientDebounceTimer = setTimeout(() => {
      executeAmbientCrossfade(slide, true);
    }, 180);
  } else {
    executeAmbientCrossfade(slide, false);
  }
}

function executeAmbientCrossfade(slide, isRapid) {
  const ambientA = document.getElementById('heroAmbientA');
  const ambientB = document.getElementById('heroAmbientB');
  if (!ambientA || !ambientB || !slide) return;
  if (currentAmbientSrc === slide.src) return;

  clearTimeout(ambientCrossfadeTimeout);
  currentAmbientSrc = slide.src;

  const topLayer = (currentAmbientTarget === 'A') ? ambientB : ambientA;
  const bottomLayer = (currentAmbientTarget === 'A') ? ambientA : ambientB;

  const fadeDuration = isRapid ? '1.2s' : '3.8s';

  // 1. Prepare incoming topLayer while 100% invisible (no transition, opacity 0)
  topLayer.style.transition = 'none';
  topLayer.style.opacity = '0';
  topLayer.style.zIndex = '3';
  topLayer.style.backgroundImage = `url("${slide.src}")`;

  // Ensure bottomLayer stays rock-solid 100% opaque underneath (zero flicker)
  bottomLayer.style.transition = 'none';
  bottomLayer.style.opacity = '1';
  bottomLayer.style.zIndex = '2';

  // 2. Force reflow so browser commits the image and opacity 0
  void topLayer.offsetWidth;

  // 3. Smoothly fade in topLayer
  topLayer.style.transition = `opacity ${fadeDuration} cubic-bezier(0.25, 1, 0.35, 1)`;
  topLayer.style.opacity = '1';

  currentAmbientTarget = (currentAmbientTarget === 'A') ? 'B' : 'A';

  // 4. Once topLayer has fully faded in, silently sync bottomLayer underneath
  ambientCrossfadeTimeout = setTimeout(() => {
    bottomLayer.style.backgroundImage = `url("${slide.src}")`;
    bottomLayer.style.opacity = '1';
    bottomLayer.style.zIndex = '2';
    topLayer.style.transition = 'none';
  }, isRapid ? 1300 : 4000);
}

function moveToTrackIndex(newTrackIndex, isRapid = false) {
  const track = document.getElementById('heroTrack');
  if (!track) return;

  const now = Date.now();
  if (now - lastMoveTime < 90) return; // Ignore hardware micro-jitter (<90ms)
  lastMoveTime = now;

  const totalReal = heroSlides.length; // 10

  // Safety wrap if user has navigated past Set 3 or before Set 1 without settling
  if (newTrackIndex >= totalReal * 2 + 5 || newTrackIndex < 5) {
    const safeIndex = ((newTrackIndex % totalReal) + totalReal) % totalReal + totalReal;
    currentHeroTrackIndex = safeIndex;
    track.style.transition = 'none';
    track.style.transform = `translateX(-${safeIndex * 100}%)`;
    void track.offsetWidth;
  } else {
    currentHeroTrackIndex = newTrackIndex;
  }

  // Calculate realIndex: 0..9
  const realIndex = ((currentHeroTrackIndex % totalReal) + totalReal) % totalReal;
  currentHeroSlide = realIndex;

  const slides = track.querySelectorAll('.hero-slide');

  // 1. Ensure neighboring slides are visible while gliding
  slides.forEach((s, idx) => {
    if (Math.abs(idx - currentHeroTrackIndex) <= 2) {
      s.style.visibility = 'visible';
    }
  });

  // 2. Set is-active class for target slide
  slides.forEach((s, idx) => {
    if (idx === currentHeroTrackIndex) {
      s.classList.add('is-active');
    } else {
      s.classList.remove('is-active');
    }
  });

  // 3. Sync blur during sliding: Both slide-in and slide-out have identical blur(5px)
  track.classList.add('is-sliding');

  // 4. Slide track smoothly (snappy 0.42s for rapid clicks, luxurious 1.15s for normal)
  const slideDuration = isRapid ? '0.42s' : '1.15s';
  const slideEase = isRapid ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.25, 1, 0.35, 1)';
  track.style.transition = `transform ${slideDuration} ${slideEase}`;
  track.style.transform = `translateX(-${currentHeroTrackIndex * 100}%)`;

  // 5. Halfway through slide, remove .is-sliding so incoming slide rack-focuses to blur(0px)
  clearTimeout(slideMotionTimeout);
  const blurHold = isRapid ? 200 : 650;
  slideMotionTimeout = setTimeout(() => {
    track.classList.remove('is-sliding');
  }, blurHold);

  // 6. Update Ambient Backdrop & Room Details immediately
  updateHeroAmbientBackdrop(heroSlides[realIndex], isRapid);
  updateHeroDetails();
  checkStickyBarVisibility();

  // 7. Settle & Silent Normalize to Set 2 (indices 10..19)
  clearTimeout(slideSettleTimeout);
  const settleWait = isRapid ? 460 : 1200;
  slideSettleTimeout = setTimeout(() => {
    const normalizedIndex = ((currentHeroTrackIndex % totalReal) + totalReal) % totalReal + totalReal;
    if (normalizedIndex !== currentHeroTrackIndex) {
      currentHeroTrackIndex = normalizedIndex;
      track.style.transition = 'none';
      track.style.transform = `translateX(-${normalizedIndex * 100}%)`;
      void track.offsetWidth;
      track.style.transition = '';

      slides.forEach((s, idx) => {
        if (idx === currentHeroTrackIndex) s.classList.add('is-active');
        else s.classList.remove('is-active');
      });
    }

    // Hide distant slides to keep GPU optimized
    slides.forEach((s, idx) => {
      if (idx !== currentHeroTrackIndex) {
        s.style.visibility = 'hidden';
      } else {
        s.style.visibility = 'visible';
      }
    });
  }, settleWait);
}

function updateHeroDetails() {
  const slide = heroSlides[currentHeroSlide];
  if (!slide) return;

  const badgeEl = document.getElementById('heroDetailBadge');
  const priceEl = document.getElementById('heroDetailPrice');
  const statusEl = document.getElementById('heroDetailStatus');
  const titleEl = document.getElementById('heroDetailTitle');
  const captionEl = document.getElementById('heroDetailCaption');
  const btnEl = document.getElementById('heroDetailBtn');
  const counterEl = document.getElementById('heroSlideCounter');

  if (badgeEl) badgeEl.textContent = slide.badge;
  if (priceEl) priceEl.textContent = `฿${slide.price} / เดือน`;
  if (statusEl) {
    if (slide.unitId === 'pojana') {
      statusEl.className = 'hero-occupied-badge available';
      statusEl.textContent = '🟢 พร้อมเข้าอยู่';
    } else {
      statusEl.className = 'hero-occupied-badge';
      statusEl.textContent = '🔴 มีผู้เช่าแล้ว';
    }
  }
  if (titleEl) titleEl.textContent = slide.unitNameTh;
  if (captionEl) {
    let captionText = slide.captionTh || '';
    // Strip redundant unit name prefix if present (e.g. "ห้อง 1 Bedroom (Celida) - ")
    captionText = captionText.replace(/^.*?-\s*/, '');
    captionEl.textContent = captionText;
  }
  if (counterEl) counterEl.textContent = `${currentHeroSlide + 1} / ${heroSlides.length}`;
  if (btnEl) {
    btnEl.onclick = (e) => {
      e.stopPropagation();
      filterByUnit(slide.unitId, true);
    };
  }
}

function resetSlideShowTimer() {
  stopSlideShow();
  startSlideShow();
}

function nextSlide(isUser = false) {
  if (isUser) resetSlideShowTimer();

  const now = Date.now();
  const isRapid = (now - lastUserSlideTime) < 600;
  lastUserSlideTime = now;

  moveToTrackIndex(currentHeroTrackIndex + 1, isRapid);
}

function prevSlide(isUser = false) {
  if (isUser) resetSlideShowTimer();

  const now = Date.now();
  const isRapid = (now - lastUserSlideTime) < 600;
  lastUserSlideTime = now;

  moveToTrackIndex(currentHeroTrackIndex - 1, isRapid);
}

function goToSlide(targetRealIndex, isUser = false) {
  if (isUser) resetSlideShowTimer();
  const totalReal = heroSlides.length;
  moveToTrackIndex(targetRealIndex + totalReal, false);
}

function startSlideShow() {
  stopSlideShow();
  heroSlideTimer = setInterval(() => {
    nextSlide(false);
  }, 6500);
}

function stopSlideShow() {
  if (heroSlideTimer) {
    clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }
}


/* ==========================================================================
   Room Filter & Gallery Logic
   ========================================================================== */
let activeFilter = 'all';
let currentFilteredPhotos = [];

function initGallery() {
  // Collect all photos
  const allPhotos = [];
  ROOMS_DATA.units.forEach(unit => {
    unit.photos.forEach(photo => {
      allPhotos.push(photo);
    });
  });

  // Setup filter buttons
  const filterContainer = document.getElementById('filterContainer');
  if (!filterContainer) return;

  const totalPhotosCount = allPhotos.length;
  const count1Bed = ROOMS_DATA.units.filter(u => u.type === '1bed').reduce((acc, u) => acc + u.photos.length, 0);
  const countStudio = ROOMS_DATA.units.filter(u => u.type === 'studio').reduce((acc, u) => acc + u.photos.length, 0);

  let filterHtml = `
    <div class="filter-row filter-row-categories">
      <button class="filter-btn filter-btn-category active" data-filter="all">
        <span>ทุกห้อง</span>
        <span class="count-badge">${totalPhotosCount}</span>
      </button>
      <button class="filter-btn filter-btn-category" data-filter="type:1bed">
        <span>1 Bedroom (7,500.-)</span>
        <span class="count-badge">${count1Bed}</span>
      </button>
      <button class="filter-btn filter-btn-category" data-filter="type:studio">
        <span>Studio (6,500.-)</span>
        <span class="count-badge">${countStudio}</span>
      </button>
    </div>
    <div class="filter-row filter-row-units">
  `;

  ROOMS_DATA.units.forEach(unit => {
    const isPojana = unit.id === 'pojana';
    const btnClass = isPojana ? 'filter-btn filter-btn-unit filter-btn-pojana active' : 'filter-btn filter-btn-unit';
    const prefixIcon = isPojana ? '🟢 ' : '';
    filterHtml += `
      <button class="${btnClass}" data-filter="unit:${unit.id}">
        <span>${prefixIcon}${unit.nameTh.replace('ห้อง ', '')}</span>
        <span class="count-badge">${unit.photos.length}</span>
      </button>
    `;
  });

  filterHtml += `</div>`;

  filterContainer.innerHTML = filterHtml;

  // Remove active class from 'all' button since Pojana is default active
  const allCategoryBtn = filterContainer.querySelector('.filter-btn-category[data-filter="all"]');
  if (allCategoryBtn) {
    allCategoryBtn.classList.remove('active');
  }

  // Add click listeners to filter buttons
  const buttons = filterContainer.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      applyFilter(filter);
    });
  });

  // Initial render: Default to Room Pojana
  applyFilter('unit:pojana');
}

function filterByUnit(unitId, scroll = true) {
  const filterContainer = document.getElementById('filterContainer');
  const targetBtn = filterContainer ? filterContainer.querySelector(`[data-filter="unit:${unitId}"]`) : null;
  
  if (targetBtn) {
    const buttons = filterContainer.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    targetBtn.classList.add('active');
    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  applyFilter(`unit:${unitId}`);

  if (scroll) {
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function filterByType(type, scroll = true) {
  const filterContainer = document.getElementById('filterContainer');
  const targetBtn = filterContainer ? filterContainer.querySelector(`[data-filter="type:${type}"]`) : null;
  
  if (targetBtn) {
    const buttons = filterContainer.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    targetBtn.classList.add('active');
    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  applyFilter(`type:${type}`);

  if (scroll) {
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function applyFilter(filter) {
  activeFilter = filter;
  const grid = document.getElementById('galleryGrid');
  const summaryBox = document.getElementById('activeUnitSummary');
  if (!grid) return;

  let photos = [];
  let selectedUnit = null;

  if (filter === 'all') {
    ROOMS_DATA.units.forEach(u => photos.push(...u.photos));
  } else if (filter.startsWith('type:')) {
    const type = filter.replace('type:', '');
    ROOMS_DATA.units.filter(u => u.type === type).forEach(u => photos.push(...u.photos));
  } else if (filter.startsWith('unit:')) {
    const unitId = filter.replace('unit:', '');
    selectedUnit = ROOMS_DATA.units.find(u => u.id === unitId);
    if (selectedUnit) {
      photos = [...selectedUnit.photos];
    }
  }

  currentFilteredPhotos = photos;

  // Show / update active unit summary box
  if (selectedUnit && summaryBox) {
    summaryBox.classList.add('show');
    const prefilledLineUrl = `https://line.me/ti/p/~sangtian5243?text=${encodeURIComponent("สนใจเช่าห้อง ห้องยังว่างอยู่ไหมครับ/ค่ะ")}`;
    summaryBox.innerHTML = `
      <div class="unit-detail-header">
        <div>
          <h3 class="unit-detail-title">
            ${selectedUnit.nameTh}${selectedUnit.floorTh ? ` <span class="unit-detail-floor">${selectedUnit.floorTh}</span>` : ''}
            <span class="unit-detail-occupied-bubble ${selectedUnit.isAvailable ? 'available' : ''}">${selectedUnit.isAvailable ? '🟢 พร้อมเข้าอยู่ 1 ห้อง' : '🔴 มีผู้เช่าแล้ว'}</span>
          </h3>
          <p style="font-size: 0.8rem; color: var(--color-wood-dark); font-weight: 600;">${selectedUnit.typeLabelTh} • ขนาด ${selectedUnit.size}</p>
        </div>
        <div class="unit-detail-price">฿${selectedUnit.priceLabel} <span style="font-size: 0.8rem; color: var(--color-slate); font-weight: normal;">/ เดือน</span></div>
      </div>
      <p class="unit-detail-desc">${selectedUnit.descriptionTh}</p>
      <div class="unit-detail-tags">
        <span class="detail-tag">✨ รีโนเวทใหม่ 100%</span>
        <span class="detail-tag">🔒 Digital Door Lock</span>
        <span class="detail-tag">📺 Smart TV</span>
        <span class="detail-tag">🧺 เครื่องซักผ้าในห้อง</span>
        <span class="detail-tag">❄️ แอร์ + ตู้เย็น Inverter</span>
      </div>
      <div class="unit-detail-actions-row">
        <a href="${prefilledLineUrl}" target="_blank" rel="noopener" class="unit-line-btn">
          💬 ทัก LINE สอบถามสถานะห้องนี้
        </a>
        <span class="detail-tag tag-owner">🛡️ เจ้าของดูแลโดยตรง</span>
      </div>
    `;
  } else if (summaryBox) {
    summaryBox.classList.remove('show');
    summaryBox.innerHTML = '';
  }

  // Render gallery photos with GPU Hardware Marquee
  grid.innerHTML = '';
  grid.style.transform = 'translate3d(0, 0, 0)';
  galleryCurrentX = 0;

  const originalCount = photos.length;
  // If 'all' tab (64 photos), duplicate for infinite loop; otherwise single set
  const renderPhotos = (filter === 'all' && photos.length > 0) ? [...photos, ...photos] : [...photos];

  renderPhotos.forEach((photo, idx) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      <img src="${photo.thumb}" alt="${photo.unitName}" loading="lazy">
      <div class="gallery-item-overlay">
        <div class="item-info">
          <span class="item-room-tag">${photo.unitName}</span>
          <div style="font-size: 0.75rem; opacity: 0.9;">฿${photo.price} / ด.</div>
        </div>
      </div>
    `;
    const targetIdx = idx % originalCount;
    item.addEventListener('click', (e) => {
      if (galleryHasMoved) {
        e.stopPropagation();
        return;
      }
      openLightbox(targetIdx);
    });
    grid.appendChild(item);
  });

  // Update gallery auto-scroll state based on active filter
  if (typeof updateGalleryAutoScrollState === 'function') {
    updateGalleryAutoScrollState(filter === 'all');
  }
}

/* Horizontal Gallery Scroll Controls & Desktop Drag (Coordinated by Unified Engine) */
function initGalleryScrollControls() {
  // Handled by initGalleryMotion()
}



/* ==========================================================================
   Interactive Lightbox Modal (with Pinch-to-Zoom, Pan & Double-Tap)
   ========================================================================== */
let currentLightboxIndex = 0;

// Lightbox Zoom & Pan State
let currentScale = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
let translateX = 0;
let translateY = 0;

// Gesture & Drag Tracking
let isDragging = false;
let startPanX = 0;
let startPanY = 0;
let initialTranslateX = 0;
let initialTranslateY = 0;

// Multi-touch Pinch Tracking
let initialPinchDistance = null;
let initialScaleOnPinch = 1;
let lastTapTime = 0;
let hudTimeout = null;

// Touch Swipe Tracking (at 1x)
let touchStartX = 0;
let touchStartY = 0;
let isTouchSwiping = false;

function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const stage = document.getElementById('lightboxStage');
  const imageWrap = document.getElementById('lightboxImageWrap');

  // Zoom toolbar buttons
  const zoomInBtn = document.getElementById('lightboxZoomIn');
  const zoomOutBtn = document.getElementById('lightboxZoomOut');
  const zoomResetBtn = document.getElementById('lightboxZoomReset');

  if (!modal || !stage || !imageWrap) return;

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', prevLightboxPhoto);
  if (nextBtn) nextBtn.addEventListener('click', nextLightboxPhoto);

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      setLightboxZoom(Math.min(MAX_SCALE, currentScale + 0.5), true);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      setLightboxZoom(Math.max(MIN_SCALE, currentScale - 0.5), true);
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      resetLightboxZoom(true);
    });
  }

  // Keyboard navigation & zoom shortcuts
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevLightboxPhoto();
    if (e.key === 'ArrowRight') nextLightboxPhoto();
    if (e.key === '+' || e.key === '=') {
      setLightboxZoom(Math.min(MAX_SCALE, currentScale + 0.5), true);
    }
    if (e.key === '-' || e.key === '_') {
      setLightboxZoom(Math.max(MIN_SCALE, currentScale - 0.5), true);
    }
    if (e.key === '0') {
      resetLightboxZoom(true);
    }
  });

  // Touch handlers: Pinch-to-Zoom, 1-finger Pan, Double-tap, and 1x Swipe
  stage.addEventListener('touchstart', (e) => {
    if (!modal.classList.contains('active')) return;

    if (e.touches.length === 2) {
      // Pinch started
      initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
      initialScaleOnPinch = currentScale;
      initialTranslateX = translateX;
      initialTranslateY = translateY;
      isTouchSwiping = false;
      imageWrap.style.transition = 'none';
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      startPanX = touch.clientX;
      startPanY = touch.clientY;
      initialTranslateX = translateX;
      initialTranslateY = translateY;

      if (currentScale > 1.05) {
        // Active Pan mode
        isDragging = true;
        imageWrap.style.transition = 'none';
        modal.classList.add('is-dragging');
      } else {
        // Normal swipe candidate
        isTouchSwiping = true;
      }
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (!modal.classList.contains('active')) return;

    if (e.touches.length === 2 && initialPinchDistance) {
      e.preventDefault(); // Prevent native browser viewport scaling
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = currentDist / initialPinchDistance;
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScaleOnPinch * ratio));

      currentScale = targetScale;
      clampLightboxTranslations();
      applyLightboxTransform(false);
      showLightboxScaleHud(currentScale);
    } else if (e.touches.length === 1 && currentScale > 1.05 && isDragging) {
      e.preventDefault(); // Prevent page pull/scroll while panning
      const touch = e.touches[0];
      translateX = initialTranslateX + (touch.clientX - startPanX);
      translateY = initialTranslateY + (touch.clientY - startPanY);
      clampLightboxTranslations();
      applyLightboxTransform(false);
    }
  }, { passive: false });

  stage.addEventListener('touchend', (e) => {
    if (!modal.classList.contains('active')) return;

    if (e.touches.length < 2) {
      initialPinchDistance = null;
    }

    if (e.touches.length === 0) {
      isDragging = false;
      modal.classList.remove('is-dragging');

      // Handle swipe navigation when at 1x
      const changedTouch = e.changedTouches[0];
      if (currentScale <= 1.05 && isTouchSwiping && changedTouch) {
        const diffX = touchStartX - changedTouch.clientX;
        const diffY = touchStartY - changedTouch.clientY;
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0) {
            nextLightboxPhoto();
          } else {
            prevLightboxPhoto();
          }
        }
      }

      // Smooth clamp spring-back if scale is near 1
      if (currentScale < 1.05) {
        resetLightboxZoom(true);
      } else {
        clampLightboxTranslations();
        applyLightboxTransform(true);
      }
      isTouchSwiping = false;
    }
  }, { passive: true });

  // Desktop Mouse Wheel Zoom
  stage.addEventListener('wheel', (e) => {
    if (!modal.classList.contains('active')) return;
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.35 : -0.35;
    const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale + zoomDelta));
    setLightboxZoom(targetScale, true);
  }, { passive: false });

  // Desktop Mouse Drag to Pan
  let isMouseDown = false;
  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a')) return;
    if (currentScale <= 1.05) return;

    isMouseDown = true;
    startPanX = e.clientX;
    startPanY = e.clientY;
    initialTranslateX = translateX;
    initialTranslateY = translateY;
    imageWrap.style.transition = 'none';
    modal.classList.add('is-dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown || !modal.classList.contains('active')) return;
    translateX = initialTranslateX + (e.clientX - startPanX);
    translateY = initialTranslateY + (e.clientY - startPanY);
    clampLightboxTranslations();
    applyLightboxTransform(false);
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown) {
      isMouseDown = false;
      modal.classList.remove('is-dragging');
      clampLightboxTranslations();
      applyLightboxTransform(true);
    }
  });
}

function getTouchDistance(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.hypot(dx, dy) || 1;
}

function clampLightboxTranslations() {
  const stage = document.getElementById('lightboxStage');
  const imgEl = document.getElementById('lightboxImg');
  if (!stage || !imgEl) return;

  if (currentScale <= 1.05) {
    translateX = 0;
    translateY = 0;
    return;
  }

  const stageW = stage.clientWidth || window.innerWidth;
  const stageH = stage.clientHeight || (window.innerHeight * 0.75);
  const imgW = (imgEl.offsetWidth || stageW * 0.85) * currentScale;
  const imgH = (imgEl.offsetHeight || stageH * 0.75) * currentScale;

  const maxTx = Math.max(0, (imgW - stageW) / 2);
  const maxTy = Math.max(0, (imgH - stageH) / 2);

  translateX = Math.min(maxTx, Math.max(-maxTx, translateX));
  translateY = Math.min(maxTy, Math.max(-maxTy, translateY));
}

function applyLightboxTransform(animated = false) {
  const imageWrap = document.getElementById('lightboxImageWrap');
  const modal = document.getElementById('lightboxModal');
  if (!imageWrap) return;

  if (animated) {
    imageWrap.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
  } else {
    imageWrap.style.transition = 'none';
  }

  imageWrap.style.transform = `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) scale(${currentScale.toFixed(3)})`;

  if (modal) {
    if (currentScale > 1.05) {
      modal.classList.add('is-zoomed');
    } else {
      modal.classList.remove('is-zoomed');
    }
  }

  updateLightboxZoomUI();
}

function setLightboxZoom(targetScale, animated = true) {
  currentScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
  if (currentScale <= 1.05) {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
  } else {
    clampLightboxTranslations();
  }
  applyLightboxTransform(animated);
  showLightboxScaleHud(currentScale);
}

function resetLightboxZoom(animated = true) {
  currentScale = 1;
  translateX = 0;
  translateY = 0;
  applyLightboxTransform(animated);
  showLightboxScaleHud(1);
}

function updateLightboxZoomUI() {
  const zoomVal = document.getElementById('lightboxZoomValue');
  const zoomInBtn = document.getElementById('lightboxZoomIn');
  const zoomOutBtn = document.getElementById('lightboxZoomOut');

  if (zoomVal) {
    zoomVal.textContent = `${Math.round(currentScale * 100)}%`;
  }
  if (zoomInBtn) {
    zoomInBtn.disabled = currentScale >= (MAX_SCALE - 0.05);
  }
  if (zoomOutBtn) {
    zoomOutBtn.disabled = currentScale <= (MIN_SCALE + 0.05);
  }
}

function showLightboxScaleHud(scale) {
  const hud = document.getElementById('lightboxScaleHud');
  const hudText = document.getElementById('lightboxHudText');
  if (!hud || !hudText) return;

  if (scale <= 1.02) {
    hud.classList.remove('visible');
    return;
  }

  hudText.textContent = `${scale.toFixed(1)}x`;
  hud.classList.add('visible');

  if (hudTimeout) clearTimeout(hudTimeout);
  hudTimeout = setTimeout(() => {
    hud.classList.remove('visible');
  }, 1400);
}

function openLightbox(index) {
  if (!currentFilteredPhotos || currentFilteredPhotos.length === 0) return;
  currentLightboxIndex = index;

  // Pause gallery auto-scroll while viewing photo in lightbox
  pauseGalleryAutoScroll(60000);

  const modal = document.getElementById('lightboxModal');
  if (!modal) return;

  resetLightboxZoom(false);
  updateLightboxContent();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (!modal) return;
  resetLightboxZoom(false);
  modal.classList.remove('active');
  modal.classList.remove('is-zoomed');
  document.body.style.overflow = '';
  // Resume auto-drift after 1.5s
  pauseGalleryAutoScroll(1500);
}

function nextLightboxPhoto() {
  if (currentFilteredPhotos.length === 0) return;
  resetLightboxZoom(false);
  currentLightboxIndex = (currentLightboxIndex + 1) % currentFilteredPhotos.length;
  updateLightboxContent();
}

function prevLightboxPhoto() {
  if (currentFilteredPhotos.length === 0) return;
  resetLightboxZoom(false);
  currentLightboxIndex = (currentLightboxIndex - 1 + currentFilteredPhotos.length) % currentFilteredPhotos.length;
  updateLightboxContent();
}

function updateLightboxContent() {
  const photo = currentFilteredPhotos[currentLightboxIndex];
  if (!photo) return;

  const imgEl = document.getElementById('lightboxImg');
  const counterEl = document.getElementById('lightboxCounter');
  const unitNameEl = document.getElementById('lightboxUnitName');
  const unitPriceEl = document.getElementById('lightboxUnitPrice');
  const statusPillEl = document.getElementById('lightboxStatusPill');
  const inquireBtn = document.getElementById('lightboxInquireBtn');

  const roomTitle = photo.unitNameTh || photo.unitName || 'ห้องพัก';

  if (imgEl) {
    imgEl.src = photo.src;
    imgEl.alt = `${roomTitle} photo ${currentLightboxIndex + 1}`;
  }

  if (counterEl) {
    counterEl.textContent = `${currentLightboxIndex + 1} / ${currentFilteredPhotos.length}`;
  }

  if (unitNameEl) {
    unitNameEl.textContent = roomTitle;
  }

  if (unitPriceEl) {
    unitPriceEl.textContent = `฿${photo.price} / เดือน`;
  }

  if (statusPillEl) {
    const isAvailable = photo.unitId === 'pojana';
    statusPillEl.className = isAvailable ? 'lightbox-status-pill available' : 'lightbox-status-pill';
    statusPillEl.textContent = isAvailable ? '🟢 พร้อมเข้าอยู่ 1 ห้อง' : '🔴 มีผู้เช่าแล้ว';
  }

  if (inquireBtn) {
    const textMsg = encodeURIComponent("สนใจเช่าห้อง ห้องยังว่างอยู่ไหมครับ/ค่ะ");
    inquireBtn.href = `${ROOMS_DATA.project.contact.lineUrl}?text=${textMsg}`;
  }
}

/* ==========================================================================
   Room Tour Video Vlog Player (iOS Liquid Glass Showcase)
   ========================================================================== */
function initVlogPlayer() {
  const video = document.getElementById('vlogVideo');
  const soundToggleBtn = document.getElementById('vlogSoundToggle');
  const iconSoundMuted = document.getElementById('iconSoundMuted');
  const iconSoundUnmuted = document.getElementById('iconSoundUnmuted');
  const textSoundToggle = document.getElementById('textSoundToggle');
  const playerCard = document.getElementById('vlogPlayerCard');
  const playIndicator = document.getElementById('vlogPlayIndicator');
  const progressFill = document.getElementById('vlogProgressFill');

  if (!video) return;

  // 1. Initial State: Muted by default per user requirement
  video.muted = true;

  // 2. Sound Toggle Click (Unmute / Mute)
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent triggering card play/pause
      video.muted = !video.muted;
      updateSoundButtonUI();

      // If video was paused, resume playing when user un-mutes
      if (!video.muted && video.paused) {
        video.play().catch(() => {});
      }
    });
  }

  function updateSoundButtonUI() {
    if (video.muted) {
      if (iconSoundMuted) iconSoundMuted.style.display = 'block';
      if (iconSoundUnmuted) iconSoundUnmuted.style.display = 'none';
      if (textSoundToggle) textSoundToggle.textContent = 'เปิดเสียง';
      if (soundToggleBtn) soundToggleBtn.classList.remove('unmuted');
    } else {
      if (iconSoundMuted) iconSoundMuted.style.display = 'none';
      if (iconSoundUnmuted) iconSoundUnmuted.style.display = 'block';
      if (textSoundToggle) textSoundToggle.textContent = 'ปิดเสียง';
      if (soundToggleBtn) soundToggleBtn.classList.add('unmuted');
    }
  }

  // 3. Tap card/video to toggle play/pause with ripple feedback
  if (playerCard) {
    playerCard.addEventListener('click', (e) => {
      // Don't trigger if clicked on sound toggle or tiktok link
      if (e.target.closest('#vlogSoundToggle') || e.target.closest('.video-tiktok-mini-btn')) {
        return;
      }
      toggleVideoPlayback();
    });
  }

  let indicatorTimer = null;
  function showPlayIndicator(iconSvg) {
    if (!playIndicator) return;
    playIndicator.innerHTML = iconSvg;
    playIndicator.classList.add('show');
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(() => {
      playIndicator.classList.remove('show');
    }, 650);
  }

  function toggleVideoPlayback() {
    if (video.paused) {
      video.play().then(() => {
        showPlayIndicator('<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>');
      }).catch(() => {});
    } else {
      video.pause();
      showPlayIndicator('<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>');
    }
  }

  // 4. Progress bar fill
  video.addEventListener('timeupdate', () => {
    if (progressFill && video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      progressFill.style.width = `${pct}%`;
    }
  });

  // 5. IntersectionObserver: Autoplay when scrolled into view, pause when out of view
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Play smoothly when in view
          video.play().catch(() => {});
        } else {
          // Pause when user scrolls away to save resources
          video.pause();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(playerCard || video);
  } else {
    // Fallback: try autoplay muted
    video.play().catch(() => {});
  }
}

// Global exposure for inline HTML handlers
window.filterByUnit = filterByUnit;
window.filterByType = filterByType;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.initVlogPlayer = initVlogPlayer;

/* ==========================================================================
   LINE Pre-filled Message Clipboard & Toast Helper
   ========================================================================== */
const LINE_PREFILLED_MSG = "สนใจเช่าห้อง ห้องยังว่างอยู่ไหมครับ/ค่ะ";

function showLineCopyToast() {
  let toast = document.getElementById('lineCopyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lineCopyToast';
    toast.className = 'line-copy-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>📋 คัดลอกข้อความ: <em>"${LINE_PREFILLED_MSG}"</em> เรียบร้อย</span>`;
  toast.classList.add('show');
  clearTimeout(window.lineToastTimer);
  window.lineToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

document.addEventListener('click', function(e) {
  const lineLink = e.target.closest('a[href*="line.me"]');
  if (lineLink) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(LINE_PREFILLED_MSG).catch(() => {});
    }
    showLineCopyToast();
  }
});

/* ==========================================================================
   1. Dropbox-Style Motion System (Orchestrated Entrance & Scroll Reveals)
   ========================================================================== */

/* Masked Split-Text Headline Reveal */
function initMaskedHeadlines() {
  const titles = document.querySelectorAll('.section-title');
  titles.forEach(title => {
    if (title.classList.contains('masked-headline')) return;
    title.classList.add('masked-headline');

    const html = title.innerHTML.trim();
    if (html.includes('<br>') || html.includes('<br/>')) {
      const parts = html.split(/<br\s*\/?>/i);
      title.innerHTML = parts.map((part, i) => 
        `<span class="headline-mask"><span class="headline-line" style="--line-i: ${i}">${part.trim()}</span></span>`
      ).join('');
    } else {
      title.innerHTML = `<span class="headline-mask"><span class="headline-line" style="--line-i: 0">${html}</span></span>`;
    }
  });
}

/* Dynamic Scroll Velocity & Position Pacing */
function initScrollVelocityPacing() {
  let lastY = window.pageYOffset || document.documentElement.scrollTop;
  let lastTime = performance.now();
  let resetTimer = null;

  const updatePacing = () => {
    const currentY = window.pageYOffset || document.documentElement.scrollTop;
    const now = performance.now();
    const deltaY = Math.abs(currentY - lastY);
    const deltaTime = Math.max(1, now - lastTime);
    const velocity = deltaY / deltaTime; // pixels/ms

    lastY = currentY;
    lastTime = now;

    // Fast scrolling (> 1.8 px/ms): faster transitions so elements keep up smoothly (0.75s)
    // Moderate scrolling (0.6 - 1.8 px/ms): 0.95s
    // Slow, deliberate reading (< 0.6 px/ms) or stopped: 1.25s (rich, slow-motion blur clarity)
    let dur = 1.25;
    if (velocity > 1.8) {
      dur = 0.75;
    } else if (velocity > 1.0) {
      dur = 0.92;
    } else if (velocity > 0.4) {
      dur = 1.1;
    } else {
      dur = 1.25;
    }

    document.documentElement.style.setProperty('--motion-duration', `${dur}s`);
    document.documentElement.style.setProperty('--motion-blur-duration', `${(dur * 0.9).toFixed(2)}s`);
    document.documentElement.style.setProperty('--motion-headline-duration', `${(dur * 0.82).toFixed(2)}s`);

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      // Revert to calm, ultra-smooth motion when scrolling stops
      document.documentElement.style.setProperty('--motion-duration', '1.25s');
      document.documentElement.style.setProperty('--motion-blur-duration', '1.15s');
      document.documentElement.style.setProperty('--motion-headline-duration', '0.95s');
    }, 180);
  };

  window.addEventListener('scroll', updatePacing, { passive: true });
}

/* Simulated Ghost Cursor on Direct LINE Contact Card */
function initGhostCursorSimulation() {
  const noticeCard = document.getElementById('pricingTrustNotice') || document.querySelector('.pricing-trust-notice');
  const targetBtn = document.getElementById('btnLineInquireDirect') || document.querySelector('.btn-line-inquire-direct');
  const cursor = document.getElementById('ghostCursor') || (noticeCard && noticeCard.querySelector('.ghost-cursor'));

  if (!noticeCard || !targetBtn || !cursor) return;

  let hasRun = false;
  let simulationLoop = null;

  function runSimulation() {
    const cardRect = noticeCard.getBoundingClientRect();
    const btnRect = targetBtn.getBoundingClientRect();

    // Calculate center of button relative to the notice card container
    const targetX = (btnRect.left + btnRect.width * 0.5) - cardRect.left;
    const targetY = (btnRect.top + btnRect.height * 0.5) - cardRect.top;

    // Start position: entering gracefully from bottom-right of the card
    const startX = Math.min(cardRect.width - 24, targetX + 130);
    const startY = Math.min(cardRect.height - 12, targetY + 65);

    // Initial silent reset
    cursor.style.transition = 'none';
    cursor.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
    cursor.style.opacity = '0';
    cursor.classList.remove('is-pressing');
    targetBtn.classList.remove('simulated-click');

    // 1. Fade in and glide smoothly towards the button center
    requestAnimationFrame(() => {
      cursor.style.transition = 'opacity 0.4s ease, transform 0.95s cubic-bezier(0.16, 1, 0.3, 1)';
      cursor.style.opacity = '1';
      cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

      // 2. Arrive at button -> Trigger Click Simulation
      setTimeout(() => {
        cursor.classList.add('is-pressing');
        targetBtn.classList.add('simulated-click');

        // 3. Release click after 220ms
        setTimeout(() => {
          cursor.classList.remove('is-pressing');
          targetBtn.classList.remove('simulated-click');

          // 4. Glide away towards top-right and fade out
          setTimeout(() => {
            const exitX = targetX + 45;
            const exitY = Math.max(6, targetY - 45);
            cursor.style.transition = 'opacity 0.55s ease, transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)';
            cursor.style.transform = `translate3d(${exitX}px, ${exitY}px, 0)`;
            cursor.style.opacity = '0';
          }, 350);
        }, 220);
      }, 980);
    });
  }

  // Observe when notice card enters viewport
  if ('IntersectionObserver' in window) {
    const cursorObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!hasRun) {
            hasRun = true;
            // Delay slightly after card's entrance animation finishes
            setTimeout(runSimulation, 600);
          }

          if (!simulationLoop) {
            // Elegant periodic rerun every 12s if user remains on this section
            simulationLoop = setInterval(() => {
              const rect = noticeCard.getBoundingClientRect();
              if (rect.top < window.innerHeight && rect.bottom > 0) {
                runSimulation();
              }
            }, 12000);
          }
        }
      });
    }, { threshold: 0.2 });

    cursorObserver.observe(noticeCard);
  }
}

function initDropboxMotion() {
  // Check reduced motion preference
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Initialize Masked Split-Text Headlines
  initMaskedHeadlines();

  // 2. Dynamic Scroll Velocity & Position Pacing
  initScrollVelocityPacing();

  // 3. Simulated Ghost Cursor on Direct Inquiry Notice Card
  initGhostCursorSimulation();

  if (prefersReduced) return;

  // 4. Section-Unified Definitions
  // Each section defines a unified boundary where:
  // - All elements enter together into focus
  // - NO element eases out until the LAST element of the section exits past the exit boundary
  // - Multi-column bubble grids animate strictly from LEFT to RIGHT
  // - Scrolling back up reverses the animation symmetrically in the opposite direction
  const sectionConfigs = [
    {
      id: 'banner',
      containerSel: '.hero-banner-container',
      itemSel: '.feature-banner',
      exitOffset: 70
    },
    {
      id: 'pricing',
      containerSel: '.pricing-section',
      itemSel: '.section-head, .pricing-card, .pricing-trust-notice',
      gridSel: '.pricing-grid',
      exitOffset: 70
    },
    {
      id: 'vlog',
      containerSel: '.video-vlog-section',
      itemSel: '.video-vlog-layout',
      exitOffset: 70
    },
    {
      id: 'gallery',
      containerSel: '.gallery-section',
      itemSel: '.section-head, .gallery-nav, #galleryGrid',
      exitOffset: 70
    },
    {
      id: 'features',
      containerSel: '.features-section',
      itemSel: '.section-head, .feature-item-card',
      gridSel: '.features-grid',
      exitOffset: 70
    },
    {
      id: 'facilities',
      containerSel: '.facilities-section',
      itemSel: '.section-head, .facility-card',
      gridSel: '.facilities-grid',
      exitOffset: 70
    },
    {
      id: 'location',
      containerSel: '.location-section',
      itemSel: '.section-head, .main-location-card, .nearby-card',
      gridSel: '.nearby-grid',
      exitOffset: 70
    },
    {
      id: 'terms',
      containerSel: '.terms-section',
      itemSel: '.section-head, .terms-card',
      gridSel: '.terms-grid',
      exitOffset: 70
    }
  ];

  // Setup Section Models & Elements
  const sectionModels = [];

  sectionConfigs.forEach(cfg => {
    const container = document.querySelector(cfg.containerSel);
    if (!container) return;

    const itemEls = Array.from(container.querySelectorAll(cfg.itemSel));
    if (!itemEls.length) return;

    const items = itemEls.map((el, i) => {
      el.classList.add('parallax-item');

      // Determine Depth Tier
      let depth = 'mg';
      let factor = 1.0;

      if (el.matches('.feature-banner, .main-location-card, .terms-card, .pricing-trust-notice, .video-vlog-layout')) {
        depth = 'bg';
        factor = 0.75;
      } else if (el.matches('.popular-badge, .card-badge, .banner-pill, .btn-line-inquire-direct, .btn-card-action, .facility-icon')) {
        depth = 'fg';
        factor = 1.25;
      } else {
        // mg (cards, bubbles, section-heads)
        factor = 0.98 + ((i % 4) * 0.02);
      }

      el.setAttribute('data-depth', depth);

      // Also register any nested foreground elements inside cards
      el.querySelectorAll('.popular-badge, .card-badge, .banner-pill, .btn-line-inquire-direct, .btn-card-action, .facility-icon').forEach(nested => {
        nested.classList.add('parallax-item');
        nested.setAttribute('data-depth', 'fg');
      });

      return { el, factor, depth };
    });

    sectionModels.push({
      id: cfg.id,
      container,
      items,
      gridSel: cfg.gridSel,
      exitOffset: cfg.exitOffset || 70
    });
  });

  // 5. Left-to-Right Stagger Calculation for all Bubble Grids
  // Ensures animation wave cascades strictly from leftmost elements to rightmost elements
  const updateGridStaggers = () => {
    sectionModels.forEach(sec => {
      if (!sec.gridSel) return;
      const grid = sec.container.querySelector(sec.gridSel);
      if (!grid) return;

      const children = Array.from(grid.children).filter(ch =>
        ch.classList.contains('parallax-item') ||
        ch.matches('.pricing-card, .feature-item-card, .facility-card, .nearby-card, .term-item')
      );
      if (!children.length) return;

      // Measure geometric positions of all children
      const measured = children.map(el => {
        const rect = el.getBoundingClientRect();
        return { el, top: rect.top, left: rect.left };
      });

      // Group children into rows (items within 25px vertical difference belong to same row)
      const rows = [];
      measured.forEach(m => {
        let row = rows.find(r => Math.abs(r.top - m.top) < 25);
        if (!row) {
          row = { top: m.top, items: [] };
          rows.push(row);
        }
        row.items.push(m);
      });

      // Sort rows strictly from top to bottom
      rows.sort((a, b) => a.top - b.top);

      // Within each row, sort items strictly from left to right, then assign sequential stagger index
      let seqIdx = 0;
      rows.forEach(row => {
        row.items.sort((a, b) => a.left - b.left);
        row.items.forEach(({ el }) => {
          el.classList.add('stagger-child');
          el.style.setProperty('--stagger-i', seqIdx);
          seqIdx++;
        });
      });
    });
  };

  updateGridStaggers();

  // 6. Section-Unified Bidirectional Scroll Motion Engine
  // Continuous, physics-based, and reversible on scroll up and down
  let ticking = false;

  const updateScrollMotion = () => {
    const windowH = window.innerHeight || document.documentElement.clientHeight;

    sectionModels.forEach(sec => {
      const secRect = sec.container.getBoundingClientRect();
      const exitBoundary = sec.exitOffset;

      // Section Entrance Calculation:
      // Starts when top of section enters bottom 94% of viewport
      // Reaches 100% settled focus when top reaches 72% of viewport
      let enterProgress = 1;
      if (secRect.top > windowH * 0.72) {
        enterProgress = Math.max(0, Math.min(1, (windowH * 0.94 - secRect.top) / (windowH * 0.22)));
      }

      // Section Exit Barrier Calculation:
      // CRITICAL: As long as secRect.bottom > exitBoundary (the last element is still visible),
      // exitProgress is strictly 1.0 — NO element in the section eases out prematurely!
      let exitProgress = 1;
      if (secRect.bottom <= exitBoundary) {
        // The last element has reached or passed the exit boundary (e.g. 70px)
        exitProgress = Math.max(0, Math.min(1, (secRect.bottom - (-70)) / (exitBoundary - (-70))));
      }

      // Combined Visibility Factor V: strictly 1.0 while reading the section
      const sectionV = Math.min(enterProgress, exitProgress);

      // Check if section is completely offscreen (above or below)
      const isOffscreenBelow = secRect.top > windowH + 120;
      const isOffscreenAbove = secRect.bottom < -100;

      sec.items.forEach(item => {
        const el = item.el;
        const factor = item.factor;

        const isBubbleZoom = el.matches('.feature-item-card, .facility-card');

        if (isBubbleZoom) {
          // Offscreen below or before entrance trigger
          if (isOffscreenBelow || secRect.top > windowH * 0.90) {
            el.classList.remove('is-zoomed-in');
            el.classList.remove('is-in-focus');
          } else if (secRect.top <= windowH * 0.88 && secRect.bottom > exitBoundary) {
            // Inside reading & focus zone: trigger breath in / zoom in sequentially
            el.classList.add('is-zoomed-in');
            el.classList.add('is-in-focus');
          } else if (secRect.bottom <= exitBoundary) {
            // Respect section exit barrier: don't dismiss until section fully departs
            if (secRect.bottom < -100) {
              el.classList.remove('is-zoomed-in');
              el.classList.remove('is-in-focus');
            }
          }
          return;
        }

        if (isOffscreenBelow) {
          el.style.setProperty('--p-y', `${Math.round(34 * factor)}px`);
          el.style.setProperty('--p-opacity', '0');
          el.style.setProperty('--p-blur', '8px');
          el.style.setProperty('--p-scale', '0.975');
          el.classList.remove('is-in-focus');
          return;
        }

        if (isOffscreenAbove) {
          el.style.setProperty('--p-y', `${Math.round(-30 * factor)}px`);
          el.style.setProperty('--p-opacity', '0');
          el.style.setProperty('--p-blur', '6px');
          el.style.setProperty('--p-scale', '0.98');
          el.classList.remove('is-in-focus');
          return;
        }

        // Inside active viewport zone:
        let elevationTravel = 0;
        if (secRect.top > windowH * 0.72) {
          // Entering from bottom (positive Y)
          elevationTravel = (1 - enterProgress) * 32 * factor;
        } else if (secRect.bottom <= exitBoundary) {
          // Exiting to top (negative Y)
          elevationTravel = -(1 - exitProgress) * 28 * factor;
        }

        // Subtle calm Z-axis depth drift during focus
        const itemRect = el.getBoundingClientRect();
        const centerY = itemRect.top + itemRect.height * 0.5;
        const normCenter = (centerY - windowH * 0.5) / windowH; // -0.5 to +0.5
        const zShift = normCenter * 10 * (factor - 1.0);

        const totalY = elevationTravel + zShift;

        // Opacity: 1.0 across focus zone
        const opacity = Math.max(0, Math.min(1, Math.pow(sectionV, 1.15)));

        // Blur: 0px across focus zone, soft blur at entrance/exit
        const blur = Math.max(0, (1 - sectionV) * 6.5);

        // Scale: 1.0 across focus zone
        const scale = 0.982 + 0.018 * sectionV;

        el.style.setProperty('--p-y', `${totalY.toFixed(1)}px`);
        el.style.setProperty('--p-opacity', opacity.toFixed(3));
        el.style.setProperty('--p-blur', `${blur.toFixed(1)}px`);
        el.style.setProperty('--p-scale', scale.toFixed(3));

        // Masked headline trigger
        if (sectionV > 0.55) {
          el.classList.add('is-in-focus');
        } else if (sectionV < 0.15) {
          el.classList.remove('is-in-focus');
        }
      });
    });

    ticking = false;
  };

  const onScrollParallax = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScrollMotion);
    }
  };

  window.addEventListener('scroll', onScrollParallax, { passive: true });
  window.addEventListener('resize', () => {
    updateGridStaggers();
    onScrollParallax();
  }, { passive: true });

  // Initial calculation
  updateScrollMotion();
}

/* ==========================================================================
   2. iOS Liquid Glass Optical Convex Lens Refraction on Scroll
   ========================================================================== */
function initLiquidGlassRefraction() {
  let ticking = false;

  const updateRefraction = () => {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight || 1000;
    const progress = Math.min(1, Math.max(0, scrollY / docHeight));

    // Calculate dynamic specular highlight angle: 120deg to 155deg as user scrolls
    const angle = 125 + (progress * 30);
    document.documentElement.style.setProperty('--lens-angle', `${angle.toFixed(1)}deg`);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateRefraction);
      ticking = true;
    }
  }, { passive: true });

  updateRefraction();
}

/* ==========================================================================
   3. Gallery Hardware Motion Engine (GPU Transform translate3d, 60fps/120fps)
   - Zero Layout Thrashing (No scrollLeft / reflow / scroll-event loops)
   - Sub-pixel floating point translation via translate3d(-Xpx, 0, 0)
   - 100% smooth, native performance on iPad (Chrome & Safari), iPhone, Android & Windows
   - Seamless Infinite Marquee loop on "ทุกห้อง" tab
   - Direct Touch Swipe (Allows natural vertical page scroll on iPad/tablets)
   - Desktop Mouse Drag with cursor feedback
   - Left/Right Liquid Glass Nav Arrows
   - Lightbox Click Guard
   ========================================================================== */
let galleryCurrentX = 0;
let galleryHalfWidth = 0;
let galleryAutoScrollActive = true;
let galleryPauseUntil = 0;
let isGalleryUserInteracting = false;
let isGalleryDragging = false;
let galleryHasMoved = false;
let galleryLastFrameTime = 0;
let galleryRafId = null;

function pauseGalleryAutoScroll(durationMs = 1800) {
  galleryPauseUntil = Date.now() + durationMs;
}

function recomputeGalleryDimensions() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  if (galleryAutoScrollActive) {
    galleryHalfWidth = Math.round(grid.scrollWidth / 2);
  } else {
    galleryHalfWidth = grid.scrollWidth;
  }
}

function updateGalleryAutoScrollState(isAllTab) {
  galleryAutoScrollActive = isAllTab;
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  galleryCurrentX = 0;
  grid.style.transition = 'none';
  grid.style.transform = 'translate3d(0, 0, 0)';

  requestAnimationFrame(() => {
    recomputeGalleryDimensions();
  });
}

function glideGalleryBy(deltaPx) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  pauseGalleryAutoScroll(2200);
  grid.style.transition = 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)';

  if (galleryAutoScrollActive && galleryHalfWidth > 100) {
    galleryCurrentX += deltaPx;
    while (galleryCurrentX < 0) galleryCurrentX += galleryHalfWidth;
    while (galleryCurrentX >= galleryHalfWidth) galleryCurrentX -= galleryHalfWidth;
  } else {
    const containerW = grid.parentElement ? grid.parentElement.clientWidth : 800;
    const maxScroll = Math.max(0, grid.scrollWidth - containerW);
    galleryCurrentX = Math.max(0, Math.min(maxScroll, galleryCurrentX + deltaPx));
  }

  grid.style.transform = `translate3d(-${galleryCurrentX.toFixed(2)}px, 0, 0)`;

  setTimeout(() => {
    grid.style.transition = 'none';
    galleryLastFrameTime = performance.now();
  }, 560);
}

function initGalleryAutoScroll() {
  const grid = document.getElementById('galleryGrid');
  const prevBtn = document.getElementById('galleryScrollPrev');
  const nextBtn = document.getElementById('galleryScrollNext');
  if (!grid) return;

  // Recompute dimensions on load & resize
  recomputeGalleryDimensions();
  window.addEventListener('resize', recomputeGalleryDimensions, { passive: true });

  // 1. Liquid Glass Nav Arrows
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      glideGalleryBy(-420);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      glideGalleryBy(420);
    });
  }

  // 2. Desktop Mouse Drag-to-Scroll
  let mouseStartX = 0;
  let mouseStartCurrentX = 0;

  grid.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isGalleryDragging = true;
    galleryHasMoved = false;
    mouseStartX = e.clientX;
    mouseStartCurrentX = galleryCurrentX;
    isGalleryUserInteracting = true;
    grid.style.transition = 'none';
    grid.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isGalleryDragging) return;
    const dx = mouseStartX - e.clientX;
    if (Math.abs(dx) > 4) galleryHasMoved = true;

    if (galleryAutoScrollActive && galleryHalfWidth > 100) {
      galleryCurrentX = mouseStartCurrentX + dx;
      while (galleryCurrentX < 0) galleryCurrentX += galleryHalfWidth;
      while (galleryCurrentX >= galleryHalfWidth) galleryCurrentX -= galleryHalfWidth;
    } else {
      const containerW = grid.parentElement ? grid.parentElement.clientWidth : 800;
      const maxScroll = Math.max(0, grid.scrollWidth - containerW);
      galleryCurrentX = Math.max(0, Math.min(maxScroll, mouseStartCurrentX + dx));
    }

    grid.style.transform = `translate3d(-${galleryCurrentX.toFixed(2)}px, 0, 0)`;
  });

  window.addEventListener('mouseup', () => {
    if (!isGalleryDragging) return;
    isGalleryDragging = false;
    isGalleryUserInteracting = false;
    grid.style.cursor = 'grab';
    pauseGalleryAutoScroll(1600);
    galleryLastFrameTime = performance.now();
    setTimeout(() => { galleryHasMoved = false; }, 120);
  });

  // 3. Mobile & iPad Touch Handling (Allows natural vertical page scroll)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartCurrentX = 0;
  let isHorizontalSwiping = false;
  let isVerticalScrolling = false;

  grid.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartCurrentX = galleryCurrentX;
    isHorizontalSwiping = false;
    isVerticalScrolling = false;
    isGalleryUserInteracting = true;
    grid.style.transition = 'none';
  }, { passive: true });

  grid.addEventListener('touchmove', (e) => {
    if (isVerticalScrolling || e.touches.length !== 1) return;
    const dx = touchStartX - e.touches[0].clientX;
    const dy = touchStartY - e.touches[0].clientY;

    if (!isHorizontalSwiping && !isVerticalScrolling) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        // User scrolling down the web page: do not block or pause!
        isVerticalScrolling = true;
        isGalleryUserInteracting = false;
        return;
      } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        isHorizontalSwiping = true;
        galleryHasMoved = true;
      }
    }

    if (isHorizontalSwiping) {
      if (galleryAutoScrollActive && galleryHalfWidth > 100) {
        galleryCurrentX = touchStartCurrentX + dx;
        while (galleryCurrentX < 0) galleryCurrentX += galleryHalfWidth;
        while (galleryCurrentX >= galleryHalfWidth) galleryCurrentX -= galleryHalfWidth;
      } else {
        const containerW = grid.parentElement ? grid.parentElement.clientWidth : 800;
        const maxScroll = Math.max(0, grid.scrollWidth - containerW);
        galleryCurrentX = Math.max(0, Math.min(maxScroll, touchStartCurrentX + dx));
      }
      grid.style.transform = `translate3d(-${galleryCurrentX.toFixed(2)}px, 0, 0)`;
    }
  }, { passive: true });

  grid.addEventListener('touchend', () => {
    isGalleryUserInteracting = false;
    if (isHorizontalSwiping) {
      pauseGalleryAutoScroll(1600);
    }
    galleryLastFrameTime = performance.now();
    setTimeout(() => {
      galleryHasMoved = false;
      isHorizontalSwiping = false;
    }, 120);
  }, { passive: true });

  // 4. Desktop Hover Pause (Ignores iPad/mobile synthetic touch)
  grid.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    isGalleryUserInteracting = true;
  });

  grid.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    isGalleryUserInteracting = false;
    galleryLastFrameTime = performance.now();
  });

  // 5. Buttery-Smooth Continuous Drift Loop (Hardware GPU Composited 60/120fps)
  const driftSpeed = 34; // 34px per second (luxurious, calm editorial drift)

  const stepMarquee = (timestamp) => {
    if (!galleryLastFrameTime) galleryLastFrameTime = timestamp;
    const dt = Math.min((timestamp - galleryLastFrameTime) / 1000, 0.1);
    galleryLastFrameTime = timestamp;

    const canDrift = galleryAutoScrollActive &&
                     (Date.now() >= galleryPauseUntil) &&
                     !isGalleryUserInteracting &&
                     galleryHalfWidth > 100;

    if (canDrift) {
      galleryCurrentX += driftSpeed * dt;

      if (galleryCurrentX >= galleryHalfWidth) {
        galleryCurrentX -= galleryHalfWidth;
      }

      grid.style.transform = `translate3d(-${galleryCurrentX.toFixed(2)}px, 0, 0)`;
    }

    galleryRafId = requestAnimationFrame(stepMarquee);
  };

  galleryRafId = requestAnimationFrame(stepMarquee);
}

// Global exposure
window.pauseGalleryAutoScroll = pauseGalleryAutoScroll;
window.updateGalleryAutoScrollState = updateGalleryAutoScrollState;

