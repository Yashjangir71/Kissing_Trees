// Step 1 runs the Smart Gate. BLOCKED guests stop before dates and are not saved.
let gate = null,
  step1Data = null;
const $ = (id) => document.getElementById(id);
$("step1").addEventListener("submit", (event) => {
  event.preventDefault();
  step1Data = {
    guestType: $("guestType").value,
    men: $("men").value,
    women: $("women").value,
    children: $("children").value,
    purpose: $("purpose").value,
  };
  gate = classifyBooking({ ...step1Data, maxGuests: SITE.maxGuests });
  const box = $("gateResult");
  box.style.display = "block";
  if (gate.status === "BLOCKED") {
    box.className = "result block";
    box.textContent = gate.message;
    $("step2").style.display = "none";
    $("step1").style.display = "none";
    document.querySelector(".booking-aside").style.display = "none";
    document.querySelector(".progress-track").style.display = "none";
    document.querySelector(".progress-label").style.display = "none";
    return;
  }
  if (gate.status === "INVALID") {
    box.className = "result review";
    box.textContent = gate.message;
    return;
  }
  box.className = "result " + (gate.status === "REVIEW" ? "review" : "ok");
  box.textContent =
    gate.status === "REVIEW"
      ? "Manual review needed. " + gate.message
      : gate.message;
  $("step2").style.display = "block";
  $("progressLabel").textContent = "02 — YOUR DATES & DETAILS";
  document.querySelector(".progress-active").style.flex = "2";
  $("step2").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("step2").addEventListener("submit", (event) => {
  event.preventDefault();
  if (
    !step1Data ||
    !gate ||
    gate.status === "INVALID" ||
    gate.status === "BLOCKED"
  ) {
    const box = $("sentResult");
    box.style.display = "block";
    box.textContent =
      "Please complete the guest profile before sending a request.";
    return;
  }
  if (
    !$("checkin").value ||
    !$("checkout").value ||
    $("checkout").value <= $("checkin").value
  ) {
    $("checkout").setCustomValidity("Check-out must be after check-in.");
    $("checkout").reportValidity();
    $("checkout").setCustomValidity("");
    return;
  }
  const request = {
    id: "KT-" + Date.now().toString().slice(-6),
    time: new Date().toLocaleString("en-IN"),
    ...step1Data,
    gateStatus: gate.status,
    gateReason: gate.reason,
    checkin: $("checkin").value,
    checkout: $("checkout").value,
    name: $("gname").value,
    phone: $("gphone").value,
    guests: $("glist").value,
    idType: $("gid").value,
    idFront: idPhotos.front,
    idBack: idPhotos.back,
    ownerStatus: "PENDING OWNER APPROVAL",
  };
  let requests;
  try {
    const stored = JSON.parse(localStorage.getItem("kt_requests") || "[]");
    requests = Array.isArray(stored) ? stored : [];
  } catch {
    requests = [];
  }
  requests.unshift(request);
  localStorage.setItem("kt_requests", JSON.stringify(requests));
  const box = $("sentResult");
  box.style.display = "block";
  box.textContent = `Request sent! (Ref: ${request.id}) The owner will reply on WhatsApp within ${SITE.approvalHours} hours. Your payment link will be shared only after approval. No payment has been taken.`;
  $("step1").style.display = "none";
  $("step2").style.display = "none";
  box.scrollIntoView({ behavior: "smooth", block: "center" });
});
const bookingContact = document.getElementById("bookingContact");
if (bookingContact)
  bookingContact.textContent = "Owner WhatsApp: " + SITE.whatsapp;

// ID front & back photo uploader / camera handler with progressive + button
const idPhotos = {
  front: null,
  back: null,
};

const idUploadFlow = document.getElementById("idUploadFlow");
const idAddBackWrapper = document.getElementById("idAddBackWrapper");
const idAddBackBtn = document.getElementById("idAddBackBtn");
const idBackCard = document.getElementById("idBackCard");
const idBackCancelBtn = document.getElementById("idBackCancelBtn");
const idFrontBadge = document.getElementById("idFrontBadge");

function setupIdUploader(
  side,
  fileInputId,
  cameraInputId,
  imgId,
  placeholderId,
  statusId,
  cardId,
  removeBtnId,
) {
  const fileInput = document.getElementById(fileInputId);
  const cameraInput = document.getElementById(cameraInputId);
  const img = document.getElementById(imgId);
  const placeholder = document.getElementById(placeholderId);
  const status = document.getElementById(statusId);
  const card = document.getElementById(cardId);
  const removeBtn = document.getElementById(removeBtnId);

  function processFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }
    if (status) status.textContent = "Processing...";
    const reader = new FileReader();
    reader.onload = function (e) {
      const tempImg = new Image();
      tempImg.onload = function () {
        const maxDim = 900;
        let w = tempImg.width;
        let h = tempImg.height;
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
        ctx.drawImage(tempImg, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

        idPhotos[side] = dataUrl;
        if (img) {
          img.src = dataUrl;
          img.hidden = false;
        }
        if (placeholder) placeholder.hidden = true;
        if (status) {
          status.textContent = "✓ Uploaded";
          status.classList.add("uploaded");
        }
        if (card) card.classList.add("has-file");
        if (removeBtn) removeBtn.hidden = false;

        // If front photo is uploaded and back card is not yet open, show the "+ Add back side" button
        if (side === "front") {
          if (idFrontBadge) idFrontBadge.textContent = "FRONT SIDE";
          if (idBackCard && idBackCard.hidden && idAddBackWrapper) {
            idAddBackWrapper.hidden = false;
          }
        }
      };
      tempImg.onerror = function () {
        if (status) status.textContent = "Error loading";
      };
      tempImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
    });
  }
  if (cameraInput) {
    cameraInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
    });
  }
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      idPhotos[side] = null;
      if (img) {
        img.src = "";
        img.hidden = true;
      }
      if (placeholder) placeholder.hidden = false;
      if (status) {
        status.textContent = "Not added";
        status.classList.remove("uploaded");
      }
      if (card) card.classList.remove("has-file");
      removeBtn.hidden = true;
      if (fileInput) fileInput.value = "";
      if (cameraInput) cameraInput.value = "";

      if (side === "front") {
        if (idFrontBadge) idFrontBadge.textContent = "ID PHOTO";
        if (idAddBackWrapper) idAddBackWrapper.hidden = true;
        // If back card was visible, reset and close it
        if (idBackCard && !idBackCard.hidden) {
          resetBackUploader();
          idBackCard.hidden = true;
          if (idUploadFlow) idUploadFlow.classList.remove("both-active");
        }
      }
    });
  }
}

