// Wave-1 SE UK outreach prospect config — used by admin send-wave API and UI
// Populate this list when PRO-265 (SE UK prospect research) delivers names/emails.

export interface Wave1SeukProspect {
  prospectKey: string; // matches ProspectStatus.prospectKey
  firstName: string;
  company: string;
  email: string;
  assetCount: number;
  area: string; // e.g. "Kent", "Surrey", "Essex"
}

export const WAVE1_SEUK_PROSPECTS: Wave1SeukProspect[] = [
  // TODO: populate once PRO-265 delivers SE UK prospect list
];
