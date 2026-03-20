import { LLPData, numWords, fmtINR, ordinalParty, fmtPartnerAddr, fmtRegAddr } from "@/types";

function esc(s: string) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function f(val: string|number|null|undefined, ph: string, preview: boolean) {
  const s = val != null && String(val).trim() ? String(val).trim() : null;
  return preview
    ? s ? `<span class="filled">${esc(s)}</span>` : `<span class="empty">${esc(ph)}</span>`
    : esc(s ?? ph);
}

export function renderDeed(data: LLPData, mode: "preview"|"print"): string {
  const pv = mode === "preview";
  const ff = (v: string|number|null|undefined, ph: string) => f(v, ph, pv);
  const ffMulti = (v: string|number|null|undefined, ph: string) => {
    const s = v != null && String(v).trim() ? String(v).trim() : null;
    if (pv) return s ? `<span class="filled">${esc(s).replace(/\n/g, "<br/>")}</span>` : `<span class="empty">${esc(ph)}</span>`;
    return s ? esc(s).replace(/\n/g, "<br/>") : esc(ph);
  };

  const nm  = data.llpName?.trim() || null;
  const LLP = nm
    ? (pv ? `<span class="filled">M/S. ${esc(nm)}</span>` : `M/S. ${esc(nm)}`)
    : (pv ? `<span class="empty">M/S. [NAME OF THE LLP]</span>` : "M/S. [NAME OF THE LLP]");

  // Partner intro paragraphs
  let partnerIntros = "";
  for (let i = 0; i < data.numPartners; i++) {
    const p   = data.partners[i];
    const lbl = ordinalParty(i).toUpperCase();
    const end = i < data.numPartners - 1 ? " ," : ".";
    if (p?.fullName) {
      partnerIntros += `<p>${ff(`${p.salutation} ${p.fullName}`, `[Partner ${i+1}]`)}, ${esc(p.relationDescriptor)} ${ff(`${p.fatherSalutation} ${p.fatherName}`,"[Father Name]")}, aged about ${ff(p.age,"[Age]")} Years, residing at ${ff(fmtPartnerAddr(p.address),"[Residential Address]")}, which expression shall unless it be repugnant to the subject or context thereof, include their legal heirs, successors, nominees and permitted assignees and hereinafter called the <strong>${lbl}</strong>${end}</p>\n`;
    } else {
      partnerIntros += `<p>${pv?`<span class="empty">[Designated Partner ${i+1}]</span>`:`[Designated Partner ${i+1}]`}, hereinafter called the <strong>${lbl}</strong>${end}</p>\n`;
    }
  }

  // WHEREAS
  let whereas = "";
  for (let i = 0; i < data.numPartners; i++) {
    const p = data.partners[i];
    if (p && p.isDesignatedPartner) {
      whereas += `<p>WHEREAS the ${ordinalParty(i)} is ${ff(p.fullName?`${p.salutation} ${p.fullName}`:null,`[Partner ${i+1} Name]`)} who is a Designated Partner.</p>\n`;
    }
  }

  const partyRef = Array.from({length:data.numPartners},(_,i)=>ordinalParty(i).toUpperCase()).join(", ");

  // Contributions
  const tc = data.totalCapital||0;
  let contribLines = "";
  for (let i = 0; i < data.numPartners; i++) {
    const c = data.contributions[i];
    const lbl = ordinalParty(i);
    const v = c?.percentage&&c?.amount ? `${c.percentage}.0%  i.e., Rs. ${fmtINR(c.amount)}/- (Rupees ${numWords(c.amount)} only)` : null;
    contribLines += `<p><strong>${lbl}</strong> &nbsp;${ff(v,"X.0%  i.e., Rs. X/- (Rupees X only)")}</p>\n`;
  }

  // Profits
  let profitLines = "";
  for (let i = 0; i < data.numPartners; i++) {
    const pr = data.profits[i];
    profitLines += `<p>${ordinalParty(i)}: &nbsp;&nbsp; ${ff(pr?.percentage?`${pr.percentage}%`:null,"X%")}</p>\n`;
  }

  // Managing partners
  const mgList  = data.partners.filter(p=>p.isManagingPartner&&p.fullName);
  const mgNames = mgList.length ? mgList.map(p=>`${p.salutation} ${p.fullName}`).join(" and ") : null;

  // Powers sections
  let powers = "";
  const forPowers = mgList.length ? mgList : (data.partners[0]?[data.partners[0]]:[]);
  for (const mp of forPowers) {
    const pn = mp?.fullName
      ? (pv?`<span class="filled">${esc(`${mp.salutation} ${mp.fullName}`)}</span>`:esc(`${mp.salutation} ${mp.fullName}`))
      : (pv?`<span class="empty">[Managing Partner]</span>`:"[Managing Partner]");
    powers += `<h4 class="sub-sec">Powers of ${pn}</h4>
<p>${pn} shall be authorised, on behalf of the LLP, to:</p>
<ol type="a">
<li>Manage and supervise business operations;</li>
<li>Enter into contracts, agreements, and arrangements in the ordinary course of business;</li>
<li>Operate and manage bank accounts of the LLP;</li>
<li>Represent the LLP before banks, government authorities, statutory bodies, clients, vendors, and third parties;</li>
<li>Incur routine business expenses and take operational decisions necessary for the conduct of the LLP's business.</li>
</ol>
<p>All acts done by ${pn} in the ordinary course of business and within the scope of authority granted under this Agreement shall be deemed to be acts of the LLP and shall be binding on the LLP and all Partners.</p>\n`;
  }

  // Sig blocks
  let sigs = "";
  for (let i = 0; i < data.numPartners; i++) {
    const p = data.partners[i];
    const n = p?.fullName ? `${p.salutation} ${p.fullName}` : `[Partner ${i+1}]`;
    sigs += `<div class="sig-block">${pv&&p?.fullName?`<span class="filled">${esc(n)}</span>`:esc(n)}<br/><br/><small>(Designated Partner)</small></div>`;
  }

  const regAddr   = data.registeredAddress?.doorNo ? fmtRegAddr(data.registeredAddress) : null;
  const partnerNm = data.partners.filter(p=>p.fullName).map(p=>`${p.salutation} ${p.fullName}`).join(" and ")||null;
  const biz       = data.businessObjectives?.trim()||null;
  const others    = data.otherPoints&&data.otherPoints.toLowerCase()!=="none"?data.otherPoints:null;
  const tcStr     = tc>0?`${fmtINR(tc)} /- (Rupees ${numWords(tc)} only)`:null;

  return `
<div class="deed-title">LLP AGREEMENT</div>
<div class="deed-sub">(As per Section 23(4) of LLP Act, 2008)</div>

<p>THIS Agreement of LLP made at <strong>${ff(data.executionCity,"[Place]")}</strong> on <strong>${ff(data.executionDate,"[Date of Execution of LLP]")}</strong>, by and between</p>

${partnerIntros}

<p class="center"><strong>(${esc(partyRef)} SHALL BE COLLECTIVELY REFERRED TO AS PARTNERS)</strong></p>

${whereas}

<p>NOW The First &amp; Second parties are interested in forming a Limited Liability Partnership under the Limited Liability Partnership Act 2008 and that they intend to write down the terms and conditions of the said formation and</p>

<p><strong>IT IS HEREBY AGREED BY AND BETWEEN THE PARTIES HERETO AS FOLLOWS:</strong></p>

<p>A Limited Liability Partnership shall be carried on in the name and style of ${LLP}.</p>

<p>The ${LLP} shall have its registered office at ${ff(regAddr,"[Registered Address of LLP]")}, and/or at such other place or places, as shall be agreed to by the majority of the partners from time to time.</p>

<p>The Contribution of the Initial Partners shall be Rs. ${ff(tcStr,"X /- (Rupees One Lakhs only)")} which shall be contributed by the partners in the following proportions.</p>

<div class="indent-block">${contribLines}</div>

<h3 class="sec">Profit &amp; Loss Sharing Ratio Clause</h3>
<p>The profit sharing ratio between the Designated Partners shall initially be as follows:</p>

<div class="indent-block">${profitLines}</div>

<p>This ratio is provisional and may be altered at any time in the future, subject to mutual consent and a written agreement executed by the Partners. The above-mentioned profit sharing ratio shall not be deemed final and conclusive.</p>

<p>Further Contribution if any required by the ${LLP} shall be brought by the partners through mutual consent between the partners.</p>

<p>The ${LLP} shall have a common seal to be affixed on documents as defined by partners under the signature of any of the Designated Partners.</p>

<p>All the Partners are entitled to share profit and losses in the ratio of their respective contribution in ${LLP}.</p>

<p>The business of the ${LLP} shall be of.</p>

<p>The Partnership shall carry on the business of:</p>
<div class="indent-block"><p>${ffMulti(biz,"[Business Description / Objectives]")}</p></div>

${(data.otherPoints === "" || (data.otherPoints == null && !pv)) ? "" : `
<h3 class="sec">Any other Points</h3>
<div class="indent-block"><p>${ffMulti(others, "[Any other Points]")}</p></div>
`}
<p>IN WITNESS WHEREOF the parties have put their respective hands the day and year first here in above Written, Signed and Delivered by the For and on behalf of</p>

<p class="center" style="margin-top: 30px;"><strong>${nm?(pv?`<span class="filled">${esc(nm)}</span>`:`${esc(nm)}`):(pv?`<span class="empty">[NAME OF THE LLP]</span>`:"[NAME OF THE LLP]")}</strong></p>

<div class="sig-row">${sigs}</div>

<div class="witness-block">
<strong>Witness:</strong><br/>
Name &nbsp;&nbsp;&nbsp;&nbsp;:<br/>
Address &nbsp;:<br/>
Signature :<br/><br/>
Name &nbsp;&nbsp;&nbsp;&nbsp;:<br/>
Address &nbsp;:<br/>
Signature :
  `;
}

