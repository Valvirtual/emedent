-- config da empresa (1 linha só)
create table if not exists config (
  id uuid default gen_random_uuid() primary key,
  company_name text,
  logo_url text,
  primary_color text default '#6366f1',
  industry text,
  created_at timestamptz default now()
);

-- calendário de conteúdo
create table if not exists content_posts (
  id uuid default gen_random_uuid() primary key,
  title text,
  body text,
  platform text[],
  scheduled_at timestamptz,
  status text default 'draft',
  created_at timestamptz default now()
);

-- CRM
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  company text,
  stage text default 'lead',
  notes text,
  created_at timestamptz default now()
);

-- orçamentos
create table if not exists quotes (
  id uuid default gen_random_uuid() primary key,
  client_name text,
  services jsonb,
  total numeric,
  status text default 'draft',
  content text,
  created_at timestamptz default now()
);

-- RLS
alter table config enable row level security;
alter table content_posts enable row level security;
alter table contacts enable row level security;
alter table quotes enable row level security;

-- Políticas: só utilizadores autenticados
create policy "auth_only" on config for all using (auth.role() = 'authenticated');
create policy "auth_only" on content_posts for all using (auth.role() = 'authenticated');
create policy "auth_only" on contacts for all using (auth.role() = 'authenticated');
create policy "auth_only" on quotes for all using (auth.role() = 'authenticated');
