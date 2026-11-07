// Step 1 runs the Smart Gate. BLOCKED guests stop before dates and are not saved.
let gate = null,
  step1Data = null;
const $ = (id) => document.getElementById(id);

// Progress and Step Management
const progBar1 = $("progBar1");
const progBar2 = $("progBar2");
const progressLabel = $("progressLabel");

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
    const aside = document.querySelector(".booking-aside");
    if (aside) aside.style.display = "none";
    const progressWrap = document.querySelector(".step-progress-wrapper");
    if (progressWrap) progressWrap.style.display = "none";
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
  if (progressLabel) progressLabel.textContent = "STEP 02 OF 02 — YOUR DATES & DETAILS";
  if (progBar2) progBar2.classList.add("active");
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

// ============================================================
// GUEST COUNTER STEPPERS & REAL-TIME SUMMARY
// ============================================================
function updateGuestSummary() {
  const menVal = parseInt($("men")?.value || "0", 10) || 0;
  const womenVal = parseInt($("women")?.value || "0", 10) || 0;
  const childrenVal = parseInt($("children")?.value || "0", 10) || 0;
  const total = menVal + womenVal + childrenVal;

  const summaryLabel = $("totalGuestCountLabel");
  if (summaryLabel) {
    if (total === 0) {
      summaryLabel.textContent = "0 guests currently selected";
    } else {
      const parts = [];
      if (menVal > 0) parts.push(`${menVal} ${menVal === 1 ? "man" : "men"}`);
      if (womenVal > 0) parts.push(`${womenVal} ${womenVal === 1 ? "woman" : "women"}`);
      if (childrenVal > 0) parts.push(`${childrenVal} ${childrenVal === 1 ? "child" : "children"}`);
      summaryLabel.textContent = `${total} guest${total === 1 ? "" : "s"} selected (${parts.join(", ")})`;
    }
  }

  // Update dec button states
  ["men", "women", "children"].forEach((key) => {
    const input = $(key);
    const card = document.querySelector(`.guest-stepper-card[data-stepper="${key}"]`);
    if (input && card) {
      const decBtn = card.querySelector(".stepper-btn-dec");
      if (decBtn) {
        decBtn.disabled = parseInt(input.value || "0", 10) <= 0;
      }
    }
  });
}

document.querySelectorAll(".stepper-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input = $(targetId);
    if (!input) return;
    let val = parseInt(input.value || "0", 10);
    if (isNaN(val)) val = 0;

    if (btn.classList.contains("stepper-btn-inc")) {
      if (val < 10) val += 1;
    } else if (btn.classList.contains("stepper-btn-dec")) {
      if (val > 0) val -= 1;
    }

    input.value = val;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    updateGuestSummary();
  });
});

["men", "women", "children"].forEach((id) => {
  const el = $(id);
  if (el) {
    el.addEventListener("input", updateGuestSummary);
    el.addEventListener("change", updateGuestSummary);
  }
});
updateGuestSummary();

// ============================================================
// STAG / BACHELOR POLICY CHECKBOX SYNC
// ============================================================
const declareInput = $("declare");
const stagCard = $("stagDeclarationCard");
if (declareInput && stagCard) {
  declareInput.addEventListener("change", () => {
    stagCard.classList.toggle("is-checked", declareInput.checked);
  });
}

// ============================================================
// SPLIT DATE RANGE COMPONENT (DURATION & AUTO-MIN)
// ============================================================
const checkinInput = $("checkin");
const checkoutInput = $("checkout");
const nightsBadge = $("nightsBadge");
const nightsCountText = $("nightsCountText");
const dateDurationDetail = $("dateDurationDetail");

