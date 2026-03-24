export type Salutation = "Mr." | "Mrs." | "Ms." | "Dr.";
export type RelationDescriptor = "S/O" | "D/O" | "W/O" | "C/O";

export interface PartnerAddress {
  doorNo: string; area: string; city: string;
  district: string; state: string; pin: string;
}

export interface Partner {
  index: number;
  salutation: Salutation;
  fullName: string;
  relationDescriptor: RelationDescriptor;
  fatherSalutation: Salutation;
  fatherName: string;
  dob: string;           // Raw DOB extracted from Aadhaar (DD/MM/YYYY or YYYY)
  age: string;
  address: PartnerAddress;
  aadhaarAddress?: string; // Raw extracted address
  isManagingPartner: boolean;
  isBankAuthorised: boolean;
  isDesignatedPartner: boolean;
}

export interface ContributionEntry { partnerIndex: number; percentage: number; amount: number; }
export interface ProfitEntry       { partnerIndex: number; percentage: number; }

export interface RegisteredAddress {
  doorNo: string; area: string; district: string; state: string; pin: string;
}

export type BankAuthority = "Single" | "Any Two" | "All";
export type RemunerationType = "Fixed" | "Percentage" | "None";

export interface LLPData {
  numPartners: number;
  partners: Partner[];
  llpName: string;
  executionCity: string;
  executionDate: string;
  registeredAddress: RegisteredAddress;
  totalCapital: number;
  contributions: ContributionEntry[];
  profits: ProfitEntry[];
  businessObjectives: string;
  otherPoints: string;
  
  // Governance & Operational Settings
  bankAuthority: BankAuthority;
  remunerationType: RemunerationType;
  remunerationValue: string;
  loansEnabled: boolean;
  loanInterestRate: number;
  arbitrationCity: string;
  manualHtml?: string; // Persistent manual edits
}

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Check if two names are suspiciously similar (likely hallucination).
 * Returns true if names are too similar and fatherName should be cleared.
 */
export function isSelfParenting(fullName: string, fatherName: string): boolean {
  if (!fullName || !fatherName) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  const a = normalize(fullName);
  const b = normalize(fatherName);
  
  // Exact match
  if (a === b) return true;
  
  // Check if names share most words (e.g., "JAJULA MANI" vs "JAJALA MANI")
  const wordsA = a.split(" ");
  const wordsB = b.split(" ");
  
  // If one name is a subset of the other
  if (wordsA.every(w => b.includes(w)) || wordsB.every(w => a.includes(w))) return true;
  
  // Check edit distance on each word pair - if most words are within 1-2 characters of each other
  if (wordsA.length === wordsB.length && wordsA.length > 0) {
    let similarWords = 0;
    for (let i = 0; i < wordsA.length; i++) {
      if (levenshtein(wordsA[i], wordsB[i]) <= 2) similarWords++;
    }
    if (similarWords === wordsA.length) return true;
  }
  
  return false;
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Calculate age from DOB string. Supports DD/MM/YYYY, YYYY, or YYYY-MM-DD formats. */
export function calculateAge(dob: string): string {
  if (!dob) return "";
  const trimmed = dob.trim();
  const today = new Date();
  
  // Try DD/MM/YYYY format (common on Aadhaar cards)
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1; // JS months are 0-based
    const year = parseInt(ddmmyyyy[3], 10);
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 && age <= 120 ? String(age) : "";
  }
  
  // Try YYYY-MM-DD format (ISO)
  const isoFormat = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoFormat) {
    const year = parseInt(isoFormat[1], 10);
    const month = parseInt(isoFormat[2], 10) - 1;
    const day = parseInt(isoFormat[3], 10);
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 && age <= 120 ? String(age) : "";
  }
  
  // Try plain year (YYYY)
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    const age = today.getFullYear() - parseInt(yearOnly[1], 10);
    return age > 0 && age <= 120 ? String(age) : "";
  }
  
  return "";
}

