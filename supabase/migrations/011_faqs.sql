-- perguntas frequentes, com resposta pré-traduzida por idioma (não tradução ao vivo pela IA,
-- para evitar erro de tradução em informação sensível como preço/convénio)
create table if not exists faqs (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  category text,
  answer_pt text,
  answer_en text,
  answer_es text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table faqs enable row level security;
create policy "auth_only" on faqs for all using (auth.role() = 'authenticated');
