/**
 * src/lib/nda-template.ts
 * Standard 3-clause mutual NDA for RealHQ transaction rooms.
 */

export interface NDAParties {
  ownerName: string;
  counterpartyName: string;
  propertyAddress: string;
  date: string; // "1 April 2026"
}

export function renderNDAText(parties: NDAParties): string {
  return `MUTUAL NON-DISCLOSURE AGREEMENT

Date: ${parties.date}

Parties:
1. ${parties.ownerName} ("Disclosing Party")
2. ${parties.counterpartyName} ("Receiving Party")

Property: ${parties.propertyAddress}

1. CONFIDENTIALITY OBLIGATION
The Receiving Party agrees to keep confidential all information disclosed by the Disclosing Party in connection with the Property ("Confidential Information"), including but not limited to financial data, tenancy schedules, valuations, surveys, title documents, and any other information marked or reasonably understood to be confidential. The Receiving Party shall not disclose Confidential Information to any third party without prior written consent, except to professional advisers who are themselves bound by equivalent confidentiality obligations.

2. USE RESTRICTION
The Receiving Party agrees to use Confidential Information solely for the purpose of evaluating a potential transaction relating to the Property. No Confidential Information shall be used for any other commercial purpose, shared with competitors, or reproduced in any form except as necessary for internal evaluation.

3. RETURN OR DESTRUCTION
Upon written request by the Disclosing Party, or upon conclusion of negotiations without a transaction, the Receiving Party shall promptly return or destroy all Confidential Information (including copies in any medium) and confirm such return or destruction in writing.

GOVERNING LAW
This Agreement is governed by the laws of England and Wales. Any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.

By accepting this NDA electronically or in writing, both parties agree to be bound by its terms.
`;
}
