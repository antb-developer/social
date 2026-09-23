import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { SUPERADMIN_IDENTITY_PHONE } from "../config/superadminIdentity";
import { findOrCreateAuthUserByPhone } from "../repositories/authUserRepository";

const SELLER_PHONE = "+919990001111";
const CUSTOMER_PHONE = "+919990002222";
const STORE_SLUG = "demo-store";

type Product = {
  id: string;
  name: string;
  description: string;
  price_paise: number;
  in_stock: boolean;
};

// Fixed (not random) IDs so re-running the seed script upserts the same
// rows instead of accumulating duplicates on every run.
const PRODUCTS: Product[] = [
  { id: "10000000-0000-0000-0000-000000000001", name: "Ethnic Cotton Kurti - Blue", description: "Breathable cotton kurti, block print.", price_paise: 59900, in_stock: true },
  { id: "10000000-0000-0000-0000-000000000002", name: "Ethnic Cotton Kurti - Maroon", description: "Breathable cotton kurti, block print.", price_paise: 59900, in_stock: true },
  { id: "10000000-0000-0000-0000-000000000003", name: "Printed Palazzo Pants", description: "Flowy palazzo, elastic waist.", price_paise: 44900, in_stock: true },
  { id: "10000000-0000-0000-0000-000000000004", name: "Silk Dupatta - Golden", description: "Banarasi-style silk dupatta.", price_paise: 34900, in_stock: false },
  { id: "10000000-0000-0000-0000-000000000005", name: "Oxidised Silver Jhumka Earrings", description: "Handcrafted oxidised silver jhumkas.", price_paise: 19900, in_stock: true },
  { id: "10000000-0000-0000-0000-000000000006", name: "Beaded Layered Necklace", description: "3-layer beaded statement necklace.", price_paise: 29900, in_stock: true },
  { id: "10000000-0000-0000-0000-000000000007", name: "Handloom Cotton Saree", description: "Pure handloom cotton, contrast border.", price_paise: 129900, in_stock: true },
  { id: "10000000-0000-0000-0000-000000000008", name: "Embroidered Clutch Bag", description: "Hand-embroidered evening clutch.", price_paise: 54900, in_stock: false },
];

async function insertStatusHistory(
  orderId: string,
  changedBy: string,
  transitions: Array<{ from: string | null; to: string }>
) {
  const rows = transitions.map((t) => ({
    order_id: orderId,
    from_status: t.from,
    to_status: t.to,
    changed_by: changedBy,
    note: "seed data",
  }));
  const { error } = await supabaseAdmin.from("order_status_history").insert(rows);
  if (error) throw error;
}

async function insertSystemMessage(orderId: string, body: string) {
  const { error } = await supabaseAdmin.from("order_messages").insert({
    order_id: orderId,
    sender: "system",
    kind: "status_change",
    payload: { body },
  });
  if (error) throw error;
}

async function createOrder(opts: {
  sellerId: string;
  customerId: string;
  status: "new" | "pending_payment" | "paid" | "shipped" | "delivered" | "cancelled";
  items: Array<{ product: Product; qty: number }>;
  sellerUserId: string;
}) {
  const totalPaise = opts.items.reduce((sum, i) => sum + i.product.price_paise * i.qty, 0);

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      seller_id: opts.sellerId,
      customer_id: opts.customerId,
      status: "new",
      total_paise: totalPaise,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
    opts.items.map((i) => ({
      order_id: order.id,
      product_id: i.product.id,
      name_snapshot: i.product.name,
      price_snapshot_paise: i.product.price_paise,
      qty: i.qty,
    }))
  );
  if (itemsError) throw itemsError;

  await insertSystemMessage(order.id, `Order ${order.order_no} placed.`);

  const path: Array<"new" | "pending_payment" | "paid" | "shipped" | "delivered" | "cancelled"> =
    ["new", "pending_payment", "paid", "shipped", "delivered"];
  const targetIndex = path.indexOf(opts.status);

  if (opts.status === "cancelled") {
    await insertStatusHistory(order.id, opts.customerId, [{ from: "new", to: "cancelled" }]);
    await insertSystemMessage(order.id, "Order cancelled.");
  } else {
    for (let i = 1; i <= targetIndex; i++) {
      await insertStatusHistory(order.id, opts.sellerUserId, [{ from: path[i - 1], to: path[i] }]);
      await insertSystemMessage(order.id, `Status changed to ${path[i]}.`);

      if (path[i] === "pending_payment") {
        await supabaseAdmin.from("order_messages").insert({
          order_id: order.id,
          sender: "seller",
          kind: "payment_request",
          payload: { title: "Payment details", amount_paise: totalPaise },
        });
      }

      if (path[i] === "paid") {
        const { data: proof, error: proofError } = await supabaseAdmin
          .from("payment_proofs")
          .insert({
            order_id: order.id,
            image_url: "https://placehold.co/400x600?text=UTR+Proof",
            utr: "123456789012",
            amount_paise: totalPaise,
            review: "approved",
            reviewed_by: opts.sellerUserId,
          })
          .select()
          .single();
        if (proofError) throw proofError;

        await supabaseAdmin.from("order_messages").insert({
          order_id: order.id,
          sender: "customer",
          kind: "payment_proof",
          payload: { proof_id: proof.id, utr: proof.utr },
        });
      }
    }
  }

  const { error: statusError } = await supabaseAdmin
    .from("orders")
    .update({ status: opts.status, proof_uploaded: opts.status !== "new" && opts.status !== "cancelled" })
    .eq("id", order.id);
  if (statusError) throw statusError;

  return order;
}

