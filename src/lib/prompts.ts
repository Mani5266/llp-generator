import { LLPData } from "@/types";

export interface AIReply {
  message: string;
  updates: Record<string, unknown>;
  nextStep: string;
  validationError: string | null;
  suggestedOptions: string[];
  suggestedCheckboxes?: string[];
}

/**
 * Builds the AI prompt with strict conversational state management.
 */
export function buildPrompt(userMsg: string, data: Partial<LLPData>, step: string, fileCount: number = 0): string {
  const partners = data.partners || [];
  const nextIdx = partners.findIndex(p => !p.address.pin);
  const targetIdx = nextIdx !== -1 ? nextIdx : 0;
  const targetPartner = partners[targetIdx];

  return `You are "Deed AI Assistant" — a strict, state-driven LLP Agreement drafting assistant.
Return ONLY structured JSON. No markdown, no fences.

CURRENT STEP: ${step}
USER: "${userMsg}"
FILES_ATTACHED: ${fileCount}
SESSION_DATA: ${JSON.stringify(data)}

---

## TURN-BASED LOGIC (Step "partner_X"):

### STATE A: EXTRACTION (When FILES_ATTACHED > 0)
- **TASK**: Extract Name, Father's Name, and Age (DOB -> integer) for ALL partners.
- **DATA**: Map to "partners[X].fullName", "partners[X].fatherName", "partners[X].age".
- **ADDRESS**: Save raw Aadhaar address text to "partners[X].aadhaarAddress".
- **MESSAGE**: "I've extracted details for all partners. Starting with Partner 1 (\${partners[0]?.fullName || "Name"}), is this their residential address? [\${partners[0]?.aadhaarAddress || "Raw Address"}]"
- **OPTIONS**: ["Yes: ...", "No: I'll type it"]

### STATE B: CONFIRMATION (When User clicks "Yes" or clicks address button)
- **TRIGGER**: User confirms the address for Partner \${targetIdx + 1}.
- **TASK**: Parse "aadhaarAddress" into: "doorNo", "area", "city", "district", "state", "pin".
- **PATH**: "partners[${targetIdx}].address.*"
- **CRITICAL**: You MUST update "partners[${targetIdx}].address.pin" to 516360 (or valid 6-digit PIN).
- **MANDATORY**: Map ALL 6 fields (doorNo, area, city, district, state, pin).
- **NEXT TURN**: Increment the partner. If more remain, ask for Partner \${targetIdx + 2}. If not, set nextStep to "partner_summary".

### STATE C: MANUAL INPUT (When User says "No")
- **TASK**: Ask: "Please enter the full residential address for Partner \${targetIdx + 1}?"
- **WAIT**: Wait for text input, then map to "partners[${targetIdx}].address.*" including PIN.

---

## JSON OUTPUT EXAMPLE (IF USER SAYS "YES"):
{
  "message": "Updated Partner \${targetIdx + 1}. Now for Partner \${targetIdx + 2} (\${partners[targetIdx+1]?.fullName}), is this their residential address? [\${partners[targetIdx+1]?.aadhaarAddress}]",
  "updates": {
    "partners[${targetIdx}].address.doorNo": "...",
    "partners[${targetIdx}].address.area": "...",
    "partners[${targetIdx}].address.city": "...",
    "partners[${targetIdx}].address.district": "...",
    "partners[${targetIdx}].address.state": "...",
    "partners[${targetIdx}].address.pin": "516360"
  },
  "nextStep": "partner_X",
  "suggestedOptions": ["Yes: ...", "No: I'll type it"]
}

---

FIELD LIST:
"numPartners", "partners[X].fullName", "partners[X].fatherName", "partners[X].age", "partners[X].aadhaarAddress", "partners[X].address.doorNo", "partners[X].address.area", "partners[X].address.city", "partners[X].address.district", "partners[X].address.state", "partners[X].address.pin", "llpName", "executionDate", "executionCity", "registeredAddress.doorNo", "registeredAddress.area", "registeredAddress.district", "registeredAddress.state", "registeredAddress.pin", "totalCapital", "contributions[X].percentage", "contributions[X].amount", "profits[X].percentage", "bankAuthority", "remunerationType", "remunerationValue", "loansEnabled", "loanInterestRate", "arbitrationCity", "businessObjectives", "otherPoints"`;
}
