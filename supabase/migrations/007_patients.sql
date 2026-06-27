-- pacientes (substitui contacts para este produto)
create table if not exists patients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text unique not null,
  email text,
  birth_date date,
  insurance_provider text,
  clinical_notes text,
  medical_history text,
  next_followup_date date,
  status text default 'active',
  preferred_language text default 'pt',
  consent_given_at timestamptz,
  consent_channel text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists patients_phone_idx on patients(phone);

alter table patients enable row level security;
create policy "auth_only" on patients for all using (auth.role() = 'authenticated');
