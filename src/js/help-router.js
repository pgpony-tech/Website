// "Get help" page: sends the visitor's question to the Worker's /api/help
// route, which asks Claude which board member(s) can help, then shows them
// with ready-to-send email links. If anything goes wrong it falls back to the
// Vice President and the full board list.
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-help-router]");
  if (!form) return;

  const input = form.querySelector('[name="question"]');
  const submitBtn = form.querySelector("[data-help-submit]");
  const resultEl = document.querySelector("[data-help-result]");
  const examplesEl = form.querySelector("[data-help-examples]");
  const FALLBACK_EMAIL = "vicepresident@pgpony.org";

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function mailto(email, question) {
    const subject = encodeURIComponent("Question from the PG PONY website");
    const body = encodeURIComponent(`${question}\n\n`);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  function contactHtml(c, question) {
    return `
      <div class="help-contact">
        <span class="help-contact__role">${escapeHtml(c.role)}</span>
        <span class="help-contact__name">${escapeHtml(c.name || c.email)}</span>
        ${c.reason ? `<p class="help-contact__reason">${escapeHtml(c.reason)}</p>` : ""}
        <a class="btn btn--primary btn--sm" href="${escapeHtml(mailto(c.email, question))}">Email ${escapeHtml(c.email)}</a>
      </div>`;
  }

  function render(data, question) {
    const links = (data.links || [])
      .map((l) => `<a class="help-router__link" href="${escapeHtml(l.href)}">${escapeHtml(l.title)} →</a>`)
      .join("");
    resultEl.innerHTML = `
      <span class="eyebrow">Here's who can help</span>
      ${data.answer ? `<p class="help-router__answer">${escapeHtml(data.answer)}</p>` : ""}
      <div class="help-router__contacts">${data.contacts.map((c) => contactHtml(c, question)).join("")}</div>
      ${links ? `<div class="help-router__links"><span class="eyebrow">Also useful</span>${links}</div>` : ""}
      <p class="help-router__note">Your email app will open with your question filled in. Not quite right? <a href="/board/">See the whole board</a>.</p>`;
    resultEl.hidden = false;
  }

  function renderFallback(question, message) {
    render(
      {
        answer: message || "We couldn't look that up right now, but the Vice President can answer or point you to the right person.",
        contacts: [{ role: "Vice President", name: "", email: FALLBACK_EMAIL, reason: "" }],
        links: [{ href: "/board/", title: "Board of Directors" }],
      },
      question
    );
  }

  if (examplesEl) {
    examplesEl.hidden = false;
    examplesEl.querySelectorAll("[data-help-example]").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = btn.textContent;
        input.focus();
      });
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) {
      input.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Finding the right person…";
    resultEl.hidden = true;
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || res.status === 400) {
        renderFallback(question, data.error);
      } else if (!res.ok || !data.ok) {
        renderFallback(question);
      } else {
        render(data, question);
      }
    } catch {
      renderFallback(question);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Find the right person";
      if (!resultEl.hidden) resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
});