if (checkinInput && checkoutInput) {
  // Set minimum check-in to today
  const todayStr = new Date().toISOString().split("T")[0];
  checkinInput.min = todayStr;

  function updateDateDuration() {
    const ci = checkinInput.value;
    const co = checkoutInput.value;

    if (ci) {
      // Check-out must be at least the same day or day after
      checkoutInput.min = ci;
    }

    if (ci && co) {
      const d1 = new Date(ci);
      const d2 = new Date(co);
      const diffMs = d2 - d1;
      const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (nights > 0) {
        if (nightsCountText) nightsCountText.textContent = `${nights} night${nights === 1 ? "" : "s"}`;
        if (dateDurationDetail) {
          dateDurationDetail.textContent = `Trip Duration: ${nights} night${nights === 1 ? "" : "s"} · Check-in 11:00 AM · Check-out 10:00 AM`;
          dateDurationDetail.style.color = "#9B4433";
          dateDurationDetail.style.fontWeight = "600";
        }
      } else {
        if (nightsCountText) nightsCountText.textContent = "→";
        if (dateDurationDetail) {
          dateDurationDetail.textContent = "Check-out must be after check-in.";
          dateDurationDetail.style.color = "#C84B31";
        }
      }
    } else {
      if (nightsCountText) nightsCountText.textContent = "→";
      if (dateDurationDetail) {
        dateDurationDetail.textContent = "Select your check-in and check-out dates above";
        dateDurationDetail.style.color = "";
        dateDurationDetail.style.fontWeight = "";
      }
    }
  }

  checkinInput.addEventListener("change", () => {
    if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
      // Auto-adjust checkout to next day
      const nextDay = new Date(checkinInput.value);
      nextDay.setDate(nextDay.getDate() + 1);
      checkoutInput.value = nextDay.toISOString().split("T")[0];
    }
    updateDateDuration();
  });

  checkoutInput.addEventListener("change", updateDateDuration);
}

// ============================================================
// ID FRONT & BACK PHOTO UPLOADER (DRAG & DROP + CAMERA + BROWSE)
// ============================================================
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
  dropzoneId
) {
  const fileInput = document.getElementById(fileInputId);
  const cameraInput = document.getElementById(cameraInputId);
  const img = document.getElementById(imgId);
  const placeholder = document.getElementById(placeholderId);
  const status = document.getElementById(statusId);
  const card = document.getElementById(cardId);
  const removeBtn = document.getElementById(removeBtnId);
  const dropzone = document.getElementById(dropzoneId);

  function processFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }
    if (status) {
      const label = status.querySelector(".status-label") || status;
      label.textContent = "Processing...";
    }
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
          const label = status.querySelector(".status-label") || status;
          label.textContent = "✓ Uploaded";
          status.classList.add("uploaded");
        }
        if (card) card.classList.add("has-file");
        if (removeBtn) removeBtn.hidden = false;

        // If front photo is uploaded and back card is not yet open, show the "+ Add back side" button
        if (side === "front") {
          if (idFrontBadge) idFrontBadge.textContent = "ID PHOTO (FRONT)";
          if (idBackCard && idBackCard.hidden && idAddBackWrapper) {
            idAddBackWrapper.hidden = false;
          }
        }
      };
      tempImg.onerror = function () {
        if (status) {
          const label = status.querySelector(".status-label") || status;
          label.textContent = "Error loading";
        }
      };
      tempImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // File Inputs
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

  // Drag and Drop support on dropzone
  if (dropzone) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "dragend"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    });

    // Clicking the dropzone triggers file picker if no file is uploaded yet
    dropzone.addEventListener("click", (e) => {
      if (!idPhotos[side] && fileInput) {
        fileInput.click();
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      idPhotos[side] = null;
      if (img) {
        img.src = "";
        img.hidden = true;
      }
      if (placeholder) placeholder.hidden = false;
      if (status) {
        const label = status.querySelector(".status-label") || status;
        label.textContent = "Not added";
        status.classList.remove("uploaded");
      }
      if (card) card.classList.remove("has-file");
      removeBtn.hidden = true;
      if (fileInput) fileInput.value = "";
      if (cameraInput) cameraInput.value = "";

      if (side === "front") {
        if (idFrontBadge) idFrontBadge.textContent = "ID PHOTO (FRONT)";
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
    const label = backStatus.querySelector(".status-label") || backStatus;
    label.textContent = "Not added";
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
  "idFrontDropzone"
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
  "idBackDropzone"
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