export const PRINT_CSS = `
body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #000; padding: 120px 48px 32px; }
.deed-title { text-align: center; font-size: 16pt; font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
.deed-sub { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 25px; }
p { margin-bottom: 12px; text-align: justify; }
.sec { font-size: 13pt; font-weight: bold; text-decoration: underline; display: block; margin-top: 24px; margin-bottom: 12px; }
.sub-sec { font-size: 12pt; font-weight: bold; text-decoration: underline; display: block; margin-top: 16px; margin-bottom: 10px; }
.sched-title { text-align: center; font-size: 15pt; font-weight: bold; text-decoration: underline; margin: 30px 0 15px; }
.center { text-align: center; }
.indent-block { margin-left: 30px; margin-bottom: 15px; }
ul, ol { margin-top: 5px; margin-bottom: 15px; padding-left: 35px; text-align: justify; }
li { margin-bottom: 8px; }
.sig-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-top: 50px; }
.sig-block { text-align: center; font-size: 11pt; font-weight: bold; }
.witness-block { margin-top: 40px; font-size: 11pt; line-height: 2.2; }
.page-break { break-before: page; page-break-before: always; height: 0; margin: 0; border: none; }
@media print {
  @page { size: portrait; margin: 25mm 20mm; }
  body { padding: 0; }
  .page-break { display: block; height: 0; page-break-before: always; }
}
`;
