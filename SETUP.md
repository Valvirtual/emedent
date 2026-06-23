# pymetool-skeleton — Guia de Setup por Cliente

Template white-label para deployar uma instância por cliente em <10 minutos.

## Pré-requisitos

- Node.js 18+
- Conta Vercel (gratuita)
- Conta Supabase (gratuita)
- Chave API Anthropic

---

## Setup por cliente (passo a passo)

### 1. Clonar o template

```bash
git clone <repo-privado> pymetool-<nome-cliente>
cd pymetool-<nome-cliente>
npm install
```

### 2. Criar projeto Supabase

1. Aceda a [supabase.com](https://supabase.com) → New project
2. Guarde: **URL do projecto** e **anon key** (Settings → API)
3. No SQL Editor, execute o conteúdo de `supabase/migrations/001_initial.sql`, `002_target_audience.sql`, `003_brand_identity.sql`, `004_post_media.sql` e `005_post_media_storage_policy.sql`
4. Em Storage, crie dois buckets com acesso **público**: `brand` e `post-media` (marcar "Public" só permite leitura — o passo 3 acima já cria as policies de upload necessárias)

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
```

### 4. Testar localmente

```bash
npm run dev
```

Aceda a `http://localhost:3000` → registe-se → explore os módulos.

### 5. Deploy no Vercel

```bash
npx vercel --prod
```

Ou use o script automatizado:

```bash
chmod +x scripts/deploy-client.sh
./scripts/deploy-client.sh nome-cliente cliente.dominio.com
```

### 6. Configurar domínio (opcional)

No painel Vercel → Settings → Domains → adicione o domínio do cliente.

---

## Estrutura dos módulos

| Módulo | URL | Descrição |
|--------|-----|-----------|
| Dashboard | `/dashboard` | Resumo com contadores |
| Calendário | `/dashboard/calendar` | Posts gerados por IA |
| CRM | `/dashboard/crm` | Gestão de contactos |
| Orçamentos | `/dashboard/quotes` | Propostas geradas por IA |
| Marca | `/dashboard/brand` | Logo, cores, nome da empresa |

---

## Custos estimados por cliente/mês

| Serviço | Custo |
|---------|-------|
| Vercel | €0 (free tier) |
| Supabase | €0 (free tier) |
| Anthropic API | ~€5–15 (uso moderado) |
| Replicate (imagens) | ~€2–8 (uso moderado) |
| Domínio | ~€0,80/mês |
| **Total** | **~€6–16/mês** |

---

## Propagação de melhorias

Quando o template central é melhorado:

```bash
# Em cada instância de cliente
git remote add template <repo-template>
git fetch template
git merge template/main --allow-unrelated-histories
```
