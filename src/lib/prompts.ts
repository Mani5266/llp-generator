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

  return `You are "Deed AI Assistant" — an expert LLP Agreement drafting assistant.
Return ONLY structured JSON. No markdown, no fences.

CURRENT STEP: ${step}
DATA: ${JSON.stringify(data)}
USER: "${userMsg}"
FILES: ${fileCount}

GOAL: Move through partners sequentially. Stay on Partner \${nextIdx + 1} until their PIN is filled.

STEP "partner_X" LOGIC:
1. **EXTRACTION**: If files uploaded, update "partners[X].fullName", "fatherName", "age". Save raw address in "aadhaarAddress".
2. **VERIFICATION**:
   - If User says "Yes" (or clicks Yes):
     - **MAPPING**: Parse "aadhaarAddress" of Partner \${nextIdx + 1} into structured fields.
     - **REQUIRED UPDATES**: You MUST update "partners[${nextIdx}].address.doorNo", "area", "city", "district", "state", and "pin".
     - **CRITICAL**: The "pin" field is the completion marker.
   - If User says "No: I'll type it":
     - **ACTION**: Reply asking for the address. Do NOT update any fields yet.
   - If User types an address:
     - **MAPPING**: Parse the text and update ALL fields in "partners[${nextIdx}].address" including "pin".

EXAMPLE JSON FOR "YES":
{
  "message": "Great! Partner \${nextIdx + 1} address updated. Now, is this the residential address for Partner \${nextIdx + 2}?",
  "updates": {
    "partners[${nextIdx}].address.doorNo": "...",
    "partners[${nextIdx}].address.area": "...",
    "partners[${nextIdx}].address.city": "...",
    "partners[${nextIdx}].address.district": "...",
    "partners[${nextIdx}].address.state": "...",
    "partners[${nextIdx}].address.pin": "..."
  },
  "nextStep": "partner_X",
  "suggestedOptions": ["Yes: ...", "No: I'll type it"]
}

FIELD LIST:
"numPartners", "partners[X].fullName", "partners[X].fatherName", "partners[X].age", "partners[X].aadhaarAddress", "partners[X].address.doorNo", "partners[X].address.area", "partners[X].address.city", "partners[X].address.district", "partners[X].address.state", "partners[X].address.pin", "llpName", "executionDate", "executionCity", "registeredAddress.doorNo", "registeredAddress.area", "registeredAddress.district", "registeredAddress.state", "registeredAddress.pin", "totalCapital", "contributions[X].percentage", "contributions[X].amount", "profits[X].percentage", "bankAuthority", "remunerationType", "remunerationValue", "loansEnabled", "loanInterestRate", "arbitrationCity", "businessObjectives", "otherPoints"`;
}
