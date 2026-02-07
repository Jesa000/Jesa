// script.js
(function () {
  const GALLERY_ID = "gallery";

  const LIGHTBOX_ID = "lightbox";
  const LB_IMG_ID = "lbImg";
  const LB_PREV_ID = "lbPrev";
  const LB_NEXT_ID = "lbNext";
  const LB_CLOSE_ID = "lbClose";

  function $(id) { return document.getElementById(id); }

  function normalizePath(p) {
    return (p || "").replace(/^images\//, "");
  }

  function baseName(file) {
    const last = (file || "").split("/").pop() || "";
    const parts = last.split(".");
    parts.pop();
    return parts.join(".") || last;
  }

  function lockScroll(lock) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function showMessage(text) {
    const gallery = $(GALLERY_ID);
    if (!gallery) return;
    gallery.innerHTML = `<div class="gallery-message">${text}</div>`;
  }

  function buildGallery(items) {
    const gallery = $(GALLERY_ID);
    if (!gallery) return [];

    gallery.innerHTML = "";
    const anchors = [];

    items.forEach((item) => {
      const file = normalizePath(item.file);
      const title = item.title || baseName(file);
      const thumbSrc = `images/${file}`;

      const a = document.createElement("a");
      a.className = "work";
      a.href = thumbSrc;
      a.dataset.full = thumbSrc;
      a.dataset.title = title;

      const img = document.createElement("img");
      img.src = thumbSrc;
      img.alt = title;
      img.loading = "lazy";
      img.decoding = "async";

      img.onload = () => img.classList.add("loaded");
      if (img.complete) img.classList.add("loaded");

      img.onerror = () => a.remove();

      const cap = document.createElement("div");
      cap.className = "caption";
      cap.textContent = title;

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

    if (!lb || !lbImg || !lbPrev || !lbNext || !lbClose) return;

    let index = 0;
    let touchStartX = null;

    function setLightboxSrc(i) {
      const a = anchors[i];
      if (!a) return;

      lbImg.style.opacity = "0";
      lbImg.src = a.dataset.full;
      lbImg.alt = a.dataset.title;

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

    // Swipe
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
      if (!res.ok) throw new Error("images.json introuvable");

      const data = await res.json();

      const photos = Array.isArray(data.photos) ? data.photos : [];
      if (!photos.length) {
        showMessage("Aucune image pour le moment.");
        return;
      }

      const anchors = buildGallery(photos);
      setupLightbox(anchors);

    } catch (err) {
      console.error(err);
      showMessage("Erreur de chargement : vérifie images.json.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