async function main() {
  console.log(`Seeding against ${process.env.SUPABASE_URL}`);

  const sellerUserId = await findOrCreateAuthUserByPhone(SELLER_PHONE);
  const customerUserId = await findOrCreateAuthUserByPhone(CUSTOMER_PHONE);

  const { data: seller, error: sellerError } = await supabaseAdmin
    .from("sellers")
    .upsert(
      {
        name: "Demo Store",
        slug: STORE_SLUG,
        description: "Handpicked everyday essentials, packed and shipped by us within 2 days.",
        address: "12 Market Road, Sector 17, Chandigarh 160017",
        phone: SELLER_PHONE,
        whatsapp_number: SELLER_PHONE,
        upi_id: "demostore@upi",
        upi_name: "Demo Store",
        is_accepting_orders: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();
  if (sellerError) throw sellerError;

  await supabaseAdmin
    .from("seller_members")
    .upsert({ seller_id: seller.id, user_id: sellerUserId, role: "owner" }, { onConflict: "seller_id,user_id" });

  await supabaseAdmin
    .from("customers")
    .upsert({ id: customerUserId, phone: CUSTOMER_PHONE, name: "Demo Customer" }, { onConflict: "id" });

  for (const product of PRODUCTS) {
    await supabaseAdmin.from("products").upsert(
      { ...product, seller_id: seller.id, is_active: true },
      { onConflict: "id" }
    );
  }

  const { data: existingTemplates } = await supabaseAdmin
    .from("templates")
    .select("id")
    .eq("seller_id", seller.id);

  if (!existingTemplates || existingTemplates.length === 0) {
    await supabaseAdmin.from("templates").insert([
      {
        seller_id: seller.id,
        kind: "payment_request",
        title: "Payment details",
        body: "Please pay via UPI and upload your payment proof.",
        fields: [],
      },
      {
        seller_id: seller.id,
        kind: "form_request",
        title: "Shipping address",
        body: "Please share your shipping address.",
        fields: [
          { key: "name", label: "Full name", type: "text", required: true },
          { key: "phone", label: "Phone", type: "phone", required: true },
          { key: "address_line", label: "Address line", type: "textarea", required: true },
          { key: "city", label: "City", type: "text", required: true },
          { key: "state", label: "State", type: "text", required: true },
          { key: "pincode", label: "Pincode", type: "pincode", required: true },
        ],
      },
    ]);
  }

  const statuses = ["new", "pending_payment", "paid", "shipped", "delivered", "cancelled"] as const;
  for (const status of statuses) {
    await createOrder({
      sellerId: seller.id,
      customerId: customerUserId,
      sellerUserId,
      status,
      items: [
        { product: PRODUCTS[0], qty: 1 },
        { product: PRODUCTS[2], qty: 2 },
      ],
    });
    console.log(`Created order in status: ${status}`);
  }

  // Also provisioned automatically on first successful login (see
  // superadminAuthController), but seeding it ahead of time means the
  // /superadmin/stores/:id/backup etc. endpoints have something to point at
  // even before anyone's logged in once.
  const superadminUserId = await findOrCreateAuthUserByPhone(SUPERADMIN_IDENTITY_PHONE);
  await supabaseAdmin.from("superadmins").upsert({ user_id: superadminUserId }, { onConflict: "user_id" });

  console.log("Seed complete.");
  console.log(`Storefront: /s/${STORE_SLUG}`);
  console.log(`Superadmin login: username "${env.superadminUsername}", password "${env.superadminPassword}"`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
