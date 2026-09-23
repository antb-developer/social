import { expect, test, type Page } from "@playwright/test";

/**
 * Full customer→seller happy path, driven through the real rendered UI in a
 * real browser (Playwright/Chromium).
 *
 * What this DOES verify: routing, component wiring, form validation, state
 * management (cart, auth, TanStack Query), and that every request our own
 * code makes matches the shape this suite expects.
 *
 * What this does NOT verify: the real Express API or real Supabase (Auth/
 * PostgREST/Storage) — every network call is intercepted and served by an
 * in-memory mock below, since this sandbox has no Docker (no local Supabase)
 * and no real Supabase project to point at. The mock's response shapes are
 * modeled on the actual controllers/repositories in apps/api and the actual
 * supabase-js call sites in apps/web — see MOCK_API_BASE / route handlers.
 * Running this against a real `supabase start` + `npm run dev --workspace
 * apps/api` stack (swap the intercepted routes for the real servers) is the
 * intended full-stack verification path; that wasn't possible to execute
 * here.
 */

const SUPABASE_URL = "https://e2e-project.supabase.co";
const API_BASE = "https://e2e-api.example.com";

const SELLER_USER_ID = "11111111-1111-1111-1111-111111111111";
const CUSTOMER_ID = "22222222-2222-2222-2222-222222222222";
const SELLER_ID = "33333333-3333-3333-3333-333333333333";
const PRODUCT_ID = "44444444-4444-4444-4444-444444444444";
const ORDER_ID = "55555555-5555-5555-5555-555555555555";
const PROOF_ID = "66666666-6666-6666-6666-666666666666";

const CUSTOMER_PHONE = "919990002222";
const SELLER_PHONE = "919990001111";

type MockMessage = {
  id: string;
  sender: "customer" | "seller" | "system";
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type MockProof = {
  id: string;
  image_url: string;
  utr: string;
  amount_paise: number;
  review: "pending" | "approved" | "rejected";
};

const order = {
  id: ORDER_ID,
  order_no: "ORD-1000",
  status: "new" as string,
  total_paise: 59900,
  seller_id: SELLER_ID,
  customer_id: CUSTOMER_ID,
  proof_uploaded: false,
  items: [{ id: "item-1", name_snapshot: "Ethnic Cotton Kurti", price_snapshot_paise: 59900, qty: 1 }],
  messages: [] as MockMessage[],
  payment_proofs: [] as MockProof[],
};

let nextMessageId = 1;
function addMessage(sender: MockMessage["sender"], kind: string, payload: Record<string, unknown>) {
  const message: MockMessage = {
    id: `msg-${nextMessageId++}`,
    sender,
    kind,
    payload,
    created_at: new Date().toISOString(),
  };
  order.messages.push(message);
  return message;
}

function customerOrderDetailBody() {
  return {
    ...order,
    seller: { id: SELLER_ID, name: "Demo Store", whatsapp_number: SELLER_PHONE, upi_id: "demo@upi", upi_name: "Demo Store" },
  };
}

function sellerOrderDetailBody() {
  return {
    ...order,
    customer: { id: CUSTOMER_ID, name: "Test Customer", phone: CUSTOMER_PHONE },
  };
}

async function mockSupabaseAuth(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/otp`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route(`${SUPABASE_URL}/auth/v1/verify`, async (route) => {
    const body = route.request().postDataJSON() as { phone: string };
    const userId = body.phone === SELLER_PHONE ? SELLER_USER_ID : CUSTOMER_ID;
    const now = Math.floor(Date.now() / 1000);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: `e2e-token-${userId}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: `e2e-refresh-${userId}`,
        user: {
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          phone: body.phone,
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }),
    });
  });
}

async function mockSupabaseRest(page: Page) {
  await page.route(`${SUPABASE_URL}/rest/v1/customers*`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: CUSTOMER_ID, name: "Test Customer", phone: CUSTOMER_PHONE }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

async function mockSupabaseStorage(page: Page) {
  // "*" doesn't cross "/" boundaries in Playwright's URL glob matching, and
  // the real upload path is nested (payment-proofs/<orderId>/<filename>), so
  // this needs "**".
  await page.route(`${SUPABASE_URL}/storage/v1/object/payment-proofs/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ Key: `payment-proofs/${ORDER_ID}/proof.jpg` }),
    });
  });

  await page.route(`${SUPABASE_URL}/storage/v1/object/sign/payment-proofs/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ signedURL: "/object/sign/payment-proofs/fake?token=e2e" }),
    });
  });
}

