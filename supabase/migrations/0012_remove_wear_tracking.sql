-- Wear tracking removed (lead decision, 2026-09-20). Cost-per-wear, #30wears and wear stamps are gone;
-- "used mine" on a hold still records which owned item stood in for a purchase.
-- Applied AFTER the code that stops reading `wears` is deployed.
alter table public.holds rename column wore_item_id to owned_item_id;
drop table if exists public.wears;
