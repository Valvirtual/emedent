-- disponibilidade por dia da semana, por profissional
create table if not exists clinic_hours (
  id uuid default gen_random_uuid() primary key,
  professional_id uuid references professionals(id),
  day_of_week int not null, -- 0=domingo .. 6=sábado
  open_time time,
  close_time time,
  closed boolean default false
);
create index if not exists clinic_hours_professional_idx on clinic_hours(professional_id);

alter table clinic_hours enable row level security;
create policy "auth_only" on clinic_hours for all using (auth.role() = 'authenticated');