async function mockOurApi(page: Page) {
  await page.route(`${API_BASE}/api/stores/demo-store`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: SELLER_ID,
        name: "Demo Store",
        slug: "demo-store",
        logo_url: null,
        is_accepting_orders: true,
      }),
    });
  });

  await page.route(`${API_BASE}/api/stores/demo-store/products`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: PRODUCT_ID,
          name: "Ethnic Cotton Kurti",
          description: "Breathable cotton kurti",
          price_paise: 59900,
          images: [],
          in_stock: true,
        },
      ]),
    });
  });

  await page.route(`${API_BASE}/api/orders`, async (route) => {
    if (route.request().method() === "POST") {
      order.status = "new";
      addMessage("system", "status_change", { body: `Order ${order.order_no} placed.` });
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: order.id, order_no: order.order_no, status: order.status }),
      });
      return;
    }
    await route.fulfill({ status: 404, body: "{}" });
  });

  await page.route(`${API_BASE}/api/orders/${ORDER_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(customerOrderDetailBody()) });
  });

  await page.route(`${API_BASE}/api/orders/${ORDER_ID}/proof`, async (route) => {
    const body = route.request().postDataJSON() as { image_url: string; utr: string };
    const proof: MockProof = {
      id: PROOF_ID,
      image_url: body.image_url,
      utr: body.utr,
      amount_paise: order.total_paise,
      review: "pending",
    };
    order.payment_proofs.push(proof);
    order.proof_uploaded = true;
    addMessage("customer", "payment_proof", { proof_id: proof.id, utr: proof.utr });
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(proof) });
  });

  await page.route(`${API_BASE}/api/seller/settings`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: SELLER_ID, name: "Demo Store", slug: "demo-store", is_accepting_orders: true }),
    });
  });

  await page.route(`${API_BASE}/api/seller/templates`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "tmpl-1", kind: "payment_request", title: "Payment details", body: "Please pay via UPI.", fields: [] },
      ]),
    });
  });

  await page.route(`${API_BASE}/api/seller/orders/${ORDER_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sellerOrderDetailBody()) });
  });

  await page.route(`${API_BASE}/api/seller/orders/${ORDER_ID}/messages`, async (route) => {
    const body = route.request().postDataJSON() as { kind: string; title?: string; amount_paise?: number };
    const payload =
      body.kind === "payment_request"
        ? { title: body.title, amount_paise: order.total_paise }
        : { title: body.title };
    const message = addMessage("seller", body.kind, payload);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(message) });
  });

  await page.route(`${API_BASE}/api/seller/orders/${ORDER_ID}/status`, async (route) => {
    const body = route.request().postDataJSON() as { status: string };
    const from = order.status;
    order.status = body.status;
    addMessage("system", "status_change", { from, to: body.status });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: order.id, status: order.status }),
    });
  });

  await page.route(`${API_BASE}/api/seller/proofs/${PROOF_ID}/review`, async (route) => {
    const body = route.request().postDataJSON() as { decision: "approved" | "rejected" };
    const proof = order.payment_proofs.find((p) => p.id === PROOF_ID);
    if (proof) proof.review = body.decision;
    if (body.decision === "approved") {
      order.status = "paid";
      addMessage("system", "status_change", { from: "pending_payment", to: "paid" });
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: PROOF_ID, review: body.decision }),
    });
  });
}

async function loginAs(page: Page, phone: string) {
  await page.getByPlaceholder("10-digit mobile number").fill(phone.slice(2));
  await page.getByRole("button", { name: "Send OTP" }).click();
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  await page.getByRole("button", { name: "Verify" }).click();
}

test("full order lifecycle: place order -> payment request -> proof -> approve -> ship -> deliver", async ({ page }) => {
  await mockSupabaseAuth(page);
  await mockSupabaseRest(page);
  await mockSupabaseStorage(page);
  await mockOurApi(page);

  // --- Customer: browse store, add to cart, place order ---
  await page.goto("/s/demo-store");
  await expect(page.getByText("Demo Store")).toBeVisible();
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByText(/View cart/).click();

  await expect(page).toHaveURL(/\/s\/demo-store\/cart/);
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page.getByText("Enter your phone number")).toBeVisible();
  await loginAs(page, CUSTOMER_PHONE);

  await expect(page).toHaveURL(new RegExp(`/o/${ORDER_ID}`));
  await expect(page.getByRole("heading", { name: "Order ORD-1000" })).toBeVisible();

  // --- Seller: send a payment request template ---
  await page.goto(`/dashboard/orders/${ORDER_ID}`);
  await expect(page.getByRole("heading", { name: "Order ORD-1000" })).toBeVisible();
  await page.getByRole("button", { name: "Payment details" }).click();
  await expect(page.getByText(/Payment request/)).toBeVisible();

  // --- Customer: sees the payment request, uploads proof ---
  await page.goto(`/o/${ORDER_ID}`);
  await page.getByRole("button", { name: "Upload payment proof" }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "proof.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image-bytes"),
  });
  await page.getByPlaceholder("12-digit UTR").fill("123456789012");
  await page.getByRole("button", { name: "Submit proof" }).click();
  await expect(page.getByText(/UTR: 123456789012/)).toBeVisible();

  // --- Seller: reviews and approves the proof ---
  await page.goto(`/dashboard/orders/${ORDER_ID}`);
  await expect(page.getByText("Payment proof pending review")).toBeVisible();
  await page.getByLabel("I verified this in my bank app").check();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByTestId("order-status-badge")).toHaveText("paid");

  // --- Seller: ships and delivers ---
  await page.getByRole("button", { name: "shipped" }).click();
  await expect(page.getByTestId("order-status-badge")).toHaveText("shipped");
  await page.getByRole("button", { name: "delivered" }).click();
  await expect(page.getByTestId("order-status-badge")).toHaveText("delivered");
});
