import { LLPData, Partner } from "@/types";

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
 * Dedicated prompt for Aadhaar extraction — called ONLY when files are attached.
 */
export function buildExtractionPrompt(data: Partial<LLPData>, numFiles: number): string {
  const numPartners = data.numPartners || 2;

  // Generate a complete example with ALL partners filled in
  const exampleUpdates: Record<string, string | number> = {};
  for (let i = 0; i < numPartners; i++) {
    exampleUpdates[`partners[${i}].fullName`] = `Full Name ${i + 1}`;
    exampleUpdates[`partners[${i}].fatherName`] = `Father Name ${i + 1}`;
    exampleUpdates[`partners[${i}].age`] = 30 + i;
    exampleUpdates[`partners[${i}].aadhaarAddress`] = `Full raw address as on Aadhaar card ${i + 1}`;
  }

  return `You are a data extraction assistant. ${numFiles} Aadhaar card image(s) have been attached.

TASK: Extract the following for each Aadhaar card in order:
1. Full Name (exactly as printed)
2. Father/Mother/Spouse Name (from S/O, D/O, W/O — name only, no title)
3. Age in years (integer: 2026 - birth year from DOB)
4. Full address (one string, copied exactly from the card)

Map card 1 -> partners[0], card 2 -> partners[1], card 3 -> partners[2], etc.

IMPORTANT:
- You MUST include ALL ${numFiles} partners in the updates object.
- Do NOT parse the address — copy it as-is into aadhaarAddress.
- Return ONLY valid JSON (no markdown, no fences).

Return this exact structure with real values:
${JSON.stringify({
  message: `I've extracted details for all ${numFiles} partners and mapped them to the document. Starting with Partner 1 ([name]), is this their residential address? [raw address]`,
  updates: exampleUpdates,
  nextStep: "partner_X",
  suggestedOptions: ["Yes: Correct", "No: I'll type it"],
  isComplete: false,
  validationError: null,
}, null, 2)}`;
}

/**
 * Conversational prompt for all non-file steps.
 */
export function buildPrompt(userMsg: string, data: Partial<LLPData>, step: string): string {
  const partners: Partner[] = (data.partners || []) as Partner[];
  const numPartners = data.numPartners || partners.length || 2;

  const allExtracted = partners.length > 0 && partners.every(p => p.fullName);
  const nextIdx = allExtracted ? partners.findIndex(p => !p.address?.pin) : -1;
  const targetIdx = nextIdx !== -1 ? nextIdx : -1;
  const targetPartner = targetIdx >= 0 ? partners[targetIdx] : null;
  const nextPartner = targetIdx >= 0 ? partners[targetIdx + 1] : null;
  const allAddressesConfirmed = allExtracted && partners.every(p => p.address?.pin);
  const designatedConfirmed = partners.some(p => p.isDesignatedPartner);

  let addressSection = "";
  if (step === "designated_partners") {
    // Step: Ask who is a designated partner using checkboxes
    const partnerNames = partners.map(p => `${p.salutation || ""} ${p.fullName}`.trim()).filter(Boolean);
    addressSection = `
## CURRENT TASK: Designated Partners
Ask the user to select who among the partners will be designated partners.
Use suggestedCheckboxes with the list of partner names.
After user selects, set "partners[X].isDesignatedPartner" = true for selected ones, false for others.
Also set "partners[X].isManagingPartner" = true for the first selected designated partner.
Minimum 2 designated partners required.
After confirming, set nextStep = "llp_name".

PARTNER NAMES FOR CHECKBOXES: ${JSON.stringify(partnerNames)}

Example response:
{
  "message": "Great! Now, who among the partners will be the Designated Partners? (Select at least 2)",
  "updates": {},
  "nextStep": "designated_partners",
  "suggestedCheckboxes": ${JSON.stringify(partnerNames)},
  "suggestedOptions": [],
  "isComplete": false,
  "validationError": null
}

If user is SUBMITTING their checkbox selection (their message includes partner names), map them to partners[X].isDesignatedPartner.`;
  } else if (allExtracted && !allAddressesConfirmed && targetPartner) {
    addressSection = `
## CURRENT TASK: Confirm Partner ${targetIdx + 1}'s address
Partner name: ${targetPartner.fullName}
Raw Aadhaar address: "${targetPartner.aadhaarAddress}"

IF user says "Yes" or any affirmative:
- Parse the raw address above into fields and return them in "updates":
  "partners[${targetIdx}].address.doorNo": "<door number>",
  "partners[${targetIdx}].address.area": "<area/street>",
  "partners[${targetIdx}].address.city": "<city/town/village>",
  "partners[${targetIdx}].address.district": "<district>",
  "partners[${targetIdx}].address.state": "<state>",
  "partners[${targetIdx}].address.pin": "<6-digit pin>"
- Then ${nextPartner ? `ask about Partner ${targetIdx + 2} (${nextPartner.fullName}): "${nextPartner.aadhaarAddress}"` : "ALL ADDRESSES ARE DONE — set nextStep to 'designated_partners' and ask who the designated partners are"}.
- nextStep: ${nextPartner ? '"partner_X"' : '"designated_partners"'}
- suggestedOptions: ${nextPartner ? '["Yes: Correct", "No: I\'ll type it"]' : '[]'}

IF user says "No":
- Ask them to type the correct address for Partner ${targetIdx + 1}
- updates: {}
- nextStep: "${step}"

IF user typed a custom address:
- Parse their text into the same address fields above
- Then ${nextPartner ? `ask about Partner ${targetIdx + 2}` : "set nextStep to 'designated_partners'"}.`;
  } else if (allAddressesConfirmed && !designatedConfirmed) {
    addressSection = `
## CURRENT TASK: Ask Designated Partners
All addresses confirmed. Now ask who the designated partners are.
Set nextStep = "designated_partners".
Use suggestedCheckboxes with all partner names.`;
  } else {
    addressSection = `Partners not extracted yet. Ask the user to attach all ${numPartners} Aadhaar cards using the 📎 button.`;
  }

  const partnerList = partners.map((p, i) =>
    `P${i + 1}: name="${p.fullName || "?"}", addr_confirmed=${!!p.address?.pin}, aadhaarAddress="${p.aadhaarAddress || "?"}"`
  ).join(" | ");

  return `You are "Deed AI Assistant" — a conversational LLP Agreement assistant.
Return ONLY valid JSON. No markdown, no code fences.

STEP: ${step}
USER: "${userMsg}"
NUM_PARTNERS: ${numPartners}
PARTNERS: ${partnerList}
DATA: ${JSON.stringify(data)}

RULES:
1. Never suggest "Upload Now".
2. If asked who to upload, say: "Please use the 📎 attachment button below to upload all ${numPartners} Aadhaar cards."
3. DO NOT try to extract images — only confirm/collect data conversationally.

${addressSection}

For other steps (llp_name, registered_address, contributions, profits, governance, remuneration, loans, arbitration, business_objectives, other_points):
Continue the normal conversational flow based on the current step and DATA.

JSON output must have: message, updates, nextStep, suggestedOptions, isComplete, validationError.
FIELD KEYS: "llpName", "executionDate", "executionCity", "registeredAddress.doorNo", "registeredAddress.area", "registeredAddress.district", "registeredAddress.state", "registeredAddress.pin", "totalCapital", "contributions[X].percentage", "contributions[X].amount", "profits[X].percentage", "bankAuthority", "remunerationType", "remunerationValue", "loansEnabled", "loanInterestRate", "arbitrationCity", "businessObjectives", "otherPoints"`;
}
