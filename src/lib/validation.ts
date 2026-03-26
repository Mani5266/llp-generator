/**
 * Input validation helpers for LLP Agreement fields.
 * Each returns { valid: boolean, error?: string }
 */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** PAN: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F) */
function validatePAN(pan: string): ValidationResult {
  if (!pan || !pan.trim()) return { valid: false, error: "PAN number is required." };
  const cleaned = pan.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleaned)) {
    return { valid: false, error: "Invalid PAN format. Must be 10 characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)." };
  }
  return { valid: true };
}

/** PIN code: exactly 6 digits, first digit 1-9 */
function validatePIN(pin: string): ValidationResult {
  if (!pin || !pin.trim()) return { valid: false, error: "PIN code is required." };
  const cleaned = pin.trim();
  if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
    return { valid: false, error: "Invalid PIN code. Must be exactly 6 digits and cannot start with 0." };
  }
  return { valid: true };
}

/** Age: numeric, between 18 and 100 */
function validateAge(age: string): ValidationResult {
  if (!age || !age.trim()) return { valid: false, error: "Age is required." };
  const n = Number(age.trim());
  if (isNaN(n) || !Number.isInteger(n)) {
    return { valid: false, error: "Age must be a whole number." };
  }
  if (n < 18) return { valid: false, error: "Age must be at least 18 years (legal requirement for LLP partners)." };
  if (n > 100) return { valid: false, error: "Please enter a valid age (18-100)." };
  return { valid: true };
}

/** Capital amount: must be a positive number */
function validateCapital(amount: number | string): ValidationResult {
  const n = typeof amount === "string" ? Number(amount.replace(/[₹,\s]/g, "")) : amount;
  if (isNaN(n) || n <= 0) {
    return { valid: false, error: "Capital amount must be a positive number." };
  }
  if (n < 1000) {
    return { valid: false, error: "Capital contribution should be at least ₹1,000." };
  }
  return { valid: true };
}

/** Validate percentage contributions sum to 100 */
function validatePercentages(percentages: number[]): ValidationResult {
  const sum = percentages.reduce((s, p) => s + (p || 0), 0);
  if (Math.abs(sum - 100) > 0.1) {
    return { valid: false, error: `Percentages must add up to 100%. Current total: ${sum.toFixed(1)}%.` };
  }
  for (let i = 0; i < percentages.length; i++) {
    if (percentages[i] < 0) return { valid: false, error: `Partner ${i + 1}'s percentage cannot be negative.` };
    if (percentages[i] > 100) return { valid: false, error: `Partner ${i + 1}'s percentage cannot exceed 100%.` };
  }
  return { valid: true };
}

/** Name: non-empty, minimum 2 characters */
function validateName(name: string, label = "Name"): ValidationResult {
  if (!name || !name.trim()) return { valid: false, error: `${label} is required.` };
  if (name.trim().length < 2) return { valid: false, error: `${label} must be at least 2 characters.` };
  if (/[0-9]/.test(name)) return { valid: false, error: `${label} should not contain numbers.` };
  return { valid: true };
}

/** Indian state name validation */
const INDIAN_STATES = [
  "andhra pradesh","arunachal pradesh","assam","bihar","chhattisgarh","goa","gujarat","haryana",
  "himachal pradesh","jharkhand","karnataka","kerala","madhya pradesh","maharashtra","manipur",
  "meghalaya","mizoram","nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","telangana",
  "tripura","uttar pradesh","uttarakhand","west bengal","delhi","jammu and kashmir","ladakh",
  "chandigarh","puducherry","lakshadweep","andaman and nicobar","dadra and nagar haveli and daman and diu"
];

function validateState(state: string): ValidationResult {
  if (!state || !state.trim()) return { valid: false, error: "State is required." };
  const s = state.trim().toLowerCase();
  if (!INDIAN_STATES.includes(s)) {
    return { valid: false, error: `"${state}" doesn't appear to be a valid Indian state or UT.` };
  }
  return { valid: true };
}

/** LLP name: non-empty, should end with "LLP" */
function validateLLPName(name: string): ValidationResult {
  if (!name || !name.trim()) return { valid: false, error: "LLP name is required." };
  if (name.trim().length < 3) return { valid: false, error: "LLP name must be at least 3 characters." };
  if (!name.trim().toUpperCase().endsWith("LLP")) {
    return { valid: false, error: "LLP name should end with 'LLP' (e.g., 'XYZ Associates LLP')." };
  }
  return { valid: true };
}

/**
 * Validate a set of updates from the AI response.
 * Returns an array of validation errors found.
 */
export function validateUpdates(updates: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const strVal = String(value ?? "");

    // PIN validation for any address pin field
    if (key.endsWith(".pin") && strVal) {
      const r = validatePIN(strVal);
      if (!r.valid) errors.push(r.error!);
    }

    // Age validation
    if (key.endsWith(".age") && strVal) {
      const r = validateAge(strVal);
      if (!r.valid) errors.push(r.error!);
    }

    // Name validation for partner names
    if (key.endsWith(".fullName") && strVal) {
      const r = validateName(strVal, "Partner name");
      if (!r.valid) errors.push(r.error!);
    }

    // Father name validation
    if (key.endsWith(".fatherName") && strVal) {
      const r = validateName(strVal, "Father's name");
      if (!r.valid) errors.push(r.error!);
    }

    // Capital validation
    if (key === "totalCapital" && value) {
      const r = validateCapital(value as number);
      if (!r.valid) errors.push(r.error!);
    }

    // LLP name validation
    if (key === "llpName" && strVal) {
      const r = validateLLPName(strVal);
      if (!r.valid) errors.push(r.error!);
    }

    // State validation for address state fields
    if (key.endsWith(".state") && strVal) {
      const r = validateState(strVal);
      if (!r.valid) errors.push(r.error!);
    }
  }

  return errors;
}
