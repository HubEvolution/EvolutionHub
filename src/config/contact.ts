export interface ContactInfo {
  email: string;
  phone?: string | null;
  supportHours?: string | null;
  address?: {
    lines: string[];
  } | null;
  website?: string | null;
}

export const contactInfo: ContactInfo = {
  email: 'contact@hub-evolution.com',
  phone: null,
  supportHours: null,
  address: null,
  website: 'https://hub-evolution.com',
};
