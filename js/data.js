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
  approvalHours: "2–4", // owner replies within 2–4 hours
  // SAMPLE demo gate only. These values are visible in page source and are NOT secure credentials.
  adminDemo: { username: "owner-demo", password: "KT-SAMPLE-2026" },
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
};

// Keep shared property identity consistent on every static page.
(function () {
  if (!document.body) return;
  const replacements = [
    ["Kissing Trees", SITE.name],
    ["Kissing Tree", SITE.name],
    ["A Private Cottage Homestay for Families, Artists & Travelers", SITE.tagline],
  ];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    let text = node.nodeValue;
    for (const [from, to] of replacements) text = text.split(from).join(to);
    node.nodeValue = text;
  }
  for (const [from, to] of replacements)
    document.title = document.title.split(from).join(to);

  if (!document.body.classList.contains("admin-page")) {
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
    whatsapp.href =
      whatsappNumber.length >= 10
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
        : "contact.html";
    whatsapp.target = whatsappNumber.length >= 10 ? "_blank" : "_self";
    whatsapp.rel = "noopener";
    whatsapp.setAttribute("aria-label", "Chat with Kissing Trees on WhatsApp");
    whatsapp.innerHTML =
      '<img src="assets/cottage-chat-logo.png" alt="Chat with Kissing Trees on WhatsApp"><strong>Click to chat</strong>';
    document.body.appendChild(whatsapp);
  }
})();
