#!/bin/bash

# Evolution Hub Shell-Aliases
# Fügen Sie diese Zeilen zu Ihrer .bashrc, .zshrc oder ähnlichen Shell-Konfigurationsdatei hinzu

# Pfad zum Projekt (bitte anpassen)
EVOLUTION_HUB_PATH="$HOME/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub"

# Hauptbefehle
alias ehub="cd $EVOLUTION_HUB_PATH && npm run menu"
alias ehub-dev="cd $EVOLUTION_HUB_PATH && npm run dev"
alias ehub-remote="cd $EVOLUTION_HUB_PATH && npx --no-install wrangler dev --remote"
alias ehub-setup="cd $EVOLUTION_HUB_PATH && npm run setup:local"
alias ehub-onboarding="cd $EVOLUTION_HUB_PATH && npm run onboarding"

# Datenbank-Befehle
alias ehub-db="cd $EVOLUTION_HUB_PATH && npm run db:setup"
alias ehub-migrate="cd $EVOLUTION_HUB_PATH && npm run db:migrate"

# Build-Befehle
alias ehub-build="cd $EVOLUTION_HUB_PATH && npm run build"
alias ehub-preview="cd $EVOLUTION_HUB_PATH && npm run preview"

# Test-Befehle
alias ehub-test="cd $EVOLUTION_HUB_PATH && npm run test"
alias ehub-e2e="cd $EVOLUTION_HUB_PATH && npm run test:e2e"

# Wrangler-Befehle
alias ehub-d1="cd $EVOLUTION_HUB_PATH && npx --no-install wrangler d1 list"
alias ehub-r2="cd $EVOLUTION_HUB_PATH && npx --no-install wrangler r2 bucket list"
alias ehub-kv="cd $EVOLUTION_HUB_PATH && npx --no-install wrangler kv namespace list"

echo "Evolution Hub Shell-Aliases wurden geladen!"
echo "Verwenden Sie 'ehub' für das interaktive Menü oder 'ehub-onboarding' für die Ersteinrichtung."
