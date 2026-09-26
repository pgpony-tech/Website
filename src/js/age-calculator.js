// PG PONY age calculator.
//
// Baseball follows the PONY national standard: eligibility is set by a player's
// age as of April 30 of the season year. That "season year" is computed dynamically
// (not hardcoded) — before May 1 we're still inside the current spring season's
// cutoff window, so it's this calendar year; from May 1 on, the site is already
// looking ahead to next spring, so it rolls forward a year.
//
// Softball follows the USA Softball / Central Coast Softball cutoff PG PONY actually
// uses (per pgpony.com): September 1, the fall before that same spring season —
// which is why the classification math below mirrors USA Softball's own JO age
// calculator (age--  when the birthdate falls after the cutoff date), just pinned
// to PG PONY's real cutoff date instead of a picklist of dates.
//
// PG PONY doesn't offer a separate "Foal" (ages 3–4) baseball division the way the
// raw national PONY chart does — pgpony.com's own division list folds those ages
// into 6U - Shetland (ages 4–6) — so league age is mapped onto PG PONY's five real
// divisions, not the unabridged national chart.
//
// The date of birth is three plain text fields (MM / DD / YYYY) rather than a
// native <input type="date">: browsers' native date control doesn't reliably cap
// its year sub-field at 4 digits (Chromium's internal control accepts far more),
// so a real HTML `maxlength` on a plain input is what actually enforces it. Focus
// auto-selects each field's contents so typing into an already-filled field
// overwrites it from scratch instead of appending.
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-age-calc]");
  if (!root) return;

  const sportButtons = root.querySelectorAll(".age-calc__sport-btn");
  const noteEl = root.querySelector("[data-sport-note]");
  const resultEl = root.querySelector("[data-result]");

  const dobParts = {
    mm: root.querySelector('[data-dob-part="mm"]'),
    dd: root.querySelector('[data-dob-part="dd"]'),
    yyyy: root.querySelector('[data-dob-part="yyyy"]'),
  };

  const NOTES = {
    baseball: "Coed — predominantly boys, but open to girls as well.",
    softball: "Girls only.",
  };

  let sport = "baseball";

  function seasonYear(today) {
    const cutoffPassed = today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() > 30);
    return cutoffPassed ? today.getFullYear() + 1 : today.getFullYear();
  }

  // Age as of a target date, PONY/USA-Softball style: count the birthday that
  // already happened on or before the target date; don't count one that hasn't.
  function ageAsOf(birthdate, asOf) {
    let age = asOf.getFullYear() - birthdate.getFullYear();
    const asOfKey = asOf.getMonth() * 100 + asOf.getDate();
    const birthKey = birthdate.getMonth() * 100 + birthdate.getDate();
    if (birthKey > asOfKey) age--;
    return age;
  }

  function baseballDivision(age) {
    if (age < 4) {
      return { label: "Not yet eligible", meta: "PG PONY's youngest baseball division (6U - Shetland) starts at age 4." };
    }
    if (age <= 6) return { label: "6U - Shetland" };
    if (age <= 8) return { label: "8U - Pinto" };
    if (age <= 10) return { label: "10U - Mustang" };
    if (age <= 12) return { label: "12U - Bronco" };
    if (age <= 14) return { label: "14U - Pony" };
    if (age <= 18) {
      return {
        label: "Play at Pacific Grove High School",
        meta: 'PG PONY doesn\'t offer a division at this age — contact PGHS baseball at <a href="mailto:vbaseball@pgusd.org">vbaseball@pgusd.org</a>.',
      };
    }
    return { label: "Not offered", meta: "PG PONY doesn't offer adult programs." };
  }

  function softballDivision(age) {
    if (age < 4) {
      return { label: "Not yet eligible", meta: "PG PONY's youngest softball division (6U - Sof-T-Ball) starts at age 4." };
    }
    if (age <= 6) return { label: "6U - Sof-T-Ball" };
    if (age <= 8) return { label: "8U - Pre-Rookies" };
    if (age <= 10) return { label: "10U - Rookies" };
    if (age <= 12) return { label: "12U - Minors" };
    if (age <= 14) return { label: "14U - Majors" };
    if (age <= 18) {
      return {
        label: "Play at Pacific Grove High School",
        meta: 'PG PONY doesn\'t offer a division at this age — contact PGHS softball at <a href="mailto:vsoftball@pgusd.org">vsoftball@pgusd.org</a>.',
      };
    }
    return { label: "Not offered", meta: "PG PONY doesn't offer adult programs." };
  }

  // Only returns a birthdate once all three fields are fully, plausibly filled —
  // hidden (via render's caller) otherwise, so nothing shows for a mid-typed date.
  function readBirthdate() {
    const mm = dobParts.mm.value;
    const dd = dobParts.dd.value;
    const yyyy = dobParts.yyyy.value;
    if (mm.length !== 2 || dd.length !== 2 || yyyy.length !== 4) return null;

    const month = Number(mm);
    const day = Number(dd);
    const year = Number(yyyy);
    const thisYear = new Date().getFullYear();
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > thisYear) return null;

    const birthdate = new Date(year, month - 1, day);
    // Catches invalid calendar dates (e.g. Feb 30) that Date() would otherwise roll over.
    if (birthdate.getMonth() !== month - 1 || birthdate.getDate() !== day) return null;
    return birthdate;
  }

  function render() {
    const birthdate = readBirthdate();
    if (!birthdate) {
      resultEl.hidden = true;
      return;
    }

    const year = seasonYear(new Date());
    const cutoff = sport === "baseball" ? new Date(year, 3, 30) : new Date(year - 1, 8, 1);
    const cutoffLabel = sport === "baseball" ? `April 30, ${year}` : `September 1, ${year - 1}`;
    const age = ageAsOf(birthdate, cutoff);
    const division = sport === "baseball" ? baseballDivision(age) : softballDivision(age);

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="age-calc__result-division">${division.label}</div>
      <p class="age-calc__result-meta">League age ${age} as of the ${cutoffLabel} cutoff.${division.meta ? " " + division.meta : ""}</p>
    `;
  }

  sportButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      sportButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      sport = btn.dataset.sport;
      noteEl.textContent = NOTES[sport];
      render();
    });
  });

  const advanceOrder = { mm: dobParts.dd, dd: dobParts.yyyy, yyyy: null };
  const retreatOrder = { dd: dobParts.mm, yyyy: dobParts.dd, mm: null };

  Object.entries(dobParts).forEach(([key, el]) => {
    // Selecting the existing value on focus means the next keystroke overwrites
    // it from scratch rather than inserting into (and overflowing past) it.
    el.addEventListener("focus", () => el.select());

    el.addEventListener("input", () => {
      el.value = el.value.replace(/[^0-9]/g, "").slice(0, el.maxLength);
      if (el.value.length === el.maxLength && advanceOrder[key]) {
        advanceOrder[key].focus();
      }
      render();
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && el.value === "" && retreatOrder[key]) {
        retreatOrder[key].focus();
        return;
      }
      // The cursor can sit in an already-full field without a fresh focus event
      // (e.g. right after finishing the year, still parked there) — maxlength
      // would otherwise just block further digits instead of overwriting them.
      const isDigit = /^[0-9]$/.test(e.key);
      const isFull = el.value.length === el.maxLength;
      const hasNoSelection = el.selectionStart === el.selectionEnd;
      if (isDigit && isFull && hasNoSelection) {
        el.select();
      }
    });
  });
});
