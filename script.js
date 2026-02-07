// script.js
// Builds the gallery from images.json, adds auto-captions (filename),
// soft fade-in on load, and a lightbox (prev/next/close + keyboard + swipe).

(function () {
  const GALLERY_ID = "gallery";
  const LIGHTBOX_ID = "lightbox";
  const LB_IMG_ID = "lbImg";
  const LB_PREV_ID = "lbPrev";
  const LB_NEXT_ID = "lbNext";
  const LB_CLOSE_ID = "lbClose";

  function $(id) { return document.getElementById(id); }

  function normalizeName(name) {
    // allow "photo1.jpg" OR "images/photo1.jpg"
    return (name || "").replace(/^images\//, "");
  }

  function baseName(file) {
    const last = (file || "").split("/").pop() || "";
    const parts = last.split(".");
    parts.pop();
    return parts.join(".") || last;
  }

  function withExt(name, ext) {
    const b = baseName(name);
    return `images/${b}.${ext}`;
  }

  function lockScroll(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function buildGallery(items) {
    const gallery = $(GALLERY_ID);
    if (!gallery) {
      console.error(`script.js: #${GALLERY_ID} introuvable`);
      return [];
    }

    gallery.innerHTML = "";
    const anchors = [];

    items.forEach((item, i) => {
      const name = normalizeName(item.file);
      const title = item.title || baseName(name);


      const thumb = `images/${name}`;
      const fullPng = withExt(name, "png");
      const fullJpg = withExt(name, "jpg");

      const a = document.createElement("a");
      a.className = "work";
      a.href = fullPng;
      a.dataset.full = fullPng;
      a.dataset.fallback = fullJpg;
      a.dataset.index = String(i);

      const img = document.createElement("img");
      img.src = thumb;
      img.alt = title;
      img.loading = "lazy";

      img.addEventListener("load", () => img.classList.add("loaded"));
      if (img.complete) img.classList.add("loaded");

      // ✅ If the thumbnail doesn't exist, remove the whole item (no broken images)
      img.onerror = () => {
        a.remove();
      };

      const cap = document.createElement("div");
      cap.className = "caption";
      cap.textContent = title;


      a.appendChild(img);
      a.appendChild(cap);
      gallery.appendChild(a);

      anchors.push(a);
    });

    return anchors.filter(a => document.body.contains(a));
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

      lbImg.style.opacity = "0";
      lbImg.onerror = null;

      lbImg.src = full;

      lbImg.onerror = () => {
        if (fallback && lbImg.src !== fallback) lbImg.src = fallback;
      };

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

    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLB();
    });

    window.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLB();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });

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
      const anchors = buildGallery(photos);

      // Rebuild anchors list after removal of broken ones
      const realAnchors = Array.from(document.querySelectorAll("a.work"));
      setupLightbox(realAnchors);
    } catch (err) {
      console.error("script.js: erreur chargement / init :", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
