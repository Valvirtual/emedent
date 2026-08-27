-- guarda quando a conversa entrou em needs_human, para o auto-reset de 24h não
-- reiniciar a cada mensagem nova (antes usava last_message_at, que muda sempre)
alter table conversations add column if not exists needs_human_since timestamptz;
