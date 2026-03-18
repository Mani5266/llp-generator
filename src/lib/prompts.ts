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
export function buildPrompt(userMsg: string, data: Partial<LLPData>, step: string): string {
  const partners = data.partners || [];
  const numPartners = data.numPartners || partners.length || 2;

  // Find next partner needing address confirmation (no pin set yet)
  const nextIdx = partners.findIndex(p => !p.address?.pin);
  const targetIdx = nextIdx !== -1 ? nextIdx : partners.length;
  const targetPartner = partners[targetIdx];
  const nextPartner = partners[targetIdx + 1];
  const allExtracted = partners.length > 0 && partners.every(p => p.fullName);
  const allAddressesConfirmed = partners.every(p => p.address?.pin);

  const partnerSummary = partners.map((p, i) =>
    `Partner ${i + 1}: name="${p.fullName || "?"}", address_confirmed=${!!p.address?.pin}, aadhaarAddress="${p.aadhaarAddress || "?"}"`
  ).join("\n");

  // Build a concrete JSON example for the YES case
  const yesExample = targetPartner ? JSON.stringify({
    message: nextPartner
      ? `Partner ${targetIdx + 1}'s address confirmed. Is Partner ${targetIdx + 2}'s (${nextPartner.fullName}) address correct? [${nextPartner.aadhaarAddress}]`
      : `All addresses confirmed! Let's continue to the next step.`,
    updates: {
      [`partners[${targetIdx}].address.doorNo`]: "<extract doorNo from aadhaarAddress>",
      [`partners[${targetIdx}].address.area`]: "<extract area/street from aadhaarAddress>",
      [`partners[${targetIdx}].address.city`]: "<extract city/village from aadhaarAddress>",
      [`partners[${targetIdx}].address.district`]: "<extract district from aadhaarAddress>",
      [`partners[${targetIdx}].address.state`]: "<extract state from aadhaarAddress>",
      [`partners[${targetIdx}].address.pin`]: "<extract 6-digit PIN from aadhaarAddress>",
    },
    nextStep: nextPartner ? "partner_X" : "partner_summary",
    suggestedOptions: nextPartner ? ["Yes: Correct", "No: I'll type it"] : [],
    isComplete: false,
    validationError: null,
  }, null, 2) : "{}";

  const noExample = targetPartner ? JSON.stringify({
    message: `Please type the correct residential address for Partner ${targetIdx + 1} (${targetPartner.fullName}):`,
    updates: {},
    nextStep: step,
    suggestedOptions: [],
    isComplete: false,
    validationError: null,
  }, null, 2) : "{}";

  return `You are "Deed AI Assistant" — a strict conversational LLP Agreement assistant.
Return ONLY structured JSON. No markdown, no fences.

CURRENT STEP: ${step}
USER: "${userMsg}"
NUM_PARTNERS: ${numPartners}
ALL_EXTRACTED: ${allExtracted}
ALL_ADDRESSES_CONFIRMED: ${allAddressesConfirmed}
PARTNER SUMMARY:
${partnerSummary}
SESSION_DATA: ${JSON.stringify(data)}

---

## ABSOLUTE RULES:
- NEVER suggest "Upload Now".
- If user hasn't uploaded Aadhaar yet, say: "Please upload all ${numPartners} Aadhaar cards using the 📎 button below."
- Do NOT extract from files here — files are handled separately.

---

## ADDRESS CONFIRMATION (step = "partner_X"):
${allExtracted && !allAddressesConfirmed ? `
You are confirming Partner ${targetIdx + 1}'s (${targetPartner?.fullName}) address.
Their raw Aadhaar address: "${targetPartner?.aadhaarAddress || "not available"}"

⚠️ CRITICAL: You MUST include the parsed address fields in your "updates" object whenever user says "Yes".
Do NOT skip this. The document cannot show the address unless you emit these fields.

IF user says "Yes" (any affirmative): Return THIS structure (fill in real parsed values from the aadhaarAddress string above):
${yesExample}

IF user says "No": Return THIS structure:
${noExample}

IF user typed a custom address (from a previous "No"): Parse their typed address and set the same fields as in the YES example.
` : allAddressesConfirmed ? `
All addresses are confirmed. Continue to the next step (partner_summary or llp_name).
Set nextStep = "partner_summary".
` : `
Partners not extracted yet. Ask user to upload Aadhaar cards using the 📎 button.
`}

---

## FOR ALL OTHER STEPS (llp_name, registered_address, contributions, profits, governance, etc.):
Continue normal conversational flow based on SESSION_DATA and the current step.

---

FIELD KEYS: "partners[X].address.doorNo", "partners[X].address.area", "partners[X].address.city", "partners[X].address.district", "partners[X].address.state", "partners[X].address.pin", "llpName", "executionDate", "executionCity", "registeredAddress.doorNo", "registeredAddress.area", "registeredAddress.district", "registeredAddress.state", "registeredAddress.pin", "totalCapital", "contributions[X].percentage", "contributions[X].amount", "profits[X].percentage", "bankAuthority", "remunerationType", "remunerationValue", "loansEnabled", "loanInterestRate", "arbitrationCity", "businessObjectives", "otherPoints"`;
}


