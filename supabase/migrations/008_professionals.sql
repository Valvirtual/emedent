-- dentistas da clínica, cada um com agenda própria
create table if not exists professionals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

alter table professionals enable row level security;
create policy "auth_only" on professionals for all using (auth.role() = 'authenticated');
