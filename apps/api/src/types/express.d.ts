import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string | null;
      };
      sellerId?: string;
      sellerRole?: "owner" | "staff";
      isSuperadmin?: boolean;
    }
  }
}