export function numWords(n: number): string {
  const o = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const t = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  n = Math.round(n);
  if (!n) return "Zero";
  if (n >= 10000000) return numWords(Math.floor(n/10000000))+" Crore"+(n%10000000?" "+numWords(n%10000000):"");
  if (n >= 100000)   return numWords(Math.floor(n/100000))  +" Lakh" +(n%100000  ?" "+numWords(n%100000)  :"");
  if (n >= 1000)     return numWords(Math.floor(n/1000))    +" Thousand"+(n%1000 ?" "+numWords(n%1000)    :"");
  if (n >= 100)      return numWords(Math.floor(n/100))     +" Hundred" +(n%100  ?" "+numWords(n%100)     :"");
  if (n >= 20)       return t[Math.floor(n/10)]+(n%10?" "+o[n%10]:"");
  return o[n];
}
export function fmtINR(n: number) { return Math.round(n).toLocaleString("en-IN"); }
const PRESERVE_ACRONYMS = new Set(["LLP","IT","CA","HR","PVT","LTD","USA","UK","UAE","GST","PAN","TAN","CIN","DPIN","ROC","MCA","FEMA","NRI","OCI","IEC","MSME","ISO","BIS","FSSAI","API","ERP","AI","ML"]);
export function toTitleCase(s: string) {
  if (!s) return "";
  return s.split(' ').map(w => {
    const upper = w.toUpperCase();
    if (PRESERVE_ACRONYMS.has(upper)) return upper;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}
export function ordinalParty(i: number) {
  return (["First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"][i]??`${i+1}th`)+" Party";
}
export function fmtPartnerAddr(a: PartnerAddress) {
  const parts = [a.doorNo, a.area, a.city, a.district, a.state]
    .map(s => (s || "").trim())
    .filter(s => s && s.toLowerCase() !== "india");
  const pin = (a.pin || "").trim();
  if (pin) parts.push("India - " + pin);
  else if (parts.length > 0) parts.push("India");
  return parts.join(", ");
}

export function fmtRegAddr(a: RegisteredAddress) {
  const pin = (a.pin || "").trim();
  if (!pin) return "";
  const parts = [a.doorNo, a.area, a.district, a.state]
    .map(s => (s || "").trim())
    .filter(s => s && s.toLowerCase() !== "india");
  return [...parts, "India - " + pin].join(", ");
}
export function blankPartner(i: number): Partner {
  return { index:i, salutation:"Mr.", fullName:"", relationDescriptor:"S/O", fatherSalutation:"Mr.",
    fatherName:"", dob:"", age:"", address:{doorNo:"",area:"",city:"",district:"",state:"",pin:""},
    aadhaarAddress: "",
    isManagingPartner:i===0, isBankAuthorised:i===0, isDesignatedPartner:i<2 };
}
export function defaultData(): LLPData {
  const t = new Date();
  const d = t.toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
  return { 
    numPartners:2, partners:[blankPartner(0),blankPartner(1)], llpName:"",
    executionCity:"", executionDate:d, registeredAddress:{doorNo:"",area:"",district:"",state:"",pin:""},
    totalCapital:0, contributions:[{partnerIndex:0,percentage:0,amount:0},{partnerIndex:1,percentage:0,amount:0}],
    profits:[{partnerIndex:0,percentage:0},{partnerIndex:1,percentage:0}], businessObjectives:"", otherPoints:"",
    
    // Default Governance Settings
    bankAuthority: "Any Two",
    remunerationType: "Percentage",
    remunerationValue: "Working Partners",
    loansEnabled: true,
    loanInterestRate: 12,
    arbitrationCity: ""
  };
}
export function getMissing(d: LLPData): string[] {
  const m: string[] = [];
  if (!d.llpName) m.push("LLP Name");
  if (!d.executionDate) m.push("Execution Date");
  d.partners.forEach((p,i)=>{
    if (!p.fullName) m.push(`Partner ${i+1} Name`);
    if (!p.fatherName) m.push(`Partner ${i+1} Father Name`);
    if (!p.age && !p.dob) m.push(`Partner ${i+1} Age/DOB`);
    if (!p.address || fmtPartnerAddr(p.address).length < 10) m.push(`Partner ${i+1} Address`);
  });
  if (d.partners.filter(p=>p.isDesignatedPartner).length < 2) m.push("Min 2 Designated Partners");
  if (!d.totalCapital) m.push("Capital Amount");
  if (Math.abs(d.contributions.reduce((s,c)=>s+(c.percentage||0),0)-100)>0.1) m.push("Contributions (must = 100%)");
  if (Math.abs(d.profits.reduce((s,p)=>s+(p.percentage||0),0)-100)>0.1) m.push("Profit sharing (must = 100%)");
  if (!d.businessObjectives) m.push("Business Objectives");
  return m;
}
export function getPct(d: LLPData): number {
  let done=0;
  if (d.executionCity) done++;
  if (d.llpName) done++;
  if (d.executionDate) done++;
  if (d.registeredAddress?.doorNo) done++;
  if (d.partners.length > 0 && d.partners.every(p => p.fullName && p.fatherName && (p.age || p.dob))) done++;
  if (d.totalCapital>0) done++;
  if (Math.abs(d.contributions.reduce((s,c)=>s+(c.percentage||0),0)-100)<0.1) done++;
  if (Math.abs(d.profits.reduce((s,p)=>s+(p.percentage||0),0)-100)<0.1) done++;
  if (d.businessObjectives) done++;
  if (d.bankAuthority) done++;
  if (d.arbitrationCity) done++;
  if (d.otherPoints !== undefined && d.otherPoints !== "") done++;
  return Math.round(done/12*100);
}
