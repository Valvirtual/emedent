-- nome do assistente de IA (ex: "TatiVirtual"), usado na frase de identificação
-- exigida pelo Art. 50 do EU AI Act na primeira mensagem de cada conversa nova
alter table config add column if not exists assistant_name text;
