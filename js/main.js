// Page enhancements from the single SITE configuration.
const money = (amount) => "₹" + Number(amount).toLocaleString("en-IN");
const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};
const whatsappDisplay = SITE.formatWhatsApp
  ? SITE.formatWhatsApp()
  : SITE.whatsapp;

setText("aboutCapacity", "Up to " + SITE.maxGuests + " guests");
setText("aboutLandscape", SITE.nearbyLandscape);
const amenities = document.getElementById("amenities");
if (amenities)
  amenities.innerHTML = SITE.amenities
    .map(
      ([icon, name]) =>
        `<article class="card"><span class="ic">${icon}</span><b>${name}</b></article>`,
    )
    .join("");
setText("pWeekday", money(SITE.tariff.weekday));
setText("pWeekend", money(SITE.tariff.weekend));
setText("pSeason", money(SITE.tariff.season));
const minNightText =
  Number(SITE.minNights) > 1 ? ` Minimum ${SITE.minNights} nights.` : "";
setText(
  "priceNotes",
  `Price includes ${SITE.includedGuests} guests. Extra guest ${money(SITE.extraGuestCharge)}/night. Refundable security deposit ${money(SITE.securityDeposit)}.${minNightText}`,
);
setText("contactWhatsApp", whatsappDisplay);
setText("contactEmail", SITE.email);
document.querySelectorAll("[data-social]").forEach((link) => {
  const url = SITE.socials && SITE.socials[link.dataset.social];
  if (url) link.href = url;
});

