// ============================================================
// KISSING TREES — OWNER & CARETAKER ADMIN PANEL (DEMO ONLY)
// Front-end static demo using browser localStorage. Real login
// authentication, database persistence, Razorpay & alerts belong
// in the backend phase.
// ============================================================

// Clearly-commented DEMO password constant (NOT production security)
const DEMO_LOGIN_PASSWORD = "admin123"; // DEMO ONLY — real login security comes with the backend.

const KEYS = {
  REQUESTS: "kt_requests",
  BLOCKED_DATES: "kt_blocked_dates",
  BLOCKED_LOG: "kt_blocked_log",
  FLAGGED_GUESTS: "kt_flagged_guests",
  SETTINGS: "kt_settings",
  TEMPLATES: "kt_templates",
  CMS: "kt_cms",
};
const AUTH_SESSION_KEY = "kt_admin_demo_session";

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
}

function money(amount) {
  return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    alert(
      "Browser storage limit reached (often from many uploaded images). Remove an uploaded image or use Export Content JSON.",
    );
    return false;
  }
}

function getLocalTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoUtc(iso) {
  const parts = String(iso || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) return null;
  const [y, m, d] = parts;
  return Date.UTC(y, m - 1, d);
}

function addDaysToIso(iso, days) {
  const ms = parseIsoUtc(iso);
  if (ms === null) return "";
  const dt = new Date(ms);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffIsoDays(startIso, endIso) {
  const s = parseIsoUtc(startIso);
  const e = parseIsoUtc(endIso);
  if (s === null || e === null) return 0;
  return Math.max(0, Math.round((e - s) / 86400000));
}

function formatMonthLabel(ym) {
  const parts = String(ym || "").split("-").map(Number);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return ym;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
  return dt.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function normalizePhoneDigits(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  return digits;
}

function normalizePhoneKey(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(-10);
  return String(phone || "").trim().toLowerCase();
}

function triggerFileDownload(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readUploadedJsonFile(fileInput, onLoad) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      onLoad(parsed);
    } catch {
      alert("Invalid JSON file selected.");
    } finally {
      fileInput.value = "";
    }
  };
  reader.readAsText(file);
}

// ============================================================
// SECTION 6: SETTINGS (kt_settings) & TARIFF CALCULATIONS
// ============================================================
function getDefaultSettings() {
  const base = typeof SITE_DEFAULTS !== "undefined" ? SITE_DEFAULTS : SITE;
  return {
    weekday: Number(base.tariff?.weekday ?? 4999),
    weekend: Number(base.tariff?.weekend ?? 6999),
    season: Number(base.tariff?.season ?? 8999),
    includedGuests: Number(base.includedGuests ?? 6),
    extraGuestCharge: Number(base.extraGuestCharge ?? 750),
    securityDeposit: Number(base.securityDeposit ?? 5000),
    minNights: Number(base.minNights ?? 1),
  };
}

function sanitizeSettings(raw) {
  const def = getDefaultSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return def;
  const num = (v, min, fb) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min ? n : fb;
  };
  return {
    weekday: num(raw.weekday, 0, def.weekday),
    weekend: num(raw.weekend, 0, def.weekend),
    season: num(raw.season, 0, def.season),
    includedGuests: num(raw.includedGuests, 1, def.includedGuests),
    extraGuestCharge: num(raw.extraGuestCharge, 0, def.extraGuestCharge),
    securityDeposit: num(raw.securityDeposit, 0, def.securityDeposit),
    minNights: num(raw.minNights, 1, def.minNights),
  };
}

function loadSettings() {
  const stored = readJson(KEYS.SETTINGS, null);
  const clean = sanitizeSettings(stored);
  if (stored === null) {
    writeJson(KEYS.SETTINGS, clean);
  }
  return clean;
}

function syncSitePricing(settings) {
  if (typeof SITE === "undefined") return;
  SITE.tariff.weekday = settings.weekday;
  SITE.tariff.weekend = settings.weekend;
  SITE.tariff.season = settings.season;
  SITE.includedGuests = settings.includedGuests;
  SITE.extraGuestCharge = settings.extraGuestCharge;
  SITE.securityDeposit = settings.securityDeposit;
  SITE.minNights = settings.minNights;
}

function nightRateForIso(iso, settings) {
  const ms = parseIsoUtc(iso);
  if (ms === null) return settings.weekday;
  const day = new Date(ms).getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 0 || day === 5 || day === 6 ? settings.weekend : settings.weekday;
}

function calcStayPricing(req, settings = loadSettings(), monthFilter = null) {
  const totalNights = diffIsoDays(req.checkin, req.checkout);
  const totalGuests =
    (Number(req.men) || 0) + (Number(req.women) || 0) + (Number(req.children) || 0);
  const extraGuests = Math.max(0, totalGuests - settings.includedGuests);
  let stayTotal = 0;
  let matchingNights = 0;
  for (let i = 0; i < totalNights; i += 1) {
    const dayIso = addDaysToIso(req.checkin, i);
    if (!monthFilter || dayIso.startsWith(monthFilter)) {
      matchingNights += 1;
      stayTotal += nightRateForIso(dayIso, settings) + extraGuests * settings.extraGuestCharge;
    }
  }
  const advanceExpected = Math.round(stayTotal * 0.5);
  return {
    nights: monthFilter ? matchingNights : totalNights,
    totalNights,
    totalGuests,
    extraGuests,
    stayTotal,
    advanceExpected,
    balanceExpected: Math.max(0, stayTotal - advanceExpected),
    depositAmount: settings.securityDeposit,
  };
}

// ============================================================
// SECTION 3/4/5/8 DATA LOADERS & NORMALIZERS
// ============================================================
function seedRequests() {
  const ym = getLocalTodayIso().slice(0, 7);
  return [
    {
      id: "KT-SAMPLE1",
      time: "Sample",
      guestType: "Family (with parents / kids / elders)",
      men: 2,
      women: 2,
      children: 1,
      purpose: "Family Vacation",
      gateStatus: "ALLOWED",
      gateReason: "Guest profile fits the house policy.",
      checkin: `${ym}-14`,
      checkout: `${ym}-16`,
      name: "Sample Family Guest",
      phone: "+91 90000 00001 (SAMPLE)",
      guests: "Sample Adult (40), Sample Spouse (38), Sample Child (9)",
      idType: "Passport",
      ownerStatus: "PENDING OWNER APPROVAL",
      internalNotes: "",
      declineReason: "",
      checkInDone: false,
      checkOutDone: false,
      idVerified: false,
      advanceStatus: "Pending",
      balanceStatus: "Pending",
      depositStatus: "Not taken",
    },
    {
      id: "KT-SAMPLE2",
      time: "Sample",
      guestType: "Solo / Corporate Work Stay",
      men: 1,
      women: 0,
      children: 0,
      purpose: "Work / Business",
      gateStatus: "REVIEW",
      gateReason: "All-male booking — owner must review manually.",
      checkin: `${ym}-20`,
      checkout: `${ym}-21`,
      name: "Sample Solo Guest",
      phone: "+91 90000 00002 (SAMPLE)",
      guests: "Sample Solo Guest (31)",
      idType: "Company ID / Business Card",
      ownerStatus: "PENDING OWNER APPROVAL",
      internalNotes: "",
      declineReason: "",
      checkInDone: false,
      checkOutDone: false,
      idVerified: false,
      advanceStatus: "Pending",
      balanceStatus: "Pending",
      depositStatus: "Not taken",
    },
  ];
}

function normalizeRequest(req) {
  return {
    ...req,
    internalNotes: req.internalNotes || "",
    declineReason: req.declineReason || "",
    checkInDone: Boolean(req.checkInDone),
    checkOutDone: Boolean(req.checkOutDone),
    idVerified: Boolean(req.idVerified),
    advanceStatus: req.advanceStatus === "Paid" ? "Paid" : "Pending",
    balanceStatus: req.balanceStatus === "Paid" ? "Paid" : "Pending",
    depositStatus:
      req.depositStatus === "Collected" || req.depositStatus === "Refunded"
        ? req.depositStatus
        : "Not taken",
  };
}

function loadRequests() {
  const raw = readJson(KEYS.REQUESTS, null);
  let list = Array.isArray(raw)
    ? raw.filter((r) => r && typeof r === "object" && !Array.isArray(r))
    : null;
  if (!list) {
    list = seedRequests();
    writeJson(KEYS.REQUESTS, list);
  }
  return list.map(normalizeRequest);
}

function saveRequests(list) {
  writeJson(KEYS.REQUESTS, list);
}

function loadBlockedDates() {
  const raw = readJson(KEYS.BLOCKED_DATES, []);
  return Array.isArray(raw)
    ? raw.filter((b) => b && b.start && b.end)
    : [];
}

function saveBlockedDates(list) {
  writeJson(KEYS.BLOCKED_DATES, list);
}

function seedBlockedLogRows() {
  const ym = getLocalTodayIso().slice(0, 7);
  return [
    {
      id: "BLK-SAMPLE1",
      date: `${ym}-05`,
      time: "Sample Attempt",
      groupSize: 4,
      men: 4,
      women: 0,
      children: 0,
      guestType: "Travelers / Duo Stay",
      purpose: "Celebration / Party",
      result: "BLOCKED",
      reason: "SAMPLE: All-male group of 2+ with party purpose.",
    },
    {
      id: "BLK-SAMPLE2",
      date: `${ym}-08`,
      time: "Sample Attempt",
      groupSize: 6,
      men: 6,
      women: 0,
      children: 0,
      guestType: "Mixed Family Group",
      purpose: "Celebration / Party",
      result: "BLOCKED",
      reason: "SAMPLE: All-male group of 2+ with party purpose.",
    },
  ];
}

function loadBlockedLog() {
  const raw = readJson(KEYS.BLOCKED_LOG, null);
  let list = Array.isArray(raw) ? raw : null;
  if (!list || list.length === 0) {
    // Seed 2 SAMPLE rows if empty so the host sees the gate log working.
    list = seedBlockedLogRows();
    writeJson(KEYS.BLOCKED_LOG, list);
  }
  return list;
}

