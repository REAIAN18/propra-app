-- Make name and company optional on SignupLead (email-only signup)
ALTER TABLE "SignupLead" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "SignupLead" ALTER COLUMN "company" DROP NOT NULL;