// Apply optional editorial CMS overrides saved from admin.html (localStorage key: kt_cms).
(function applyCmsEditorialOverrides() {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem("kt_cms");
    if (!raw) return;
    const cms = JSON.parse(raw);
    if (!cms || typeof cms !== "object") return;

    const setSelText = (sel, val) => {
      if (typeof val !== "string" || !val.trim()) return;
      const el = document.querySelector(sel);
      if (el) el.textContent = val.trim();
    };

    const safeImg = (val) =>
      typeof isSafeImageSrc === "function" && isSafeImageSrc(val) ? val.trim() : "";

    if (cms.site && typeof cms.site === "object") {
      if (typeof cms.site.location === "string" && cms.site.location.trim()) {
        const accEl = document.querySelector(".about-intro-section ~ .subpage-band .fact-row > div:first-child strong");
        if (accEl) accEl.textContent = cms.site.location.trim();
      }
      if (typeof cms.site.approvalHours === "string" && cms.site.approvalHours.trim()) {
        const contactHours = document.querySelector(".contact-info-col h2 em");
        if (contactHours) contactHours.textContent = cms.site.approvalHours.trim() + " hours.";
      }
      if (
        typeof SITE_DEFAULTS !== "undefined" &&
        typeof cms.site.tagline === "string" &&
        cms.site.tagline.trim() &&
        cms.site.tagline.trim() !== SITE_DEFAULTS.tagline
      ) {
        const ft = document.querySelector(".footer-tagline");
        if (ft) ft.textContent = cms.site.tagline.trim();
      }
    }

    if (cms.home && document.querySelector(".home-hero")) {
      const h = cms.home;
      const heroEl = document.querySelector(".home-hero");
      const heroImg = safeImg(h.heroImageSrc);
      if (heroImg && heroEl) {
        heroEl.style.backgroundImage =
          `linear-gradient(90deg, rgba(20, 14, 10, 0.88) 0%, rgba(20, 14, 10, 0.74) 34%, rgba(20, 14, 10, 0.28) 58%, rgba(20, 14, 10, 0.04) 85%, transparent 100%), linear-gradient(180deg, rgba(20, 14, 10, 0.2) 0%, transparent 40%, rgba(20, 14, 10, 0.5) 100%), url("${heroImg}")`;
      }
      setSelText(".hero-eyebrow", h.heroEyebrow);
      setSelText(".hero-lead", h.heroLead);
      setSelText(".hero-subtext", h.heroSubtext);
      setSelText(".intro-band .intro-lead", h.introLead);
      setSelText(".intro-band .intro-body", h.introBody);
      setSelText(".closing-cta > p:not(.eyebrow)", h.ctaSubtext);
      if (Array.isArray(h.highlights)) {
        const cards = document.querySelectorAll(".intro-feature-card");
        h.highlights.forEach((item, idx) => {
          const card = cards[idx];
          if (!card || !item) return;
          if (item.tag) {
            const t = card.querySelector(".intro-card-tag");
            if (t) t.textContent = item.tag;
          }
          if (item.title) {
            const h3 = card.querySelector("h3");
            if (h3) h3.textContent = item.title;
          }
          if (item.body) {
            const p = card.querySelector("p");
            if (p) p.textContent = item.body;
          }
        });
      }
    }

    if (cms.about && document.querySelector(".about-intro-section")) {
      const a = cms.about;
      setSelText(".subpage-hero > p:last-child", a.heroSubtext);
      const prosePs = document.querySelectorAll(".about-intro-section .detail-prose > p");
      if (a.introP1 && prosePs[0]) prosePs[0].textContent = a.introP1;
      if (a.introP2 && prosePs[1]) prosePs[1].textContent = a.introP2;
      setSelText(".about-intro-section .detail-callout strong", a.promiseCallout);
      const founderPs = document.querySelectorAll(".founder-copy > p:not(.eyebrow)");
      if (a.founderP1 && founderPs[0]) founderPs[0].textContent = a.founderP1;
      if (a.founderP2 && founderPs[1]) founderPs[1].textContent = a.founderP2;

      const founderPhotoBox = document.querySelector(".founder-photo");
      if (founderPhotoBox) {
        const hostSrc = safeImg(a.hostPhotoSrc);
        const archInner = founderPhotoBox.querySelector(".founder-arch-inner");
        const capSpan = founderPhotoBox.querySelector(".founder-photo-caption span");
        const capSmall = founderPhotoBox.querySelector(".founder-photo-caption small");
        if (hostSrc) {
          founderPhotoBox.classList.remove("founder-photo--placeholder");
          founderPhotoBox.setAttribute("aria-label", a.hostPhotoAlt || "Host portrait");
          if (archInner) archInner.hidden = true;
          let img = founderPhotoBox.querySelector("img");
          if (!img) {
            img = document.createElement("img");
            founderPhotoBox.insertBefore(img, founderPhotoBox.firstChild);
          }
          img.src = hostSrc;
          img.alt = a.hostPhotoAlt || "Host at Kissing Trees";
        }
        if (capSpan && a.hostPhotoTag) capSpan.textContent = a.hostPhotoTag;
        if (capSmall && typeof a.hostPhotoCaption === "string") {
          capSmall.textContent = a.hostPhotoCaption;
        }
      }
    }

    if (cms.faq && document.querySelector(".faq-list")) {
      const f = cms.faq;
      if (f.heroSubtext) setSelText(".subpage-hero > p:last-child", f.heroSubtext);
      if (Array.isArray(f.rules) && f.rules.length) {
        const rulesEl = document.querySelector(".rules-list");
        if (rulesEl) {
          rulesEl.innerHTML = f.rules
            .filter((r) => String(r || "").trim())
            .map((ruleText, i) => {
              const num = String(i + 1).padStart(2, "0");
              const span = document.createElement("span");
              span.textContent = num;
              const p = document.createElement("p");
              p.textContent = String(ruleText).trim();
              const art = document.createElement("article");
              art.appendChild(span);
              art.appendChild(p);
              return art.outerHTML;
            })
            .join("");
        }
      }
      if (Array.isArray(f.faqs) && f.faqs.length) {
        const faqEl = document.querySelector(".faq-list");
        if (faqEl) {
          faqEl.innerHTML = "";
          f.faqs
            .filter((q) => q && q.question && q.answer)
            .forEach((item, i) => {
              const details = document.createElement("details");
              if (i === 0) details.open = true;
              const summary = document.createElement("summary");
              const numSpan = document.createElement("span");
              numSpan.className = "faq-number";
              numSpan.textContent = String(i + 1).padStart(2, "0");
              const qSpan = document.createElement("span");
              qSpan.className = "faq-question";
              qSpan.textContent = item.question;
              const tSpan = document.createElement("span");
              tSpan.className = "faq-toggle";
              tSpan.setAttribute("aria-hidden", "true");
              tSpan.textContent = "+";
              summary.append(numSpan, qSpan, tSpan);
              const ansP = document.createElement("p");
              ansP.textContent = item.answer;
              details.append(summary, ansP);
              faqEl.appendChild(details);
            });
        }
      }
    }

    if (cms.gallery && document.getElementById("galleryGrid")) {
      const gridEl = document.getElementById("galleryGrid");
      if (cms.gallery.helperNote) setSelText(".gallery-helper-note", cms.gallery.helperNote);
      if (Array.isArray(cms.gallery.items) && cms.gallery.items.length) {
        const validItems = cms.gallery.items.filter((it) => it && safeImg(it.src));
        if (validItems.length) {
          gridEl.innerHTML = "";
          validItems.forEach((it) => {
            const fig = document.createElement("figure");
            const sizeCls = it.size === "wide" ? "gallery-card--wide" : "gallery-card--tall";
            fig.className = `gallery-tile ${sizeCls}`;
            fig.dataset.category = it.category || "interiors";
            const media = document.createElement("div");
            media.className = "gallery-media";
            const img = document.createElement("img");
            img.src = safeImg(it.src);
            img.alt = it.alt || it.caption || "Kissing Trees photograph";
            img.loading = "lazy";
            media.appendChild(img);
            const cap = document.createElement("figcaption");
            cap.className = "gallery-caption";
            cap.textContent = it.caption || "";
            fig.append(media, cap);
            gridEl.appendChild(fig);
          });
          const allPill = document.querySelector('.gallery-filters .filter-pill[data-filter="all"]');
          if (allPill) allPill.textContent = `All (${validItems.length})`;
        }
      } else if (Array.isArray(cms.gallery.captions)) {
        const caps = document.querySelectorAll("#galleryGrid .gallery-caption");
        cms.gallery.captions.forEach((cap, i) => {
          if (caps[i] && typeof cap === "string" && cap.trim()) {
            caps[i].textContent = cap.trim();
          }
        });
      }
    }

    if (cms.blog && document.querySelector(".blog-grid")) {
      const blogGrid = document.querySelector(".blog-grid");
      if (cms.blog.heroSubtext) setSelText(".subpage-hero > p:last-child", cms.blog.heroSubtext);
      if (Array.isArray(cms.blog.posts) && cms.blog.posts.length) {
        blogGrid.innerHTML = "";
        cms.blog.posts.forEach((post, i) => {
          if (!post) return;
          const art = document.createElement("article");
          art.className = i === 0 ? "blog-card blog-card--featured" : "blog-card";

          const media = document.createElement("div");
          media.className = "blog-card-media";
          const badge = document.createElement("span");
          badge.className = "blog-badge";
          badge.textContent = post.badge || `0${i + 1} · Story`;
          const img = document.createElement("img");
          img.src = safeImg(post.image) || "assets/property-photos/house-exterior.jpeg";
          img.alt = post.imageAlt || post.title || "Kissing Trees blog photograph";
          img.loading = "lazy";
          media.append(badge, img);

          const body = document.createElement("div");
          body.className = "blog-card-body";
          const meta = document.createElement("div");
          meta.className = "blog-meta";
          const catSpan = document.createElement("span");
          catSpan.textContent = post.category || "FIELD NOTE";
          meta.appendChild(catSpan);

          const h2 = document.createElement("h2");
          h2.textContent = post.title || "";
          const p = document.createElement("p");
          p.textContent = post.summary || "";

          const footer = document.createElement("div");
          footer.className = "blog-card-footer";
          const placeEl = document.createElement("span");
          placeEl.className = "blog-place";
          placeEl.textContent = post.place || "";
          footer.appendChild(placeEl);

          body.append(meta, h2, p, footer);
          art.append(media, body);
          blogGrid.appendChild(art);
        });
      }
    }
  } catch {
    // Ignore storage/parse issues.
  }
})();

