-- Identify the item, precisely: identifiers + product links from receipts/emails; "none" = user cleared a wrong image.
alter table public.items add column if not exists identifier text;      -- UPC/EAN/SKU/style number as printed
alter table public.items add column if not exists product_url text;     -- product page linked from the order email
alter table public.items drop constraint if exists items_image_source_check;
alter table public.items add constraint items_image_source_check check (image_source in ('email','product_page','identifier','shopping','lens','user_photo','cutout','none'));
