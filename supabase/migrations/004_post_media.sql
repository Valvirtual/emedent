-- imagem gerada por IA associada a cada post (Replicate + Supabase Storage)
alter table content_posts add column if not exists image_url text;
