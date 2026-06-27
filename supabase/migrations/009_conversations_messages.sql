-- conversas e mensagens de WhatsApp
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id),
  wa_phone text not null,
  status text default 'open', -- open / needs_human / closed
  priority text default 'normal', -- normal / urgent
  ai_enabled boolean default true,
  intro_sent boolean default false,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists conversations_wa_phone_idx on conversations(wa_phone);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) not null,
  direction text not null, -- inbound / outbound
  sender text, -- patient / staff / ai
  wa_message_id text,
  content_type text default 'text', -- text / image / audio / document / template
  content text,
  media_path text, -- caminho no Supabase Storage (bucket patient-media), não a URL temporária do Meta
  status text default 'sent', -- sent / delivered / read / failed / received
  intent text,
  raw_payload jsonb,
  created_at timestamptz default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);
create index if not exists messages_wa_message_id_idx on messages(wa_message_id);

alter table conversations enable row level security;
alter table messages enable row level security;
create policy "auth_only" on conversations for all using (auth.role() = 'authenticated');
create policy "auth_only" on messages for all using (auth.role() = 'authenticated');

-- habilita Supabase Realtime para a inbox atualizar ao vivo quando chega mensagem nova
alter publication supabase_realtime add table messages;
