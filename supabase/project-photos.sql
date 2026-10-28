-- Additive change to the existing project; run once.
alter table public.projects add column image_urls text[] not null default '{}' check(cardinality(image_urls)<=30);
alter table public.projects add column completed_on date;
update public.projects set image_urls=array[image_url] where image_url<>'' and cardinality(image_urls)=0;
-- Uploads are signed by the server only after checking admin_users.
-- Public reads are intentional: these files are website portfolio photos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-photos','project-photos',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
