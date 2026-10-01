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

  // Same normalization as the dutyLinks filter in .eleventy.js.
  function roleKey(role) {
    return String(role).toLowerCase().replace(/&/g, "and").replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+\d+$/, "").replace(/s$/, "").replace(/\s+/g, " ").trim();
  }

  const DUTY_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>';

  function personCardHtml(person, coverer, dutyId) {
    const name = person.name || "";
    const nameClass = name ? "person-card__name" : "person-card__name person-card__name--vacant";
    const covering = !name && coverer;
    const coverHtml = covering
      ? `<span class="person-card__cover">Covered by ${escapeHtml(coverer.role)}${coverer.name ? ` (${escapeHtml(coverer.name)})` : ""}</span>`
      : "";
    const email = person.email || (covering ? coverer.email : "");
    const emailHtml = email
      ? `<a class="person-card__email" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
      : "";
    return `
      <div class="card card--elevated card--accent-bar person-card">
        ${dutyId ? `<a class="person-card__duties" href="/board-roles/#${escapeHtml(dutyId)}" aria-label="${escapeHtml(person.role)} duties" title="Role duties">${DUTY_ICON}</a>` : ""}
        <span class="person-card__role">${escapeHtml(person.role)}</span>
        <span class="${nameClass}">${escapeHtml(name || "Vacant")}</span>
        ${coverHtml}
        ${emailHtml}
      </div>`;
  }

  function hydrateFieldStatus(data) {
    const el = document.getElementById("field-status");
    if (!el) return;
    if (!data || !data.message) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const actionLabel = el.dataset.actionLabel;
    const actionHref = el.dataset.actionHref;
    const action =
      actionLabel && actionHref
        ? `<a class="btn btn--ghost btn--sm" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a>`
        : "";
    el.innerHTML = `
      <div class="alert alert--${escapeHtml(data.tone || "info")}">
        <div class="alert__body">
          <span class="alert__title">${escapeHtml(data.title)}</span>
          <p class="alert__message">${escapeHtml(data.message)}</p>
        </div>
        ${action}
      </div>`;
  }

  function hydrateRegistrationStatus(data) {
    const el = document.getElementById("registration-status");
    if (!el || !data || !data.message) return;
    el.textContent = data.message;
  }

  var KEY_DATE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatKeyDate(ev) {
    if (ev.allDay) {
      const [sy, sm, sd] = ev.start.split("-").map(Number);
      let meta = `${KEY_DATE_MONTHS[sm - 1]} ${sd}`;
      if (ev.end) {
        const [ey, em, ed] = ev.end.split("-").map(Number);
        const lastDayMs = Date.UTC(ey, em - 1, ed) - 86400000;
        if (lastDayMs > Date.UTC(sy, sm - 1, sd)) {
          const lastDate = new Date(lastDayMs);
          const sameMonth = lastDate.getUTCMonth() === sm - 1;
          meta += sameMonth
            ? `–${lastDate.getUTCDate()}`
            : `–${KEY_DATE_MONTHS[lastDate.getUTCMonth()]} ${lastDate.getUTCDate()}`;
        }
      }
      return { month: KEY_DATE_MONTHS[sm - 1].toUpperCase(), day: String(sd), meta };
    }
    const d = new Date(ev.start);
    const month = d.toLocaleString("en-US", { month: "short", timeZone: "America/Los_Angeles" });
    const day = d.toLocaleString("en-US", { day: "numeric", timeZone: "America/Los_Angeles" });
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
    return { month: month.toUpperCase(), day, meta: `${month} ${day} · ${time}` };
  }

  function keyDateCardHtml(ev) {
    const { month, day, meta } = formatKeyDate(ev);
    const metaParts = [meta];
    if (ev.location) metaParts.push(ev.location);
    const desc = ev.description ? `<p class="key-date-card__desc">${escapeHtml(ev.description)}</p>` : "";
    const icsHref = buildIcsDataUri(ev);
    const filename = `${slugifyForFile(ev.title)}.ics`;
    return `
      <div class="key-date-card">
        <div class="key-date-card__when">
          <span class="key-date-card__month">${escapeHtml(month)}</span>
          <span class="key-date-card__day">${escapeHtml(day)}</span>
        </div>
        <div class="key-date-card__main">
          <span class="key-date-card__title">${escapeHtml(ev.title)}</span>
          <span class="key-date-card__meta">${escapeHtml(metaParts.join(" · "))}</span>
          ${desc}
          <div class="key-date-card__cta">
            <a class="btn btn--secondary btn--sm" href="${icsHref}" download="${escapeHtml(filename)}">+ Add to calendar</a>
          </div>
        </div>
      </div>`;
  }

  function slugifyForFile(text) {
    const slug = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return slug || "event";
  }

  function escapeIcsText(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function toIcsDate(iso) {
    return iso.replace(/[-:]/g, "");
  }

  function buildIcsDataUri(ev) {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@pgpony.org`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endValue = ev.end || ev.start;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PG PONY//Key Dates//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      ev.allDay ? `DTSTART;VALUE=DATE:${toIcsDate(ev.start)}` : `DTSTART:${toIcsDate(ev.start)}`,
      ev.allDay ? `DTEND;VALUE=DATE:${toIcsDate(endValue)}` : `DTEND:${toIcsDate(endValue)}`,
      `SUMMARY:${escapeIcsText(ev.title)}`,
    ];
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    lines.push("END:VEVENT", "END:VCALENDAR");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }

  function hydrateKeyDates(data) {
    const el = document.getElementById("key-dates-list");
    if (!el) return;
    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<p class="text-muted">No upcoming key dates right now — check back soon.</p>';
      return;
    }
    const limit = el.dataset.limit ? Number(el.dataset.limit) : null;
    const items = limit ? data.slice(0, limit) : data;
    el.innerHTML = items.map(keyDateCardHtml).join("");
  }

  function hydrateFields(data) {
    if (!data || !Array.isArray(data)) return;

    const grid = document.getElementById("fields-grid");
    if (grid) {
      grid.innerHTML = data
        .map((f) => {
          const gamesDivisions = (f.gamesPlayed && f.gamesPlayed.divisions) || [];
          const practicesDivisions = (f.practices && f.practices.divisions) || [];
          const games =
            f.gamesPlayed && f.gamesPlayed.active
              ? escapeHtml(gamesDivisions.join(", "))
              : '<span class="text-muted">Not held here</span>';
          const practices =
            f.practices && f.practices.active
              ? escapeHtml(practicesDivisions.join(", "))
              : '<span class="text-muted">Not held here</span>';
          const concessions = f.concessionStand
            ? '<span style="color:var(--status-success);">✓ Yes</span>'
            : '<span class="text-muted">✕ No</span>';
          return `
            <div id="${escapeHtml(f.slug)}" class="card card--elevated field-card" data-games="${escapeHtml(gamesDivisions.join("|"))}" data-practices="${escapeHtml(practicesDivisions.join("|"))}">
              <h3 style="text-transform:uppercase;margin-bottom:var(--space-2);">${escapeHtml(f.name)}</h3>
              <p class="text-muted" style="margin-bottom:var(--space-4);">${escapeHtml(f.description)}</p>
              <p style="font-size:var(--text-sm);margin-bottom:var(--space-2);"><strong>Games played:</strong> ${games}</p>
              <p style="font-size:var(--text-sm);margin-bottom:var(--space-2);"><strong>Practices:</strong> ${practices}</p>
              <p style="font-size:var(--text-sm);margin-bottom:var(--space-4);"><strong>Concession stand:</strong> ${concessions}</p>
              <a class="btn btn--secondary btn--sm" href="${escapeHtml(f.mapUrl)}" target="_blank" rel="noopener">View on Google Maps</a>
            </div>`;
        })
        .join("");
      if (window.applyFieldFilter) window.applyFieldFilter();
    }
  }

  function hydrateBoard(data) {
    const el = document.getElementById("board-content");
    if (!el || !data) return;

    const everyone = ["executive", "general", "baseballReps", "softballReps"].flatMap((g) => data[g] || []);
    const covererOf = (person) => (person.coveredBy ? everyone.find((p) => p.role === person.coveredBy) : null);
    let dutyLinks = {};
    try { dutyLinks = JSON.parse(el.dataset.dutyLinks || "{}"); } catch {}
    // Division reps share one duties section; everyone else is looked up by title.
    const group = (people, isRep) => (people || [])
      .map((p) => personCardHtml(p, covererOf(p), dutyLinks[roleKey(isRep ? "Division Representatives" : p.role)]))
      .join("");
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
      <div class="grid-4 mb-6">${group(data.baseballReps, true)}</div>
      <span class="eyebrow">Softball reps</span>
      <div class="grid-4">${group(data.softballReps, true)}</div>`;
    if (window.applyBoardFilter) window.applyBoardFilter();
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
    const controller = document.getElementById("hero-controller");
    const controllerInner = document.getElementById("hero-controller-inner");
    if (!hero || !controller || !controllerInner || !Array.isArray(slides) || slides.length === 0) return;

    slides.forEach((slide, i) => {
      const div = document.createElement("div");
      div.className = "hero__slide";
      div.dataset.index = String(i + 1);
      div.innerHTML = heroSlideInnerHtml(slide);
      hero.appendChild(div);
    });

    const slideEls = Array.from(hero.querySelectorAll(".hero__slide"));
    const total = slideEls.length;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fillEls = slideEls.map((_, i) => {
      const seg = document.createElement("button");
      seg.type = "button";
      seg.className = "hero-controller__seg";
      seg.setAttribute("aria-label", `Show slide ${i + 1}`);
      const fill = document.createElement("span");
      fill.className = "hero-controller__seg-fill";
      seg.appendChild(fill);
      seg.addEventListener("click", () => goTo(i));
      controllerInner.appendChild(seg);
      return fill;
    });
    controller.hidden = false;

    let current = 0;

    // Re-triggering a CSS animation requires clearing it, forcing a reflow, then
    // re-adding it — the timing (and the next-slide advance, via animationend) is
    // driven entirely by the animation itself, not a JS timer, so there's no
    // interval to accidentally stack from repeated focus/hover events.
    function activateFill(index) {
      fillEls.forEach((fill) => fill.classList.remove("is-animating", "is-static"));
      const active = fillEls[index];
      void active.offsetWidth;
      active.classList.add(reduceMotion ? "is-static" : "is-animating");
    }

    function goTo(index) {
      slideEls[current].classList.remove("hero__slide--active");
      current = index;
      slideEls[current].classList.add("hero__slide--active");
      activateFill(current);
    }

    controllerInner.addEventListener("animationend", (e) => {
      if (e.animationName === "heroProgress") goTo((current + 1) % total);
    });

    goTo(0);
  }

  async function run() {
    const tasks = [];
    if (document.getElementById("field-status")) {
      tasks.push(fetchJson("/api/field-status").then(hydrateFieldStatus));
    }
    if (document.getElementById("registration-status")) {
      tasks.push(fetchJson("/api/registration-status").then(hydrateRegistrationStatus));
    }
    if (document.getElementById("fields-grid")) {
      tasks.push(fetchJson("/api/fields").then(hydrateFields));
    }
    if (document.getElementById("key-dates-list")) {
      tasks.push(fetchJson("/api/key-dates").then(hydrateKeyDates));
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
