-- perguntas-chave de identidade de marca, usadas para personalizar o copy gerado por IA
alter table config add column if not exists description text;
alter table config add column if not exists usp text;
alter table config add column if not exists tone_of_voice text default 'profissional';
alter table config add column if not exists location text;
alter table config add column if not exists audience_detail text;
