// Home page enhancements from the single SITE configuration.
const money = (amount) => "₹" + Number(amount).toLocaleString("en-IN");
const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};
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
setText("contactWhatsApp", SITE.whatsapp);
setText("contactEmail", SITE.email);
setText("bookingContact", "Owner WhatsApp: " + SITE.whatsapp);

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
  const closeLightbox = () => {
    galleryLightbox.hidden = true;
    document.body.style.overflow = "";
  };
  const openLightbox = (tile) => {
    const image = tile.querySelector("img");
    const caption = tile.querySelector("span");
    if (!image) return;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = caption ? caption.textContent : image.alt;
    galleryLightbox.hidden = false;
    document.body.style.overflow = "hidden";
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
  galleryLightbox
    .querySelector(".lightbox-close")
    .addEventListener("click", closeLightbox);
  galleryLightbox.addEventListener("click", (event) => {
    if (event.target === galleryLightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !galleryLightbox.hidden) closeLightbox();
  });
}

const brandWalker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
);
let brandNode;
while ((brandNode = brandWalker.nextNode())) {
  brandNode.nodeValue = brandNode.nodeValue.replace(/Trees{2}/g, "Trees");
}
document.title = document.title.replace(/Trees{2}/g, "Trees");
