import { LLPData, numWords, fmtINR, ordinalParty, fmtPartnerAddr, fmtRegAddr, toTitleCase } from "@/types";

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

  const nm  = data.llpName?.trim() ? toTitleCase(data.llpName.trim()) : null;
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

<h3 class="sec">Admission of New Partner</h3>
<p>No Person may be introduced as a new partner without the consent of Majority partners. Such incoming partner shall give his prior consent to act as Partner of the ${LLP}.</p>

<h3 class="sec">Retirement of Partner</h3>
<ul>
<li>A retiring Partner shall receive payout for their interest calculated using CA-Certified Fair Market Value (FMV).</li>
<li>On retirement of a partner, the retiring partner shall be entitled to full payment in respect of all his rights, title and interest in the partner as herein provided.</li>
<li>Payment may be made in instalments over up to 12 months, as mutually agreed.</li>
<li>No Partner may use ${LLP} IP personally or outside the ${LLP} after exit without written approval.</li>
</ul>

<h3 class="sec">Death of a Partner</h3>
<p>If the deceased Partner's heir(s) choose not to join the ${LLP}:</p>
<ol type="a">
<li>The surviving Partner may purchase the deceased Partner's interest at FMV certified by an independent CA.</li>
<li>Heirs shall not automatically become Partners unless both Partners agree unanimously in writing.</li>
</ol>

<h3 class="sec">Transfer of Partnership Interest</h3>
<ol type="a">
<li>A Partner may not assign, transfer, mortgage, or otherwise dispose of his/her share without unanimous written consent of both Partners.</li>
<li>In case any of the Partners of the ${LLP} desires to transfer or assign his interest or shares in the ${LLP} he/she has to offer the same to the remaining partners or any other by giving 15 days prior notice to the ${LLP}.</li>
<li>The remaining Partner shall always have the Right of First Refusal (ROFR).</li>
</ol>

<h3 class="sec">Rights of Partner</h3>
<ol type="a">
<li>All the partners hereto shall have the rights, title and interest in all the assets and properties in the said ${LLP} in proportion of their Contribution.</li>
<li>Every partner has a right to have access to and to inspect and copy any books of the ${LLP}.</li>
<li>All the parties hereto shall be entitled to carry on their own, separate and independent business as hitherto they might be doing or they may hereafter do as they deem fit and proper and other partners and the ${LLP} shall have no objection thereto provided that the said partner has intimated the said fact to the ${LLP} before the start of the independent business and moreover he shall not uses the name of the ${LLP} to carry on the said business in the same or associated fields of business with similar objectives.</li>
<li>${LLP} shall have perpetual succession, death, retirement or insolvency of any partner shall not dissolve the ${LLP}.</li>
</ol>

<h3 class="sec">Duties of Partners</h3>
<ul>
<li>Every partner shall account to the limited liability partnership for any benefit derived by him without the consent of the limited liability partnership from any transaction concerning the limited liability partnership, or from any use by him of the property, name or any business connection of the limited liability partnership.</li>
<li>Every partner shall indemnify the limited liability partnership and the other existing partner for any loss caused to it by his fraud in the conduct of the business of the limited liability partnership. As every partner has his or her own duties to fulfil and work in favor of ${LLP}.</li>
<li>Each partner shall render true accounts and full information of all things affecting the limited liability partnership to any partner or his legal representatives.</li>
</ul>
<p>No partner shall without the written consent of the ${LLP}, --</p>
<ol type="a">
<li>Employ any money, goods or effects of the ${LLP} or pledge the credit thereof except in the ordinary course of business and upon the account or for the benefit of the ${LLP}.</li>
<li>Lend money or give credit and take money or take loans or advances on behalf of the ${LLP} or to have any dealings with any persons, company or firm whom the other partner previously in writing have forbidden it to trust or deal with. Any loss incurred through any breach of provisions shall be made good with the ${LLP} by the partner incurring the same.</li>
<li>Enter into any bond or becomes surety or security with or for any person or do knowingly cause or suffer to be done anything whereby the ${LLP} property or any part thereof may be seized.</li>
<li>Assign, mortgage or charge his or her share in the ${LLP} or any asset or property thereof or make any other person a partner therein.</li>
<li>Compromise or compound or (except upon payment in full) release or discharge any debt due to the ${LLP} except upon the written consent given by the other partner.</li>
</ol>