function loadFlaggedGuests() {
  const raw = readJson(KEYS.FLAGGED_GUESTS, {});
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function saveFlaggedGuests(map) {
  writeJson(KEYS.FLAGGED_GUESTS, map);
}

function getDefaultTemplates() {
  return {
    approve:
      "Hello {name}, great news! Your stay request at Kissing Trees from {checkin} to {checkout} is approved. Estimated stay tariff: {amount}. Please confirm arrival timing so we can share your directions and demo payment link.",
    decline:
      "Hello {name}, thank you for contacting Kissing Trees for {checkin} to {checkout}. Unfortunately we are unable to host this request ({reason}). Wishing you a pleasant trip.",
  };
}

function loadTemplates() {
  const def = getDefaultTemplates();
  const raw = readJson(KEYS.TEMPLATES, null);
  if (!raw || typeof raw !== "object") return def;
  return {
    approve: typeof raw.approve === "string" && raw.approve.trim() ? raw.approve : def.approve,
    decline: typeof raw.decline === "string" && raw.decline.trim() ? raw.decline : def.decline,
  };
}

function isApproved(req) {
  return String(req.ownerStatus || "").startsWith("APPROVED");
}

function isDeclined(req) {
  return String(req.ownerStatus || "").startsWith("DECLINED");
}

function isPending(req) {
  return !isApproved(req) && !isDeclined(req);
}

function getRequestClashes(req, allRequests, blockedDates) {
  if (!isPending(req) || !req.checkin || !req.checkout) {
    return { hasClash: false, details: [] };
  }
  const details = [];
  for (const other of allRequests) {
    if (other.id === req.id || !isApproved(other)) continue;
    if (req.checkin < other.checkout && other.checkin < req.checkout) {
      details.push(`Approved stay ${other.id} (${other.name}: ${other.checkin} → ${other.checkout})`);
    }
  }
  for (const blk of blockedDates) {
    if (req.checkin <= blk.end && req.checkout > blk.start) {
      details.push(`Blocked dates (${blk.start} to ${blk.end}: ${blk.reason})`);
    }
  }
  return { hasClash: details.length > 0, details };
}

function isGuestFlagged(phone, flaggedMap) {
  const key = normalizePhoneKey(phone);
  return Boolean(key && flaggedMap[key]);
}

function fillTemplateText(template, req, settings) {
  const pricing = calcStayPricing(req, settings);
  const amountStr = money(pricing.stayTotal);
  const reasonStr = req.declineReason || "dates unavailable";
  return String(template || "")
    .replace(/\{name\}/gi, req.name || "Guest")
    .replace(/\{checkin\}/gi, req.checkin || "")
    .replace(/\{checkout\}/gi, req.checkout || "")
    .replace(/\{amount\}/gi, amountStr)
    .replace(/\{reason\}/gi, reasonStr);
}

function buildWhatsAppUrl(req, settings = loadSettings(), templates = loadTemplates()) {
  const digits = normalizePhoneDigits(req.phone);
  if (digits.length < 10) return null;
  const tpl = isDeclined(req) ? templates.decline : templates.approve;
  const message = fillTemplateText(tpl, req, settings);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ============================================================
// SECTION 7: STRUCTURED CMS DEFAULTS & PHOTO LIBRARY (kt_cms)
// ============================================================
const PROPERTY_PHOTO_LIBRARY = [
  { src: "assets/property-photos/house-exterior.jpeg", label: "House Exterior" },
  { src: "assets/property-photos/coconut-grove.jpeg", label: "Coconut Grove" },
  { src: "assets/property-photos/bedroom-bed.jpeg", label: "Bedroom" },
  { src: "assets/property-photos/bedroom-wide.jpeg", label: "Bedroom View (Wide)" },
  { src: "assets/property-photos/bedroom-detail.jpeg", label: "Bedroom Detail" },
  { src: "assets/property-photos/bathroom.jpeg", label: "Bathroom" },
  { src: "assets/property-photos/bath-detail.jpeg", label: "Bath Detail" },
  { src: "assets/property-photos/thatched-ceiling.jpeg", label: "Thatched Ceiling" },
  { src: "assets/property-photos/room-entry.jpeg", label: "Room Entry" },
  { src: "assets/property-photos/doorway.jpeg", label: "Doorway" },
  { src: "assets/property-photos/wall-art.jpeg", label: "Wall Art" },
  { src: "assets/property-photos/wall-lights.jpeg", label: "Wall Lights" },
  { src: "assets/property-photos/welcome-dog.jpeg", label: "Welcome Doorway" },
  { src: "assets/cottage-chat-logo.png", label: "Cottage Chat Badge" },
];

function getDefaultGalleryItems() {
  return [
    { src: "assets/property-photos/bathroom.jpeg", alt: "Kissing Trees bathroom with handmade details", caption: "01 / Bathroom", category: "interiors", size: "tall" },
    { src: "assets/property-photos/wall-art.jpeg", alt: "Handmade wall art at Kissing Trees", caption: "02 / Wall art", category: "details", size: "tall" },
    { src: "assets/property-photos/bedroom-bed.jpeg", alt: "Kissing Trees bedroom", caption: "03 / Bedroom", category: "interiors", size: "wide" },
    { src: "assets/property-photos/bedroom-wide.jpeg", alt: "Wide view of the Kissing Trees bedroom", caption: "04 / Bedroom view", category: "interiors", size: "wide" },
    { src: "assets/property-photos/thatched-ceiling.jpeg", alt: "Thatched ceiling and fan at Kissing Trees", caption: "05 / Thatched ceiling", category: "details", size: "tall" },
    { src: "assets/property-photos/room-entry.jpeg", alt: "Room entry at Kissing Trees", caption: "06 / Room entry", category: "interiors", size: "tall" },
    { src: "assets/property-photos/bedroom-detail.jpeg", alt: "Bedroom detail at Kissing Trees", caption: "07 / Bedroom detail", category: "interiors", size: "tall" },
    { src: "assets/property-photos/doorway.jpeg", alt: "Open doorway at Kissing Trees", caption: "08 / Doorway", category: "details", size: "tall" },
    { src: "assets/property-photos/wall-lights.jpeg", alt: "Decorative wall lights at Kissing Trees", caption: "09 / Wall lights", category: "details", size: "wide" },
    { src: "assets/property-photos/welcome-dog.jpeg", alt: "Welcome doorway at Kissing Trees", caption: "10 / Welcome", category: "outdoors", size: "tall" },
    { src: "assets/property-photos/coconut-grove.jpeg", alt: "Coconut grove around Kissing Trees", caption: "11 / Coconut grove", category: "outdoors", size: "wide" },
    { src: "assets/property-photos/house-exterior.jpeg", alt: "Kissing Trees house exterior", caption: "12 / House exterior", category: "outdoors", size: "wide" },
    { src: "assets/property-photos/bath-detail.jpeg", alt: "Bathroom detail at Kissing Trees", caption: "13 / Bath detail", category: "details", size: "tall" },
  ];
}

function getDefaultCms() {
  const def = typeof SITE_DEFAULTS !== "undefined" ? SITE_DEFAULTS : SITE;
  return {
    site: {
      name: def.name,
      tagline: def.tagline,
      location: def.location,
      nearbyLandscape: def.nearbyLandscape,
      whatsapp: def.whatsapp,
      email: def.email,
      checkIn: def.checkIn,
      checkOut: def.checkOut,
      maxGuests: def.maxGuests,
      approvalHours: def.approvalHours,
      chatLogoSrc: def.chatLogoSrc || "assets/cottage-chat-logo.png",
      socials: { ...def.socials },
    },
    home: {
      heroImageSrc: "assets/property-photos/house-exterior.jpeg",
      heroEyebrow: "A QUIET INLAND HOME · KARNATAKA",
      heroLead:
        "A peaceful retreat where inspiration flows freely, moments are shared, and new experiences unfold.",
      heroSubtext:
        "Whether creating something meaningful, spending time together, or discovering the charm of local life, there’s room for everyone to find their own kind of escape.",
      introLead:
        "A private cottage homestay for families, artists, travelers and working professionals, surrounded by organic farmland, coconut groves and the serene freshwater backwaters of the KRS reservoir.",
      introBody:
        "Enjoy unhurried mornings with birdsong, barefoot walks through coconut palms, and sunset rides along quiet backwater trails. Thoughtful stays begin with the right guests—welcome to a quieter rhythm.",
      ctaSubtext: "Tell us who’s coming and when. The owner will take it from there.",
      highlights: [
        {
          tag: "SCENIC TRAILS",
          title: "10 km Backwater Cycling Track",
          body: "Paved and rustic country trails leading directly to the peaceful backwaters of the KRS reservoir. Ideal for early morning cycling, jogging, or golden-hour photography.",
        },
        {
          tag: "NATURE LIVING",
          title: "Farmland & Coconut Groves",
          body: "Cradled inside lush Karnataka farmland with canopying coconut palms, open country air, and natural shade. Experience authentic countryside simplicity away from crowds.",
        },
        {
          tag: "SLOW LIVING",
          title: "Quiet Stays & Creative Workation",
          body: "Purpose-built for deep work, artistic retreats, family bonding, and restorative rest. Settle in with high-speed connectivity and spaces that invite quiet reflection.",
        },
      ],
    },
    about: {
      hostPhotoSrc: "",
      hostPhotoTag: "YOUR HOST",
      hostPhotoCaption: "Owner portrait coming soon",
      hostPhotoAlt: "Host portrait at Kissing Trees",
      heroSubtext:
        "Kissing Trees is a private cottage homestay near Dornahalli, shaped around slower days, thoughtful hosting and time with your people.",
      introP1:
        "Created for families, artists, travelers and working professionals, Kissing Trees offers a welcoming base for shared meals, unhurried mornings and time outdoors. The house is presented for family stays, creative retreats, travelers, office workations and women’s groups.",
      introP2:
        "Every request is reviewed personally by the owner. Your guest list, dates and group details are confirmed before any payment link is shared.",
      promiseCallout: "Clear expectations. A personal review. A more peaceful stay.",
      founderP1:
        "Kissing Trees was created to give families, artists, travelers and working professionals a peaceful place to slow down, reconnect and feel genuinely looked after.",
      founderP2:
        "From the first welcome to the final check-out, every detail is shaped by a simple belief: a good stay should feel personal.",
    },
    amenities: (def.amenities || []).map((a) => [...a]),
    faq: {
      heroSubtext: "Clear answers and house rules for a peaceful stay.",
      rules: [
        "We host families, artists, travelers, office professionals and women’s groups. Bachelor or stag groups are not hosted.",
        "At check-in, guest IDs must match the approved guest list.",
        "A refundable security deposit applies. No parties or outside guests.",
        "Please include the names and ages of everyone staying in your request.",
      ],
      faqs: [
        {
          question: "Who can stay at Kissing Trees?",
          answer:
            "Families, artists, travelers, office professionals, women’s groups and mixed family groups. Bachelor or stag groups are not hosted.",
        },
        {
          question: "Is my booking confirmed right away?",
          answer: "No. Every request is reviewed by the owner before confirmation.",
        },
        {
          question: "When do I pay?",
          answer:
            "Only after the owner approves your request. This website does not collect payment.",
        },
        {
          question: "What happens at check-in?",
          answer:
            "Guest IDs (Government ID or Company ID / Business Card) are checked against the approved guest list. A refundable security deposit applies.",
        },
      ],
    },
    gallery: {
      helperNote: "Click any photograph to view it larger.",
      items: getDefaultGalleryItems(),
    },
    blog: {
      heroSubtext:
        "Slow routes around the KRS backwaters, quiet afternoons across four acres of coconut groves, and live updates shared on our social handles.",
      posts: [
        {
          image: "assets/property-photos/coconut-grove.jpeg",
          imageAlt: "Coconut grove pathway at Kissing Trees near the KRS backwaters",
          badge: "01 · Featured Guide",
          category: "LOCAL GUIDE",
          title:
            "The 10 km Cycling Track to the KRS Backwaters & Venugopala Swamy Temple",
          summary:
            "Just outside our 4-acre coconut grove near Dornahalli and KR Nagar, quiet country lanes wind roughly 10 km to the freshwater KRS backwaters—ideal for early-morning birding, golden sunsets, and visiting Kannambadi’s relocated 12th-century Hoysala temple.",
          place: "Near Dornahalli · KR Nagar",
        },
        {
          image: "assets/property-photos/house-exterior.jpeg",
          imageAlt: "Private thatched cottage exterior surrounded by palms at Kissing Trees",
          badge: "02 · Stay Story",
          category: "STAY STORY",
          title: "A Quiet Weekend Near Mysuru: Inside Our 4-Acre Cottage Homestay",
          summary:
            "Thirty kilometres outside Mysuru near Dornahalli’s St. Anthony Church and 20 km from Brindavan Gardens, enjoy private thatched cottages, organic gardens, and fresh home-cooked meals with tea and snacks included.",
          place: "Arakere · Mysuru District",
        },
        {
          image: "assets/property-photos/bedroom-wide.jpeg",
          imageAlt: "Quiet air-conditioned bedroom and workspace corner at Kissing Trees",
          badge: "03 · Workations",
          category: "WORKATIONS & RETREATS",
          title:
            "Why Artists, Families & Remote Teams Choose a Private Cottage Over a Resort",
          summary:
            "With high-speed Wi-Fi, power backup, AC bedrooms, full kitchen, and an owner-reviewed booking policy (no bachelor or stag parties), Kissing Trees trades hotel noise for space to rest, create, and focus.",
          place: "Peaceful Retreats",
        },
      ],
    },
  };
}

function mergeGalleryDefaults(defaultItems, savedGallery) {
  if (Array.isArray(savedGallery?.items) && savedGallery.items.length) {
    return savedGallery.items.map((it, idx) => ({
      ...(defaultItems[idx] || {
        src: "assets/property-photos/house-exterior.jpeg",
        alt: "Kissing Trees photo",
        caption: "",
        category: "interiors",
        size: "tall",
      }),
      ...it,
    }));
  }
  if (Array.isArray(savedGallery?.captions)) {
    return defaultItems.map((it, idx) => ({
      ...it,
      caption: savedGallery.captions[idx] || it.caption,
    }));
  }
  return defaultItems;
}

function mergeDeepDefaults(defaults, saved) {
  if (!saved || typeof saved !== "object") return defaults;
  return {
    site: {
      ...defaults.site,
      ...(saved.site || {}),
      socials: { ...defaults.site.socials, ...(saved.site?.socials || {}) },
    },
    home: {
      ...defaults.home,
      ...(saved.home || {}),
      highlights:
        Array.isArray(saved.home?.highlights) && saved.home.highlights.length
          ? saved.home.highlights
          : defaults.home.highlights,
    },
    about: { ...defaults.about, ...(saved.about || {}) },
    amenities:
      Array.isArray(saved.amenities) && saved.amenities.length
        ? saved.amenities
        : defaults.amenities,
    faq: {
      ...defaults.faq,
      ...(saved.faq || {}),
      rules:
        Array.isArray(saved.faq?.rules) && saved.faq.rules.length
          ? saved.faq.rules
          : defaults.faq.rules,
      faqs:
        Array.isArray(saved.faq?.faqs) && saved.faq.faqs.length
          ? saved.faq.faqs
          : defaults.faq.faqs,
    },
    gallery: {
      helperNote: saved.gallery?.helperNote || defaults.gallery.helperNote,
      items: mergeGalleryDefaults(defaults.gallery.items, saved.gallery),
    },
    blog: {
      ...defaults.blog,
      ...(saved.blog || {}),
      posts:
        Array.isArray(saved.blog?.posts) && saved.blog.posts.length
          ? saved.blog.posts.map((p, idx) => ({
              ...(defaults.blog.posts[idx] || {
                image: "assets/property-photos/house-exterior.jpeg",
                imageAlt: "Kissing Trees story",
              }),
              ...p,
            }))
          : defaults.blog.posts,
    },
  };
}

function loadCmsState() {
  return mergeDeepDefaults(getDefaultCms(), readJson(KEYS.CMS, null));
}

// ============================================================
// ADMIN UI STATE
// ============================================================
const state = {
  role: "owner",
  activePanel: "dashboard",
  reqFilter: "ALL",
  reqSearch: "",
  guestSearch: "",
  opsView: "all",
  cmsGroup: "all",
  calMonth: getLocalTodayIso().slice(0, 7),
  selectedCalDay: getLocalTodayIso(),
  detailReqId: null,
  declineReqId: null,
  cmsDraft: null,
};

// DOM Refs (every static ID matches admin.html)
const loginScreen = $("loginScreen");
const adminContent = $("adminContent");
const ownerLoginForm = $("ownerLogin");
const ownerPasswordInput = $("ownerPassword");
const roleOwnerRadio = $("roleOwner");
const roleCaretakerRadio = $("roleCaretaker");
const loginErrorEl = $("loginError");
const logoutButton = $("logoutBtn");
const activeRoleBadge = $("activeRoleBadge");
const sidebarRoleTag = $("sidebarRoleTag");

$("demoPassword").textContent = DEMO_LOGIN_PASSWORD;

// ============================================================
// ROLE & TAB NAVIGATION (8-Section Enforced Access)
// ============================================================
function applyRoleVisibility() {
  const isOwner = state.role === "owner";
  document.querySelectorAll("[data-owner-only]").forEach((el) => {
    el.hidden = !isOwner;
  });
  $("calCaretakerNote").hidden = isOwner;
  activeRoleBadge.textContent = isOwner ? "OWNER" : "CARETAKER";
  sidebarRoleTag.textContent = isOwner
    ? "Owner · Full Access"
    : "Caretaker · Requests & Calendar";

  const allowedCaretakerPanels = new Set(["requests", "calendar"]);
  if (!isOwner && !allowedCaretakerPanels.has(state.activePanel)) {
    state.activePanel = "requests";
  }
}

const PANEL_TITLES = {
  dashboard: "Dashboard Overview",
  requests: "Booking Requests",
  calendar: "Calendar & Bookings",
  payments: "Payments (Demo)",
  pricing: "Pricing Settings",
  content: "CMS & Editorial Content",
  reports: "Logs, Guests & Reports",
};

function setBodyClass(cls, active) {
  if (document.body && document.body.classList && document.body.classList.toggle) {
    document.body.classList.toggle(cls, active);
  }
}

function closeMobileSidebar() {
  setBodyClass("admin-drawer-open", false);
  $("sidebarBackdrop").hidden = true;
}

function switchPanel(panelName) {
  const allowedCaretakerPanels = new Set(["requests", "calendar"]);
  if (state.role !== "owner" && !allowedCaretakerPanels.has(panelName)) {
    panelName = "requests";
  }
  state.activePanel = panelName;
  $("adminTopTitle").textContent = PANEL_TITLES[panelName] || "Host Desk";
  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    const active = btn.dataset.panel === panelName;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".workspace-panel").forEach((panel) => {
    const show = panel.dataset.panelView === panelName;
    if (!show) {
      panel.hidden = true;
    } else if (state.role === "owner" || !panel.hasAttribute("data-owner-only")) {
      panel.hidden = false;
    }
  });
}

$("adminNavTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".admin-nav-btn");
  if (!btn) return;
  if (state.activePanel === "content" && state.role === "owner") {
    persistCmsDraftNow("Auto-saved to kt_cms ✓");
  }
  switchPanel(btn.dataset.panel);
  closeMobileSidebar();
  renderAll();
});

