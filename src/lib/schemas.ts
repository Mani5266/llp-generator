import { z } from "zod";

// ── Sub-object schemas ─────────────────────────────────────

const partnerAddressSchema = z.object({
  doorNo: z.string().max(200).default(""),
  area: z.string().max(200).default(""),
  city: z.string().max(100).default(""),
  district: z.string().max(100).default(""),
  state: z.string().max(100).default(""),
  pin: z.string().max(10).default(""),
});

const partnerSchema = z.object({
  index: z.number().int().min(0).max(9),
  salutation: z.enum(["Mr.", "Mrs.", "Ms.", "Dr."]).default("Mr."),
  fullName: z.string().max(200).default(""),
  relationDescriptor: z.enum(["S/O", "D/O", "W/O", "C/O"]).default("S/O"),
  fatherSalutation: z.enum(["Mr.", "Mrs.", "Ms.", "Dr."]).default("Mr."),
  fatherName: z.string().max(200).default(""),
  dob: z.string().max(20).default(""),
  age: z.string().max(5).default(""),
  address: partnerAddressSchema.default({ doorNo: "", area: "", city: "", district: "", state: "", pin: "" }),
  aadhaarAddress: z.string().max(500).optional().default(""),
  isManagingPartner: z.boolean().default(false),
  isBankAuthorised: z.boolean().default(false),
  isDesignatedPartner: z.boolean().default(false),
});

const contributionSchema = z.object({
  partnerIndex: z.number().int().min(0),
  percentage: z.number().min(0).max(100),
  amount: z.number().min(0),
});

const profitSchema = z.object({
  partnerIndex: z.number().int().min(0),
  percentage: z.number().min(0).max(100),
});

const registeredAddressSchema = z.object({
  doorNo: z.string().max(200).default(""),
  area: z.string().max(200).default(""),
  district: z.string().max(100).default(""),
  state: z.string().max(100).default(""),
  pin: z.string().max(10).default(""),
});

// ── LLPData schema (used by render-deed, download-docx) ───

export const llpDataSchema = z.object({
  numPartners: z.number().int().min(2).max(10),
  partners: z.array(partnerSchema).min(2).max(10),
  llpName: z.string().max(300).default(""),
  executionCity: z.string().max(100).default(""),
  executionDate: z.string().max(50).default(""),
  registeredAddress: registeredAddressSchema.default({ doorNo: "", area: "", district: "", state: "", pin: "" }),
  totalCapital: z.number().min(0).max(100_000_000_000).default(0),
  contributions: z.array(contributionSchema).default([]),
  profits: z.array(profitSchema).default([]),
  businessObjectives: z.string().max(5000).default(""),
  otherPoints: z.string().max(5000).default(""),

  // Governance
  bankAuthority: z.enum(["Single", "Any Two", "All"]).default("Any Two"),
  remunerationType: z.enum(["Fixed", "Percentage", "None"]).default("Percentage"),
  remunerationValue: z.string().max(200).default(""),
  loansEnabled: z.boolean().default(true),
  loanInterestRate: z.number().min(0).max(100).default(12),
  arbitrationCity: z.string().max(100).default(""),
  manualHtml: z.string().max(500_000).optional(),
});

// ── Chat API input schema ──────────────────────────────────

const fileAttachmentSchema = z.object({
  base64: z.string().max(10_000_000), // ~7.5 MB decoded
  mimeType: z.enum([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "application/pdf",
  ]),
});

export const chatInputSchema = z.object({
  message: z.string().max(5000),  // can be empty when files are attached
  data: llpDataSchema.partial(),  // all fields optional during conversation
  step: z.string().min(1).max(50),
  files: z.array(fileAttachmentSchema).max(5).optional(),
}).refine(
  (input) => input.message.length > 0 || (input.files && input.files.length > 0),
  { message: "Either a message or at least one file is required" }
);

// ── PDF download input schema ──────────────────────────────

export const pdfInputSchema = z.object({
  html: z.string().min(1).max(500_000),
  llpName: z.string().max(300).optional().default("Draft"),
});