<h3 class="sec">Meeting</h3>
<p>All the matters related to the ${LLP} as mentioned in schedule II to this agreement shall be decided by all the continuing partners.</p>
<p>The meeting of the Partners may be called by sending 15 days prior notice to all the partners at their residential address or by mail at the Email ids provided by the individual Partners in written to the ${LLP}. In case any partner is a foreign resident the meeting may be conducted by serving 15 days prior notice through email. Provided the meeting can be called at shorter notice, if majority of the partners agree in writing to the same either before or after the meeting.</p>
<p>The meeting of Partners shall ordinarily be held at the registered office of the ${LLP} or at any other place as per the convenience of partners.</p>
<p>With the written Consent of all the partners, a meeting of the Partners may be conducted through Teleconferencing.</p>
<p>Limited Liability Partnership shall ensure that every decision taken by it are recorded in the minutes within 30 days of taking such decisions and are kept and maintained at the registered office of the ${LLP}.</p>
<p>Each partner shall--</p>
<ol type="a">
<li>Punctually pay and discharge the separate debts and engagement and indemnify the other partners and the ${LLP} assets against the same and all proceedings, costs, claims and demands in respect thereof.</li>
<li>Each of the partners shall give time and attention as may be required for the fulfillment of the objectives of the ${LLP} business and they all shall be working partners.</li>
</ol>

<h3 class="sec">Duties of Designated Partner</h3>
<ul>
<li>The Authorised representative of First &amp; Second shall act as the Designated Partner of the ${LLP} in terms of the requirement of the Limited Liability Partnership Act, 2008.</li>
<li>The Designated Partners shall be responsible for the doing of all acts, matters and things as are required to be done by the limited liability partnership in respect of compliance of the provisions of this Act including filing of any document, return, statement and the like report pursuant to the provisions of Limited Liability Partnership Act, 2008.</li>
<li>The Designated Partners shall be responsible for the doing of all acts arising out of this agreement.</li>
<li>The ${LLP} shall pay such remuneration to the Designated Partner as may be decided by the majority of the Partners, for rendering his services as such.</li>
<li>The ${LLP} shall indemnify and defend its partners and other officers from and against any and all liability in connection with claims, actions and proceedings (regardless of the outcome), judgment, loss or settlement thereof, whether civil or criminal, arising out of or resulting from their respective performances as partners and officers of ${LLP}, except for the gross negligence or willful misconduct of the partner or officer seeking indemnification.</li>
</ul>

<h3 class="sec">Partners, Management &amp; Authority</h3>
<p>The Limited Liability Partnership shall have ${ff(partnerNm,"[Partner Names]")} as its Partners, whose names and details are set out in this Agreement and the records of the LLP.</p>
<p>It is hereby expressly agreed that ${ff(mgNames,"[Managing Partner Name(s)]")} shall be the Managing Partner of ${LLP} and shall have the primary responsibility and authority for the day-to-day operations, administration, and management of the business and affairs of the LLP.</p>
${powers}

<h3 class="sec">Cessation of existing Partners</h3>
<ul>
<li>Partner may cease to be partner of the ${LLP} by giving a notice in writing of not less than 30 days (Thirty days) to the other partners of his intention to resign as partner and A Designated Partner shall remain liable to discharge all duties, responsibilities, and obligations incurred or arising during his/her tenure as a Designated Partner, notwithstanding the cessation of such position. Such liabilities shall continue until duly fulfilled in accordance with the provisions of the Limited Liability Partnership Act, 2008 and the LLP Agreement.</li>
<li>No majority of Partners can expel any partner except in the situation where any partner has been found guilty of carrying out the activity/business of ${LLP} with fraudulent purpose.</li>
<li>The ${LLP} can be wound up with the consent of all the partners subject to the provisions of Limited Liability Partnership Act 2008.</li>
</ul>

<h3 class="sec">Extent of Liability of ${LLP}</h3>
<p>${LLP} is not bound by anything done by a partner in dealing with a person if—</p>
<ol type="a">
<li>the partner in fact has no authority to act for the ${LLP} in doing a particular act; and</li>
<li>the person knows that he has no authority or does not know or believe him to be a partner of the ${LLP}.</li>
</ol>