$("sidebarCollapseBtn").addEventListener("click", () => {
  const collapsed =
    document.body &&
    document.body.classList &&
    document.body.classList.contains("admin-sidebar-collapsed");
  setBodyClass("admin-sidebar-collapsed", !collapsed);
});

$("mobileSidebarBtn").addEventListener("click", () => {
  setBodyClass("admin-drawer-open", true);
  $("sidebarBackdrop").hidden = false;
});

$("sidebarBackdrop").addEventListener("click", closeMobileSidebar);

// ============================================================
// SECTION 2: DASHBOARD RENDERER
// ============================================================
function renderDashboard() {
  if (state.role !== "owner") return;
  const requests = loadRequests();
  const blocked = loadBlockedDates();
  const flagged = loadFlaggedGuests();
  const settings = loadSettings();
  const today = getLocalTodayIso();
  const ym = today.slice(0, 7);

  $("dashMonthLabel").textContent = formatMonthLabel(ym);

  const pendingList = requests.filter(isPending);
  const checkinsToday = requests.filter((r) => isApproved(r) && r.checkin === today);
  const checkoutsToday = requests.filter((r) => isApproved(r) && r.checkout === today);

  let approvedMonthCount = 0;
  let expectedIncomeMonth = 0;
  for (const r of requests) {
    if (!isApproved(r)) continue;
    const share = calcStayPricing(r, settings, ym);
    if (share.nights > 0) {
      approvedMonthCount += 1;
      expectedIncomeMonth += share.stayTotal;
    }
  }

  const reviewPending = pendingList.filter((r) => r.gateStatus === "REVIEW").length;
  const reviewTotal = requests.filter((r) => r.gateStatus === "REVIEW").length;

  $("kpiPending").textContent = String(pendingList.length);
  $("kpiCheckinsToday").textContent = String(checkinsToday.length);
  $("kpiCheckoutsToday").textContent = String(checkoutsToday.length);
  $("kpiApprovedMonth").textContent = String(approvedMonthCount);
  $("kpiIncomeMonth").textContent = money(expectedIncomeMonth);
  $("kpiIncomeSub").textContent = `${approvedMonthCount} stay(s) in ${formatMonthLabel(ym)} × kt_settings`;
  $("kpiReviewNeeded").textContent = String(reviewPending);
  $("kpiReviewSub").textContent = `${reviewTotal} total gate-flagged request(s)`;

  // Alerts
  const clashCount = pendingList.filter(
    (r) => getRequestClashes(r, requests, blocked).hasClash,
  ).length;
  const flaggedPending = pendingList.filter((r) => isGuestFlagged(r.phone, flagged)).length;
  const alertsHtml = [];
  if (clashCount > 0) {
    alertsHtml.push(
      `<div class="alert-banner alert-banner--danger"><strong>DATE CLASH ALERT:</strong> ${clashCount} pending request(s) overlap approved stays or blocked dates.</div>`,
    );
  }
  if (flaggedPending > 0) {
    alertsHtml.push(
      `<div class="alert-banner alert-banner--danger"><strong>BLACKLIST ALERT:</strong> ${flaggedPending} pending request(s) match a flagged guest phone number.</div>`,
    );
  }
  if (reviewPending > 0) {
    alertsHtml.push(
      `<div class="alert-banner alert-banner--warn"><strong>MANUAL REVIEW NEEDED:</strong> ${reviewPending} pending request(s) flagged REVIEW by the guest gate.</div>`,
    );
  }
  $("dashAlerts").innerHTML = alertsHtml.join("");

  $("dashUpcomingBody").innerHTML =
    requests
      .slice(0, 8)
      .map((r) => {
        const pricing = calcStayPricing(r, settings);
        const statusCls = isApproved(r) ? "a" : isDeclined(r) ? "d" : "p";
        return `<tr>
          <td><b>${escapeHTML(r.id)}</b></td>
          <td>${escapeHTML(r.name)}<br><span class="small">${escapeHTML(r.phone)}</span></td>
          <td>${escapeHTML(r.checkin)} → ${escapeHTML(r.checkout)}<br><span class="small">${pricing.totalNights} night(s)</span></td>
          <td><b>${money(pricing.stayTotal)}</b></td>
          <td><span class="chip ${statusCls}">${escapeHTML(r.ownerStatus)}</span></td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="5">No requests yet.</td></tr>`;
}

// ============================================================
// SECTION 3: BOOKING REQUESTS RENDERER & ACTIONS
// ============================================================
function renderRequests() {
  const all = loadRequests();
  const blocked = loadBlockedDates();
  const flagged = loadFlaggedGuests();
  const settings = loadSettings();
  const templates = loadTemplates();

  const counts = {
    ALL: all.length,
    PENDING: all.filter(isPending).length,
    REVIEW: all.filter((r) => r.gateStatus === "REVIEW").length,
    APPROVED: all.filter(isApproved).length,
    DECLINED: all.filter(isDeclined).length,
  };

  $("navPendingBadge").textContent = String(counts.PENDING);
  $("countAll").textContent = String(counts.ALL);
  $("countPending").textContent = String(counts.PENDING);
  $("countReview").textContent = String(counts.REVIEW);
  $("countApproved").textContent = String(counts.APPROVED);
  $("countDeclined").textContent = String(counts.DECLINED);

  const q = state.reqSearch.trim().toLowerCase();
  const filtered = all.filter((r) => {
    if (state.reqFilter === "PENDING" && !isPending(r)) return false;
    if (state.reqFilter === "REVIEW" && r.gateStatus !== "REVIEW") return false;
    if (state.reqFilter === "APPROVED" && !isApproved(r)) return false;
    if (state.reqFilter === "DECLINED" && !isDeclined(r)) return false;
    if (q) {
      const hay = `${r.id} ${r.name} ${r.phone} ${r.guests}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $("rows").innerHTML =
    filtered
      .map((r) => {
        const clash = getRequestClashes(r, all, blocked);
        const flaggedGuest = isGuestFlagged(r.phone, flagged);
        const waUrl = buildWhatsAppUrl(r, settings, templates);
        const decisionCls = isApproved(r) ? "a" : isDeclined(r) ? "d" : "p";
        const notesSnippet = r.internalNotes
          ? `<br><span class="small">Note: ${escapeHTML(r.internalNotes.slice(0, 48))}${r.internalNotes.length > 48 ? "…" : ""}</span>`
          : "";
        return `<tr class="req-row" data-open-id="${escapeHTML(r.id)}">
    <td>
      <b>${escapeHTML(r.id)}</b><br>
      <span class="small">${escapeHTML(r.time)}</span>
      ${clash.hasClash ? `<br><span class="chip clash" title="${escapeHTML(clash.details.join("; "))}">DATE CLASH</span>` : ""}
      ${flaggedGuest ? `<br><span class="chip flagged">FLAGGED GUEST</span>` : ""}
    </td>
    <td>
      <b>${escapeHTML(r.name)}</b><br>
      <span class="small">${escapeHTML(r.phone)}<br>${escapeHTML(r.guests)}</span>
      <div style="margin-top:6px;font-size:10.5px;color:#55483f;">
        <strong>ID:</strong> ${escapeHTML(r.idType || "Not specified")}
      </div>
      ${
        r.idFront || r.idBack
          ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
            ${r.idFront ? `<button type="button" class="id-thumb-btn" data-view-id="${escapeHTML(r.id)}" data-side="front">📷 Front ID</button>` : ""}
            ${r.idBack ? `<button type="button" class="id-thumb-btn" data-view-id="${escapeHTML(r.id)}" data-side="back">📷 Back ID</button>` : ""}
          </div>`
          : ""
      }
    </td>
    <td>
      ${escapeHTML(r.guestType)}<br>
      <span class="small">Men ${escapeHTML(r.men)} • Women ${escapeHTML(r.women)} • Children ${escapeHTML(r.children)}<br>${escapeHTML(r.purpose)}</span>
    </td>
    <td>
      <b>${escapeHTML(r.checkin)} → ${escapeHTML(r.checkout)}</b><br>
      <span class="small">${diffIsoDays(r.checkin, r.checkout)} night(s)</span>
    </td>
    <td>
      <span class="chip ${r.gateStatus === "ALLOWED" ? "a" : "r"}">${escapeHTML(r.gateStatus)}</span>
      <br><span class="small">${escapeHTML(r.gateReason || "")}</span>
    </td>
    <td>
      <span class="chip ${decisionCls}">${escapeHTML(r.ownerStatus)}</span>
      ${r.declineReason ? `<br><span class="small" style="color:#962b20;"><strong>Reason:</strong> ${escapeHTML(r.declineReason)}</span>` : ""}
      ${r.payLink ? `<br><span class="small">DEMO link: ${escapeHTML(r.payLink)}</span>` : ""}
      ${notesSnippet}
    </td>
    <td>
      <div class="table-action-stack">
        ${
          isPending(r)
            ? `<div style="display:flex;gap:5px;flex-wrap:wrap;">
                <button type="button" class="btn" data-act="approve" data-req-id="${escapeHTML(r.id)}">Approve</button>
                <button type="button" class="btn alt" data-act="decline" data-req-id="${escapeHTML(r.id)}">Decline</button>
              </div>`
            : ""
        }
        <button type="button" class="admin-btn-outline" data-detail-id="${escapeHTML(r.id)}">Details &amp; Notes</button>
        ${
          waUrl
            ? `<a class="admin-btn-wa" href="${escapeHTML(waUrl)}" target="_blank" rel="noopener">WhatsApp Guest ↗</a>`
            : `<button type="button" class="admin-btn-wa" data-wa-invalid="1">WhatsApp Guest</button>`
        }
      </div>
    </td>
  </tr>`;
      })
      .join("") || `<tr><td colspan="7">No matching requests found.</td></tr>`;
}

function approveRequest(reqId) {
  const all = loadRequests();
  const item = all.find((r) => String(r.id) === String(reqId));
  if (!item) return;
  item.ownerStatus = "APPROVED";
  item.declineReason = "";
  if (!item.payLink) {
    item.payLink =
      "https://pay.kissingtree.example/" +
      encodeURIComponent(item.id) +
      " (DEMO link)";
  }
  saveRequests(all);
  renderAll();
  if (state.detailReqId === reqId && !$("detailModal").hidden) {
    openDetailModal(reqId);
  }
}

function openDeclineModal(reqId) {
  const all = loadRequests();
  const item = all.find((r) => String(r.id) === String(reqId));
  if (!item) return;
  state.declineReqId = item.id;
  $("declineReqMeta").textContent = `${item.id} · ${item.name} (${item.checkin} → ${item.checkout})`;
  $("declineReasonSelect").value = item.declineReason ? item.declineReason.split(" — ")[0] : "";
  $("declineReasonNote").value = "";
  $("declineModal").hidden = false;
}

function closeDeclineModal() {
  $("declineModal").hidden = true;
  state.declineReqId = null;
}

$("declineForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const reason = $("declineReasonSelect").value;
  if (!reason || !state.declineReqId) return;
  const extra = $("declineReasonNote").value.trim();
  const all = loadRequests();
  const item = all.find((r) => String(r.id) === String(state.declineReqId));
  if (!item) return;
  item.ownerStatus = "DECLINED";
  item.declineReason = extra ? `${reason} — ${extra}` : reason;
  item.payLink = "";
  saveRequests(all);
  const inspectedId = state.detailReqId;
  closeDeclineModal();
  renderAll();
  if (inspectedId && inspectedId === item.id && !$("detailModal").hidden) {
    openDetailModal(item.id);
  }
});

$("declineModalCloseBtn").addEventListener("click", closeDeclineModal);
$("declineCancelBtn").addEventListener("click", closeDeclineModal);

function openDetailModal(reqId) {
  const all = loadRequests();
  const item = all.find((r) => String(r.id) === String(reqId));
  if (!item) return;
  state.detailReqId = item.id;
  const blocked = loadBlockedDates();
  const flagged = loadFlaggedGuests();
  const settings = loadSettings();
  const templates = loadTemplates();
  const pricing = calcStayPricing(item, settings);
  const clash = getRequestClashes(item, all, blocked);
  const flaggedGuest = isGuestFlagged(item.phone, flagged);

  $("detailModalBody").innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
      <span class="chip ${item.gateStatus === "ALLOWED" ? "a" : "r"}">Gate: ${escapeHTML(item.gateStatus)}</span>
      <span class="chip ${isApproved(item) ? "a" : isDeclined(item) ? "d" : "p"}">${escapeHTML(item.ownerStatus)}</span>
      ${clash.hasClash ? `<span class="chip clash">DATE CLASH: ${escapeHTML(clash.details.join(" | "))}</span>` : ""}
      ${flaggedGuest ? `<span class="chip flagged">FLAGGED / BLACKLISTED GUEST</span>` : ""}
    </div>
    <div class="detail-kv-grid">
      <div class="detail-kv-item"><small>Reference / Time</small><strong>${escapeHTML(item.id)}</strong> · ${escapeHTML(item.time)}</div>
      <div class="detail-kv-item"><small>Lead Guest &amp; Phone</small><strong>${escapeHTML(item.name)}</strong><br>${escapeHTML(item.phone)}</div>
      <div class="detail-kv-item"><small>Dates &amp; Duration</small><strong>${escapeHTML(item.checkin)} → ${escapeHTML(item.checkout)}</strong> (${pricing.totalNights} nights)</div>
      <div class="detail-kv-item"><small>Estimated Tariff</small><strong>${money(pricing.stayTotal)}</strong> + ${money(pricing.depositAmount)} refundable deposit</div>
      <div class="detail-kv-item"><small>Guest Type &amp; Purpose</small>${escapeHTML(item.guestType)}<br>${escapeHTML(item.purpose)}</div>
      <div class="detail-kv-item"><small>Party Breakdown</small>Men ${escapeHTML(item.men)} · Women ${escapeHTML(item.women)} · Children ${escapeHTML(item.children)}</div>
      <div class="detail-kv-item" style="grid-column:1 / -1;"><small>Full Guest List</small>${escapeHTML(item.guests || "Not provided")}</div>
      <div class="detail-kv-item"><small>ID Document Type</small>${escapeHTML(item.idType || "Not specified")}</div>
      <div class="detail-kv-item"><small>Gate Review Reason</small>${escapeHTML(item.gateReason || "No note")}</div>
      ${
        item.declineReason
          ? `<div class="detail-kv-item" style="grid-column:1 / -1;color:#962b20;"><small>Saved Decline Reason</small><strong>${escapeHTML(item.declineReason)}</strong></div>`
          : ""
      }
      ${
        item.payLink
          ? `<div class="detail-kv-item" style="grid-column:1 / -1;"><small>Demo Payment Link</small><code>${escapeHTML(item.payLink)}</code></div>`
          : ""
      }
    </div>
    ${
      item.idFront || item.idBack
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${item.idFront ? `<button type="button" class="id-thumb-btn" data-view-id="${escapeHTML(item.id)}" data-side="front">📷 View Front ID</button>` : ""}
            ${item.idBack ? `<button type="button" class="id-thumb-btn" data-view-id="${escapeHTML(item.id)}" data-side="back">📷 View Back ID</button>` : ""}
          </div>`
        : `<p class="small-note">No ID photos uploaded in this browser request.</p>`
    }
  `;

  $("detailNotesInput").value = item.internalNotes || "";
  $("detailNoteStatus").textContent = "";

  $("detailApproveBtn").hidden = isApproved(item);
  $("detailDeclineBtn").hidden = isDeclined(item);
  const waUrl = buildWhatsAppUrl(item, settings, templates);
  $("detailWaBtn").dataset.waUrl = waUrl || "";
  $("detailModal").hidden = false;
}

function closeDetailModal() {
  $("detailModal").hidden = true;
  state.detailReqId = null;
}

$("detailModalCloseBtn").addEventListener("click", closeDetailModal);
$("saveDetailNoteBtn").addEventListener("click", () => {
  if (!state.detailReqId) return;
  const all = loadRequests();
  const item = all.find((r) => String(r.id) === String(state.detailReqId));
  if (!item) return;
  item.internalNotes = $("detailNotesInput").value;
  saveRequests(all);
  $("detailNoteStatus").textContent = "Notes saved ✓";
  renderRequests();
});
$("detailApproveBtn").addEventListener("click", () => {
  if (state.detailReqId) approveRequest(state.detailReqId);
});
$("detailDeclineBtn").addEventListener("click", () => {
  if (state.detailReqId) openDeclineModal(state.detailReqId);
});
$("detailWaBtn").addEventListener("click", () => {
  const url = $("detailWaBtn").dataset.waUrl;
  if (!url) {
    alert("Guest phone number does not have enough digits for a WhatsApp link.");
    return;
  }
  window.open(url, "_blank", "noopener");
});
$("detailModalBody").addEventListener("click", (e) => {
  const viewBtn = e.target.closest("[data-view-id]");
  if (viewBtn) window.viewIdModal(viewBtn.dataset.viewId, viewBtn.dataset.side);
});

// Requests table delegated clicks & filter/search
$("reqFilterBar").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-req-filter]");
  if (!btn) return;
  state.reqFilter = btn.dataset.reqFilter;
  $("reqFilterBar")
    .querySelectorAll("[data-req-filter]")
    .forEach((p) => p.classList.toggle("is-active", p === btn));
  renderRequests();
});

$("reqSearch").addEventListener("input", (e) => {
  state.reqSearch = e.target.value;
  renderRequests();
});

$("rows").addEventListener("click", (e) => {
  if (e.target.closest("[data-wa-invalid]")) {
    alert("Guest phone number must contain at least 10 digits to open WhatsApp.");
    return;
  }
  if (e.target.closest("a")) return;
  const viewBtn = e.target.closest("[data-view-id]");
  if (viewBtn) {
    window.viewIdModal(viewBtn.dataset.viewId, viewBtn.dataset.side);
    return;
  }
  const actBtn = e.target.closest("[data-act]");
  if (actBtn) {
    if (actBtn.dataset.act === "approve") {
      approveRequest(actBtn.dataset.reqId);
    } else if (actBtn.dataset.act === "decline") {
      openDeclineModal(actBtn.dataset.reqId);
    }
    return;
  }
  const detailBtn = e.target.closest("[data-detail-id]");
  if (detailBtn) {
    openDetailModal(detailBtn.dataset.detailId);
    return;
  }
  const row = e.target.closest("[data-open-id]");
  if (row) openDetailModal(row.dataset.openId);
});

$("clearBtn").addEventListener("click", () => {
  if (window.confirm("Clear all local demo booking requests?")) {
    localStorage.removeItem(KEYS.REQUESTS);
    renderAll();
  }
});

// ============================================================
// SECTION 4: CALENDAR, BLOCK DATES & APPROVED CHECKLIST
// ============================================================
function stepCalendarMonth(delta) {
  const [y, m] = state.calMonth.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  state.calMonth = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  renderCalendar();
}

$("calPrevBtn").addEventListener("click", () => stepCalendarMonth(-1));
$("calNextBtn").addEventListener("click", () => stepCalendarMonth(1));
$("calTodayBtn").addEventListener("click", () => {
  const today = getLocalTodayIso();
  state.calMonth = today.slice(0, 7);
  state.selectedCalDay = today;
  renderCalendar();
});

function renderDayInspector(dayIso, approvedList, blockedList) {
  const bookingsOnDay = approvedList.filter(
    (r) => dayIso >= r.checkin && dayIso < r.checkout,
  );
  const checkoutsOnDay = approvedList.filter((r) => dayIso === r.checkout);
  const blocksOnDay = blockedList.filter(
    (b) => dayIso >= b.start && dayIso <= b.end,
  );
  const parts = [`<strong>${escapeHTML(dayIso)}</strong>`];
  if (!bookingsOnDay.length && !blocksOnDay.length && !checkoutsOnDay.length) {
    parts.push(" · Available (no approved stays or blocks).");
  }
  bookingsOnDay.forEach((b) => {
    parts.push(
      ` · <span class="chip a">Stay: ${escapeHTML(b.name)} (${escapeHTML(b.id)})</span>`,
    );
  });
  checkoutsOnDay.forEach((b) => {
    parts.push(
      ` · <span class="chip p">Morning check-out: ${escapeHTML(b.name)}</span>`,
    );
  });
  blocksOnDay.forEach((b) => {
    parts.push(
      ` · <span class="chip d">Blocked (${escapeHTML(b.reason)})${b.note ? ": " + escapeHTML(b.note) : ""}</span>`,
    );
  });
  $("calDayInspector").innerHTML = parts.join("");
}

function renderCalendar() {
  const requests = loadRequests();
  const approvedList = requests.filter(isApproved);
  const pendingList = requests.filter(isPending);
  const blockedList = loadBlockedDates();
  const today = getLocalTodayIso();

  $("calMonthTitle").textContent = formatMonthLabel(state.calMonth);

  const clashingPending = pendingList
    .map((r) => ({ req: r, clash: getRequestClashes(r, requests, blockedList) }))
    .filter((entry) => entry.clash.hasClash);
  $("calClashAlerts").innerHTML = clashingPending
    .map(
      ({ req, clash }) =>
        `<div class="alert-banner alert-banner--danger"><strong>DATE CLASH:</strong> Pending request <b>${escapeHTML(req.id)}</b> (${escapeHTML(req.name)}, ${escapeHTML(req.checkin)} → ${escapeHTML(req.checkout)}) overlaps ${escapeHTML(clash.details.join("; "))}</div>`,
    )
    .join("");

  const [yr, mo] = state.calMonth.split("-").map(Number);
  const firstDow = new Date(Date.UTC(yr, mo - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(yr, mo, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < firstDow; i += 1) {
    cells.push('<div class="cal-cell cal-cell--empty" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayIso = `${state.calMonth}-${String(day).padStart(2, "0")}`;
    const dayApproved = approvedList.filter(
      (r) => dayIso >= r.checkin && dayIso < r.checkout,
    );
    const dayBlocked = blockedList.filter(
      (b) => dayIso >= b.start && dayIso <= b.end,
    );
    const dayPending = pendingList.filter(
      (r) => dayIso >= r.checkin && dayIso < r.checkout,
    );

    const classes = ["cal-cell"];
    if (dayBlocked.length) classes.push("cal-cell--blocked");
    if (dayIso === today) classes.push("cal-cell--today");
    if (dayIso === state.selectedCalDay) classes.push("cal-cell--selected");

    const pills = [
      ...dayApproved.map(
        (b) =>
          `<span class="cal-pill cal-pill--approved" title="${escapeHTML(b.name)}">${escapeHTML(b.name)}</span>`,
      ),
      ...dayBlocked.map(
        (blk) =>
          `<span class="cal-pill cal-pill--blocked" title="${escapeHTML(blk.reason)}">Blocked: ${escapeHTML(blk.reason)}</span>`,
      ),
      ...dayPending.map(
        (p) =>
          `<span class="cal-pill cal-pill--pending" title="Pending: ${escapeHTML(p.name)}">Pending: ${escapeHTML(p.name)}</span>`,
      ),
    ];

    cells.push(
      `<button type="button" class="${classes.join(" ")}" data-cal-day="${dayIso}">
        <span class="cal-day-num"><span>${day}</span>${dayIso === today ? "<small>Today</small>" : ""}</span>
        ${pills.slice(0, 3).join("")}
      </button>`,
    );
  }

  $("calendarGrid").innerHTML = cells.join("");
  renderDayInspector(state.selectedCalDay || today, approvedList, blockedList);

  $("blockedRangesList").innerHTML =
    blockedList
      .map(
        (blk) => `<div class="blocked-range-item">
          <div>
            <strong>${escapeHTML(blk.start)} → ${escapeHTML(blk.end)}</strong><br>
            <span class="small-note">${escapeHTML(blk.reason)}${blk.note ? " · " + escapeHTML(blk.note) : ""}</span>
          </div>
          <button type="button" class="admin-btn-outline" data-unblock-id="${escapeHTML(blk.id)}">Unblock</button>
        </div>`,
      )
      .join("") || `<p class="small-note">No blocked date ranges saved.</p>`;

  $("calApprovedList").innerHTML =
    approvedList
      .map(
        (r) => `<article class="approved-check-card">
          <div class="approved-check-top">
            <div>
              <b>${escapeHTML(r.name)}</b> <span class="small">(${escapeHTML(r.id)})</span><br>
              <span class="small-note">${escapeHTML(r.checkin)} → ${escapeHTML(r.checkout)} · ${diffIsoDays(r.checkin, r.checkout)} night(s)</span>
            </div>
            <button type="button" class="admin-btn-outline" data-open-approved="${escapeHTML(r.id)}">Details</button>
          </div>
          <div class="approved-checkbox-row">
            <label class="check-pill">
              <input type="checkbox" data-booking-check="${escapeHTML(r.id)}" data-field="checkInDone" ${r.checkInDone ? "checked" : ""} />
              Check-in done
            </label>
            <label class="check-pill">
              <input type="checkbox" data-booking-check="${escapeHTML(r.id)}" data-field="checkOutDone" ${r.checkOutDone ? "checked" : ""} />
              Check-out done
            </label>
            <label class="check-pill">
              <input type="checkbox" data-booking-check="${escapeHTML(r.id)}" data-field="idVerified" ${r.idVerified ? "checked" : ""} />
              ID-verified
            </label>
          </div>
        </article>`,
      )
      .join("") || `<p class="small-note">Approve a booking request to track check-in, check-out, and ID verification.</p>`;
}

$("calendarGrid").addEventListener("click", (e) => {
  const cell = e.target.closest("[data-cal-day]");
  if (!cell) return;
  state.selectedCalDay = cell.dataset.calDay;
  renderCalendar();
});

$("blockDatesForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.role !== "owner") return;
  const start = $("blockStart").value;
  const end = $("blockEnd").value;
  const reason = $("blockReason").value;
  const note = $("blockNote").value.trim();
  const statusEl = $("blockFormStatus");
  if (!start || !end || end < start) {
    statusEl.textContent = "To date must be on or after From date.";
    statusEl.style.color = "#962b20";
    return;
  }
  const blocked = loadBlockedDates();
  blocked.push({
    id: "BLKDATE-" + Date.now().toString().slice(-6),
    start,
    end,
    reason,
    note,
  });
  saveBlockedDates(blocked);
  state.calMonth = start.slice(0, 7);
  state.selectedCalDay = start;
  statusEl.textContent = `Blocked ${start} → ${end} (${reason}).`;
  statusEl.style.color = "#1f5c35";
  $("blockDatesForm").reset();
  renderAll();
});

$("blockedRangesList").addEventListener("click", (e) => {
  if (state.role !== "owner") return;
  const btn = e.target.closest("[data-unblock-id]");
  if (!btn) return;
  const remaining = loadBlockedDates().filter((b) => b.id !== btn.dataset.unblockId);
  saveBlockedDates(remaining);
  renderAll();
});

$("calApprovedList").addEventListener("change", (e) => {
  const cb = e.target.closest("[data-booking-check]");
  if (!cb) return;
  const all = loadRequests();
  const item = all.find((r) => r.id === cb.dataset.bookingCheck);
  if (!item) return;
  item[cb.dataset.field] = cb.checked;
  saveRequests(all);
});

$("calApprovedList").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open-approved]");
  if (btn) openDetailModal(btn.dataset.openApproved);
});

