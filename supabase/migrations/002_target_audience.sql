-- público-alvo da empresa, usado para adaptar o tom do copy gerado por IA
alter table config add column if not exists target_audience text default 'b2c';
