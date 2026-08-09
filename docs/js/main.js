/* ============================================================
   MASJID BANDAR LABIS — main.js
   Navigasi, borang (FormSubmit.co), salin akaun, QR & logo fallback.
   ============================================================ */

/* ---- KONFIGURASI ---- */
const SITE_CONFIG = {
  // E-mel penerima borang — dihantar melalui FormSubmit.co (percuma, tanpa pendaftaran).
  // Nota: pada penghantaran PERTAMA, FormSubmit akan menghantar e-mel pengesahan
  // kepada alamat ini; pihak masjid perlu klik pautan pengesahan tersebut sekali sahaja.
  formEmail: "masjidbandarlabis@gmail.com",

  // Facebook page rasmi masjid
  facebookPage: "https://www.facebook.com/masjidbandarlabis",
};

document.addEventListener("DOMContentLoaded", function () {
  initNav();
  initScrollTop();
  initReveal();
  initLogos();
  initMosqueSlider();
  initQRModal();
  initCopyAccount();
  initQRFallback();
  initForms();
  setYear();
});

/* ---------- Navigasi (mobile + dropdown) ---------- */
function initNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  const navbar = document.getElementById("navbar");

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      menu.classList.toggle("active");
      toggle.classList.toggle("active");
    });

    // Tutup menu bila pautan diklik
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menu.classList.remove("active");
        toggle.classList.remove("active");
      });
    });
  }

  // Dropdown untuk mobile: klik parent untuk buka/tutup submenu
  document.querySelectorAll(".nav-item.has-dropdown").forEach(function (item) {
    const parentLink = item.querySelector(":scope > .nav-link");
    if (window.innerWidth <= 768 && parentLink) {
      parentLink.addEventListener("click", function (e) {
        e.preventDefault();
        item.classList.toggle("open");
      });
    }
  });

  if (navbar) {
    window.addEventListener("scroll", function () {
      navbar.classList.toggle("scrolled", window.scrollY > 10);
    });
  }
}

/* ---------- Butang kembali ke atas ---------- */
function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  if (!btn) return;
  window.addEventListener("scroll", function () {
    btn.classList.toggle("visible", window.scrollY > 320);
  });
  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ---------- Animasi kemunculan semasa scroll ---------- */
function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach((el) => el.classList.add("revealed"));
    return;
  }
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => observer.observe(el));
}

/* ---------- Logo masjid: papar imej jika wujud, fallback emoji ---------- */
function initLogos() {
  document.querySelectorAll(".logo-img").forEach(function (img) {
    var fallback = img.parentElement.querySelector(".logo-fallback");

    function show() {
      img.hidden = false;
      if (fallback) fallback.hidden = true;
    }
    function hide() {
      img.hidden = true;
      if (fallback) fallback.hidden = false;
    }

    img.addEventListener("load", show);
    img.addEventListener("error", hide);
    // Imej mungkin sudah dimuat/gagal sebelum listener dipasang
    if (img.complete) {
      if (img.naturalWidth > 0) show();
      else hide();
    }
  });
}

