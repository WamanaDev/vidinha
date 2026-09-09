# CI/CD — `backup-postgres.yml` (Backup semanal para Cloudflare R2)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).

**Nota de monorepo:** este workflow não referencia `apps/api`, `apps/mobile` nem `packages/**` — ele opera diretamente sobre o banco Postgres (via `PROD_DIRECT_URL`) e não faz `checkout` de código do app para build/lint/test, então não precisa de `working-directory` nem de `paths:` no trigger (roda por `schedule`/`workflow_dispatch`, independente de qualquer mudança no repositório). Nenhum ajuste de caminho foi necessário.

```yaml
name: Weekly Postgres Backup

on:
  schedule:
    - cron: "0 6 * * 0"  # todo domingo às 06:00 UTC
  workflow_dispatch: {}

jobs:
  backup:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Instalar cliente Postgres
        run: sudo apt-get update && sudo apt-get install -y postgresql-client
      - name: Dump do banco de produção
        run: |
          FILENAME="vidinha-prod-$(date +%Y%m%d).dump"
          pg_dump "${{ secrets.PROD_DIRECT_URL }}" -Fc -f "$FILENAME"
          echo "FILENAME=$FILENAME" >> "$GITHUB_ENV"
      - name: Upload para Cloudflare R2
        uses: shallwefootball/s3-upload-action@master  # cliente compatível com S3 API do R2
        with:
          aws_key_id: ${{ secrets.R2_ACCESS_KEY_ID }}
          aws_secret_access_key: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          aws_bucket: vidinha-backups
          endpoint: ${{ secrets.R2_ENDPOINT }}
          source_dir: .
          destination_dir: postgres/
```

O dump usa formato customizado (`-Fc`) para permitir restauração seletiva com `pg_restore`. Retenção de backups no bucket R2 (ex.: manter últimas 8 semanas) é configurada via lifecycle rule no próprio Cloudflare R2, sem custo adicional. Um segundo job manual (`restore-runbook`, não incluso em CI) deve ser documentado à parte para descrever o procedimento de restauração testado.
