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
export function toTitleCase(s: string) {
  if (!s) return "";
  return s.toLowerCase().split(' ').map(w => w === "llp" ? "LLP" : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
    fatherName:"", age:"", address:{doorNo:"",area:"",city:"",district:"",state:"",pin:""},
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
    if (!p.age) m.push(`Partner ${i+1} Age`);
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
  if (d.partners.length > 0 && d.partners.every(p => p.fullName && p.fatherName && p.age)) done++;
  if (d.totalCapital>0) done++;
  if (Math.abs(d.contributions.reduce((s,c)=>s+(c.percentage||0),0)-100)<0.1) done++;
  if (Math.abs(d.profits.reduce((s,p)=>s+(p.percentage||0),0)-100)<0.1) done++;
  if (d.businessObjectives) done++;
  if (d.bankAuthority) done++;
  if (d.arbitrationCity) done++;
  if (d.otherPoints !== undefined) done++;
  return Math.round(done/12*100);
}
