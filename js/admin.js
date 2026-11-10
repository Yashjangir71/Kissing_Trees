// Front-end demo gate only. It does not provide real security.
const KEY = "kt_requests";
const authKey = "kt_admin_demo_session";
const loginScreen = document.getElementById("loginScreen");
const adminContent = document.getElementById("adminContent");
const loginForm = document.getElementById("ownerLogin");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutBtn");
document.getElementById("demoUser").textContent = SITE.adminDemo.username;
document.getElementById("demoPassword").textContent = SITE.adminDemo.password;
const seed = () => [
  {
    id: "KT-SAMPLE1",
    time: "Sample",
    guestType: "Family (with parents / kids / elders)",
    men: 2,
    women: 2,
    children: 1,
    purpose: "Family Vacation",
    gateStatus: "ALLOWED",
    gateReason: "Sample request",
    checkin: "2026-12-14",
    checkout: "2026-12-16",
    name: "Sample Family Guest",
    phone: "SAMPLE contact",
    guests: "Sample family guest names and ages",
    idType: "Passport",
    ownerStatus: "PENDING OWNER APPROVAL",
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
    gateReason: "Sample request",
    checkin: "2026-12-20",
    checkout: "2026-12-21",
    name: "Sample Solo Guest",
    phone: "SAMPLE contact",
    guests: "Sample solo guest name and age",
    idType: "Company ID / Business Card",
    ownerStatus: "PENDING OWNER APPROVAL",
  },
];
function load() {
  let all;
  try {
    all = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    all = null;
  }
  if (Array.isArray(all)) {
    all = all.filter(
      (request) =>
        request && typeof request === "object" && !Array.isArray(request),
    );
  } else {
    all = null;
  }
  if (!all) {
    all = seed();
    localStorage.setItem(KEY, JSON.stringify(all));
  }
  return all;
}
function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
function render() {
  const all = load();
  document.getElementById("rows").innerHTML =
    all
      .map(
        (r) => `<tr>
    <td><b>${escapeHTML(r.id)}</b><br><span class="small">${escapeHTML(r.time)}</span></td>
    <td>
      <b>${escapeHTML(r.name)}</b><br>
      <span class="small">${escapeHTML(r.phone)}<br>${escapeHTML(r.guests)}</span>
      <div style="margin-top:6px;font-size:11px;color:#55483f;">
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
    <td>${escapeHTML(r.guestType)}<br><span class="small">Men ${escapeHTML(r.men)} • Women ${escapeHTML(r.women)} • Children ${escapeHTML(r.children)}<br>${escapeHTML(r.purpose)}</span></td>
    <td>${escapeHTML(r.checkin)} → ${escapeHTML(r.checkout)}</td>
    <td><span class="chip ${r.gateStatus === "ALLOWED" ? "a" : "r"}">${escapeHTML(r.gateStatus)}</span></td>
    <td><span class="chip ${String(r.ownerStatus || "").startsWith("APPROVED") ? "a" : String(r.ownerStatus || "").startsWith("DECLINED") ? "d" : "p"}">${escapeHTML(r.ownerStatus)}</span>${r.payLink ? `<br><span class="small">DEMO link: ${escapeHTML(r.payLink)}</span>` : ""}</td>
    <td>${r.ownerStatus === "PENDING OWNER APPROVAL" ? `<button type="button" class="btn" style="padding:7px 10px;font-size:12px" data-act="approve" data-req-id="${escapeHTML(r.id)}">Approve</button> <button type="button" class="btn alt" style="padding:7px 10px;font-size:12px" data-act="decline" data-req-id="${escapeHTML(r.id)}">Decline</button>` : ""}</td>
  </tr>`,
      )
      .join("") || `<tr><td colspan="7">No requests yet.</td></tr>`;
}
function act(reqId, approved) {
  const all = load();
  const item = all.find((r) => String(r.id) === String(reqId));
  if (!item) return;
  item.ownerStatus = approved ? "APPROVED" : "DECLINED";
  if (approved)
    item.payLink =
      "https://pay.kissingtree.example/" +
      encodeURIComponent(item.id) +
      " (DEMO link)";
  localStorage.setItem(KEY, JSON.stringify(all));
  render();
}

const rowsEl = document.getElementById("rows");
if (rowsEl) {
  rowsEl.addEventListener("click", (event) => {
    const viewBtn = event.target.closest("[data-view-id]");
    if (viewBtn) {
      window.viewIdModal(viewBtn.dataset.viewId, viewBtn.dataset.side);
      return;
    }
    const actBtn = event.target.closest("[data-act]");
    if (actBtn) {
      act(actBtn.dataset.reqId, actBtn.dataset.act === "approve");
    }
  });
}
function showPanel() {
  loginScreen.hidden = true;
  adminContent.hidden = false;
  logoutButton.hidden = false;
  render();
}
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const credentials = SITE.adminDemo;
  if (
    document.getElementById("ownerId").value === credentials.username &&
    document.getElementById("ownerPassword").value === credentials.password
  ) {
    sessionStorage.setItem(authKey, "demo-authenticated");
    loginError.textContent = "";
    showPanel();
  } else {
    loginError.textContent =
      "That ID and password do not match the SAMPLE demo credentials.";
  }
});
logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(authKey);
  adminContent.hidden = true;
  loginScreen.hidden = false;
  logoutButton.hidden = true;
  loginForm.reset();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  if (window.confirm("Clear all local demo booking requests?")) {
    localStorage.removeItem(KEY);
    render();
  }
});
if (sessionStorage.getItem(authKey) === "demo-authenticated") showPanel();

// ID Document Photo Viewer Modal
window.viewIdModal = function (id, side) {
  const all = load();
  const req = all.find((item) => item.id === id);
  if (!req) return;
  const dataUrl = side === "front" ? req.idFront : req.idBack;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    alert("No valid photo available for this side.");
    return;
  }

  const modal = document.getElementById("idModal");
  const modalImg = document.getElementById("idModalImg");
  const modalTitle = document.getElementById("idModalTitle");

  if (modalTitle) {
    modalTitle.textContent = `${req.name} — ${side === "front" ? "Front" : "Back"} Photo (${req.idType || "ID"})`;
  }
  if (modalImg) modalImg.src = dataUrl;
  if (modal) modal.hidden = false;
};

const idModal = document.getElementById("idModal");
if (idModal) {
  const closeBtn = document.getElementById("idModalCloseBtn");
  const closeModal = () => {
    idModal.hidden = true;
    const modalImg = document.getElementById("idModalImg");
    if (modalImg) modalImg.src = "";
  };
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  idModal.addEventListener("click", (e) => {
    if (e.target === idModal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !idModal.hidden) closeModal();
  });
}
