import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from "docx";
import { LLPData, numWords, fmtINR, ordinalParty, fmtPartnerAddr, fmtRegAddr } from "@/types";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req);
  if (authError) return authError;

  try {
    const data: LLPData = await req.json();
    const buf = await buildDocx(data);
    const name = (data.llpName || "draft").replace(/\s+/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="LLP_Agreement_${name}.docx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function buildDocx(d: LLPData): Promise<Buffer> {
  const nm = d.llpName || "[NAME OF LLP]";
  const tnr = (t: string, o: Record<string,unknown>={}) => new TextRun({ text:t, font:"Times New Roman", size:24, ...o });
  const P   = (t: string) => new Paragraph({ spacing:{after:140}, alignment:AlignmentType.JUSTIFIED, children:[tnr(t)] });
  const PB  = (t: string) => new Paragraph({ spacing:{after:140}, alignment:AlignmentType.JUSTIFIED, children:[tnr(t,{bold:true})] });
  const SEC = (t: string) => new Paragraph({ spacing:{after:120,before:160}, children:[tnr(t,{bold:true,underline:{type:UnderlineType.SINGLE}})] });
  const CTR = (t: string, bold=false, sz=24) => new Paragraph({ spacing:{after:160}, alignment:AlignmentType.CENTER, children:[tnr(t,{bold,size:sz})] });
  const BR  = () => new Paragraph({ spacing:{after:80}, children:[tnr("")] });

  const partnerParas: Paragraph[] = [];
  for (let i=0; i<d.numPartners; i++) {
    const p = d.partners[i];
    const lbl = ordinalParty(i).toUpperCase();
    const end = i < d.numPartners-1 ? " ," : ".";
    partnerParas.push(P(p?.fullName
      ? `${p.salutation} ${p.fullName}, ${p.relationDescriptor} ${p.fatherSalutation} ${p.fatherName}, aged about ${p.age} Years, residing at ${fmtPartnerAddr(p.address)}, which expression shall unless it be repugnant to the subject or context thereof, include their legal heirs, successors, nominees and permitted assignees and hereinafter called the ${lbl}${end}`
      : `[Designated Partner ${i+1}], hereinafter called the ${lbl}${end}`
    ), BR());
  }

  const whereParas = d.partners.map((p,i) => {
    const isDP = p?.isDesignatedPartner;
    const name = p?.fullName ? `${p.salutation} ${p.fullName}` : `[Partner ${i+1}]`;
    return isDP
      ? P(`WHEREAS the ${ordinalParty(i)} is ${name} who is a Designated Partner.`)
      : P(`WHEREAS the ${ordinalParty(i)} is ${name} who is a Partner.`);
  });

  const contribParas = d.contributions.map((c,i) => {
    const lbl = ordinalParty(i);
    return c?.percentage&&c?.amount
      ? P(`${lbl}  ${c.percentage}.0%  i.e., Rs. ${fmtINR(c.amount)}/- (Rupees ${numWords(c.amount)} only)`)
      : P(`${lbl}  X.0%  i.e., Rs. X/-`);
  });

  const profitParas = d.profits.map((pr,i) =>
    P(`${ordinalParty(i)}:   ${pr?.percentage?pr.percentage+"%":"X%"}`)
  );

  const mgNames = d.partners.filter(p=>p.isManagingPartner&&p.fullName).map(p=>`${p.salutation} ${p.fullName}`).join(" and ")||"[Managing Partner]";
  const powerParas: Paragraph[] = [];
  const mgList = d.partners.filter(p=>p.isManagingPartner&&p.fullName);
  if (!mgList.length && d.partners[0]) mgList.push(d.partners[0]);
  for (const mp of mgList) {
    const pn = mp?.fullName?`${mp.salutation} ${mp.fullName}`:"[Managing Partner]";
    powerParas.push(SEC(`Powers of ${pn}`), P(`${pn} shall be authorised, on behalf of the LLP, to:`),
      P("Manage and supervise business operations;"), P("Enter into contracts, agreements, and arrangements in the ordinary course of business;"),
      P("Operate and manage bank accounts of the LLP;"), P("Represent the LLP before banks, government authorities, statutory bodies, clients, vendors, and third parties;"),
      P("Incur routine business expenses and take operational decisions necessary for the conduct of the LLP's business."), BR(),
      P(`All acts done by ${pn} in the ordinary course of business and within the scope of authority granted under this Agreement shall be deemed to be acts of the LLP and shall be binding on the LLP and all Partners.`), BR());
  }

  const tc     = d.totalCapital||0;
  const tcStr  = tc>0?`Rs. ${fmtINR(tc)}/- (Rupees ${numWords(tc)} only)`:"Rs. X/- (Rupees X only)";
  const reg    = d.registeredAddress?.doorNo?fmtRegAddr(d.registeredAddress):"[Registered Address]";
  const pList  = d.partners.filter(p=>p.fullName).map(p=>`${p.salutation} ${p.fullName}`).join(" and ")||"[Partner Names]";
  const biz    = d.businessObjectives||"[Business Objectives]";
  const others = d.otherPoints&&d.otherPoints.toLowerCase()!=="none"?d.otherPoints:" ";
  const pRef   = Array.from({length:d.numPartners},(_,i)=>ordinalParty(i).toUpperCase()).join(", ");

  const doc = new Document({ sections:[{ properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1260,bottom:1440,left:1800}}},
    children:[
      CTR("LLP AGREEMENT",true,28), CTR("(As per Section 23(4) of LLP Act, 2008)",false,20), BR(),
      P(`THIS Agreement of LLP made at ${d.executionCity||"Hyderabad"} on ${d.executionDate||"[Date of Execution of LLP]"} , by and between`), BR(),
      ...partnerParas.flat(),
      new Paragraph({spacing:{after:140},alignment:AlignmentType.JUSTIFIED,children:[tnr(`(${pRef} SHALL BE COLLECTIVELY REFERRED TO AS PARTNERS)`,{bold:true})]}),
      BR(), ...whereParas, BR(),
      P("NOW The parties hereto are interested in forming a Limited Liability Partnership under the Limited Liability Partnership Act 2008 and that they intend to write down the terms and conditions of the said formation and"), BR(),
      PB("IT IS HEREBY AGREED BY AND BETWEEN THE PARTIES HERETO AS FOLLOWS:"), BR(),
      P(`A Limited Liability Partnership shall be carried on in the name and style of M/s. ${nm}.`), BR(),
      P(`The M/s. ${nm} shall have its registered office at ${reg}, and/or at such other place or places, as shall be agreed to by the majority of the partners from time to time.`), BR(),
      P(`The Contribution of the Initial Partners shall be ${tcStr} which shall be contributed by the partners in the following proportions.`), BR(),
      ...contribParas, BR(),
      SEC("Profit & Loss Sharing Ratio Clause"), P("The profit sharing ratio between the Designated Partners shall initially be as follows:"), BR(),
      ...profitParas, BR(),
      P("This ratio is provisional and may be altered at any time in the future, subject to mutual consent and a written agreement executed by both the Designated Partners. The above-mentioned profit sharing ratio shall not be deemed final and conclusive."), BR(),
      P(`Further Contribution if any required by the M/S. ${nm} shall be brought by the partners through mutual consent between the partners.`),
      P(`The M/S. ${nm} shall have a common seal to be affixed on documents as defined by partners under the signature of any of the Designated Partners.`),
      P(`All the Partners are entitled to share profit and losses in the ratio of their respective contribution in M/S. ${nm}.`),
      P(`The business of the M/S. ${nm} shall be of`), BR(), P("The Partnership shall carry on the business of:"), BR(), P(biz), BR(),
      SEC("Admission of New Partner"), P(`No Person may be introduced as a new partner without the consent of Majority partners. Such incoming partner shall give his prior consent to act as Partner of the M/S. ${nm}.`), BR(),
      SEC("Retirement of Partner"), P("A retiring Partner shall receive payout for their interest calculated using CA-Certified Fair Market Value (FMV)."), P("Payment may be made in instalments over up to 12 months, as mutually agreed."), P(`No Partner may use M/S. ${nm} IP personally or outside the M/S. ${nm} after exit without written approval.`), BR(),
      SEC("Death of a Partner"), P(`If the deceased Partner's heir(s) choose not to join the M/S. ${nm}:`), P("The surviving Partner may purchase the deceased Partner's interest at FMV certified by an independent CA."), P("Heirs shall not automatically become Partners unless all Partners agree unanimously in writing."), BR(),
      SEC("Transfer of Partnership Interest"), P("A Partner may not assign, transfer, mortgage, or otherwise dispose of his/her share without unanimous written consent of all Partners."), P(`In case any of the Partners of the M/S. ${nm} desires to transfer or assign his interest or shares in the M/S. ${nm} he/she has to offer the same to the remaining partners or any other by giving 15 days prior notice to the M/S. ${nm}.`), P("The remaining Partner shall always have the Right of First Refusal (ROFR)."), BR(),
      SEC("Rights of Partner"), P(`All the partners hereto shall have the rights, title and interest in all the assets and properties in the said M/S. ${nm} in proportion of their Contribution.`), P(`M/S. ${nm} shall have perpetual succession, death, retirement or insolvency of any partner shall not dissolve the M/S. ${nm}.`), BR(),
      SEC("Duties of Partners"), P("Every partner shall account to the limited liability partnership for any benefit derived by him without the consent of the limited liability partnership from any transaction concerning the limited liability partnership."), P(`Every partner shall indemnify the limited liability partnership and the other existing partner for any loss caused to it by his fraud. As every partner has his or her own duties to fulfil and work in favor of M/S. ${nm}.`), BR(),
      SEC("Meeting"), P(`The meeting of the Partners may be called by sending 15 days prior notice to all the partners at their residential address or by mail at the Email ids provided by the individual Partners in written to the M/S. ${nm}.`), P("With the written Consent of all the partners, a meeting of the Partners may be conducted through Teleconferencing."), BR(),
      SEC("Duties of Designated Partner"), P(`The Authorised representatives shall act as the Designated Partners of the M/S. ${nm} in terms of the requirement of the Limited Liability Partnership Act, 2008.`), P("The Designated Partners shall be responsible for the doing of all acts, matters and things as are required to be done by the limited liability partnership in respect of compliance of the provisions of this Act."), BR(),
      SEC("Partners, Management & Authority"), P(`The Limited Liability Partnership shall have ${pList} as its Partners, whose names and details are set out in this Agreement and the records of the LLP.`), P(`It is hereby expressly agreed that ${mgNames} shall be the Managing Partner of M/S. ${nm} and shall have the primary responsibility and authority for the day-to-day operations.`), BR(),
      ...powerParas,
      SEC("Cessation of existing Partners"), P(`Partner may cease to be partner of the M/S. ${nm} by giving a notice in writing of not less than 30 days(Thirty days) to the other partners of his intention to resign as partner.`), P(`The M/S. ${nm} can be wound up with the consent of all the partners subject to the provisions of Limited Liability Partnership Act 2008.`), BR(),
      SEC(`Extent of Liability of M/S. ${nm}`), P(`M/S. ${nm} is not bound by anything done by a partner in dealing with a person if the partner in fact has no authority to act for the M/S. ${nm} in doing a particular act.`), BR(),
      SEC("Miscellaneous Provisions"), P(`The accounting year of the M/S. ${nm} shall be from 1st April of the year to 31st March of subsequent year.`), P(`It is expressly agreed that the bank account of the M/S. ${nm} shall be operated by ${d.bankAuthority || "Any Two"} Partners who are engaged in the day-to-day activities of the regular business.`), P(`All disputes between the partners or between the Partner and the M/S. ${nm} arising out of the limited liability partnership agreement shall be referred for arbitration as per the provisions of the Arbitration and Conciliation Act, 1996 and the venue of arbitration shall be ${d.arbitrationCity || d.registeredAddress?.district || "[City]"}.`), BR(),
      SEC("Remuneration"), P(d.remunerationType === "None"
        ? "No remuneration shall be paid to any of the partners for their services rendered to the LLP."
        : `The M/S. ${nm} shall pay remuneration to ${d.remunerationValue || "the Designated Partners"} as ${d.remunerationType === "Percentage" ? "a percentage of profits" : "a fixed monthly amount"}, subject to the limits specified under Section 40(b) of the Income Tax Act.`
      ), BR(),
      ...(d.loansEnabled !== false ? [
        SEC("Loans from LLP to Partners"), P(`The LLP may extend loans to Partners at an interest rate of ${d.loanInterestRate || 6}% per annum. Must be approved in writing by all Partners. Partners may not take interest-free loans unless unanimously approved.`), BR(),
        SEC("Loans to LLP from Partners"), P(`Partners may lend money to the LLP at ${d.loanInterestRate || 12}% per annum, or any mutually agreed rate. Loan does NOT alter profit-sharing ratio.`), BR(),
      ] : [
        SEC("Loans"), P("No loans shall be extended from the LLP to any partners, and any loans brought into the LLP by partners shall be subject to a separate written agreement and the mutual consent of all partners."), BR(),
      ]),
      SEC("Any other Points"), P(others), BR(), BR(),
      P("IN WITNESS WHEREOF the parties have put their respective hands the day and year    first here in above Written, Signed and Delivered by the For and on behalf of"), BR(),
      CTR(`M/S. ${nm}`,true,24), BR(), BR(), BR(),
      new Paragraph({spacing:{after:80},children:[tnr("(Designated Partner)\t\t\t\t\t\t\t(Designated Partner)")]}),
      BR(), BR(), PB("Witness:"), BR(), P("Name\t\t:"), P("Address\t:"), P("Signature\t:"), BR(), P("Name\t\t:"), P("Address\t:"), P("Signature\t:"),
      BR(), BR(), new Paragraph({ text: "SCHEDULE 1", heading: "Heading1", alignment: AlignmentType.CENTER, pageBreakBefore: true, spacing: { after: 200 } }),
      CTR(`ANCILLARY OR OTHER BUSINESS CARRIED OVER BY THE M/S. ${nm}`,true,20), BR(),
      PB("The  Business Incidental Or Ancillary  To The Attainment Of The Main Business Are:"), BR(),
      P(biz 
        ? "To achieve its main business, the LLP will undertake all ancillary works incidental to and necessary for the attainment of the above-mentioned objects, including but not limited to: the acquisition of necessary infrastructure, equipment, and technology; the procurement of all requisite licences, certifications, and regulatory approvals; the establishment and maintenance of offices, warehouses, and operational facilities; the management of financing, bank accounts, and government tenders; the operation of domestic and international logistics and supply chain networks; and the formation of strategic partnerships, joint ventures, and technical collaborations as may be required."
        : "[Ancillary business details will be generated based on the business objectives entered above.]"
      ),
      BR(), BR(), new Paragraph({ text: "SCHEDULE 2", heading: "Heading1", alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
      P("Matters To Be Decided By A Resolution Passed By A Majority In Share Holding Of The Partners:"), BR(),
      P("Change in Registered office Address"), P("Admission of New Partner"), P("Removal of existing partner"), P("Change in Bank Account Operations"),
    ]}]});

  return Buffer.from(await Packer.toBuffer(doc));
}
