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
    // Build explicit index → name mapping so the AI knows exactly which index to update
    const partnerNames = partners.map(p => `${p.salutation || ""} ${p.fullName}`.trim()).filter(Boolean);
    const indexNameMap = partners.map((p, i) =>
      `  partners[${i}] → "${p.salutation || ""} ${p.fullName}".trim()`
    ).join("\n");

    // Build an example update showing ALL partners with true/false
    const exampleUpdates: Record<string, unknown> = {};
    partners.forEach((_, i) => {
      exampleUpdates[`partners[${i}].isDesignatedPartner`] = i < 2 ? true : false;
      exampleUpdates[`partners[${i}].isManagingPartner`] = i === 0 ? true : false;
    });

    addressSection = `
## CURRENT TASK: Designated Partners Selection

PARTNER INDEX MAP (use this to set the correct partner):
${indexNameMap}

IF the user has NOT selected yet (first time showing this step):
- Return this response to show the checkboxes:
  { "message": "Now, who among the partners will be the Designated Partners? Select at least 2.", "updates": {}, "nextStep": "designated_partners", "suggestedCheckboxes": ${JSON.stringify(partnerNames)}, "suggestedOptions": [], "isComplete": false, "validationError": null }

IF the user HAS submitted a checkbox selection (message contains partner names or "selected"):
- Look up each partner name in the INDEX MAP above to find their exact index.
- Set "partners[X].isDesignatedPartner" = true for EACH selected partner.
- Set "partners[X].isDesignatedPartner" = false for EACH partner NOT selected.
- Set "partners[X].isManagingPartner" = true for the FIRST designated partner only, false for the rest.
- Set nextStep = "llp_name" (NOT "partner_X", NOT "partner_summary").
- Validate: at least 2 must be selected. If less than 2 selected, set validationError and repeat the checkboxes.
- CRITICAL: The message MUST end with: "Now, what will be the name of your LLP? (It must end with 'LLP')"
- Example updates structure (replace with actual selected/unselected values):
${JSON.stringify(exampleUpdates, null, 2)}`;

  } else if (allExtracted && !allAddressesConfirmed && targetPartner) {
    const partnerNamesForCheckbox = partners.map(p => `${p.salutation || ""} ${p.fullName}`.trim()).filter(Boolean);
    const isLastPartner = !nextPartner;

    addressSection = `
## CURRENT TASK: Confirm Partner ${targetIdx + 1}'s (${targetPartner.fullName}) address
Raw Aadhaar address: "${targetPartner.aadhaarAddress}"

⚠️ ALWAYS include "suggestedOptions": ["Yes: Correct", "No: I'll type it"] in your response for this step.

IF user says "Yes" or any affirmative:
- Parse the raw address above into fields and return them in "updates":
  "partners[${targetIdx}].address.doorNo": "<door number>",
  "partners[${targetIdx}].address.area": "<area/street>",
  "partners[${targetIdx}].address.city": "<city/town/village>",
  "partners[${targetIdx}].address.district": "<district>",
  "partners[${targetIdx}].address.state": "<state>",
  "partners[${targetIdx}].address.pin": "<6-digit pin code>"
${isLastPartner ? `- This is the LAST partner. In the SAME response:
  - Set nextStep = "designated_partners"
  - Set suggestedOptions = []
  - Set suggestedCheckboxes = ${JSON.stringify(partnerNamesForCheckbox)}
  - message = "Partner ${targetIdx + 1}'s address confirmed! Now, who among the partners will be the Designated Partners? (Select at least 2)"` :
`- Then ask about Partner ${targetIdx + 2} (${nextPartner!.fullName}): "${nextPartner!.aadhaarAddress}"
- nextStep: "partner_X"
- suggestedOptions: ["Yes: Correct", "No: I'll type it"]`}

IF user says "No":
- Ask them to type the correct address for Partner ${targetIdx + 1}
- updates: {}
- nextStep: "${step}"
- suggestedOptions: []

IF user typed a custom address:
- Parse their text into the same address fields above
${isLastPartner ? `- nextStep = "designated_partners", suggestedCheckboxes = ${JSON.stringify(partnerNamesForCheckbox)}, message asks about designated partners` : `- Ask about Partner ${targetIdx + 2}`}`;
  } else if (allAddressesConfirmed && !designatedConfirmed) {
    addressSection = `
## CURRENT TASK: Ask Designated Partners
All addresses confirmed. Now ask who the designated partners are.
Set nextStep = "designated_partners".
Use suggestedCheckboxes with all partner names.`;
  } else {
    addressSection = `Partners not extracted yet. Ask the user to attach all ${numPartners} Aadhaar cards using the 📎 button.`;
  }

  // ── Step-specific logic for post-confirmation steps ──────────────────────────

  const totalCapital = (data as LLPData).totalCapital || 0;
  const contributions = (data as LLPData).contributions || [];
  const profits = (data as LLPData).profits || [];

  const partnerContribExample = partners.map((p, i) =>
    `  "contributions[${i}].percentage": <share% for ${p.fullName}>,\n  "contributions[${i}].amount": <calculated: share%/100 * totalCapital>`
  ).join("\n");

  const partnerProfitExample = partners.map((p, i) =>
    `  "profits[${i}].percentage": <profit% for ${p.fullName}>`
  ).join("\n");

  const stepSections: Record<string, string> = {
    num_partners: `
## STEP: Number of Partners
USER input: "${userMsg}"
IF the user's input is a number between 2 and 10:
  - Set updates: { "numPartners": ${userMsg} }
  - Message: "Great! Please upload all ${numPartners} Aadhaar card images (one per partner) using the 📎 button below so I can extract each partner's details."
  - nextStep: "partner_X"
  - suggestedOptions: []
ELSE:
  - Ask: "How many partners will be part of the LLP firm in total? (Enter a number between 2 and 10)"
  - updates: {}, nextStep: "num_partners"`,

    llp_name: `
## STEP: LLP Name
USER input: "${userMsg}"
IF the user's input IS the LLP name (contains any text, especially ending with "LLP" or "llp"):
  - Set updates: { "llpName": "${userMsg}" }
  - Set nextStep: "registered_address"
  - Message: "✅ Great! '${userMsg}' has been saved as your LLP name. You can already see it appear in the document preview on the right.\n\nNow, what is the registered office address of the LLP? Please provide:\n- Door/Flat No.\n- Area/Street\n- District\n- State\n- PIN Code"
ELSE IF the user's message is empty, unrelated, or a greeting:
  - Ask: "What will be the name of your LLP? (Must end with 'LLP', e.g. 'ABC Enterprises LLP')"
  - updates: {}, nextStep: "llp_name"`,

    registered_address: `
## STEP: Registered Address
USER input: "${userMsg}"
IF the user's input looks like an address (contains street/area/city/district/state/PIN):
  - Parse the address into: doorNo, area, district, state, pin
  - Set ALL of these in updates:
    "registeredAddress.doorNo": "...",
    "registeredAddress.area": "...",
    "registeredAddress.district": "...",
    "registeredAddress.state": "...",
    "registeredAddress.pin": "...",
    "executionCity": "<same as district>" ← CRITICAL: sets the [Place] field in the deed header
  - Message: "✅ Registered address saved! You can see it mapped in the document preview.\n\nNow, what is the total capital contribution of the LLP in Rupees? (e.g. 100000 for ₹1 Lakh)"
  - nextStep: "total_capital"
ELSE IF message is empty or not an address:
  - Ask: "What is the registered office address of the LLP? Please provide:\n- Door/Flat No.\n- Area/Street\n- District\n- State\n- PIN Code"
  - updates: {}, nextStep: "registered_address"`,

    total_capital: `
## STEP: Total Capital Contribution
USER input: "${userMsg}"
IF the user's input contains a number (the capital amount in Rupees):
  - Extract the number from input
  - Validate it is > 0
  - Set updates: { "totalCapital": <number> }
  - nextStep: "contributions"
  - Message: "Capital set to ₹<amount>. Now, what is the contribution percentage for each partner? (must total 100%)\n${partners.map((p) => `- ${p.fullName}`).join("\n")}"
ELSE:
  - Ask: "What is the total capital contribution of the LLP in Rupees? (must be greater than 0)"
  - updates: {}, nextStep: "total_capital"`,

    contributions: `
## STEP: Partner Capital Shares
Current total capital: ₹${totalCapital.toLocaleString("en-IN")}
Partners: ${partners.map((p, i) => `${i + 1}. ${p.fullName}`).join(", ")}
USER input: "${userMsg}"

IF the user's input contains percentages (numbers that could be partner shares):
  - Parse the ${numPartners} percentages from input (e.g., "50 30 20" or "50%, 30%, 20%")
  - Validate they sum to exactly 100. If not, set validationError.
  - For each partner i, set:
    "contributions[i].percentage": <parsed %>,
    "contributions[i].amount": Math.round((<parsed %> / 100) * ${totalCapital})
  - nextStep: "profits"
  - CRITICAL: Message MUST end with the profit question: "Now, how will profits and losses be shared among the partners? (must total 100%)\n${partners.map((p, i) => `- Partner ${i + 1} (${p.fullName}): ?%`).join("\n")}"
ELSE:
  - Ask: "What is the capital contribution percentage for each partner? (must total 100%)\n${partners.map((p, i) => `- Partner ${i + 1} (${p.fullName}): ?%`).join("\n")}"
  - updates: {}, nextStep: "contributions"`,

    profits: `
## STEP: Profit & Loss Sharing
Partners: ${partners.map((p, i) => `${i + 1}. ${p.fullName}`).join(", ")}
USER input: "${userMsg}"

IF the user's input contains percentages for profit sharing:
  - Parse the ${numPartners} percentages from input
  - Validate they sum to exactly 100. If not, set validationError.
  - For each partner i, set: "profits[i].percentage": <parsed %>
  - nextStep: "business_objectives"
  - CRITICAL: Message MUST end with the business objectives question: "Now, briefly describe the main business activity of your LLP. (e.g. 'Software consulting and IT services')"
ELSE:
  - Ask: "How will profits and losses be shared among the partners? (must total 100%)\n${partners.map((p, i) => `- Partner ${i + 1} (${p.fullName}): ?%`).join("\n")}"
  - updates: {}, nextStep: "profits"`,

    business_objectives: `
## STEP: Business Objectives
USER input: "${userMsg}"
CURRENT businessObjectives in DATA: "${(data as LLPData).businessObjectives || ""}"

CASE 1 — IF user's input is "yes", "Yes", "Yes, include", "include" (affirmative to include objectives):
  - The objectives were already generated and shown to the user in the previous message.
  - Take the previously generated 10 objectives from the conversation context.
  - Set updates: { "businessObjectives": "<all 10 points as one string with \\n between each>" }
  - nextStep: "other_points"
  - suggestedOptions: []
  - Message: "Business objectives noted! Are there any other special terms or conditions to add? (Type 'None' if not)"

CASE 2 — IF user's input is "no", "No", "reject" (user wants to write their own):
  - Ask: "Please type your own business objectives for the LLP."
  - updates: {}, nextStep: "business_objectives"

CASE 3 — IF user's input is a description of business activity (a sentence describing what the LLP does, NOT yes/no):
  - Generate EXACTLY 10 clear, professional, legally appropriate business objective points based on their description.
  - Format as a numbered list in message.
  - End with: "Would you like to include these objectives in the agreement?"
  - updates: {}, nextStep: "business_objectives"
  - suggestedOptions: ["Yes, include these", "No, I'll write my own"]

CASE 4 — IF user's input is empty or unrelated:
  - Ask: "Briefly describe the main business activity of your LLP."
  - updates: {}, nextStep: "business_objectives", suggestedOptions: []`,

    other_points: `
## STEP: Other Special Points
USER input: "${userMsg}"
IF user's input is "None", "none", "no", or empty — or they have answered with any text:
  - Set updates: { "otherPoints": "${userMsg.toLowerCase() === "none" || userMsg.toLowerCase() === "no" ? "" : userMsg}" }
  - nextStep: "governance"
  - Message: "Got it! Now, for the LLP bank account, who should be authorized to operate it?"
  - suggestedOptions: ["Single (any one partner)", "Any Two partners", "All partners"]
ELSE first time / no answer yet:
  - Ask: "Are there any other special terms or conditions to add to the agreement? (Type 'None' if not)"
  - updates: {}, nextStep: "other_points"`,

    governance: `
## STEP: Bank Authority
USER input: "${userMsg}"
IF user's input mentions "single", "one", "any one":
  - updates: { "bankAuthority": "Single" }, nextStep: "remuneration"
  - Message: "Bank authority set to Single. Will the designated partners receive any remuneration?"
  - suggestedOptions: ["Fixed Amount", "Percentage of Profit", "None"]
ELSE IF user's input mentions "two", "any two", "2":
  - updates: { "bankAuthority": "Any Two" }, nextStep: "remuneration"
  - suggestedOptions: ["Fixed Amount", "Percentage of Profit", "None"]
ELSE IF user's input mentions "all":
  - updates: { "bankAuthority": "All" }, nextStep: "remuneration"
  - suggestedOptions: ["Fixed Amount", "Percentage of Profit", "None"]
ELSE:
  - Ask: "For the LLP bank account, who should be authorized to operate it?"
  - suggestedOptions: ["Single (any one partner)", "Any Two partners", "All partners"]
  - updates: {}, nextStep: "governance"`,

    remuneration: `
## STEP: Remuneration
USER input: "${userMsg}"
IF user says "fixed" or "fixed amount":
  - Set updates: { "remunerationType": "Fixed" }
  - Ask for the fixed amount value
  - nextStep: "remuneration" until they give the value
  - When value given: also set "remunerationValue": "<amount>", nextStep: "loans"
ELSE IF user says "percentage":
  - Set updates: { "remunerationType": "Percentage" }
  - Ask for the % value
  - When given: "remunerationValue": "<value>%", nextStep: "loans"
ELSE IF user says "none", "no", "None":
  - updates: { "remunerationType": "None", "remunerationValue": "" }, nextStep: "loans"
  - Ask: "Will partners be allowed to give loans to the LLP?"
  - suggestedOptions: ["Yes", "No"]
ELSE:
  - Ask: "Will the designated partners receive remuneration?"
  - suggestedOptions: ["Fixed Amount", "Percentage of Profit", "None"]
  - updates: {}, nextStep: "remuneration"`,

    loans: `
## STEP: Partner Loans
USER input: "${userMsg}"
IF user says "yes":
  - Ask for interest rate
  - When rate given: updates: { "loansEnabled": true, "loanInterestRate": <rate> }, nextStep: "arbitration"
ELSE IF user says "no":
  - updates: { "loansEnabled": false }, nextStep: "arbitration"
  - Message: "Got it. In which city will disputes be resolved through arbitration?"
ELSE:
  - Ask: "Will partners be allowed to give loans to the LLP?"
  - suggestedOptions: ["Yes", "No"]
  - updates: {}, nextStep: "loans"`,

    arbitration: `
## STEP: Arbitration City
Ask: "In which city will disputes be resolved through arbitration?"
Map to: "arbitrationCity": "<city>"
nextStep: "partner_summary"`,
  };

  const stepInstruction = stepSections[step] || `Continue the normal conversational flow for step "${step}" based on DATA.`;

  const partnerList = partners.map((p, i) =>
    `P${i + 1}: name="${p.fullName || "?"}", addr_confirmed=${!!p.address?.pin}`
  ).join(" | ");

  return `You are "Deed AI Assistant" — a conversational LLP Agreement assistant.
Return ONLY valid JSON. No markdown, no code fences.

STEP: ${step}
USER: "${userMsg}"
NUM_PARTNERS: ${numPartners}
PARTNERS: ${partnerList}
DATA: ${JSON.stringify(data)}

GLOBAL RULES:
1. Never suggest "Upload Now".
2. Never go back to a previous step.
3. Follow the STEP INSTRUCTION below exactly.

${step === "partner_X" || step === "designated_partners" ? addressSection : stepInstruction}

JSON output must always have all these fields:
{ "message": "...", "updates": {}, "nextStep": "...", "suggestedOptions": [], "suggestedCheckboxes": [], "isComplete": false, "validationError": null }`;
}