// ============================================================
// SECTION 5: PAYMENTS (DEMO ONLY)
// ============================================================
function updatePaymentTotals(approved = loadRequests().filter(isApproved), settings = loadSettings()) {
  let advanceCollected = 0;
  let balancePending = 0;
  let depositsHeld = 0;
  for (const r of approved) {
    const p = calcStayPricing(r, settings);
    if (r.advanceStatus === "Paid") advanceCollected += p.advanceExpected;
    if (r.balanceStatus !== "Paid") balancePending += p.balanceExpected;
    if (r.depositStatus === "Collected") depositsHeld += p.depositAmount;
  }
  $("payTotalAdvance").textContent = money(advanceCollected);
  $("payTotalBalance").textContent = money(balancePending);
  $("payTotalDeposits").textContent = money(depositsHeld);
}

function renderPayments() {
  if (state.role !== "owner") return;
  const approved = loadRequests().filter(isApproved);
  const settings = loadSettings();

  $("paymentsRows").innerHTML =
    approved
      .map((r) => {
        const p = calcStayPricing(r, settings);

        return `<tr>
          <td><b>${escapeHTML(r.id)}</b><br>${escapeHTML(r.name)}<br><span class="small">${escapeHTML(r.phone)}</span></td>
          <td>${escapeHTML(r.checkin)} → ${escapeHTML(r.checkout)}<br><span class="small">${p.totalNights} night(s) · Total <b>${money(p.stayTotal)}</b><br>Deposit: ${money(p.depositAmount)}</span></td>
          <td>
            <div class="small" style="margin-bottom:4px;">${money(p.advanceExpected)}</div>
            <select data-pay-req="${escapeHTML(r.id)}" data-pay-field="advanceStatus" aria-label="Advance payment status for ${escapeHTML(r.name)}">
              <option value="Pending" ${r.advanceStatus === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Paid" ${r.advanceStatus === "Paid" ? "selected" : ""}>Paid</option>
            </select>
          </td>
          <td>
            <div class="small" style="margin-bottom:4px;">${money(p.balanceExpected)}</div>
            <select data-pay-req="${escapeHTML(r.id)}" data-pay-field="balanceStatus" aria-label="Balance payment status for ${escapeHTML(r.name)}">
              <option value="Pending" ${r.balanceStatus === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Paid" ${r.balanceStatus === "Paid" ? "selected" : ""}>Paid</option>
            </select>
          </td>
          <td>
            <select data-pay-req="${escapeHTML(r.id)}" data-pay-field="depositStatus" aria-label="Security deposit status for ${escapeHTML(r.name)}">
              <option value="Not taken" ${r.depositStatus === "Not taken" ? "selected" : ""}>Not taken</option>
              <option value="Collected" ${r.depositStatus === "Collected" ? "selected" : ""}>Collected</option>
              <option value="Refunded" ${r.depositStatus === "Refunded" ? "selected" : ""}>Refunded</option>
            </select>
          </td>
          <td>
            <button type="button" class="btn" data-gen-paylink="${escapeHTML(r.id)}">Generate Payment Link</button>
            ${r.payLink ? `<div class="small" style="margin-top:6px;">DEMO link:<br><code>${escapeHTML(r.payLink)}</code></div>` : ""}
          </td>
        </tr>`;
      })
      .join("") ||
    `<tr><td colspan="6">Approve a booking request to track demo advance, balance, and deposit status.</td></tr>`;

  updatePaymentTotals(approved, settings);
}

