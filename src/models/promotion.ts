export type Promotion = {
  id: number;
  title: string;
  description: string;
  businessName: string;
  mobileImageUrl: string | null;
  tabletImageUrl: string | null;
  linkUrl: string;
  label?: string;
};
