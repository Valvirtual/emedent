#!/bin/bash
# Uso: ./scripts/deploy-client.sh <nome-cliente> <dominio>
# Exemplo: ./scripts/deploy-client.sh restaurante-maria maria.pymetool.com

set -e

CLIENT_NAME=${1:?"Uso: $0 <nome-cliente> <dominio>"}
DOMAIN=${2:?"Uso: $0 <nome-cliente> <dominio>"}

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   pymetool — Deploy por cliente        ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Cliente: $CLIENT_NAME"
echo "Domínio: $DOMAIN"
echo ""

# 1. Pedir credenciais
read -p "NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
read -p "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY

# 2. Criar .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
EOF

echo ""
echo "→ .env.local criado"

# 3. Deploy no Vercel
echo "→ A fazer deploy no Vercel..."
npx vercel --prod --name "pymetool-$CLIENT_NAME" \
  --env NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --env ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

echo ""
echo "✓ Deploy concluído!"
echo ""
echo "Próximos passos:"
echo "1. Configure o domínio $DOMAIN no painel do Vercel"
echo "2. Execute o SQL em supabase/migrations/001_initial.sql no Supabase do cliente"
echo "3. Crie um bucket 'brand' no Supabase Storage (público)"
echo "4. Registe-se em https://$DOMAIN/register"
echo ""
