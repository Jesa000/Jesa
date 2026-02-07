// script.js
// Builds the gallery from images.json, adds auto-captions (filename),
// applies a soft fade-in on load, and enables a lightbox (prev/next/close + keyboard + swipe).

(function () {
  const GALLERY_ID = "gallery";
  const LIGHTBOX_ID = "lightbox";
  const LB_IMG_ID = "lbImg";
  const LB_PREV_ID = "lbPrev";
  const LB_NEXT_ID = "lbNext";
  const LB_CLOSE_ID = "lbClose";

  function $(id) { return document.getElementById(id); }

  function baseName(file) {
    // "photo27.jpg" -> "photo27"
    const last = (file || "").split("/").pop() || "";
    const parts = last.split(".");
    parts.pop();
    return parts.join(".") || last;
  }

  function withExt(path, ext) {
    const b = baseName(path);
    return `images/${b}.${ext}`;
  }

  function lockScroll(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function markLoaded(img) {
    img.classList.add("loaded");
  }

  function buildGallery(items) {
    const gallery = $(GALLERY_ID);
    if (!gallery) {
      console.error(`script.js: #${GALLERY_ID} introuvable`);
      return [];
    }

    gallery.innerHTML = "";
    const anchors = [];

    items.forEach((name, i) => {
      const thumb = `images/${name}`;          // thumbnail (as listed in JSON)
      const fullPng = withExt(name, "png");    // expected HD
      const fullJpg = withExt(name, "jpg");    // fallback HD

      const a = document.createElement("a");
      a.className = "work";
      a.href = fullPng;                 // keep standard behavior
      a.dataset.full = fullPng;         // for lightbox
      a.dataset.fallback = fullJpg;     // if png missing
      a.dataset.index = String(i);

      const img = document.createElement("img");
      img.src = thumb;
      img.alt = baseName(name);
      img.loading = "lazy";
      img.addEventListener("load", () => markLoaded(img));
      if (img.complete) markLoaded(img);

      const cap = document.createElement("div");
      cap.className = "caption";
      cap.textContent = baseName(name);

      a.appendChild(img);
      a.appendChild(cap);
      gallery.appendChild(a);

      anchors.push(a);
    });

    return anchors;
  }

  function setupLightbox(anchors) {
    const lb = $(LIGHTBOX_ID);
    const lbImg = $(LB_IMG_ID);
    const lbPrev = $(LB_PREV_ID);
    const lbNext = $(LB_NEXT_ID);
    const lbClose = $(LB_CLOSE_ID);

    if (!lb || !lbImg || !lbPrev || !lbNext || !lbClose) {
      console.error("script.js: éléments lightbox manquants (ids: lightbox/lbImg/lbPrev/lbNext/lbClose)");
      return;
    }

    let index = 0;
    let touchStartX = null;

    function setLightboxSrc(i) {
      const a = anchors[i];
      if (!a) return;

      const full = a.dataset.full || a.getAttribute("href") || "";
      const fallback = a.dataset.fallback || "";

      // reset opacity transition
      lbImg.style.opacity = "0";
      lbImg.onerror = null;

      lbImg.src = full;

      // fallback if png missing
      lbImg.onerror = () => {
        if (fallback && lbImg.src !== fallback) {
          lbImg.src = fallback;
        }
      };

      // force fade-in when loaded
      lbImg.onload = () => {
        requestAnimationFrame(() => (lbImg.style.opacity = "1"));
      };
    }

    function openLB(i) {
      index = i;
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      lockScroll(true);
      setLightboxSrc(index);
    }

    function closeLB() {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      lockScroll(false);
      lbImg.src = "";
      lbImg.style.opacity = "0";
    }

    function prev() {
      index = (index - 1 + anchors.length) % anchors.length;
      setLightboxSrc(index);
    }

    function next() {
      index = (index + 1) % anchors.length;
      setLightboxSrc(index);
    }

    anchors.forEach((a, i) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openLB(i);
      });
    });

    lbPrev.addEventListener("click", prev);
    lbNext.addEventListener("click", next);
    lbClose.addEventListener("click", closeLB);

    // click outside image closes
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLB();
    });

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLB();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });

    // swipe
    lb.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    lb.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;

      if (Math.abs(dx) < 40) return;
      if (dx > 0) prev();
      else next();
    }, { passive: true });
  }

  async function init() {
    try {
      const res = await fetch("images.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`images.json introuvable (${res.status})`);
      const data = await res.json();

      const photos = Array.isArray(data.photos) ? data.photos : [];
      if (!photos.length) {
        console.warn("script.js: images.json -> photos[] vide");
      }

      const anchors = buildGallery(photos);
      setupLightbox(anchors);
    } catch (err) {
      console.error("script.js: erreur chargement / init :", err);
    }
  }

  // run when DOM is ready (safe even if script is at end of body)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
