/**
 * Lumpini Condotown Rattanathibet - Web Application Logic
 * Mobile-First Interactive Gallery, Smooth Slider & Lightbox
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
  initGallery();
  initGalleryScrollControls();
  initLightbox();
  initVlogPlayer();
});

/* ==========================================================================
   Hero Highlights Slideshow (Smooth Horizontal Slide Track)
   ========================================================================== */
let currentHeroSlide = 0;
let heroSlideTimer = null;
const heroSlides = ROOMS_DATA.heroHighlights;

function initHeroSlider() {
  const track = document.getElementById('heroTrack');
  const dotsContainer = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');
  const sliderContainer = document.querySelector('.hero-slider-container');

  if (!track || !heroSlides || heroSlides.length === 0) return;

  // Build slides into track (Clean Photos ONLY - 100% Unobstructed!)
  track.innerHTML = '';
  dotsContainer.innerHTML = '';

  heroSlides.forEach((slide, index) => {
    const slideEl = document.createElement('div');
    slideEl.className = 'hero-slide';
    slideEl.setAttribute('role', 'group');
    slideEl.setAttribute('aria-label', `${slide.unitNameTh} photo ${index + 1}`);
    slideEl.innerHTML = `
      <img src="${slide.src}" alt="${slide.captionTh}" loading="${index === 0 ? 'eager' : 'lazy'}">
    `;
    // Clicking photo navigates directly to that room's gallery
    slideEl.addEventListener('click', () => {
      filterByUnit(slide.unitId, true);
    });
    track.appendChild(slideEl);

    // Indicator Dot
    const dot = document.createElement('span');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Slide ${index + 1}`);
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
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
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    sliderContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = true;
      stopSlideShow();
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
        if (diffX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
      startSlideShow();
    }, { passive: true });
  }
}

function updateSlideTrack() {
  const track = document.getElementById('heroTrack');
  const dots = document.querySelectorAll('.slider-dots .dot');

  if (track) {
    track.style.transform = `translateX(-${currentHeroSlide * 100}%)`;
  }
  dots.forEach((d, idx) => {
    d.classList.toggle('active', idx === currentHeroSlide);
  });

  // Synchronize room info bar below the photo
  updateHeroDetails();
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
  if (captionEl) captionEl.textContent = slide.captionTh;
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
  heroSlideTimer = setInterval(nextSlide, 4500);
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
  const indicator = document.getElementById('galleryCountIndicator');
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
    summaryBox.innerHTML = `
      <div class="unit-detail-header">
        <div>
          <h3 class="unit-detail-title">${selectedUnit.nameTh}</h3>
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
    `;
  } else if (summaryBox) {
    summaryBox.classList.remove('show');
    summaryBox.innerHTML = '';
  }

  // Render gallery photos
  grid.innerHTML = '';
  grid.scrollLeft = 0; // Reset horizontal scroll to start

  photos.forEach((photo, idx) => {
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
    item.addEventListener('click', () => openLightbox(idx));
    grid.appendChild(item);
  });

  if (indicator) {
    indicator.textContent = `แสดงรูปภาพทั้งหมด ${photos.length} รูป (เลื่อนแนวนอน 3 แถว • แตะรูปเพื่อดูภาพขยาย)`;
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
      grid.scrollBy({ left: -420, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
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
    const textMsg = encodeURIComponent(`สวัสดีครับ สนใจเช่าคอนโด Lumpini Condotown Rattanathibet ${roomTitle} (ราคา ${photo.price}.-/เดือน) สะดวกขอนัดดูห้องครับ`);
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
