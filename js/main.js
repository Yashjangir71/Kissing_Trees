// Page enhancements from the single SITE configuration.
const money = (amount) => "₹" + Number(amount).toLocaleString("en-IN");
const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};
const whatsappDisplay = SITE.formatWhatsApp
  ? SITE.formatWhatsApp()
  : SITE.whatsapp;

setText("nearbyLandscape", SITE.nearbyLandscape);
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
setText(
  "priceNotes",
  `Price includes ${SITE.includedGuests} guests. Extra guest ${money(SITE.extraGuestCharge)}/night. Refundable security deposit ${money(SITE.securityDeposit)}.`,
);
setText("apprHrs", SITE.approvalHours);
setText("footContact", SITE.location + " · " + SITE.email);
setText("locationLine", SITE.location);
setText(
  "locationMore",
  SITE.location + ". Exact arrival directions are shared after owner approval.",
);
setText("contactWhatsApp", whatsappDisplay);
setText("contactEmail", SITE.email);
setText("bookingContact", "Owner WhatsApp: " + whatsappDisplay);
document.querySelectorAll("[data-social]").forEach((link) => {
  const url = SITE.socials && SITE.socials[link.dataset.social];
  if (url) link.href = url;
});

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
