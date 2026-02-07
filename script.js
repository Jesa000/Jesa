// script.js
// Gallery from images.json grouped by year + left year bar (Apple Photos style)
// + Lightbox (prev/next/close + keyboard + swipe)

(function () {
  const GALLERY_ID = "gallery";
  const YEARBAR_ID = "yearbar";

  const LIGHTBOX_ID = "lightbox";
  const LB_IMG_ID = "lbImg";
  const LB_PREV_ID = "lbPrev";
  const LB_NEXT_ID = "lbNext";
  const LB_CLOSE_ID = "lbClose";

  function $(id) { return document.getElementById(id); }

  function normalizePath(p) {
    // allow "photo.jpg" OR "images/photo.jpg"
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

  function groupByYear(items) {
    const map = new Map();

    items.forEach((it) => {
      const y = (it.year !== undefined && it.year !== null && it.year !== "")
        ? String(it.year)
        : "Autres";

      if (!map.has(y)) map.set(y, []);
      map.get(y).push(it);
    });

    // tri: années numériques desc, "Autres" à la fin
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "Autres") return 1;
      if (b === "Autres") return -1;

      const na = Number(a), nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return nb - na;
      return String(b).localeCompare(String(a));
    });

    return keys.map(k => [k, map.get(k)]);
  }

  function showMessage(text) {
    const gallery = $(GALLERY_ID);
    if (!gallery) return;
    gallery.innerHTML = `<div class="gallery-message">${text}</div>`;
  }

  function buildGalleryByYear(items) {
    const gallery = $(GALLERY_ID);
    if (!gallery) {
      console.error(`script.js: #${GALLERY_ID} introuvable`);
      return { years: [], anchors: [] };
    }

    gallery.innerHTML = "";

    const anchors = [];
    const years = [];

    const groups = groupByYear(items);

    groups.forEach(([year, list]) => {
      years.push(year);

      // section ancre
      const section = document.createElement("section");
      section.className = "year-section";
      section.dataset.year = year;
      section.id = `year-${year}`;

      // IMPORTANT: display: contents pour garder la grid de .gallery
      section.style.display = "contents";

      list.forEach((item) => {
        const file = normalizePath(item.file);
        const full = normalizePath(item.full || item.file);
        const title = item.title || baseName(file || full);

        const thumbSrc = `images/${file}`;
        const fullSrc = `images/${full}`;

        const a = document.createElement("a");
        a.className = "work";
        a.href = fullSrc;
        a.dataset.full = fullSrc;
        a.dataset.title = title;

        const img = document.createElement("img");
        img.src = thumbSrc;
        img.alt = title;
        img.loading = "lazy";
        img.decoding = "async";

        img.addEventListener("load", () => img.classList.add("loaded"));
        if (img.complete) img.classList.add("loaded");

        // si thumb cassé -> on retire l'item
        img.onerror = () => a.remove();

        const cap = document.createElement("div");
        cap.className = "caption";
        cap.textContent = title;

        a.appendChild(img);
        a.appendChild(cap);

        section.appendChild(a);
        anchors.push(a);
      });

      gallery.appendChild(section);
    });

    return { years, anchors };
  }

  function setupYearbar(years) {
    const bar = $(YEARBAR_ID);
    if (!bar) return;

    bar.innerHTML = "";
    const buttons = new Map();

    years.forEach((y) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = y;

      btn.addEventListener("click", () => {
        const target = document.getElementById(`year-${y}`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      bar.appendChild(btn);
      buttons.set(y, btn);
    });

    const sections = Array.from(document.querySelectorAll(".year-section"));

    // met à jour le bouton actif
    function setActive(year) {
      buttons.forEach((btn, y) => {
        btn.classList.toggle("active", y === year);
      });
    }

    // Observer : quelle section est la plus proche du haut
    const io = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (!visible.length) return;
      const currentYear = visible[0].target.dataset.year;
      if (currentYear) setActive(currentYear);
    }, {
      root: null,
      threshold: 0.01,
      rootMargin: "-20% 0px -70% 0px"
    });

    sections.forEach(s => io.observe(s));

    // initial
    if (years[0]) setActive(years[0]);
  }

  function setupLightbox(anchors) {
    const lb = $(LIGHTBOX_ID);
    const lbImg = $(LB_IMG_ID);
    const lbPrev = $(LB_PREV_ID);
    const lbNext = $(LB_NEXT_ID);
    const lbClose = $(LB_CLOSE_ID);

    if (!lb || !lbImg || !lbPrev || !lbNext || !lbClose) {
      console.error("script.js: éléments lightbox manquants");
      return;
    }

    let index = 0;
    let touchStartX = null;

    function setLightboxSrc(i) {
      const a = anchors[i];
      if (!a) return;

      const full = a.dataset.full || a.getAttribute("href") || "";
      const title = a.dataset.title || "";

      lbImg.style.opacity = "0";
      lbImg.onerror = null;

      lbImg.src = full;
      lbImg.alt = title;

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
      if (!photos.length) {
        showMessage("Aucune image pour le moment.");
        return;
      }

      const { years } = buildGalleryByYear(photos);
      setupYearbar(years);

      // Re-scan anchors after broken thumbs are removed
      const realAnchors = Array.from(document.querySelectorAll("a.work"));
      if (!realAnchors.length) {
        showMessage("Images introuvables (vérifie le dossier /images).");
        return;
      }

      setupLightbox(realAnchors);
    } catch (err) {
      console.error("script.js: erreur chargement / init :", err);
      showMessage("Erreur de chargement. Vérifie images.json et le dossier /images.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