$("paymentsRows").addEventListener("change", (e) => {
  const sel = e.target.closest("[data-pay-req]");
  if (!sel) return;
  const all = loadRequests();
  const item = all.find((r) => r.id === sel.dataset.payReq);
  if (!item) return;
  item[sel.dataset.payField] = sel.value;
  saveRequests(all);
  updatePaymentTotals(all.filter(isApproved), loadSettings());
});

$("paymentsRows").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-gen-paylink]");
  if (!btn) return;
  const all = loadRequests();
  const item = all.find((r) => r.id === btn.dataset.genPaylink);
  if (!item) return;
  item.payLink =
    "https://pay.kissingtree.example/" +
    encodeURIComponent(item.id) +
    " (DEMO link)";
  saveRequests(all);
  renderAll();
});

// ============================================================
// SECTION 6: PRICING SETTINGS FORM & JSON EXPORT/IMPORT
// ============================================================
function renderPricingSettings() {
  if (state.role !== "owner") return;
  const s = loadSettings();
  $("setWeekday").value = s.weekday;
  $("setWeekend").value = s.weekend;
  $("setSeason").value = s.season;
  $("setIncludedGuests").value = s.includedGuests;
  $("setExtraGuest").value = s.extraGuestCharge;
  $("setSecurityDeposit").value = s.securityDeposit;
  $("setMinNights").value = s.minNights;
}

$("pricingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.role !== "owner") return;
  const next = sanitizeSettings({
    weekday: $("setWeekday").value,
    weekend: $("setWeekend").value,
    season: $("setSeason").value,
    includedGuests: $("setIncludedGuests").value,
    extraGuestCharge: $("setExtraGuest").value,
    securityDeposit: $("setSecurityDeposit").value,
    minNights: $("setMinNights").value,
  });
  writeJson(KEYS.SETTINGS, next);
  syncSitePricing(next);
  $("settingsStatus").textContent = "Settings saved to kt_settings ✓";
  renderAll();
});

$("resetSettingsBtn").addEventListener("click", () => {
  if (state.role !== "owner") return;
  const def = getDefaultSettings();
  writeJson(KEYS.SETTINGS, def);
  syncSitePricing(def);
  $("settingsStatus").textContent = "Reset to SAMPLE defaults ✓";
  renderAll();
});

$("exportSettingsBtn").addEventListener("click", () => {
  const s = loadSettings();
  triggerFileDownload(
    "kissing-trees-settings.json",
    "application/json",
    JSON.stringify(s, null, 2),
  );
});

$("importSettingsBtn").addEventListener("click", () => $("importSettingsFile").click());
$("importSettingsFile").addEventListener("change", () => {
  readUploadedJsonFile($("importSettingsFile"), (parsed) => {
    const clean = sanitizeSettings(parsed);
    writeJson(KEYS.SETTINGS, clean);
    syncSitePricing(clean);
    $("settingsStatus").textContent = "Imported settings JSON into kt_settings ✓";
    renderAll();
  });
});

