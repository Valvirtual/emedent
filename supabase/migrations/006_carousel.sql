-- urls dos slides de um carrossel (Instagram/LinkedIn), gerados via next/og
alter table content_posts add column if not exists carousel_urls text[];