<h3 class="sec">Miscellaneous Provisions</h3>
<p>The limited liability partnership shall indemnify each partner in respect of payments made and personal liabilities incurred by him -</p>
<ol type="a">
<li>In the ordinary and proper conduct of the business of the limited liability partnership; or</li>
<li>In or about anything necessarily done for the preservation of the business or property of the limited liability partnership.</li>
</ol>
<ul>
<li>The books of accounts of the firm shall be kept at the registered office of the ${LLP} for the reference of all the partners.</li>
    <li>The accounting year of the ${LLP} shall be from 1st April of the year to 31st March of subsequent year. The first accounting year shall be from the date of commencement of this ${LLP} till 31st March of the subsequent year.</li>
    <li>It is expressly agreed that the bank account of the ${LLP} shall be operated by <strong>${ff(data.bankAuthority, "Any Two Partners Jointly")}</strong> who are engaged in the day-to-day activities of the regular business.</li>
    <li>All disputes between the partners or between the Partner and the ${LLP} arising out of the limited liability partnership agreement which cannot be resolved in terms of this agreement shall be referred for arbitration as per the provisions of the Arbitration and Conciliation Act, 1996 (26 of 1996) and the venue of arbitration shall be <strong>${ff(data.arbitrationCity || data.registeredAddress?.district, "[City]")}</strong>.</li>
  </ul>

<h3 class="sec">Remuneration</h3>
<p>${data.remunerationType === "None" 
  ? "No remuneration shall be paid to any of the partners for their services rendered to the LLP." 
  : `The ${LLP} shall pay remuneration to ${ff(data.remunerationValue || "the Designated Partners", "the Partners")} as ${data.remunerationType === "Percentage" ? "a percentage of profits" : "a fixed monthly amount"}, subject to the limits specified under Section 40(b) of the Income Tax Act.`
}</p>

${data.loansEnabled ? `
<h3 class="sec">Loans from LLP to Partners</h3>
<p>The LLP may extend loans to Partners at an interest rate of <strong>${data.loanInterestRate || 6}%</strong> per annum.</p>
<ul>
<li>Must be approved in writing by both Partners.</li>
<li>Repayment schedule must be documented.</li>
<li>Reflected properly in LLP accounts.</li>
<li>Partners may not take interest-free loans unless unanimously approved.</li>
</ul>

<h3 class="sec">Loans to LLP from Partners</h3>
<p>Partners may lend money to the LLP at <strong>${data.loanInterestRate || 12}%</strong> per annum, or any mutually agreed rate.</p>
<ul>
<li>Interest shall be tax-deductible as per Section 40(b).</li>
<li>Loan does NOT alter profit-sharing ratio.</li>
<li>Repayment of Partner loans has priority over profit withdrawals.</li>
</ul>
` : `
<h3 class="sec">Loans</h3>
<p>No loans shall be extended from the LLP to any partners, and any loans brought into the LLP by partners shall be subject to a separate written agreement and the mutual consent of all partners.</p>
`}

${data.otherPoints !== "" ? `
<h3 class="sec">Any other Points</h3>
<div class="indent-block"><p>${ffMulti(others, "[Any other Points]")}</p></div>
` : ""}
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
</div>

<div class="page-break"></div>
<h3 class="sched-title">SCHEDULE 1</h3>
<p class="center" style="font-size: 13pt;"><strong>ANCILLARY OR OTHER BUSINESS CARRIED OVER BY THE ${nm?(pv?`<span class="filled">${esc(nm)}</span>`:`${esc(nm)}`):(pv?`<span class="empty">[NAME OF THE LLP]</span>`:"[NAME OF THE LLP]")}</strong></p>

<p><strong>The Business Incidental Or Ancillary To The Attainment Of The Main Business Are:</strong></p>
<p>To achieve its main business, the LLP will undertake ancillary works including the acquisition of specialized manufacturing infrastructure and extrusion machinery, the maintenance of climate-controlled warehousing, the procurement of mandatory FSSAI and BIS certifications, the establishment of R&amp;D laboratories to secure patents and proprietary formulations, the management of industrial financing and bank guarantees for government tendering, the operation of domestic and international logistics networks for import and export, and the formation of strategic joint ventures and technical collaborations to enhance nutritional food security.</p>

<div class="page-break"></div>
<h3 class="sched-title">SCHEDULE 2</h3>
<p>Matters To Be Decided By A Resolution Passed By A Majority In Share Holding Of The Partners:</p>
<ol type="a">
<li>Change in Registered office Address</li>
<li>Admission of New Partner</li>
<li>Removal of existing partner</li>
<li>Change in Bank Account Operations</li>
</ol>
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
