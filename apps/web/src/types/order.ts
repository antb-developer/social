export type OrderMessageKind =
  | "text"
  | "payment_request"
  | "form_request"
  | "form_response"
  | "payment_proof"
  | "status_change";

export type OrderMessageSender = "seller" | "customer" | "system";

export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "phone" | "pincode" | "select";
  options?: string[];
  required?: boolean;
};

export type OrderMessage = {
  id: string;
  order_id: string;
  sender: OrderMessageSender;
  kind: OrderMessageKind;
  payload: Record<string, unknown>;
  created_at: string;
};

export type OrderStatusHistoryEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
};
