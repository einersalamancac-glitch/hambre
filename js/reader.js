// ============================================================
// reader.js — orquesta la carga del libro, la paginación, los
// controles de la interfaz, los gestos táctiles y la memoria
// de lectura.
// ============================================================
(function () {
  "use strict";

  const FONT_MIN = 0.75;
  const FONT_MAX = 1.9;
  const FONT_STEP = 0.1;

  const app = document.getElementById("app");
  const viewport = document.getElementById("viewport");
  const stage = document.getElementById("stage");
  const leaf = document.getElementById("leaf");
  const leafFront = document.getElementById("leaf-front");
  const leafBack = document.getElementById("leaf-back");
  const leafShadow = document.getElementById("leaf-shadow");
  const pageUnder = document.getElementById("page-under");

  const chapterLabel = document.getElementById("chapter-label");
  const pageIndicator = document.getElementById("page-indicator");
  const progressSlider = document.getElementById("progress-slider");
  const btnToc = document.getElementById("btn-toc");
  const btnTocClose = document.getElementById("btn-toc-close");
  const tocOverlay = document.getElementById("toc-overlay");
  const tocList = document.getElementById("toc-list");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const btnTextMinus = document.getElementById("btn-text-minus");
  const btnTextPlus = document.getElementById("btn-text-plus");
  const tapPrev = document.getElementById("tap-prev");
  const tapNext = document.getElementById("tap-next");

  let PAGES = [];
  let TOC = [];
  let pageTurn = null;
  let fontScale = 1;
  let chromeVisible = false;
  let resizeTimer = null;

  // ---------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setFontScale(v, skipRepaginate) {
    fontScale = clamp(Math.round(v * 100) / 100, FONT_MIN, FONT_MAX);
    document.documentElement.style.setProperty("--font-scale", fontScale);
    Storage.save({ fontScale: fontScale });
    if (!skipRepaginate) repaginate();
  }

  function showChrome(show) {
    chromeVisible = show;
    app.classList.toggle("chrome-visible", show);
  }

  function toggleChrome() { showChrome(!chromeVisible); }

  // ---------------------------------------------------------
  // Paginación
  // ---------------------------------------------------------
  function stageSize() {
    return { w: stage.clientWidth, h: stage.clientHeight };
  }

  function buildToc() {
    tocList.innerHTML = "";
    TOC.forEach(function (item) {
      const btn = document.createElement("button");
      btn.className = "toc-item" + (item.isPart ? " part-item" : "");
      btn.textContent = item.title;
      btn.addEventListener("click", function () {
        pageTurn.goTo(item.pageIndex);
        showChrome(false);
        tocOverlay.classList.add("hidden");
      });
      tocList.appendChild(btn);
    });
  }

  function updateUiForPage(index) {
    const total = PAGES.length;
    const p = PAGES[index];
    chapterLabel.textContent = p && p.chapterNum
      ? "Capítulo " + p.chapterNum
      : (BOOK_DATA.meta.title);
    pageIndicator.textContent = "Página " + (index + 1) + " / " + total;
    progressSlider.max = String(Math.max(0, total - 1));
    progressSlider.value = String(index);
    Storage.save({ pageIndex: index });
  }

  function repaginate(preserve) {
    preserve = preserve || {};
    const prevChapter = PAGES.length && pageTurn ? (PAGES[pageTurn.current()] || {}).chapterNum : null;
    const prevRatio = PAGES.length && pageTurn ? pageTurn.current() / Math.max(1, PAGES.length - 1) : 0;

    app.classList.add("loading");

    // pequeño respiro para que el navegador pinte el estado "cargando"
    setTimeout(function () {
      const size = stageSize();
      const result = Paginator.paginate(BOOK_DATA, size.w, size.h);
      PAGES = result.pages;
      TOC = result.toc;
      buildToc();

      if (!pageTurn) {
        pageTurn = createPageTurn({
          stageEl: stage,
          leafEl: leaf,
          leafFrontEl: leafFront,
          leafBackEl: leafBack,
          leafShadowEl: leafShadow,
          pageUnderEl: pageUnder,
          getPageHtml: function (i) { return PAGES[i] ? PAGES[i].html : null; },
          getTotalPages: function () { return PAGES.length; },
          onChange: updateUiForPage,
        });
      }

      let targetIndex = 0;
      const saved = Storage.load();
      if (preserve.useSaved && typeof saved.pageIndex === "number") {
        targetIndex = saved.pageIndex;
      } else if (prevChapter) {
        const firstOfChapter = PAGES.findIndex(function (pg) { return pg.chapterNum === prevChapter; });
        targetIndex = firstOfChapter >= 0 ? firstOfChapter : Math.round(prevRatio * (PAGES.length - 1));
      } else {
        targetIndex = Math.round(prevRatio * (PAGES.length - 1));
      }
      targetIndex = clamp(targetIndex, 0, PAGES.length - 1);

      pageTurn.goTo(targetIndex);
      app.classList.remove("loading");
    }, 20);
  }

  // ---------------------------------------------------------
  // Gestos táctiles / arrastre de página
  // ---------------------------------------------------------
  let ptrActive = false;
  let ptrId = null;
  let startX = 0, startY = 0, decided = false, isDragGesture = false;
  const TAP_MAX_MOVE = 10;
  const DRAG_THRESHOLD = 8;

  function onPointerDown(e) {
    if (e.target.closest(".chrome") || e.target.closest(".overlay")) return;
    if (pageTurn && pageTurn.isAnimating()) return;
    ptrActive = true;
    ptrId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    decided = false;
    isDragGesture = false;
    viewport.setPointerCapture && viewport.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!ptrActive || e.pointerId !== ptrId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!decided) {
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        decided = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          isDragGesture = true;
          const dir = dx < 0 ? "next" : "prev";
          pageTurn.beginDrag(dir);
        }
      }
    }

    if (isDragGesture) {
      e.preventDefault();
      pageTurn.updateDrag(dx, stage.clientWidth);
    }
  }

  function onPointerUp(e) {
    if (!ptrActive || e.pointerId !== ptrId) return;
    ptrActive = false;

    if (isDragGesture) {
      pageTurn.endDrag();
    } else {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < TAP_MAX_MOVE && Math.abs(dy) < TAP_MAX_MOVE) {
        handleTap(e.clientX);
      }
    }
    decided = false;
    isDragGesture = false;
  }

  function handleTap(clientX) {
    const w = window.innerWidth;
    const ratio = clientX / w;
    if (ratio < 0.28) {
      pageTurn.prev();
    } else if (ratio > 0.72) {
      pageTurn.next();
    } else {
      toggleChrome();
    }
  }

  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);

  // Botones de zona de toque (accesibilidad / lectores de pantalla)
  tapPrev.addEventListener("click", function () { if (pageTurn) pageTurn.prev(); });
  tapNext.addEventListener("click", function () { if (pageTurn) pageTurn.next(); });

  // ---------------------------------------------------------
  // Teclado
  // ---------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (!pageTurn) return;

    if (e.key === "ArrowRight") { pageTurn.next(); }
    else if (e.key === "ArrowLeft") { pageTurn.prev(); }
    else if (e.key === " ") { e.preventDefault(); pageTurn.next(); }
    else if (e.key === "Backspace") { e.preventDefault(); pageTurn.prev(); }
    else if (e.key === "Escape") { tocOverlay.classList.add("hidden"); }
  });

  // ---------------------------------------------------------
  // Controles de interfaz
  // ---------------------------------------------------------
  btnToc.addEventListener("click", function () {
    tocOverlay.classList.remove("hidden");
  });
  btnTocClose.addEventListener("click", function () {
    tocOverlay.classList.add("hidden");
  });
  tocOverlay.addEventListener("click", function (e) {
    if (e.target === tocOverlay) tocOverlay.classList.add("hidden");
  });

  btnTextMinus.addEventListener("click", function () { setFontScale(fontScale - FONT_STEP); });
  btnTextPlus.addEventListener("click", function () { setFontScale(fontScale + FONT_STEP); });

  progressSlider.addEventListener("change", function () {
    if (pageTurn) pageTurn.goTo(parseInt(progressSlider.value, 10));
  });

  btnFullscreen.addEventListener("click", function () {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen && el.requestFullscreen()) ||
      (el.webkitRequestFullscreen && el.webkitRequestFullscreen());
    } else {
      (document.exitFullscreen && document.exitFullscreen()) ||
      (document.webkitExitFullscreen && document.webkitExitFullscreen());
    }
  });

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { repaginate(); }, 250);
  });
  window.addEventListener("orientationchange", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { repaginate(); }, 350);
  });

  // ---------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------
  function init() {
    const saved = Storage.load();
    setFontScale(typeof saved.fontScale === "number" ? saved.fontScale : 1, true);
    repaginate({ useSaved: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