// Handle contact form submission without redirecting visitors to a broken placeholder page.
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  const statusBox = document.getElementById("contactFormStatus");
  const accessInput = contactForm.querySelector('input[name="access_key"]');
  const showContactStatus = (type, message, whatsappDraft) => {
    if (!statusBox) return;
    statusBox.className = "contact-form-status" + (type ? " " + type : "");
    statusBox.textContent = "";
    const p = document.createElement("span");
    p.textContent = message;
    statusBox.appendChild(p);
    if (whatsappDraft && SITE.whatsappUrl) {
      const br = document.createElement("br");
      const a = document.createElement("a");
      a.className = "contact-status-action";
      a.href = SITE.whatsappUrl(whatsappDraft);
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Send this note directly on WhatsApp ↗";
      statusBox.appendChild(br);
      statusBox.appendChild(a);
    }
    statusBox.hidden = false;
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const guestName = String(formData.get("name") || "").trim();
    const guestEmail = String(formData.get("email") || "").trim();
    const guestMessage = String(formData.get("message") || "").trim();
    const whatsappDraft = `Hello, my name is ${guestName} (${guestEmail}). ${guestMessage}`;
    const keyVal = accessInput ? accessInput.value.trim() : "";

    if (!keyVal || keyVal === "YOUR_WEB3FORMS_ACCESS_KEY") {
      showContactStatus(
        "",
        "Direct email delivery isn't connected on this demo yet. Use WhatsApp below so your message goes straight to the host:",
        whatsappDraft,
      );
      return;
    }

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    showContactStatus("", "Sending your message...");

    try {
      const res = await fetch(contactForm.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        contactForm.reset();
        showContactStatus(
          "is-success",
          `Thank you! Your note has been sent. The host usually replies within ${SITE.approvalHours} hours.`,
        );
      } else {
        showContactStatus(
          "is-error",
          "Could not submit the email form right now. You can send the same note via WhatsApp instead:",
          whatsappDraft,
        );
      }
    } catch {
      showContactStatus(
        "is-error",
        "Network error while sending. You can reach the host directly on WhatsApp instead:",
        whatsappDraft,
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// On devices with fine hover (mouse), allow gentle hover preview.
// Do not trap focusin/focusout so mobile touch toggles naturally without lock.
if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll(".faq-list details").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      item.open = true;
    });
    item.addEventListener("mouseleave", () => {
      if (!item.matches(":focus-within")) item.open = false;
    });
  });
}

