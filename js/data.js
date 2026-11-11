// ============================================================
// KISSING TREES — SITE CONFIG
// ⚠️ PLACEHOLDER DATA: every value marked SAMPLE below is a demo
// value. Replace with the client's real details after they confirm
// (location, tariff, deposit, WhatsApp number, photos).
// ============================================================
const SITE = {
  name: "Kissing Trees",
  tagline: "A Private Cottage Homestay for Families, Artists & Travelers",
  location: "Near Dornahalli, KR Nagar, Mysuru district, Karnataka",
  nearbyLandscape: "10 km cycling track to the KRS backwaters",
  whatsapp: "919256725871",
  email: "stay@kissingtrees.example", // SAMPLE
  socials: {
    instagram: "https://www.instagram.com/kissingtrees/",
    x: "https://x.com/kissingtrees",
    facebook: "https://www.facebook.com/kissingtrees",
  }, // SAMPLE profile links
  maxGuests: 10, // SAMPLE
  checkIn: "11:00 AM", // SAMPLE
  checkOut: "10:00 AM", // SAMPLE
  tariff: { weekday: 4999, weekend: 6999, season: 8999 }, // SAMPLE ₹/night
  includedGuests: 6, // SAMPLE
  extraGuestCharge: 750, // SAMPLE ₹ per extra guest / night
  securityDeposit: 5000, // SAMPLE ₹ refundable
  minNights: 1, // SAMPLE minimum stay nights
  approvalHours: "2–4", // owner replies within 2–4 hours
  chatLogoSrc: "assets/cottage-chat-logo.png",
  // DEMO login credential only. Real authentication must run on a backend server.
  adminDemo: { username: "owner-demo", password: "admin123" },
  amenities: [
    ["🌐", "High-speed Wi-Fi"],
    ["❄️", "AC Bedrooms"],
    ["🍳", "Full Kitchen"],
    ["🚗", "Free Parking"],
    ["🔌", "Power Backup"],
    ["📺", "Smart TV"],
    ["🧺", "Washing Machine"],
    ["🌴", "Private Garden"],
    ["🔥", "BBQ Corner (SAMPLE)"],
  ],
  formatWhatsApp() {
    const digits = String(this.whatsapp || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return this.whatsapp;
  },
  whatsappUrl(message) {
    const digits = String(this.whatsapp || "").replace(/\D/g, "");
    if (digits.length < 10) return "contact.html";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  },
};

const SITE_DEFAULTS = {
  name: SITE.name,
  tagline: SITE.tagline,
  location: SITE.location,
  nearbyLandscape: SITE.nearbyLandscape,
  whatsapp: SITE.whatsapp,
  email: SITE.email,
  socials: { ...SITE.socials },
  maxGuests: SITE.maxGuests,
  checkIn: SITE.checkIn,
  checkOut: SITE.checkOut,
  tariff: { ...SITE.tariff },
  includedGuests: SITE.includedGuests,
  extraGuestCharge: SITE.extraGuestCharge,
  securityDeposit: SITE.securityDeposit,
  minNights: SITE.minNights,
  approvalHours: SITE.approvalHours,
  chatLogoSrc: SITE.chatLogoSrc,
  amenities: SITE.amenities.map((item) => [...item]),
};

function isSafeImageSrc(src) {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  return /^(?:\.?\/?assets\/[a-zA-Z0-9_./-]+(?:\?[a-zA-Z0-9=&_-]+)?|https?:\/\/[^\s"'()<>]+|data:image\/[a-zA-Z0-9+.+-]+;base64,[A-Za-z0-9+/=]+)$/.test(
    trimmed,
  );
}

// Apply saved localStorage pricing & CMS identity overrides (demo mode only).
(function hydrateSiteFromLocalStorage() {
  try {
    if (typeof localStorage === "undefined") return;
    const rawSettings = JSON.parse(localStorage.getItem("kt_settings") || "null");
    if (rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)) {
      const toNum = (v, min = 0) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= min ? n : null;
      };
      const wd = toNum(rawSettings.weekday, 0);
      const we = toNum(rawSettings.weekend, 0);
      const se = toNum(rawSettings.season, 0);
      const inc = toNum(rawSettings.includedGuests, 1);
      const ex = toNum(rawSettings.extraGuestCharge, 0);
      const dep = toNum(rawSettings.securityDeposit, 0);
      const mn = toNum(rawSettings.minNights, 1);
      if (wd !== null) SITE.tariff.weekday = wd;
      if (we !== null) SITE.tariff.weekend = we;
      if (se !== null) SITE.tariff.season = se;
      if (inc !== null) SITE.includedGuests = inc;
      if (ex !== null) SITE.extraGuestCharge = ex;
      if (dep !== null) SITE.securityDeposit = dep;
      if (mn !== null) SITE.minNights = mn;
    }

    const rawCms = JSON.parse(localStorage.getItem("kt_cms") || "null");
    if (rawCms && typeof rawCms === "object" && rawCms.site && typeof rawCms.site === "object") {
      const s = rawCms.site;
      const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
      if (str(s.name)) SITE.name = str(s.name);
      if (str(s.tagline)) SITE.tagline = str(s.tagline);
      if (str(s.location)) SITE.location = str(s.location);
      if (str(s.nearbyLandscape)) SITE.nearbyLandscape = str(s.nearbyLandscape);
      if (str(s.whatsapp)) SITE.whatsapp = str(s.whatsapp);
      if (str(s.email)) SITE.email = str(s.email);
      if (str(s.checkIn)) SITE.checkIn = str(s.checkIn);
      if (str(s.checkOut)) SITE.checkOut = str(s.checkOut);
      if (str(s.approvalHours)) SITE.approvalHours = str(s.approvalHours);
      if (isSafeImageSrc(s.chatLogoSrc)) SITE.chatLogoSrc = s.chatLogoSrc.trim();
      const maxG = Number(s.maxGuests);
      if (Number.isFinite(maxG) && maxG >= 1) SITE.maxGuests = maxG;
      if (s.socials && typeof s.socials === "object") {
        if (str(s.socials.instagram)) SITE.socials.instagram = str(s.socials.instagram);
        if (str(s.socials.x)) SITE.socials.x = str(s.socials.x);
        if (str(s.socials.facebook)) SITE.socials.facebook = str(s.socials.facebook);
      }
      if (Array.isArray(rawCms.amenities) && rawCms.amenities.length) {
        const cleaned = rawCms.amenities
          .filter((a) => Array.isArray(a) && String(a[1] || "").trim())
          .map((a) => [String(a[0] || "✦").trim(), String(a[1]).trim()]);
        if (cleaned.length) SITE.amenities = cleaned;
      }
    }
  } catch {
    // Ignore invalid JSON or unavailable storage.
  }
})();

