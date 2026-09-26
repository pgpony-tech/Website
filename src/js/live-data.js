(function () {
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  async function fetchJson(path) {
    try {
      const res = await fetch(path, { headers: { accept: "application/json" } });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function personCardHtml(person) {
    const name = person.name || "";
    const nameClass = name ? "person-card__name" : "person-card__name person-card__name--vacant";
    const emailHtml = person.email
      ? `<a class="person-card__email" href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a>`
      : "";
    return `
      <div class="card card--elevated card--accent-bar person-card">
        <span class="person-card__role">${escapeHtml(person.role)}</span>
        <span class="${nameClass}">${escapeHtml(name || "Vacant")}</span>
        ${emailHtml}
      </div>`;
  }

  function hydrateFieldStatus(data) {
    const el = document.getElementById("field-status");
    if (!el || !data) return;
    el.innerHTML = `
      <div class="alert alert--${escapeHtml(data.tone || "info")}">
        <div class="alert__body">
          <span class="alert__title">${escapeHtml(data.title)}</span>
          <p class="alert__message">${escapeHtml(data.message)}</p>
        </div>
      </div>`;
  }

  function hydrateRegistrationStatus(data) {
    const el = document.getElementById("registration-status");
    if (!el || !data || !data.message) return;
    el.textContent = data.message;
  }

  function hydrateFields(data) {
    if (!data || !Array.isArray(data)) return;

    const nav = document.getElementById("fields-nav-list");
    if (nav) {
      nav.innerHTML = data
        .map(
          (f) =>
            `<li style="margin-bottom:var(--space-2);"><a href="#${escapeHtml(f.slug)}">${escapeHtml(f.name)}</a></li>`
        )
        .join("");
    }

    const grid = document.getElementById("fields-grid");
    if (grid) {
      grid.innerHTML = data
        .map((f) => {
          const games =
            f.gamesPlayed && f.gamesPlayed.active
              ? escapeHtml((f.gamesPlayed.divisions || []).join(", "))
              : '<span class="text-muted">Not held here</span>';
          const practices =
            f.practices && f.practices.active
              ? escapeHtml((f.practices.divisions || []).join(", "))
              : '<span class="text-muted">Not held here</span>';
          const concessions = f.concessionStand
            ? '<span style="color:var(--status-success);">✓ Yes</span>'
            : '<span class="text-muted">✕ No</span>';
          return `
            <div id="${escapeHtml(f.slug)}" class="card card--elevated field-card">
              <h3 style="text-transform:uppercase;margin-bottom:var(--space-2);">${escapeHtml(f.name)}</h3>
              <p class="text-muted" style="margin-bottom:var(--space-4);">${escapeHtml(f.description)}</p>
              <p style="font-size:var(--text-sm);margin-bottom:var(--space-2);"><strong>Games played:</strong> ${games}</p>
              <p style="font-size:var(--text-sm);margin-bottom:var(--space-2);"><strong>Practices:</strong> ${practices}</p>
              <p style="font-size:var(--text-sm);margin-bottom:var(--space-4);"><strong>Concession stand:</strong> ${concessions}</p>
              <a class="btn btn--secondary btn--sm" href="${escapeHtml(f.mapUrl)}" target="_blank" rel="noopener">View on Google Maps</a>
            </div>`;
        })
        .join("");
    }
  }

  function hydrateBoard(data) {
    const el = document.getElementById("board-content");
    if (!el || !data) return;

    const group = (people) => (people || []).map(personCardHtml).join("");
    const vacancy = data.vacancyContact || {};

    el.innerHTML = `
      <div class="section-heading">
        <div class="section-heading__text">
          <span class="section-heading__eyebrow">${escapeHtml(data.termLabel)}</span>
          <h2 class="section-heading__title">Who to contact</h2>
          <p class="section-heading__desc">${escapeHtml(data.votedIn)} · Last updated ${escapeHtml(data.lastUpdated)}</p>
        </div>
      </div>

      <div class="alert alert--info mb-9">
        <div class="alert__body">
          <span class="alert__title">Vacant position?</span>
          <p class="alert__message">Email <a href="mailto:${escapeHtml(vacancy.email)}">${escapeHtml(vacancy.name)}</a>.</p>
        </div>
      </div>

      <h3 style="text-transform:uppercase;">Executive board</h3>
      <div class="grid-3 mb-9">${group(data.executive)}</div>

      <h3 style="text-transform:uppercase;">General board</h3>
      <div class="grid-3 mb-9">${group(data.general)}</div>

      <h3 style="text-transform:uppercase;">Division representatives</h3>
      <span class="eyebrow">Baseball reps</span>
      <div class="grid-4 mb-6">${group(data.baseballReps)}</div>
      <span class="eyebrow">Softball reps</span>
      <div class="grid-4">${group(data.softballReps)}</div>`;
  }

  function hydrateSponsors(data) {
    const el = document.getElementById("sponsor-grid");
    if (!el || !Array.isArray(data)) return;
    el.innerHTML = data
      .map((s) => {
        const inner = s.logo
          ? `<img src="/${escapeHtml(s.logo)}" alt="${escapeHtml(s.name)}" loading="lazy">`
          : `<span class="sponsor-tile__name">${escapeHtml(s.name)}</span>`;
        return `<a class="sponsor-tile" href="${escapeHtml(s.url)}" target="_blank" rel="noopener" title="${escapeHtml(s.name)}">${inner}</a>`;
      })
      .join("");
  }

  function heroSlideInnerHtml(slide) {
    const hasText = slide.title || slide.lede || (slide.ctaLabel && slide.ctaHref);
    const imgClass = hasText ? "hero__photo" : "hero__photo hero__photo--contain";
    const img = `<img class="${imgClass}" src="/media/${encodeURIComponent(slide.image)}" alt="${escapeHtml(slide.alt || "")}">`;

    let body;
    if (hasText) {
      const eyebrow = slide.eyebrow ? `<span class="hero__eyebrow">${escapeHtml(slide.eyebrow)}</span>` : "";
      const title = slide.title ? `<p class="hero__slide-title">${escapeHtml(slide.title)}</p>` : "";
      const lede = slide.lede ? `<p class="hero__lede">${escapeHtml(slide.lede)}</p>` : "";
      const cta =
        slide.ctaLabel && slide.ctaHref
          ? `<div class="hero__actions"><a class="btn btn--accent btn--lg" href="${escapeHtml(slide.ctaHref)}">${escapeHtml(slide.ctaLabel)}</a></div>`
          : "";
      body = `
        ${img}
        <div class="hero__scrim"></div>
        <div class="hero__inner">
          <div class="hero__content">
            ${eyebrow}
            ${title}
            ${lede}
            ${cta}
          </div>
        </div>`;
    } else {
      // Slide is a pre-designed graphic (text baked into the image) — show it as-is, no scrim/overlay.
      body = img;
    }

    return slide.href
      ? `<a class="hero__slide-link" href="${escapeHtml(slide.href)}">${body}</a>`
      : body;
  }

  function hydrateHero(slides) {
    const hero = document.getElementById("hero");
    const dotsEl = document.getElementById("hero-dots");
    if (!hero || !dotsEl || !Array.isArray(slides) || slides.length === 0) return;

    slides.forEach((slide, i) => {
      const div = document.createElement("div");
      div.className = "hero__slide";
      div.dataset.index = String(i + 1);
      div.innerHTML = heroSlideInnerHtml(slide);
      dotsEl.before(div);
    });

    const slideEls = Array.from(hero.querySelectorAll(".hero__slide"));
    const total = slideEls.length;

    slideEls.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hero__dot" + (i === 0 ? " hero__dot--active" : "");
      dot.setAttribute("aria-label", `Show slide ${i + 1}`);
      dot.addEventListener("click", () => goTo(i, true));
      dotsEl.appendChild(dot);
    });
    dotsEl.hidden = false;

    const dotEls = Array.from(dotsEl.children);
    let current = 0;
    let timer = null;

    function goTo(index, userInitiated) {
      slideEls[current].classList.remove("hero__slide--active");
      dotEls[current].classList.remove("hero__dot--active");
      current = index;
      slideEls[current].classList.add("hero__slide--active");
      dotEls[current].classList.add("hero__dot--active");
      if (userInitiated) restart();
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function start() {
      if (reduceMotion) return;
      timer = setInterval(() => goTo((current + 1) % total, false), 6000);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    function restart() {
      stop();
      start();
    }

    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", start);

    start();
  }

  async function run() {
    const tasks = [];
    if (document.getElementById("field-status")) {
      tasks.push(fetchJson("/api/field-status").then(hydrateFieldStatus));
    }
    if (document.getElementById("registration-status")) {
      tasks.push(fetchJson("/api/registration-status").then(hydrateRegistrationStatus));
    }
    if (document.getElementById("fields-nav-list") || document.getElementById("fields-grid")) {
      tasks.push(fetchJson("/api/fields").then(hydrateFields));
    }
    if (document.getElementById("board-content")) {
      tasks.push(fetchJson("/api/board").then(hydrateBoard));
    }
    if (document.getElementById("sponsor-grid")) {
      tasks.push(fetchJson("/api/sponsors").then(hydrateSponsors));
    }
    if (document.getElementById("hero")) {
      tasks.push(fetchJson("/api/hero-slides").then(hydrateHero));
    }
    await Promise.all(tasks);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