const galleryGrid = document.getElementById("galleryGrid");
const galleryTiles = Array.from(document.querySelectorAll(".gallery-tile"));
const filterButtons = Array.from(
  document.querySelectorAll(".gallery-filters .filter-pill"),
);

if (galleryGrid && filterButtons.length && galleryTiles.length) {
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetFilter = btn.dataset.filter || "all";
      filterButtons.forEach((pill) => {
        const active = pill === btn;
        pill.classList.toggle("is-active", active);
        pill.setAttribute("aria-selected", active ? "true" : "false");
      });

      galleryTiles.forEach((tile) => {
        const matches =
          targetFilter === "all" || tile.dataset.category === targetFilter;
        tile.hidden = !matches;
        tile.classList.remove("is-entering");
        if (matches) {
          void tile.offsetWidth;
          tile.classList.add("is-entering");
        }
      });
    });
  });
}

const galleryLightbox = document.getElementById("galleryLightbox");
if (galleryLightbox) {
  const lightboxImage = galleryLightbox.querySelector("img");
  const lightboxTitle =
    galleryLightbox.querySelector(".lightbox-title") ||
    galleryLightbox.querySelector("figcaption");
  const lightboxCounter = galleryLightbox.querySelector(".lightbox-counter");
  const closeButton = galleryLightbox.querySelector(".lightbox-close");
  const prevButton = galleryLightbox.querySelector(".lightbox-prev");
  const nextButton = galleryLightbox.querySelector(".lightbox-next");
  let lastTrigger = null;
  let activeIndex = 0;

  const getVisibleTiles = () => galleryTiles.filter((tile) => !tile.hidden);

  const showSlide = (index) => {
    const visible = getVisibleTiles();
    if (!visible.length) return;
    activeIndex = (index + visible.length) % visible.length;
    const tile = visible[activeIndex];
    const image = tile.querySelector("img");
    const captionEl =
      tile.querySelector(".gallery-caption") || tile.querySelector("span");
    if (!image) return;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    const titleText = captionEl ? captionEl.textContent.trim() : image.alt;
    if (lightboxTitle) lightboxTitle.textContent = titleText;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${activeIndex + 1} / ${visible.length}`;
    }
    const multi = visible.length > 1;
    if (prevButton) prevButton.hidden = !multi;
    if (nextButton) nextButton.hidden = !multi;
  };

  const closeLightbox = () => {
    galleryLightbox.hidden = true;
    lightboxImage.src = "";
    const drawer = document.getElementById("mobileDrawer");
    if (!drawer || !drawer.classList.contains("open")) {
      document.body.style.overflow = "";
    }
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
      lastTrigger = null;
    }
  };

  const openLightbox = (tile) => {
    const visible = getVisibleTiles();
    const index = visible.indexOf(tile);
    if (index === -1) return;
    lastTrigger = tile;
    showSlide(index);
    galleryLightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (closeButton) closeButton.focus();
  };

  galleryTiles.forEach((tile) => {
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.addEventListener("click", () => openLightbox(tile));
    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(tile);
      }
    });
  });

  if (prevButton) {
    prevButton.addEventListener("click", (event) => {
      event.stopPropagation();
      showSlide(activeIndex - 1);
    });
  }
  if (nextButton) {
    nextButton.addEventListener("click", (event) => {
      event.stopPropagation();
      showSlide(activeIndex + 1);
    });
  }
  if (closeButton) closeButton.addEventListener("click", closeLightbox);
  galleryLightbox.addEventListener("click", (event) => {
    if (!event.target.closest(".lightbox-media, button, figcaption")) {
      closeLightbox();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (galleryLightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    else if (event.key === "ArrowLeft") showSlide(activeIndex - 1);
    else if (event.key === "ArrowRight") showSlide(activeIndex + 1);
  });
}
