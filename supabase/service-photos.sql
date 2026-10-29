-- Additive storage setup. Existing service records and image URLs stay untouched.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-photos','service-photos',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
-- Website photos are public. All uploads require admin-authorized server signatures.
-- No anon/authenticated INSERT/UPDATE/DELETE Storage policies are granted.
