# Architecture Decisions

- Store newly uploaded catalogue imagery as Lovable CDN asset pointers under `src/assets/products`; this keeps product media durable without adding large binaries to the repository.- International orders live in `international_order_requests`, created only via the `create_international_request` RPC (server re-prices items); guests access their request by reference + private access token. Why: prevents price tampering and exposing requests to others.
- Admin-editable shop settings (e.g. international WhatsApp number) live in `app_settings`, with `is_public` controlling anonymous reads. Why: no phone numbers hardcoded in the frontend.
- Store stock changes by staff go only through the `adjust_store_inventory` RPC (active store_manager of that store, or admin), which writes an `inventory_movements` record; per-store size stock lives in `product_store_availability.variant_stock`. Why: audited, store-scoped inventory with prices kept admin-only by RLS.
