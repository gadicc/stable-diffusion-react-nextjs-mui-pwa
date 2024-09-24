// Not actually a schema, just the type.

interface User {
  [key: string]: unknown;
  _id: string;
  emails: Array<{ value: string; verified: boolean }>;
  services: Array<{
    service: string;
    id: string;
    profile: Record<string, unknown> & { _json: Record<string, unknown> };
    accessToken?: string; // deprecrecated
  }>;
  displayName: string;
  credits: {
    free: number;
    paid: number;
  };
  createdAt: Date;
  stripeCustomerId: string;
  redeemedCreditCodes: string[];
  username?: string;
  admin?: boolean;
}

export type { User };
