-- agendamentos
create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) not null,
  professional_id uuid references professionals(id),
  conversation_id uuid references conversations(id),
  scheduled_at timestamptz not null,
  duration_minutes int default 30,
  procedure text,
  status text default 'scheduled', -- scheduled / confirmed / cancelled / completed / no_show
  reminder_sent_at timestamptz,
  notes text,
  created_by text default 'staff', -- staff / ai
  created_at timestamptz default now()
);
create index if not exists appointments_scheduled_at_idx on appointments(scheduled_at);
create index if not exists appointments_patient_idx on appointments(patient_id);
create index if not exists appointments_professional_idx on appointments(professional_id);

alter table appointments enable row level security;
create policy "auth_only" on appointments for all using (auth.role() = 'authenticated');