// Keep shared property identity consistent on every static page.
(function () {
  if (!document.body) return;
  const replacements = [
    [/\bKissing Trees\b/g, SITE.name],
    [/\bKissing Tree\b/g, SITE.name],
    [/\bA Private Cottage Homestay for Families, Artists & Travelers\b/g, SITE.tagline],
  ];
  const ignoredTags = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT"]);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent && ignoredTags.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node;
  while ((node = walker.nextNode())) {
    let text = node.nodeValue;
    for (const [pattern, to] of replacements) text = text.replace(pattern, to);
    text = text.replace(/Kissing Trees{2,}/g, "Kissing Trees");
    node.nodeValue = text;
  }
  for (const [pattern, to] of replacements)
    document.title = document.title.replace(pattern, to);
  document.title = document.title.replace(/Kissing Trees{2,}/g, "Kissing Trees");

  if (!document.body.classList.contains("admin-page")) {
    const topbar = document.querySelector(".topbar");
    if (topbar && !topbar.querySelector(".mobile-nav-actions")) {
      const isBookingPage =
        /(?:^|\/)booking(?:\.html)?\/?$/i.test(window.location.pathname) ||
        window.location.href.includes("booking.html");
      const navActions = document.createElement("div");
      navActions.className = "mobile-nav-actions";

      if (!isBookingPage) {
        const bookPill = document.createElement("a");
        bookPill.className = "mobile-book-pill";
        bookPill.href = "booking.html";
        bookPill.innerHTML = `Book <span>↗</span>`;
        navActions.appendChild(bookPill);
      }

      const menuBtn = document.createElement("button");
      menuBtn.type = "button";
      menuBtn.className = "mobile-menu-toggle";
      menuBtn.setAttribute("aria-label", "Toggle navigation menu");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.innerHTML = `
        <span class="menu-bar"></span>
        <span class="menu-bar"></span>
        <span class="menu-bar"></span>
      `;
      navActions.appendChild(menuBtn);
      topbar.appendChild(navActions);

      const drawer = document.createElement("div");
      drawer.className = "mobile-drawer-overlay";
      drawer.id = "mobileDrawer";
      drawer.setAttribute("aria-hidden", "true");
      drawer.innerHTML = `
        <div class="mobile-drawer-panel">
          <div class="mobile-drawer-header">
            <a class="wordmark" href="index.html">
              <span class="wordmark-icon">KT</span>
              <span class="wordmark-text">
                Kissing Trees
                <small>A PRIVATE COTTAGE HOMESTAY</small>
              </span>
            </a>
            <button type="button" class="mobile-drawer-close" aria-label="Close menu">&times;</button>
          </div>
          <nav class="mobile-drawer-nav">
            <a href="index.html">Home</a>
            <a href="about.html">About the Cottage</a>
            <a href="gallery.html">Photo Gallery</a>
            <a href="amenities.html">Amenities</a>
            <a href="pricing.html">Tariff</a>
            <a href="blog.html">Blog &amp; Guides</a>
            <a href="contact.html">Contact Host</a>
          </nav>
          <div class="mobile-drawer-footer">
            <a class="button mobile-drawer-cta" href="booking.html">Request to book <span>↗</span></a>
            <p class="mobile-drawer-note">Owner-reviewed stays · Direct host confirmation</p>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);

      const closeDrawer = () => {
        drawer.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        drawer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      };

      const openDrawer = () => {
        drawer.classList.add("open");
        menuBtn.setAttribute("aria-expanded", "true");
        drawer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      };

      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (drawer.classList.contains("open")) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });

      drawer.querySelector(".mobile-drawer-close").addEventListener("click", closeDrawer);
      drawer.addEventListener("click", (e) => {
        if (e.target === drawer) closeDrawer();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
      });
    }

    const footerBrand = document.querySelector(".footer-brand");
    if (footerBrand && !footerBrand.querySelector(".social-links")) {
      footerBrand.insertAdjacentHTML(
        "beforeend",
        `<nav class="social-links" aria-label="Social media">
          <a href="${SITE.socials.instagram}" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1"></circle></svg>
          </a>
          <a href="${SITE.socials.x}" target="_blank" rel="noopener" aria-label="X">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l14 16M19 4L5 20"></path></svg>
          </a>
          <a href="${SITE.socials.facebook}" target="_blank" rel="noopener" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h3l.5-3H14V8.2c0-1 .3-1.7 1.8-1.7H18V3.8c-.4-.1-1.3-.2-2.4-.2-2.8 0-4.6 1.7-4.6 4.7V10H8v3h3v8"></path></svg>
          </a>
        </nav>`,
      );
    }
    const whatsapp = document.createElement("a");
    const whatsappNumber = String(SITE.whatsapp).replace(/\D/g, "");
    const whatsappMessage =
      "Hello, I am interested in staying at Kissing Trees. Please share availability and booking details.";
    whatsapp.className = "whatsapp-float";
    whatsapp.href = SITE.whatsappUrl(whatsappMessage);
    whatsapp.target = whatsappNumber.length >= 10 ? "_blank" : "_self";
    whatsapp.rel = "noopener";
    whatsapp.setAttribute("aria-label", "Chat with Kissing Trees on WhatsApp");
    const waImg = document.createElement("img");
    waImg.src = isSafeImageSrc(SITE.chatLogoSrc)
      ? SITE.chatLogoSrc
      : "assets/cottage-chat-logo.png";
    waImg.alt = "Chat with Kissing Trees on WhatsApp";
    const waStrong = document.createElement("strong");
    waStrong.textContent = "Click to chat";
    whatsapp.appendChild(waImg);
    whatsapp.appendChild(waStrong);
    document.body.appendChild(whatsapp);
  }
})();
