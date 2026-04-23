export interface Venue {
  id: string;
  admin_id: string;
  name: string;
  description: string;
  image_url: string;
  created_at: string;
}

export interface Referral {
  id: string;
  venue_id: string;
  referrer_name: string;
  referrer_email: string;
  referral_code: string;
  referred_by: string | null;
  accepted: boolean;
  created_at: string;
  children?: Referral[];
}