function resetBackUploader() {
  idPhotos.back = null;
  const backImg = document.getElementById("idBackImg");
  const backPlaceholder = document.getElementById("idBackPlaceholder");
  const backStatus = document.getElementById("idBackStatus");
  const backFileInput = document.getElementById("idBackFileInput");
  const backCameraInput = document.getElementById("idBackCameraInput");
  if (backImg) {
    backImg.src = "";
    backImg.hidden = true;
  }
  if (backPlaceholder) backPlaceholder.hidden = false;
  if (backStatus) {
    backStatus.textContent = "Not added";
    backStatus.classList.remove("uploaded");
  }
  if (idBackCard) idBackCard.classList.remove("has-file");
  if (backFileInput) backFileInput.value = "";
  if (backCameraInput) backCameraInput.value = "";
}

// Setup Front Uploader
setupIdUploader(
  "front",
  "idFrontFileInput",
  "idFrontCameraInput",
  "idFrontImg",
  "idFrontPlaceholder",
  "idFrontStatus",
  "idFrontCard",
  "idFrontRemoveBtn",
);

// Setup Back Uploader
setupIdUploader(
  "back",
  "idBackFileInput",
  "idBackCameraInput",
  "idBackImg",
  "idBackPlaceholder",
  "idBackStatus",
  "idBackCard",
  "idBackCancelBtn",
);

// "+ Add Back Side" button click handler
if (idAddBackBtn) {
  idAddBackBtn.addEventListener("click", () => {
    if (idAddBackWrapper) idAddBackWrapper.hidden = true;
    if (idBackCard) idBackCard.hidden = false;
    if (idUploadFlow) idUploadFlow.classList.add("both-active");
  });
}

// Cancel / Remove back card handler
if (idBackCancelBtn) {
  idBackCancelBtn.addEventListener("click", () => {
    resetBackUploader();
    if (idBackCard) idBackCard.hidden = true;
    if (idUploadFlow) idUploadFlow.classList.remove("both-active");
    // If front photo is still present, restore the "+ Add back side" button
    if (idPhotos.front && idAddBackWrapper) {
      idAddBackWrapper.hidden = false;
    }
  });
}
