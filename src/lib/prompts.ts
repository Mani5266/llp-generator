import { LLPData } from "@/types";

export interface AIReply {
  message: string;
  updates: Record<string, unknown>;
  nextStep: string;
  validationError: string | null;
  suggestedOptions: string[];
  suggestedCheckboxes?: string[];
  isComplete?: boolean;
}

/**
 * Dedicated prompt for Aadhaar extraction — called only when files are attached.
 * Returns a structured JSON with ALL partner details extracted at once.
 */
export function buildExtractionPrompt(data: Partial<LLPData>, numFiles: number): string {
  const numPartners = data.numPartners || 2;
  const partners = data.partners || [];

  // Build a fully filled-out example for EVERY partner, no ellipsis
  const exampleUpdates: Record<string, unknown> = {};
  for (let i = 0; i < numPartners; i++) {
    exampleUpdates[`partners[${i}].fullName`] = `Full Name of Person ${i + 1} from Aadhaar`;
    exampleUpdates[`partners[${i}].fatherName`] = `Father Name of Person ${i + 1} from Aadhaar`;
    exampleUpdates[`partners[${i}].age`] = 30 + i;
    exampleUpdates[`partners[${i}].aadhaarAddress`] = `Complete raw address string exactly as printed on Aadhaar card ${i + 1}`;
  }
  const p0Name = partners[0]?.fullName || "Person 1 Full Name";
  const p0Addr = partners[0]?.aadhaarAddress || "their Aadhaar address";

  const exampleJson = JSON.stringify({
    message: `I've extracted and mapped details for all ${numPartners} partners to the live document. Starting with Partner 1 (${p0Name}), is this their residential address? [${p0Addr}]`,
    updates: exampleUpdates,
    nextStep: "partner_X",
    suggestedOptions: ["Yes: Correct", "No: I'll type it"],
    isComplete: false,
    validationError: null,
  }, null, 2);

  return `You are a data extraction assistant. Extract identity details from the ${numFiles} Aadhaar card image(s) provided.

TASK: Extract the following for EVERY person in EVERY Aadhaar card:
- Full Name (as printed, no salutation)
- Father's Name (from "S/O", "D/O", or "W/O" field, name only, no salutation)
- Age (calculate as integer: current year 2026 minus birth year from DOB)
- Full Address (copy the COMPLETE address exactly as printed, as a single string)

The ${numFiles} Aadhaar card(s) correspond to partners [0] through [${numFiles - 1}] IN ORDER (first card = partners[0], second card = partners[1], etc.)

CRITICAL REQUIREMENTS:
- You MUST include all ${numFiles} partners in your "updates" object.
- Do NOT leave any partner out.
- Do NOT parse addresses into separate fields yet — just copy the full raw address string into "partners[X].aadhaarAddress".
- Return ONLY valid JSON matching the format below. No markdown, no code fences.

REQUIRED OUTPUT FORMAT (copy this structure exactly, fill in real extracted values):
${exampleJson}`;
}

/**
 * Builds the main conversational AI prompt for all non-extraction steps.
 */
export function buildPrompt(userMsg: string, data: Partial<LLPData>, step: string, fileCount: number = 0): string {
  const partners = data.partners || [];
  const numPartners = data.numPartners || partners.length || 2;
  // Find next partner needing address confirmation (no pin set)
  const nextIdx = partners.findIndex(p => !p.address?.pin);
  const targetIdx = nextIdx !== -1 ? nextIdx : partners.length;

  // Current state of extractions
  const allExtracted = partners.every(p => p.fullName);
  const partnerSummary = partners.map((p, i) =>
    `Partner ${i + 1}: fullName="${p.fullName || "?"}", aadhaarAddress="${p.aadhaarAddress || "?"}"`
  ).join("\n");

  return `You are "Deed AI Assistant" — a strict conversational LLP Agreement assistant.
Return ONLY structured JSON. No markdown, no fences.

CURRENT STEP: ${step}
USER: "${userMsg}"
NUM_PARTNERS: ${numPartners}
ALL_EXTRACTED: ${allExtracted}
PARTNER SUMMARY:
${partnerSummary}
SESSION_DATA: ${JSON.stringify(data)}

---

## ABSOLUTE RULES:
- NEVER suggest "Upload Now" as an option. Never.
- When step is "num_partners" and user hasn't uploaded yet, ask: "Great! Please upload all ${numPartners} Aadhaar cards using the attachment button (📎) below."
- Do NOT try to extract from files in this prompt — extraction is handled separately.
- Your job here is: conversational flow, address confirmation, and all steps AFTER extraction.

---

## ADDRESS CONFIRMATION FLOW (step = "partner_X"):
${allExtracted ? `
All ${numPartners} partners have been extracted. Now confirm addresses one by one.
Currently on Partner ${targetIdx + 1}.

Partner ${targetIdx + 1}'s raw Aadhaar address: "${partners[targetIdx]?.aadhaarAddress || "not available"}"

- IF user says "Yes" → Parse the aadhaarAddress into: doorNo, area, city, district, state, pin.
  Set "partners[${targetIdx}].address.doorNo", "partners[${targetIdx}].address.area", etc.
  Then if Partner ${targetIdx + 2} exists, ask about their address next.
  If all confirmed, set nextStep = "partner_summary".

- IF user says "No" → Ask them to type the correct address.
  Then parse their typed address into the same fields.
` : `
Partners have not been extracted yet. Ask the user to upload Aadhaar cards using the 📎 button.
`}

---

## FOR ALL OTHER STEPS (llp_name, contributions, profits, etc.):
Continue the normal conversational flow for that step based on SESSION_DATA.

---

FIELD KEYS: "numPartners", "partners[X].fullName", "partners[X].fatherName", "partners[X].age", "partners[X].aadhaarAddress", "partners[X].address.doorNo", "partners[X].address.area", "partners[X].address.city", "partners[X].address.district", "partners[X].address.state", "partners[X].address.pin", "llpName", "executionDate", "executionCity", "registeredAddress.doorNo", "registeredAddress.area", "registeredAddress.district", "registeredAddress.state", "registeredAddress.pin", "totalCapital", "contributions[X].percentage", "contributions[X].amount", "profits[X].percentage", "bankAuthority", "remunerationType", "remunerationValue", "loansEnabled", "loanInterestRate", "arbitrationCity", "businessObjectives", "otherPoints"`;
}
