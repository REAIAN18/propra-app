// Wave-1 FL outreach prospect config — used by admin send-wave API and UI
// Only includes prospects with confirmed emails and to_contact status

export interface Wave1Prospect {
  prospectKey: string; // matches ProspectStatus.prospectKey
  firstName: string;
  company: string;
  email: string;
  assetCount: number;
  area: string; // used in email subject e.g. "Broward County"
}

export const WAVE1_FL_PROSPECTS: Wave1Prospect[] = [
  {
    prospectKey: "fl-sunbeam",
    firstName: "Steve",
    company: "Sunbeam Properties",
    email: "sweeks@sunbeam.com",
    assetCount: 12,
    area: "Broward County",
  },
  {
    prospectKey: "fl-easton",
    firstName: "Carlos",
    company: "Easton Group Properties",
    email: "cghitis@eastongroup.com",
    assetCount: 10,
    area: "Miami-Dade",
  },
  {
    prospectKey: "fl-butters",
    firstName: "Ron",
    company: "Butters Construction & Development",
    email: "ron@buttersconstruction.com",
    assetCount: 8,
    area: "Boca Raton",
  },
  {
    prospectKey: "fl-continental",
    firstName: "Carlos",
    company: "Continental Real Estate Companies",
    email: "ccastellano@continental-realty.com",
    assetCount: 8,
    area: "Miami-Dade / Broward",
  },
  {
    prospectKey: "fl-pebb",
    firstName: "Ian",
    company: "Pebb Enterprises",
    email: "iweiner@pebbent.com",
    assetCount: 10,
    area: "Boca Raton",
  },
  {
    prospectKey: "fl-stiles",
    firstName: "Chris",
    company: "Stiles Corporation",
    email: "chris.stiles@stiles.com",
    assetCount: 40,
    area: "Fort Lauderdale",
  },
  {
    prospectKey: "fl-flagler",
    firstName: "Tom",
    company: "Flagler Development Group",
    email: "tdixon@flagler.com",
    assetCount: 8,
    area: "Miami / Doral",
  },
  {
    prospectKey: "fl-anderson-columbia",
    firstName: "Howard",
    company: "Anderson Columbia Co.",
    email: "hfinley@andersoncolumbia.com",
    assetCount: 6,
    area: "North Florida",
  },
  {
    prospectKey: "fl-richland",
    firstName: "Jimmy",
    company: "Richland Communities",
    email: "jdunn@richlandcommunities.com",
    assetCount: 4,
    area: "Orlando",
  },
  {
    prospectKey: "fl-adler",
    firstName: "Matthew",
    company: "Adler Real Estate Partners",
    email: "madler@adler-partners.com",
    assetCount: 3,
    area: "Tampa Bay",
  },
];