// ============================================================
// SECTION 7: CMS & EDITORIAL CONTENT EDITOR
// ============================================================
function compressPhotoFile(file, maxDim = 1100, quality = 0.8, preserveAlpha = false) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("Please select an image file (JPEG, PNG, WEBP)."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image data."));
      img.onload = () => {
        let w = img.width || maxDim;
        let h = img.height || maxDim;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const outType =
          preserveAlpha && file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(outType, quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoPickerHtml({
  slot,
  currentSrc,
  defaultSrc = "",
  title,
  placeholderLabel = "No photo set (Monogram placeholder)",
  allowClear = false,
}) {
  const safeUrl =
    typeof isSafeImageSrc === "function" && isSafeImageSrc(currentSrc)
      ? currentSrc.trim()
      : "";
  const isDataUri = safeUrl.startsWith("data:image/");
  const optionsHtml = PROPERTY_PHOTO_LIBRARY.map(
    (p) =>
      `<option value="${escapeHTML(p.src)}" ${safeUrl === p.src ? "selected" : ""}>${escapeHTML(p.label)}</option>`,
  ).join("");

  return `<div class="cms-photo-editor">
    <div class="cms-photo-thumb" data-photo-preview="${escapeHTML(slot)}">
      ${safeUrl ? `<img src="${escapeHTML(safeUrl)}" alt="${escapeHTML(title)}" />` : `<span>${escapeHTML(placeholderLabel)}</span>`}
    </div>
    <div class="cms-photo-controls">
      <strong style="font-size:12px;color:var(--pine);">${escapeHTML(title)}</strong>
      <div class="cms-photo-actions">
        <label class="cms-upload-btn">
          Upload Photo
          <input type="file" accept="image/*" data-photo-upload="${escapeHTML(slot)}" />
        </label>
        ${defaultSrc ? `<button type="button" class="admin-btn-outline" data-photo-reset="${escapeHTML(slot)}">Reset Default</button>` : ""}
        ${allowClear ? `<button type="button" class="admin-btn-outline" data-photo-clear="${escapeHTML(slot)}">Use Placeholder</button>` : ""}
      </div>
      <div class="settings-form-grid">
        <label>
          Or choose site photo
          <select data-photo-preset="${escapeHTML(slot)}">
            <option value="">-- Select property photo --</option>
            ${optionsHtml}
          </select>
        </label>
        <label>
          Or paste image URL / asset path
          <input type="text" data-photo-url="${escapeHTML(slot)}" value="${isDataUri ? "[Uploaded photo]" : escapeHTML(currentSrc || "")}" placeholder="assets/property-photos/... or https://..." ${isDataUri ? 'data-has-upload="1"' : ""} />
        </label>
      </div>
    </div>
  </div>`;
}

function getDefaultPhotoBySlot(slot) {
  if (slot === "chatLogo") return "assets/cottage-chat-logo.png";
  if (slot === "homeHero") return "assets/property-photos/house-exterior.jpeg";
  if (slot === "aboutHost") return "";
  if (slot.startsWith("blog:")) {
    const idx = Number(slot.split(":")[1]);
    const defPosts = getDefaultCms().blog.posts;
    return (defPosts[idx] && defPosts[idx].image) || "assets/property-photos/house-exterior.jpeg";
  }
  if (slot.startsWith("gallery:")) {
    const idx = Number(slot.split(":")[1]);
    const defItems = getDefaultGalleryItems();
    return (defItems[idx] && defItems[idx].src) || "assets/property-photos/house-exterior.jpeg";
  }
  return "";
}

function setCmsPhotoBySlot(slot, nextVal) {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  const c = state.cmsDraft;
  if (slot === "chatLogo") c.site.chatLogoSrc = nextVal;
  else if (slot === "homeHero") c.home.heroImageSrc = nextVal;
  else if (slot === "aboutHost") c.about.hostPhotoSrc = nextVal;
  else if (slot.startsWith("blog:")) {
    const idx = Number(slot.split(":")[1]);
    if (c.blog.posts[idx]) c.blog.posts[idx].image = nextVal;
  } else if (slot.startsWith("gallery:")) {
    const idx = Number(slot.split(":")[1]);
    if (c.gallery.items[idx]) c.gallery.items[idx].src = nextVal;
  }
}

function renderCmsPhotoSlots() {
  const c = state.cmsDraft;
  $("cmsChatLogoSlot").innerHTML = renderPhotoPickerHtml({
    slot: "chatLogo",
    currentSrc: c.site.chatLogoSrc,
    defaultSrc: "assets/cottage-chat-logo.png",
    title: "Sitewide Floating WhatsApp Badge Photo",
  });
  $("cmsHomeHeroPhotoSlot").innerHTML = renderPhotoPickerHtml({
    slot: "homeHero",
    currentSrc: c.home.heroImageSrc,
    defaultSrc: "assets/property-photos/house-exterior.jpeg",
    title: "Homepage Hero Background Photograph",
  });
  $("cmsAboutHostPhotoSlot").innerHTML = renderPhotoPickerHtml({
    slot: "aboutHost",
    currentSrc: c.about.hostPhotoSrc,
    placeholderLabel: "KT Monogram Placeholder",
    title: "About Page Host Portrait Photo",
    allowClear: true,
  });
}

function renderCmsRepeaters() {
  const cms = state.cmsDraft;
  $("cmsHighlightsEditor").innerHTML = cms.home.highlights
    .map(
      (item, idx) => `<div class="cms-repeat-item">
        <strong>Feature Card 0${idx + 1}</strong>
        <div class="settings-form-grid">
          <label>Tag <input type="text" data-cms-hl="${idx}" data-key="tag" value="${escapeHTML(item.tag)}" /></label>
          <label>Heading <input type="text" data-cms-hl="${idx}" data-key="title" value="${escapeHTML(item.title)}" /></label>
          <label class="full-span">Description <textarea rows="2" data-cms-hl="${idx}" data-key="body">${escapeHTML(item.body)}</textarea></label>
        </div>
      </div>`,
    )
    .join("");

  $("cmsAmenitiesList").innerHTML = cms.amenities
    .map(
      (item, idx) => `<div class="cms-repeat-item">
        <div style="display:grid;grid-template-columns:80px minmax(0,1fr) auto;gap:10px;align-items:end;">
          <label style="font-size:10px;font-weight:700;">Icon <input type="text" data-cms-amen="${idx}" data-col="0" value="${escapeHTML(item[0])}" /></label>
          <label style="font-size:10px;font-weight:700;">Label <input type="text" data-cms-amen="${idx}" data-col="1" value="${escapeHTML(item[1])}" /></label>
          <button type="button" class="admin-btn-outline" data-cms-del-amen="${idx}">Remove</button>
        </div>
      </div>`,
    )
    .join("");

  $("cmsRulesList").innerHTML = cms.faq.rules
    .map(
      (rule, idx) => `<div class="cms-repeat-item">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;">
          <input type="text" data-cms-rule="${idx}" value="${escapeHTML(rule)}" aria-label="House rule ${idx + 1}" />
          <button type="button" class="admin-btn-outline" data-cms-del-rule="${idx}">Remove</button>
        </div>
      </div>`,
    )
    .join("");

  $("cmsFaqsList").innerHTML = cms.faq.faqs
    .map(
      (faq, idx) => `<div class="cms-repeat-item">
        <div class="card-head-inline" style="margin-bottom:0;">
          <strong>FAQ #${idx + 1}</strong>
          <button type="button" class="admin-btn-outline" data-cms-del-faq="${idx}">Remove</button>
        </div>
        <div class="settings-form-grid">
          <label class="full-span">Question <input type="text" data-cms-faq="${idx}" data-key="question" value="${escapeHTML(faq.question)}" /></label>
          <label class="full-span">Answer <textarea rows="2" data-cms-faq="${idx}" data-key="answer">${escapeHTML(faq.answer)}</textarea></label>
        </div>
      </div>`,
    )
    .join("");

  $("cmsBlogPostsEditor").innerHTML = cms.blog.posts
    .map(
      (post, idx) => `<div class="cms-repeat-item">
        <div class="card-head-inline" style="margin-bottom:0;">
          <strong>Article #${idx + 1}</strong>
          <button type="button" class="admin-btn-outline" data-cms-del-blog="${idx}">Remove</button>
        </div>
        ${renderPhotoPickerHtml({
          slot: `blog:${idx}`,
          currentSrc: post.image,
          defaultSrc: getDefaultPhotoBySlot(`blog:${idx}`),
          title: `Article #${idx + 1} Cover Photograph`,
        })}
        <div class="settings-form-grid">
          <label>Image Alt Text <input type="text" data-cms-blog="${idx}" data-key="imageAlt" value="${escapeHTML(post.imageAlt || "")}" /></label>
          <label>Place tag <input type="text" data-cms-blog="${idx}" data-key="place" value="${escapeHTML(post.place)}" /></label>
          <label>Badge <input type="text" data-cms-blog="${idx}" data-key="badge" value="${escapeHTML(post.badge)}" /></label>
          <label>Category <input type="text" data-cms-blog="${idx}" data-key="category" value="${escapeHTML(post.category)}" /></label>
          <label class="full-span">Title <input type="text" data-cms-blog="${idx}" data-key="title" value="${escapeHTML(post.title)}" /></label>
          <label class="full-span">Summary <textarea rows="2" data-cms-blog="${idx}" data-key="summary">${escapeHTML(post.summary)}</textarea></label>
        </div>
      </div>`,
    )
    .join("");

  $("cmsGalleryItemsEditor").innerHTML = cms.gallery.items
    .map(
      (item, idx) => `<div class="cms-repeat-item">
        <div class="card-head-inline" style="margin-bottom:0;">
          <strong>Gallery Photo #${String(idx + 1).padStart(2, "0")}</strong>
          <div class="panel-actions-row">
            <button type="button" class="admin-btn-outline" data-cms-move-gal="${idx}:-1" ${idx === 0 ? "disabled" : ""}>↑ Up</button>
            <button type="button" class="admin-btn-outline" data-cms-move-gal="${idx}:1" ${idx === cms.gallery.items.length - 1 ? "disabled" : ""}>↓ Down</button>
            <button type="button" class="admin-btn-danger" data-cms-del-gal="${idx}">Remove</button>
          </div>
        </div>
        ${renderPhotoPickerHtml({
          slot: `gallery:${idx}`,
          currentSrc: item.src,
          defaultSrc: getDefaultPhotoBySlot(`gallery:${idx}`),
          title: `Photo File / Image`,
        })}
        <div class="settings-form-grid">
          <label>Caption <input type="text" data-cms-gal="${idx}" data-key="caption" value="${escapeHTML(item.caption)}" /></label>
          <label>Alt Text <input type="text" data-cms-gal="${idx}" data-key="alt" value="${escapeHTML(item.alt)}" /></label>
          <label>
            Category Filter
            <select data-cms-gal="${idx}" data-key="category">
              <option value="interiors" ${item.category === "interiors" ? "selected" : ""}>Interiors &amp; Bedrooms</option>
              <option value="details" ${item.category === "details" ? "selected" : ""}>Handmade Details</option>
              <option value="outdoors" ${item.category === "outdoors" ? "selected" : ""}>The Grove &amp; Outdoors</option>
            </select>
          </label>
          <label>
            Editorial Card Size
            <select data-cms-gal="${idx}" data-key="size">
              <option value="tall" ${item.size !== "wide" ? "selected" : ""}>Vertical Portrait (3:4)</option>
              <option value="wide" ${item.size === "wide" ? "selected" : ""}>Wide Landscape (span 2)</option>
            </select>
          </label>
        </div>
      </div>`,
    )
    .join("");
}

function renderCmsSection() {
  if (state.role !== "owner") return;
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  const c = state.cmsDraft;
  $("cmsName").value = c.site.name;
  $("cmsTagline").value = c.site.tagline;
  $("cmsLocation").value = c.site.location;
  $("cmsNearby").value = c.site.nearbyLandscape;
  $("cmsWhatsapp").value = c.site.whatsapp;
  $("cmsEmail").value = c.site.email;
  $("cmsCheckIn").value = c.site.checkIn;
  $("cmsCheckOut").value = c.site.checkOut;
  $("cmsMaxGuests").value = c.site.maxGuests;
  $("cmsApprovalHours").value = c.site.approvalHours;
  $("cmsInstagram").value = c.site.socials.instagram;
  $("cmsX").value = c.site.socials.x;
  $("cmsFacebook").value = c.site.socials.facebook;

  $("cmsHeroEyebrow").value = c.home.heroEyebrow;
  $("cmsCtaSubtext").value = c.home.ctaSubtext;
  $("cmsHeroLead").value = c.home.heroLead;
  $("cmsHeroSubtext").value = c.home.heroSubtext;
  $("cmsIntroLead").value = c.home.introLead;
  $("cmsIntroBody").value = c.home.introBody;

  $("cmsHostPhotoTag").value = c.about.hostPhotoTag || "YOUR HOST";
  $("cmsHostPhotoCaption").value = c.about.hostPhotoCaption || "";
  $("cmsHostPhotoAlt").value = c.about.hostPhotoAlt || "";
  $("cmsAboutHeroSubtext").value = c.about.heroSubtext;
  $("cmsAboutP1").value = c.about.introP1;
  $("cmsAboutP2").value = c.about.introP2;
  $("cmsAboutPromise").value = c.about.promiseCallout;
  $("cmsFounderP1").value = c.about.founderP1;
  $("cmsFounderP2").value = c.about.founderP2;

  $("cmsFaqHeroSubtext").value = c.faq.heroSubtext;
  $("cmsBlogHeroSubtext").value = c.blog.heroSubtext;
  $("cmsGalleryHelper").value = c.gallery.helperNote;

  document.querySelectorAll("[data-cms-card]").forEach((card) => {
    card.hidden = state.cmsGroup !== "all" && card.dataset.cmsCard !== state.cmsGroup;
  });

  renderCmsPhotoSlots();
  renderCmsRepeaters();
}

function collectCmsDraftFromInputs() {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  const c = state.cmsDraft;
  c.site.name = $("cmsName").value.trim() || c.site.name;
  c.site.tagline = $("cmsTagline").value.trim() || c.site.tagline;
  c.site.location = $("cmsLocation").value.trim() || c.site.location;
  c.site.nearbyLandscape = $("cmsNearby").value.trim() || c.site.nearbyLandscape;
  c.site.whatsapp = $("cmsWhatsapp").value.trim() || c.site.whatsapp;
  c.site.email = $("cmsEmail").value.trim() || c.site.email;
  c.site.checkIn = $("cmsCheckIn").value.trim() || c.site.checkIn;
  c.site.checkOut = $("cmsCheckOut").value.trim() || c.site.checkOut;
  c.site.maxGuests = Math.max(1, Number($("cmsMaxGuests").value) || 10);
  c.site.approvalHours = $("cmsApprovalHours").value.trim() || c.site.approvalHours;
  c.site.socials.instagram = $("cmsInstagram").value.trim();
  c.site.socials.x = $("cmsX").value.trim();
  c.site.socials.facebook = $("cmsFacebook").value.trim();

  c.home.heroEyebrow = $("cmsHeroEyebrow").value.trim();
  c.home.ctaSubtext = $("cmsCtaSubtext").value.trim();
  c.home.heroLead = $("cmsHeroLead").value.trim();
  c.home.heroSubtext = $("cmsHeroSubtext").value.trim();
  c.home.introLead = $("cmsIntroLead").value.trim();
  c.home.introBody = $("cmsIntroBody").value.trim();

  c.about.hostPhotoTag = $("cmsHostPhotoTag").value.trim();
  c.about.hostPhotoCaption = $("cmsHostPhotoCaption").value.trim();
  c.about.hostPhotoAlt = $("cmsHostPhotoAlt").value.trim();
  c.about.heroSubtext = $("cmsAboutHeroSubtext").value.trim();
  c.about.introP1 = $("cmsAboutP1").value.trim();
  c.about.introP2 = $("cmsAboutP2").value.trim();
  c.about.promiseCallout = $("cmsAboutPromise").value.trim();
  c.about.founderP1 = $("cmsFounderP1").value.trim();
  c.about.founderP2 = $("cmsFounderP2").value.trim();

  c.faq.heroSubtext = $("cmsFaqHeroSubtext").value.trim();
  c.blog.heroSubtext = $("cmsBlogHeroSubtext").value.trim();
  c.gallery.helperNote = $("cmsGalleryHelper").value.trim();

  return c;
}

function persistCmsDraftNow(statusMessage = "Saved to kt_cms ✓") {
  const cms = collectCmsDraftFromInputs();
  if (writeJson(KEYS.CMS, cms)) {
    $("cmsStatus").textContent = statusMessage;
  }
}

let cmsAutoSaveTimer = null;
function scheduleCmsAutoSave() {
  if (cmsAutoSaveTimer) clearTimeout(cmsAutoSaveTimer);
  cmsAutoSaveTimer = setTimeout(() => {
    persistCmsDraftNow("Auto-saved to kt_cms ✓");
  }, 150);
}

if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
  $("cmsProtocolWarning").hidden = false;
}

$("cmsSubNav").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cms-group]");
  if (!btn) return;
  persistCmsDraftNow("Auto-saved to kt_cms ✓");
  state.cmsGroup = btn.dataset.cmsGroup;
  $("cmsSubNav")
    .querySelectorAll("[data-cms-group]")
    .forEach((p) => p.classList.toggle("is-active", p === btn));
  renderCmsSection();
});

$("panel-content").addEventListener("input", (e) => {
  const t = e.target;
  if (!state.cmsDraft) return;
  if (t.dataset.cmsHl !== undefined) {
    state.cmsDraft.home.highlights[Number(t.dataset.cmsHl)][t.dataset.key] = t.value;
  } else if (t.dataset.cmsAmen !== undefined) {
    state.cmsDraft.amenities[Number(t.dataset.cmsAmen)][Number(t.dataset.col)] = t.value;
  } else if (t.dataset.cmsRule !== undefined) {
    state.cmsDraft.faq.rules[Number(t.dataset.cmsRule)] = t.value;
  } else if (t.dataset.cmsFaq !== undefined) {
    state.cmsDraft.faq.faqs[Number(t.dataset.cmsFaq)][t.dataset.key] = t.value;
  } else if (t.dataset.cmsBlog !== undefined) {
    state.cmsDraft.blog.posts[Number(t.dataset.cmsBlog)][t.dataset.key] = t.value;
  } else if (t.dataset.cmsGal !== undefined) {
    state.cmsDraft.gallery.items[Number(t.dataset.cmsGal)][t.dataset.key] = t.value;
  } else if (t.dataset.photoUrl !== undefined) {
    const val = t.value.trim();
    if (val !== "[Uploaded photo]") setCmsPhotoBySlot(t.dataset.photoUrl, val);
  }
  scheduleCmsAutoSave();
});

$("panel-content").addEventListener("change", (e) => {
  const t = e.target;
  if (!state.cmsDraft) return;
  if (t.dataset.cmsGal !== undefined) {
    state.cmsDraft.gallery.items[Number(t.dataset.cmsGal)][t.dataset.key] = t.value;
    persistCmsDraftNow("Auto-saved to kt_cms ✓");
    return;
  }
  if (t.dataset.photoUpload !== undefined) {
    const slot = t.dataset.photoUpload;
    const file = t.files && t.files[0];
    if (!file) return;
    const isBadge = slot === "chatLogo";
    compressPhotoFile(file, isBadge ? 420 : 1100, 0.8, isBadge)
      .then((dataUrl) => {
        setCmsPhotoBySlot(slot, dataUrl);
        renderCmsPhotoSlots();
        renderCmsRepeaters();
        persistCmsDraftNow("Photo uploaded & saved to kt_cms ✓");
      })
      .catch((err) => alert(err.message))
      .finally(() => {
        t.value = "";
      });
    return;
  }
  if (t.dataset.photoPreset !== undefined) {
    const slot = t.dataset.photoPreset;
    if (!t.value) return;
    setCmsPhotoBySlot(slot, t.value);
    renderCmsPhotoSlots();
    renderCmsRepeaters();
    persistCmsDraftNow("Photo updated & saved to kt_cms ✓");
    return;
  }
  if (t.dataset.photoUrl !== undefined) {
    const slot = t.dataset.photoUrl;
    const val = t.value.trim();
    if (val === "[Uploaded photo]") return;
    setCmsPhotoBySlot(slot, val);
    renderCmsPhotoSlots();
    renderCmsRepeaters();
    persistCmsDraftNow("Photo URL saved to kt_cms ✓");
    return;
  }
  persistCmsDraftNow("Auto-saved to kt_cms ✓");
});

$("panel-content").addEventListener("click", (e) => {
  if (!state.cmsDraft) return;
  const resetPhoto = e.target.closest("[data-photo-reset]");
  if (resetPhoto) {
    const slot = resetPhoto.dataset.photoReset;
    setCmsPhotoBySlot(slot, getDefaultPhotoBySlot(slot));
    renderCmsPhotoSlots();
    renderCmsRepeaters();
    persistCmsDraftNow("Reset photo & saved to kt_cms ✓");
    return;
  }
  const clearPhoto = e.target.closest("[data-photo-clear]");
  if (clearPhoto) {
    setCmsPhotoBySlot(clearPhoto.dataset.photoClear, "");
    renderCmsPhotoSlots();
    renderCmsRepeaters();
    persistCmsDraftNow("Updated placeholder & saved to kt_cms ✓");
    return;
  }
  const delAmen = e.target.closest("[data-cms-del-amen]");
  if (delAmen) {
    state.cmsDraft.amenities.splice(Number(delAmen.dataset.cmsDelAmen), 1);
    renderCmsRepeaters();
    persistCmsDraftNow("Removed amenity & saved to kt_cms ✓");
    return;
  }
  const delRule = e.target.closest("[data-cms-del-rule]");
  if (delRule) {
    state.cmsDraft.faq.rules.splice(Number(delRule.dataset.cmsDelRule), 1);
    renderCmsRepeaters();
    persistCmsDraftNow("Removed rule & saved to kt_cms ✓");
    return;
  }
  const delFaq = e.target.closest("[data-cms-del-faq]");
  if (delFaq) {
    state.cmsDraft.faq.faqs.splice(Number(delFaq.dataset.cmsDelFaq), 1);
    renderCmsRepeaters();
    persistCmsDraftNow("Removed FAQ & saved to kt_cms ✓");
    return;
  }
  const delBlog = e.target.closest("[data-cms-del-blog]");
  if (delBlog) {
    state.cmsDraft.blog.posts.splice(Number(delBlog.dataset.cmsDelBlog), 1);
    renderCmsRepeaters();
    persistCmsDraftNow("Removed article & saved to kt_cms ✓");
    return;
  }
  const delGal = e.target.closest("[data-cms-del-gal]");
  if (delGal) {
    state.cmsDraft.gallery.items.splice(Number(delGal.dataset.cmsDelGal), 1);
    renderCmsRepeaters();
    persistCmsDraftNow("Removed gallery photo & saved to kt_cms ✓");
    return;
  }
  const moveGal = e.target.closest("[data-cms-move-gal]");
  if (moveGal) {
    const [idxStr, dirStr] = moveGal.dataset.cmsMoveGal.split(":");
    const idx = Number(idxStr);
    const next = idx + Number(dirStr);
    const arr = state.cmsDraft.gallery.items;
    if (next >= 0 && next < arr.length) {
      const [moved] = arr.splice(idx, 1);
      arr.splice(next, 0, moved);
      renderCmsRepeaters();
      persistCmsDraftNow("Reordered gallery & saved to kt_cms ✓");
    }
  }
});

$("addAmenityBtn").addEventListener("click", () => {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  state.cmsDraft.amenities.push(["✦", "New Amenity"]);
  renderCmsRepeaters();
  persistCmsDraftNow("Added amenity & saved to kt_cms ✓");
});

$("addRuleBtn").addEventListener("click", () => {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  state.cmsDraft.faq.rules.push("New house policy note.");
  renderCmsRepeaters();
  persistCmsDraftNow("Added rule & saved to kt_cms ✓");
});

$("addFaqBtn").addEventListener("click", () => {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  state.cmsDraft.faq.faqs.push({ question: "New question?", answer: "Answer here." });
  renderCmsRepeaters();
  persistCmsDraftNow("Added FAQ & saved to kt_cms ✓");
});

$("addBlogBtn").addEventListener("click", () => {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  const nextNum = String(state.cmsDraft.blog.posts.length + 1).padStart(2, "0");
  state.cmsDraft.blog.posts.push({
    image: "assets/property-photos/house-exterior.jpeg",
    imageAlt: "Kissing Trees cottage homestay photograph",
    badge: `${nextNum} · Stay Story`,
    category: "FIELD NOTE",
    title: "New story headline",
    summary: "Short editorial summary for this field note.",
    place: "Near Dornahalli · KR Nagar",
  });
  renderCmsRepeaters();
  persistCmsDraftNow("Added article & saved to kt_cms ✓");
});

$("addGalleryPhotoBtn").addEventListener("click", () => {
  if (!state.cmsDraft) state.cmsDraft = loadCmsState();
  const nextNum = String(state.cmsDraft.gallery.items.length + 1).padStart(2, "0");
  state.cmsDraft.gallery.items.push({
    src: "assets/property-photos/house-exterior.jpeg",
    alt: "Kissing Trees cottage photograph",
    caption: `${nextNum} / New photo`,
    category: "interiors",
    size: "tall",
  });
  renderCmsRepeaters();
  persistCmsDraftNow("Added gallery photo & saved to kt_cms ✓");
});

$("saveCmsBtn").addEventListener("click", () => {
  persistCmsDraftNow("All CMS content & photos saved to kt_cms ✓");
});

$("resetCmsBtn").addEventListener("click", () => {
  if (!window.confirm("Reset CMS & editorial copy back to built-in defaults?")) return;
  localStorage.removeItem(KEYS.CMS);
  state.cmsDraft = getDefaultCms();
  renderCmsSection();
  $("cmsStatus").textContent = "CMS reset to built-in defaults ✓";
});

$("exportCmsBtn").addEventListener("click", () => {
  const cms = collectCmsDraftFromInputs();
  triggerFileDownload(
    "kissing-trees-cms.json",
    "application/json",
    JSON.stringify(cms, null, 2),
  );
});

$("importCmsBtn").addEventListener("click", () => $("importCmsFile").click());
$("importCmsFile").addEventListener("change", () => {
  readUploadedJsonFile($("importCmsFile"), (parsed) => {
    const merged = mergeDeepDefaults(getDefaultCms(), parsed);
    writeJson(KEYS.CMS, merged);
    state.cmsDraft = merged;
    renderCmsSection();
    $("cmsStatus").textContent = "Imported CMS JSON ✓";
  });
});

// ============================================================
// SECTION 8: BLOCKED LOG, GUESTS, TEMPLATES, REPORTS & BACKUP
// ============================================================
function renderBlockedLog() {
  const log = loadBlockedLog();
  $("blockedLogRows").innerHTML = log
    .map(
      (entry) => `<tr>
        <td><b>${escapeHTML(entry.date || entry.time)}</b><br><span class="small">${escapeHTML(entry.time || "")}</span></td>
        <td><b>${escapeHTML(entry.groupSize)} guest(s)</b></td>
        <td>${escapeHTML(entry.guestType || "—")}<br><span class="small">Men ${escapeHTML(entry.men)} · Women ${escapeHTML(entry.women)} · Children ${escapeHTML(entry.children)}</span></td>
        <td>${escapeHTML(entry.purpose)}</td>
        <td><span class="chip d">${escapeHTML(entry.result || "BLOCKED")}</span></td>
        <td>${escapeHTML(entry.reason || "Gate blocked")}</td>
      </tr>`,
    )
    .join("");
}

function renderGuestsDirectory() {
  const requests = loadRequests();
  const flagged = loadFlaggedGuests();
  const byPhone = new Map();

  for (const r of requests) {
    const key = normalizePhoneKey(r.phone) || `name:${String(r.name || "").toLowerCase()}`;
    const existing = byPhone.get(key) || {
      key,
      name: r.name,
      phone: r.phone,
      totalRequests: 0,
      approvedStays: 0,
      latestDates: `${r.checkin} → ${r.checkout}`,
    };
    existing.totalRequests += 1;
    if (isApproved(r)) existing.approvedStays += 1;
    byPhone.set(key, existing);
  }

  const q = state.guestSearch.trim().toLowerCase();
  const list = [...byPhone.values()].filter(
    (g) => !q || g.name.toLowerCase().includes(q) || g.phone.toLowerCase().includes(q),
  );

  $("guestsRows").innerHTML =
    list
      .map((g) => {
        const isBlacklisted = Boolean(flagged[g.key]);
        return `<tr>
          <td><b>${escapeHTML(g.name)}</b></td>
          <td>${escapeHTML(g.phone)}</td>
          <td>${g.totalRequests} request(s) · <b>${g.approvedStays}</b> approved stay(s)</td>
          <td>${escapeHTML(g.latestDates)}</td>
          <td>${isBlacklisted ? `<span class="chip flagged">BLACKLISTED / FLAGGED</span>` : `<span class="chip a">Clear</span>`}</td>
          <td>
            <button type="button" class="${isBlacklisted ? "admin-btn-outline" : "admin-btn-danger"}" data-toggle-flag="${escapeHTML(g.key)}">
              ${isBlacklisted ? "Remove Flag" : "Flag / Blacklist"}
            </button>
          </td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="6">No guests recorded yet.</td></tr>`;
}

function renderTemplatePreviews() {
  const settings = loadSettings();
  const sampleReq = {
    name: "Anand Murthy",
    checkin: `${getLocalTodayIso().slice(0, 7)}-14`,
    checkout: `${getLocalTodayIso().slice(0, 7)}-16`,
    men: 2,
    women: 2,
    children: 1,
    declineReason: "Dates unavailable",
  };
  $("tplPreviewApprove").textContent = fillTemplateText($("tplApprove").value, sampleReq, settings);
  $("tplPreviewDecline").textContent = fillTemplateText($("tplDecline").value, sampleReq, settings);
}

function renderTemplatesSection() {
  const tpl = loadTemplates();
  $("tplApprove").value = tpl.approve;
  $("tplDecline").value = tpl.decline;
  renderTemplatePreviews();
}

function renderReportsAndCsv() {
  const requests = loadRequests();
  const settings = loadSettings();
  const approved = requests.filter(isApproved);
  const byMonth = new Map();

  for (const r of approved) {
    const nights = diffIsoDays(r.checkin, r.checkout);
    const pricing = calcStayPricing(r, settings);
    const ym = String(r.checkin || "").slice(0, 7) || "Unknown";
    const row = byMonth.get(ym) || { ym, bookings: 0, nights: 0, income: 0 };
    row.bookings += 1;
    row.nights += nights;
    row.income += pricing.stayTotal;
    byMonth.set(ym, row);
  }

  const rows = [...byMonth.values()].sort((a, b) => a.ym.localeCompare(b.ym));
  let totalBookings = 0;
  let totalNights = 0;
  let totalIncome = 0;

  $("reportsRows").innerHTML =
    rows
      .map((m) => {
        totalBookings += m.bookings;
        totalNights += m.nights;
        totalIncome += m.income;
        return `<tr>
          <td><b>${escapeHTML(formatMonthLabel(m.ym))}</b> <span class="small">(${escapeHTML(m.ym)})</span></td>
          <td>${m.bookings}</td>
          <td>${m.nights}</td>
          <td><b>${money(m.income)}</b></td>
        </tr>`;
      })
      .join("") ||
    `<tr><td colspan="4">No approved bookings yet to report by month.</td></tr>`;

  $("reportsTotalFooter").innerHTML = `<tr>
    <th>TOTAL (APPROVED)</th>
    <th>${totalBookings}</th>
    <th>${totalNights}</th>
    <th>${money(totalIncome)}</th>
  </tr>`;
}

function csvCell(value) {
  const str = String(value ?? "");
  return '"' + str.replace(/"/g, '""') + '"';
}

function buildBookingsCsv() {
  const requests = loadRequests();
  const settings = loadSettings();
  const headers = [
    "Booking ID",
    "Received",
    "Lead Guest",
    "Phone",
    "Guest Type",
    "Men",
    "Women",
    "Children",
    "Purpose",
    "Check-in",
    "Check-out",
    "Nights",
    "Gate Status",
    "Gate Reason",
    "Owner Status",
    "Decline Reason",
    "Estimated Tariff (INR)",
    "Advance Status",
    "Balance Status",
    "Deposit Status",
    "ID Verified",
    "Check-in Done",
    "Check-out Done",
    "Internal Notes",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const r of requests) {
    const p = calcStayPricing(r, settings);
    lines.push(
      [
        r.id,
        r.time,
        r.name,
        r.phone,
        r.guestType,
        r.men,
        r.women,
        r.children,
        r.purpose,
        r.checkin,
        r.checkout,
        p.totalNights,
        r.gateStatus,
        r.gateReason,
        r.ownerStatus,
        r.declineReason,
        p.stayTotal,
        r.advanceStatus,
        r.balanceStatus,
        r.depositStatus,
        r.idVerified ? "Yes" : "No",
        r.checkInDone ? "Yes" : "No",
        r.checkOutDone ? "Yes" : "No",
        r.internalNotes,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

function renderBackupSummary() {
  const reqs = loadRequests();
  const blks = loadBlockedDates();
  const log = loadBlockedLog();
  const flaggedCount = Object.keys(loadFlaggedGuests()).length;
  $("backupStats").textContent =
    `Stored locally in this browser: ${reqs.length} booking request(s), ${blks.length} blocked date range(s), ${log.length} gate blocked log row(s), ${flaggedCount} flagged guest(s).`;
}

function renderOperationsSection() {
  if (state.role !== "owner") return;
  const viewMap = {
    blocked: "ops-blocked",
    guests: "ops-guests",
    templates: "ops-templates",
    reports: "ops-reports",
    backup: "ops-backup",
  };
  Object.entries(viewMap).forEach(([key, id]) => {
    $(id).hidden = state.opsView !== "all" && state.opsView !== key;
  });

  renderBlockedLog();
  renderGuestsDirectory();
  renderTemplatesSection();
  renderReportsAndCsv();
  renderBackupSummary();
}

$("opsSubTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-ops-view]");
  if (!btn) return;
  state.opsView = btn.dataset.opsView;
  $("opsSubTabs")
    .querySelectorAll("[data-ops-view]")
    .forEach((p) => p.classList.toggle("is-active", p === btn));
  renderOperationsSection();
});

$("seedBlockedBtn").addEventListener("click", () => {
  writeJson(KEYS.BLOCKED_LOG, seedBlockedLogRows());
  renderBlockedLog();
  renderBackupSummary();
});

$("clearBlockedBtn").addEventListener("click", () => {
  localStorage.removeItem(KEYS.BLOCKED_LOG);
  renderBlockedLog();
  renderBackupSummary();
});

$("guestSearch").addEventListener("input", (e) => {
  state.guestSearch = e.target.value;
  renderGuestsDirectory();
});

$("guestsRows").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toggle-flag]");
  if (!btn) return;
  const key = btn.dataset.toggleFlag;
  const flagged = loadFlaggedGuests();
  if (flagged[key]) delete flagged[key];
  else flagged[key] = { flagged: true, updatedAt: getLocalTodayIso() };
  saveFlaggedGuests(flagged);
  renderAll();
});

$("tplApprove").addEventListener("input", renderTemplatePreviews);
$("tplDecline").addEventListener("input", renderTemplatePreviews);

$("templatesForm").addEventListener("submit", (e) => {
  e.preventDefault();
  writeJson(KEYS.TEMPLATES, {
    approve: $("tplApprove").value,
    decline: $("tplDecline").value,
  });
  $("templatesStatus").textContent = "Templates saved to kt_templates ✓";
  renderRequests();
});

$("resetTemplatesBtn").addEventListener("click", () => {
  const def = getDefaultTemplates();
  writeJson(KEYS.TEMPLATES, def);
  renderTemplatesSection();
  $("templatesStatus").textContent = "Templates reset to defaults ✓";
  renderRequests();
});

$("downloadCsvBtn").addEventListener("click", () => {
  const csv = buildBookingsCsv();
  triggerFileDownload(
    `kissing-trees-bookings-${getLocalTodayIso()}.csv`,
    "text/csv;charset=utf-8;",
    csv,
  );
});

$("exportBackupBtn").addEventListener("click", () => {
  const bundle = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      kt_requests: loadRequests(),
      kt_blocked_dates: loadBlockedDates(),
      kt_blocked_log: loadBlockedLog(),
      kt_flagged_guests: loadFlaggedGuests(),
      kt_settings: loadSettings(),
      kt_templates: loadTemplates(),
      kt_cms: readJson(KEYS.CMS, null),
    },
  };
  triggerFileDownload(
    `kissing-trees-backup-${getLocalTodayIso()}.json`,
    "application/json",
    JSON.stringify(bundle, null, 2),
  );
});

$("importBackupBtn").addEventListener("click", () => $("importBackupFile").click());
$("importBackupFile").addEventListener("change", () => {
  readUploadedJsonFile($("importBackupFile"), (parsed) => {
    const payload = parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
    if (!payload || typeof payload !== "object") {
      alert("Unrecognized backup file format.");
      return;
    }
    if (Array.isArray(payload.kt_requests)) writeJson(KEYS.REQUESTS, payload.kt_requests);
    if (Array.isArray(payload.kt_blocked_dates)) writeJson(KEYS.BLOCKED_DATES, payload.kt_blocked_dates);
    if (Array.isArray(payload.kt_blocked_log)) writeJson(KEYS.BLOCKED_LOG, payload.kt_blocked_log);
    if (payload.kt_flagged_guests && typeof payload.kt_flagged_guests === "object") {
      writeJson(KEYS.FLAGGED_GUESTS, payload.kt_flagged_guests);
    }
    if (payload.kt_settings && typeof payload.kt_settings === "object") {
      writeJson(KEYS.SETTINGS, sanitizeSettings(payload.kt_settings));
    }
    if (payload.kt_templates && typeof payload.kt_templates === "object") {
      writeJson(KEYS.TEMPLATES, payload.kt_templates);
    }
    if (payload.kt_cms && typeof payload.kt_cms === "object") {
      writeJson(KEYS.CMS, payload.kt_cms);
      state.cmsDraft = null;
    }
    $("backupStatus").textContent = "Backup restored into localStorage ✓";
    renderAll();
  });
});

$("resetAllDemoBtn").addEventListener("click", () => {
  if (!window.confirm("Reset all requests, blocks, templates, settings and CMS data to demo defaults?")) {
    return;
  }
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  state.cmsDraft = null;
  $("backupStatus").textContent = "All local demo data reset ✓";
  renderAll();
});

// ============================================================
// RENDER ORCHESTRATION & LOGIN SESSION FLOW
// ============================================================
function renderAll() {
  syncSitePricing(loadSettings());
  applyRoleVisibility();
  switchPanel(state.activePanel);
  renderDashboard();
  renderRequests();
  renderCalendar();
  renderPayments();
  renderPricingSettings();
  renderCmsSection();
  renderOperationsSection();
}

function openAdminSession(role) {
  state.role = role === "caretaker" ? "caretaker" : "owner";
  state.activePanel = state.role === "owner" ? "dashboard" : "requests";
  loginScreen.hidden = true;
  adminContent.hidden = false;
  logoutButton.hidden = false;
  activeRoleBadge.hidden = false;
  setBodyClass("admin-logged-in", true);
  closeMobileSidebar();
  renderAll();
}

ownerLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const entered = ownerPasswordInput.value;
  const selectedRole = roleCaretakerRadio.checked ? "caretaker" : "owner";
  if (entered === DEMO_LOGIN_PASSWORD) {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ role: selectedRole }));
    loginErrorEl.textContent = "";
    openAdminSession(selectedRole);
  } else {
    loginErrorEl.textContent =
      "Incorrect demo password. Enter admin123 to continue.";
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  adminContent.hidden = true;
  loginScreen.hidden = false;
  logoutButton.hidden = true;
  activeRoleBadge.hidden = true;
  setBodyClass("admin-logged-in", false);
  closeMobileSidebar();
  ownerLoginForm.reset();
  roleOwnerRadio.checked = true;
  loginErrorEl.textContent = "";
});

// Restore saved demo session across reloads (needed so pricing reload & tab tests stay signed in)
(function restoreDemoSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      loginScreen.hidden = false;
      adminContent.hidden = true;
      logoutButton.hidden = true;
      activeRoleBadge.hidden = true;
      setBodyClass("admin-logged-in", false);
      return;
    }
    if (raw === "demo-authenticated") {
      openAdminSession("owner");
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.role === "owner" || parsed.role === "caretaker")) {
      openAdminSession(parsed.role);
    }
  } catch {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
})();

// ============================================================
// ID DOCUMENT PHOTO VIEWER MODAL & GLOBAL ESC / BACKDROP CLOSE
// ============================================================
window.viewIdModal = function (id, side) {
  const req = loadRequests().find((item) => item.id === id);
  if (!req) return;
  const dataUrl = side === "front" ? req.idFront : req.idBack;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    alert("No valid photo available for this side.");
    return;
  }
  $("idModalTitle").textContent = `${req.name} — ${side === "front" ? "Front" : "Back"} Photo (${req.idType || "ID"})`;
  $("idModalImg").src = dataUrl;
  $("idModal").hidden = false;
};

function closeIdModal() {
  $("idModal").hidden = true;
  $("idModalImg").src = "";
}

$("idModalCloseBtn").addEventListener("click", closeIdModal);
$("idModal").addEventListener("click", (e) => {
  if (e.target === $("idModal")) closeIdModal();
});
$("detailModal").addEventListener("click", (e) => {
  if (e.target === $("detailModal")) closeDetailModal();
});
$("declineModal").addEventListener("click", (e) => {
  if (e.target === $("declineModal")) closeDeclineModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("idModal").hidden) closeIdModal();
  else if (!$("declineModal").hidden) closeDeclineModal();
  else if (!$("detailModal").hidden) closeDetailModal();
  else closeMobileSidebar();
});
