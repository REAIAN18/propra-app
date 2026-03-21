/**
 * Wave 1 — FL outreach prospects
 * Source: sales-materials/gtm/outreach/wave-1-emails.md
 * 10 priority prospects for the FL cold outreach wave.
 *
 * email: "" means the address wasn't in the file — fill in before sending.
 */

export interface Wave1Prospect {
  prospectKey: string;
  name: string;
  firstName: string;
  email: string;
  company: string;
  market: "fl";
  /** Short area label used to personalise email subject/body */
  area: string;
  /** Estimated number of assets (used by sendColdOutreachEmail) */
  assetCount: number;
}

export const WAVE1_FL_PROSPECTS: Wave1Prospect[] = [
  {
    prospectKey: "remington-fl",
    name: "[Find via Sunbiz]",
    firstName: "[First name]",
    email: "",
    company: "Remington Properties",
    market: "fl",
    area: "Naples/Fort Myers",
    assetCount: 14,
  },
  {
    prospectKey: "buligo-fl",
    name: "Itay Goren",
    firstName: "Itay",
    email: "itay@buligocapital.com",
    company: "Buligo Capital",
    market: "fl",
    area: "Sarasota",
    assetCount: 5,
  },
  {
    prospectKey: "redfearn-fl",
    name: "Alex Redfearn",
    firstName: "Alex",
    email: "alex@redfearncapital.com",
    company: "Redfearn Capital",
    market: "fl",
    area: "Tampa",
    assetCount: 10,
  },
  {
    prospectKey: "shelbourne-fl",
    name: "Ben Schlossberg",
    firstName: "Ben",
    email: "",
    company: "Shelbourne Global Solutions",
    market: "fl",
    area: "South Florida",
    assetCount: 10,
  },
  {
    prospectKey: "tampa-batch-fl",
    name: "[Find via PA records]",
    firstName: "[First name]",
    email: "",
    company: "Tampa Bay owners",
    market: "fl",
    area: "Tampa",
    assetCount: 3,
  },
  {
    prospectKey: "miami-dade-batch-fl",
    name: "[Find via PA records]",
    firstName: "[First name]",
    email: "",
    company: "Miami-Dade owners",
    market: "fl",
    area: "Miami",
    assetCount: 3,
  },
  {
    prospectKey: "broward-batch-fl",
    name: "[Find via PA records]",
    firstName: "[First name]",
    email: "",
    company: "Broward owners",
    market: "fl",
    area: "Broward",
    assetCount: 3,
  },
  {
    prospectKey: "fort-myers-batch-fl",
    name: "[Find via PA records]",
    firstName: "[First name]",
    email: "",
    company: "Fort Myers / Lee County owners",
    market: "fl",
    area: "Fort Myers",
    assetCount: 3,
  },
  {
    prospectKey: "orlando-i4-batch-fl",
    name: "[Find via PA records]",
    firstName: "[First name]",
    email: "",
    company: "Orlando I-4 corridor owners",
    market: "fl",
    area: "Orlando",
    assetCount: 3,
  },
  {
    prospectKey: "jacksonville-boma-fl",
    name: "[Find via BOMA/PA records]",
    firstName: "[First name]",
    email: "",
    company: "Jacksonville commercial owners",
    market: "fl",
    area: "Jacksonville",
    assetCount: 3,
  },
];
