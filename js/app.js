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
let currentHeroSlide = 0;
let heroSlideTimer = null;
let slideMotionTimeout = null;
let ambientCrossfadeTimeout = null;
let currentAmbientTarget = 'A';
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

  // Initialize Stationary Ambient Blur Backdrop (Layer A active on top)
  if (ambientA) {
    ambientA.style.backgroundImage = `url("${heroSlides[0].src}")`;
    ambientA.classList.add('active');
    ambientA.style.zIndex = '2';
  }
  if (ambientB) {
    ambientB.classList.remove('active');
    ambientB.style.zIndex = '1';
  }
  currentAmbientTarget = 'A';

  // Build slides into track (Clean Photos ONLY - 100% Unobstructed!)
  track.innerHTML = '';

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  let hasSwiped = false;

  heroSlides.forEach((slide, index) => {
    const slideEl = document.createElement('div');
    slideEl.className = index === 0 ? 'hero-slide is-active' : 'hero-slide';
    slideEl.setAttribute('role', 'button');
    slideEl.setAttribute('tabindex', '0');
    slideEl.setAttribute('aria-label', `ภาพห้อง ${slide.unitNameTh} - แตะเพื่อดูรายละเอียดด้านล่าง`);
    slideEl.innerHTML = `
      <div class="hero-slide-fg-wrap">
        <img class="hero-slide-fg-img" src="${slide.src}" alt="${slide.captionTh}" loading="${index === 0 ? 'eager' : 'lazy'}">
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

  // Initial update of room details bar below photo
  updateHeroDetails();

  // Buttons
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });

  // Auto slide
  startSlideShow();

  if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', stopSlideShow);
    sliderContainer.addEventListener('mouseleave', startSlideShow);

    // Mobile Touch Swipe Handling
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
      if (Math.abs(currentX - touchStartX) > 12 || Math.abs(currentY - touchStartY) > 12) {
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

      // Only trigger if horizontal swipe is dominant and > 35px
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
        hasSwiped = true;
        if (diffX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
      startSlideShow();
      setTimeout(() => { hasSwiped = false; }, 300);
    }, { passive: true });
  }
}

function updateSlideTrack() {
  const track = document.getElementById('heroTrack');
  const slide = heroSlides[currentHeroSlide];
  if (!slide) return;

  // 1. Foreground Push Transition (Clean, slow, graceful glide with synchronized motion blur)
  if (track) {
    track.classList.add('is-sliding');
    clearTimeout(slideMotionTimeout);

    track.style.transform = `translateX(-${currentHeroSlide * 100}%)`;

    const slides = track.querySelectorAll('.hero-slide');
    slides.forEach((s, idx) => {
      if (idx === currentHeroSlide) {
        s.classList.add('is-active');
      } else {
        s.classList.remove('is-active');
      }
    });

    slideMotionTimeout = setTimeout(() => {
      track.classList.remove('is-sliding');
    }, 1100);
  }

  // 2. Stationary Ambient Background Cross-Fade (Zero brightness dip, seamless crossfade)
  const ambientA = document.getElementById('heroAmbientA');
  const ambientB = document.getElementById('heroAmbientB');
  if (ambientA && ambientB) {
    clearTimeout(ambientCrossfadeTimeout);
    if (currentAmbientTarget === 'A') {
      ambientB.style.backgroundImage = `url("${slide.src}")`;
      ambientB.style.zIndex = '3';
      ambientA.style.zIndex = '2';
      ambientB.classList.add('active');
      currentAmbientTarget = 'B';
      ambientCrossfadeTimeout = setTimeout(() => {
        ambientA.classList.remove('active');
        ambientA.style.zIndex = '1';
      }, 1500);
    } else {
      ambientA.style.backgroundImage = `url("${slide.src}")`;
      ambientA.style.zIndex = '3';
      ambientB.style.zIndex = '2';
      ambientA.classList.add('active');
      currentAmbientTarget = 'A';
      ambientCrossfadeTimeout = setTimeout(() => {
        ambientB.classList.remove('active');
        ambientB.style.zIndex = '1';
      }, 1500);
    }
  }

  // Synchronize room info bar below the photo
  updateHeroDetails();

  // Re-verify sticky bar overlap on slide change
  checkStickyBarVisibility();
}

function updateHeroDetails() {
  const slide = heroSlides[currentHeroSlide];
  if (!slide) return;

  const badgeEl = document.getElementById('heroDetailBadge');
  const priceEl = document.getElementById('heroDetailPrice');
  const titleEl = document.getElementById('heroDetailTitle');
  const captionEl = document.getElementById('heroDetailCaption');
  const btnEl = document.getElementById('heroDetailBtn');
  const counterEl = document.getElementById('heroSlideCounter');

  if (badgeEl) badgeEl.textContent = slide.badge;
  if (priceEl) priceEl.textContent = `฿${slide.price} / เดือน`;
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

function nextSlide() {
  currentHeroSlide = (currentHeroSlide + 1) % heroSlides.length;
  updateSlideTrack();
}

function prevSlide() {
  currentHeroSlide = (currentHeroSlide - 1 + heroSlides.length) % heroSlides.length;
  updateSlideTrack();
}

function goToSlide(index) {
  currentHeroSlide = index;
  updateSlideTrack();
}

function startSlideShow() {
  stopSlideShow();
  heroSlideTimer = setInterval(nextSlide, 6500);
}

function stopSlideShow() {
  if (heroSlideTimer) clearInterval(heroSlideTimer);
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
    <button class="filter-btn active" data-filter="all">
      <span>ทุกห้อง</span>
      <span class="count-badge">${totalPhotosCount}</span>
    </button>
    <button class="filter-btn" data-filter="type:1bed">
      <span>1 Bedroom (7,500.-)</span>
      <span class="count-badge">${count1Bed}</span>
    </button>
    <button class="filter-btn" data-filter="type:studio">
      <span>Studio (6,500.-)</span>
      <span class="count-badge">${countStudio}</span>
    </button>
  `;

  ROOMS_DATA.units.forEach(unit => {
    filterHtml += `
      <button class="filter-btn" data-filter="unit:${unit.id}">
        <span>${unit.nameTh.replace('ห้อง ', '')}</span>
        <span class="count-badge">${unit.photos.length}</span>
      </button>
    `;
  });

  filterContainer.innerHTML = filterHtml;

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

  // Initial render
  applyFilter('all');
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
          <h3 class="unit-detail-title">${selectedUnit.nameTh}${selectedUnit.floorTh ? ` <span class="unit-detail-floor">${selectedUnit.floorTh}</span>` : ''}</h3>
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
        <span class="detail-tag tag-occupied">🔴 มีผู้เช่าแล้ว</span>
        <span class="detail-tag tag-owner">🛡️ เจ้าของดูแลโดยตรง</span>
      </div>
    `;
  } else if (summaryBox) {
    summaryBox.classList.remove('show');
    summaryBox.innerHTML = '';
  }

  // Render gallery photos with seamless infinite marquee duplication
  grid.innerHTML = '';
  grid.scrollLeft = 0; // Reset horizontal scroll to start

  const originalCount = photos.length;
  // Duplicate array so Column 1 follows immediately after the last column seamlessly
  const renderPhotos = (photos.length > 0) ? [...photos, ...photos] : [];

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
    item.addEventListener('click', () => openLightbox(targetIdx));
    grid.appendChild(item);
  });

  // Update gallery auto-scroll state based on active filter
  if (typeof updateGalleryAutoScrollState === 'function') {
    updateGalleryAutoScrollState(filter === 'all');
  }
}


/* Horizontal Gallery Scroll Controls & Desktop Drag */
function initGalleryScrollControls() {
  const grid = document.getElementById('galleryGrid');
  const prevBtn = document.getElementById('galleryScrollPrev');
  const nextBtn = document.getElementById('galleryScrollNext');
  if (!grid) return;

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      pauseGalleryAutoScroll(20000);
      grid.scrollBy({ left: -420, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      pauseGalleryAutoScroll(20000);
      grid.scrollBy({ left: 420, behavior: 'smooth' });
    });
  }

  // Desktop Mouse Drag-to-Scroll
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasDragged = false;

  grid.addEventListener('mousedown', (e) => {
    isDown = true;
    hasDragged = false;
    startX = e.pageX - grid.offsetLeft;
    scrollLeft = grid.scrollLeft;
    pauseGalleryAutoScroll(20000);
  });

  window.addEventListener('mouseup', () => {
    isDown = false;
  });

  grid.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - grid.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 6) {
      hasDragged = true;
    }
    grid.scrollLeft = scrollLeft - walk;
  });

  grid.addEventListener('touchstart', () => {
    pauseGalleryAutoScroll(20000);
  }, { passive: true });

  // Prevent opening lightbox if user was dragging
  grid.addEventListener('click', (e) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
      hasDragged = false;
    }
  }, true);
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

  // Pause gallery auto-scroll and trigger 20s cooldown
  pauseGalleryAutoScroll(20000);

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

      // Group children by column using their horizontal offset
      const measured = children.map(el => ({
        el,
        left: el.getBoundingClientRect().left
      }));

      // Sort unique horizontal column positions from left to right (within 20px threshold)
      const uniqueCols = [];
      measured.forEach(m => {
        const found = uniqueCols.find(col => Math.abs(col - m.left) < 20);
        if (found === undefined) {
          uniqueCols.push(m.left);
        }
      });
      uniqueCols.sort((a, b) => a - b);

      measured.forEach(({ el, left }) => {
        let colIdx = uniqueCols.findIndex(col => Math.abs(col - left) < 20);
        if (colIdx < 0) colIdx = 0;
        el.classList.add('stagger-child');
        el.style.setProperty('--stagger-i', colIdx);
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
   3. Gallery Continuous Marquee Auto-Scroll (Tab "ทุกห้อง" - 64 Photos only)
   - Continuous subtle drift
   - Seamless loop
   - Pauses on hover, touch, or when opening any lightbox photo
   - When paused by photo view, stays paused for 20 seconds before resuming
   - Disabled on 1-bed, studio, or individual unit tabs
   ========================================================================== */
let galleryAutoScrollActive = true;
let galleryAutoScrollRaf = null;
let galleryPauseUntil = 0;
let isUserInteractingGallery = false;

function pauseGalleryAutoScroll(durationMs = 20000) {
  galleryPauseUntil = Date.now() + durationMs;
}

function updateGalleryAutoScrollState(isAllTab) {
  galleryAutoScrollActive = isAllTab;
  const grid = document.getElementById('galleryGrid');
  if (grid) {
    if (galleryAutoScrollActive && Date.now() >= galleryPauseUntil && !isUserInteractingGallery) {
      grid.classList.add('is-auto-scrolling');
    } else {
      grid.classList.remove('is-auto-scrolling');
    }
  }
}

function initGalleryAutoScroll() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const scrollSpeed = 0.55; // Pixels per frame (buttery-smooth, calm editorial pace)

  const stepAutoScroll = () => {
    const now = Date.now();
    const canScroll = galleryAutoScrollActive && (now >= galleryPauseUntil) && !isUserInteractingGallery;

    if (canScroll) {
      grid.classList.add('is-auto-scrolling');
      const halfWidth = grid.scrollWidth / 2;

      if (halfWidth > 20) {
        // Increment continuous scroll position
        grid.scrollLeft += scrollSpeed;

        // Truly seamless infinite loop: when reaching the end of the original set,
        // subtract halfWidth seamlessly so Column 1 follows continuously with zero cut
        if (grid.scrollLeft >= halfWidth) {
          grid.scrollLeft -= halfWidth;
        }
      }
    } else {
      grid.classList.remove('is-auto-scrolling');
    }

    galleryAutoScrollRaf = requestAnimationFrame(stepAutoScroll);
  };

  // Bidirectional seamless scroll wrap on manual drag or swipe
  grid.addEventListener('scroll', () => {
    const halfWidth = grid.scrollWidth / 2;
    if (halfWidth > 20) {
      if (grid.scrollLeft >= halfWidth * 1.9) {
        grid.scrollLeft -= halfWidth;
      } else if (grid.scrollLeft <= 1) {
        grid.scrollLeft += halfWidth;
      }
    }
  }, { passive: true });

  // Hover Pause
  grid.addEventListener('mouseenter', () => {
    isUserInteractingGallery = true;
    grid.classList.remove('is-auto-scrolling');
  });

  grid.addEventListener('mouseleave', () => {
    isUserInteractingGallery = false;
  });

  // Touch Interactions
  grid.addEventListener('touchstart', () => {
    isUserInteractingGallery = true;
    pauseGalleryAutoScroll(20000);
    grid.classList.remove('is-auto-scrolling');
  }, { passive: true });

  grid.addEventListener('touchend', () => {
    isUserInteractingGallery = false;
  }, { passive: true });

  // Start continuous loop
  galleryAutoScrollRaf = requestAnimationFrame(stepAutoScroll);
}

// Global exposure
window.pauseGalleryAutoScroll = pauseGalleryAutoScroll;
window.updateGalleryAutoScrollState = updateGalleryAutoScrollState;