/* ---------- Slider gambar masjid (auto-scroll galeri) ---------- */
function initMosqueSlider() {
  const slider = document.getElementById("mosqueSlider");
  if (!slider) return;
  const slides = slider.querySelectorAll(".mosque-slide");
  if (!slides.length) return;

  let index = 0;
  slides[index].classList.add("active");
  if (slides.length < 2) return;

  setInterval(function () {
    slides[index].classList.remove("active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("active");
  }, 4000);
}

/* ---------- QR sumbangan: perbesar untuk scan (lightbox) ---------- */
function initQRModal() {
  const openBtn = document.getElementById("qrOpen");
  const modal = document.getElementById("qrModal");
  const qrImg = document.getElementById("qrDonation");
  if (!openBtn || !modal) return;

  function canOpen() {
    // Hanya buka jika imej QR benar-benar dimuat
    return qrImg && !qrImg.hidden && qrImg.naturalWidth > 0;
  }

  openBtn.addEventListener("click", function () {
    if (!canOpen()) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  });

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  modal.querySelectorAll("[data-qr-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* ---------- Salin nombor akaun bank ---------- */
function initCopyAccount() {
  const btn = document.getElementById("copyAccount");
  const accountEl = document.getElementById("bankAccount");
  const msg = document.getElementById("copyMsg");
  if (!btn || !accountEl) return;

  btn.addEventListener("click", async function () {
    const text = accountEl.textContent.trim();
    let ok = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (_) {
      ok = false;
    }

    if (!ok) {
      // Fallback untuk pelayar lama
      const range = document.createRange();
      range.selectNodeContents(accountEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ok = document.execCommand("copy");
      sel.removeAllRanges();
    }

    if (msg) {
      msg.textContent = ok ? "Nombor akaun disalin ✓" : "Sila salin secara manual";
      msg.style.display = "inline-block";
      setTimeout(function () {
        msg.style.display = "none";
      }, 2600);
    }
  });
}

/* ---------- QR sumbangan: papar placeholder jika imej tiada ---------- */
function initQRFallback() {
  const img = document.getElementById("qrDonation");
  const placeholder = document.getElementById("qrPlaceholder");
  if (!img || !placeholder) return;

  function showFallback() {
    img.style.display = "none";
    placeholder.hidden = false;
  }

  img.addEventListener("error", showFallback);

  // Imej mungkin gagal dimuat sebelum listener dipasang (cached 404)
  if (img.complete && img.naturalWidth === 0) showFallback();
}

/* ---------- Borang (FormSubmit.co → e-mel masjid) ---------- */
function initForms() {
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Validasi asas pelayar (required/email/pattern)
      if (!form.reportValidity()) return;

      // Cegah hantar berulang
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.disabled) return;
      if (submitBtn) submitBtn.disabled = true;

      const fd = new FormData(form);

      // Honeypot anti-spam: jika diisi oleh bot, senyap-senyap "berjaya"
      if (fd.get("botcheck")) {
        showFormResult(
          form,
          "success",
          "Terima kasih! Maklumat anda telah diterima."
        );
        form.reset();
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Bina payload (buang medan honeypot)
      const payload = {};
      fd.forEach(function (value, key) {
        if (key !== "botcheck") payload[key] = value;
      });
      payload._subject =
        fd.get("_subject") || "Maklum balas daripada laman web";
      payload._captcha = "false"; // borang AJAX: elak reCAPTCHA
      payload._template = "table";

      // Reply-To: mesej boleh dibalas terus kepada pengirim
      const senderEmail = fd.get("E-mel") || fd.get("email") || "";
      if (senderEmail) payload._replyto = senderEmail;

      const endpoint =
        "https://formsubmit.co/ajax/" +
        encodeURIComponent(SITE_CONFIG.formEmail);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data && (data.success === "true" || data.success === true)) {
          showFormResult(
            form,
            "success",
            "Terima kasih! Maklumat anda telah dihantar ke pihak masjid."
          );
          form.reset();
        } else if (data && /activat/i.test(data.message || "")) {
          showFormResult(
            form,
            "warning",
            "Penghantaran pertama memerlukan pengesahan. Pihak masjid perlu klik pautan pengesahan dalam e-mel daripada FormSubmit, kemudian cuba semula."
          );
        } else {
          showFormResult(form, "error", "Penghantaran gagal. Sila cuba lagi.");
        }
      } catch (err) {
        showFormResult(form, "error", "Ralat rangkaian. Sila cuba lagi.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

/* ---------- Papar hasil borang ---------- */
function showFormResult(form, type, message) {
  // Buang mesej lama
  const old = form.parentElement.querySelector(".form-result");
  if (old) old.remove();

  const box = document.createElement("div");
  box.className = "form-result " + type;
  box.setAttribute("role", "status");

  // Bina teks dengan DOM (selamat)
  const text = document.createElement("span");
  text.textContent = message;
  box.appendChild(text);

  if (type === "warning" || type === "error") {
    box.appendChild(document.createTextNode(" Hubungi kami melalui "));

    const mail = document.createElement("a");
    mail.textContent = "e-mel";
    mail.href = "mailto:" + SITE_CONFIG.formEmail;
    mail.style.textDecoration = "underline";
    mail.style.fontWeight = "700";
    box.appendChild(mail);

    box.appendChild(document.createTextNode(" atau "));

    const fb = document.createElement("a");
    fb.textContent = "Facebook page";
    fb.href = SITE_CONFIG.facebookPage;
    fb.target = "_blank";
    fb.rel = "noopener noreferrer";
    fb.style.textDecoration = "underline";
    fb.style.fontWeight = "700";
    box.appendChild(fb);

    box.appendChild(document.createTextNode("."));
  }

  form.parentElement.appendChild(box);
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- Tahun semasa dalam footer ---------- */
function setYear() {
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
}
