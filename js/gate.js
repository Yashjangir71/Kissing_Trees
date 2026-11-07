// ============================================================
// KISSING TREES — THE SMART GUEST GATE (Layer 2 of the 3-layer system)
// Pure logic, no DOM — also testable from Node: require('./gate.js')
//
// Rules (from the approved poster solution, 2026-11-03):
//  BLOCKED : all-adult-male group of 2+ AND purpose = Celebration/Party
//            -> polite block message, form stops, NO payment ever.
//  REVIEW  : any other all-adult-male case (incl. solo male)
//            -> request may be sent, but flagged MANUAL REVIEW for owner.
//  ALLOWED : family / artists / travelers / office & remote work / women's group / mixed family
//            -> request sent for owner approval (Layer 3 still applies:
//               payment link ONLY after owner approves — for everyone).
// Declaration checkbox is enforced by the form before this is called.
// ============================================================
function classifyBooking(input) {
  const values = [input.men, input.women, input.children].map(Number);
  const [men, women, children] = values;
  const maxGuests = Number(input.maxGuests);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    return {
      status: "INVALID",
      reason: "Guest counts must be non-negative whole numbers.",
      message: "Please enter valid guest counts.",
    };
  }
  const adults = men + women;
  const total = adults + children;

  if (total === 0) {
    return {
      status: "INVALID",
      reason: "No guests added.",
      message: "Please add at least one guest.",
    };
  }

  if (Number.isFinite(maxGuests) && maxGuests > 0 && total > maxGuests) {
    return {
      status: "INVALID",
      reason: "Guest count exceeds the house capacity.",
      message: `This request is for ${total} guests, but the house accommodates up to ${maxGuests}.`,
    };
  }

  const allAdultMale = men > 0 && women === 0 && children === 0;

  if (allAdultMale && adults >= 2 && input.purpose === "Celebration / Party") {
    return {
      status: "BLOCKED",
      reason: "All-male group of 2+ with party purpose.",
      message:
        "Thank you for your interest. Kissing Trees is reserved for families, artists, travelers, and working professionals, so we're unable to host bachelor / stag groups. We hope you find a place that fits your trip better.",
    };
  }

  if (allAdultMale) {
    return {
      status: "REVIEW",
      reason: "All-male booking — owner must review manually.",
      message:
        "Your request can be sent, but it will be flagged for manual review by the owner before any confirmation. No payment will be taken unless the owner approves.",
    };
  }

  return {
    status: "ALLOWED",
    reason: "Guest profile fits the house policy.",
    message:
      "Great — your profile fits the house policy. Send the request and the owner will confirm availability. Payment link is shared only after approval.",
  };
}

if (typeof module !== "undefined" && module.exports)
  module.exports = { classifyBooking };
if (typeof window !== "undefined") window.classifyBooking = classifyBooking;
