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

const galleryLightbox = document.getElementById("galleryLightbox");
if (galleryLightbox) {
  const lightboxImage = galleryLightbox.querySelector("img");
  const lightboxCaption = galleryLightbox.querySelector("figcaption");
  const closeButton = galleryLightbox.querySelector(".lightbox-close");
  let lastTrigger = null;
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
    const image = tile.querySelector("img");
    const caption = tile.querySelector("span");
    if (!image) return;
    lastTrigger = tile;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = caption ? caption.textContent : image.alt;
    galleryLightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (closeButton) closeButton.focus();
  };
  document.querySelectorAll(".gallery-tile").forEach((tile) => {
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
  if (closeButton) closeButton.addEventListener("click", closeLightbox);
  galleryLightbox.addEventListener("click", (event) => {
    if (event.target === galleryLightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !galleryLightbox.hidden) closeLightbox();
  });
}
