/**
 * Appends a confirmed order to the operations Google Sheet.
 *
 * Runs server-side only, through the Lovable Google Sheets connector gateway.
 * Sensitive payment data (references, card/gateway identifiers, tokens) is
 * intentionally NOT written to the sheet.
 *
 * Configure ORDERS_SHEET_ID (the spreadsheet ID from its URL) and optionally
 * ORDERS_SHEET_TAB (defaults to "Orders").
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    const SHEET_ID = Deno.env.get("ORDERS_SHEET_ID");
    const TAB = Deno.env.get("ORDERS_SHEET_TAB") || "Orders";

    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
      return json({ skipped: true, reason: "Google Sheets connector not configured" });
    }
    if (!SHEET_ID) {
      return json({ skipped: true, reason: "ORDERS_SHEET_ID secret not set" });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) return json({ error: "orderId is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, status, customer_name, customer_email, customer_phone, delivery_zone, delivery_address, total_amount, delivery_fee, currency, items, payment_method",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) return json({ error: `Order lookup failed: ${error.message}` }, 500);
    if (!order) return json({ error: "Order not found" }, 404);

    const items = Array.isArray(order.items) ? order.items : [];
    const itemSummary = items
      .map((i: any) =>
        `${i.quantity ?? 1}x ${i.name}${
          [i.selectedColor, i.selectedSize].filter(Boolean).length
            ? ` (${[i.selectedColor, i.selectedSize].filter(Boolean).join(" / ")})`
            : ""
        }`,
      )
      .join(" | ");

    // Payment method is a non-sensitive label (e.g. "mobile_money"); no references or tokens.
    const row = [
      order.id,
      order.created_at,
      order.status,
      order.customer_name || "",
      order.customer_email || "",
      order.customer_phone || "",
      order.delivery_zone || "",
      (order as any).delivery_address || "",
      itemSummary,
      items.reduce((n: number, i: any) => n + (Number(i.quantity) || 1), 0),
      Number(order.total_amount) || 0,
      Number(order.delivery_fee) || 0,
      order.currency || "TZS",
      order.payment_method || "",
      "", // Fulfilment notes — filled in manually by the ops team
    ];

    const res = await fetch(
      `${GATEWAY_URL}/spreadsheets/${SHEET_ID}/values/${TAB}!A:O:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [row] }),
      },
    );

    const text = await res.text();
    if (!res.ok) {
      console.error(`Sheets append failed [${res.status}]: ${text}`);
      return json({ error: "Sheets append failed", status: res.status, details: text }, res.status);
    }

    return json({ success: true, orderId: order.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("sync-order-to-sheet error:", msg);
    return json({ error: msg }, 500);
  }
});
