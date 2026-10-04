# Kit de PDFs dos relatórios

## Gerar

`./GERAR-KIT-RELATORIOS.sh` cria uma pasta datada em `output/reports/` com um PDF por categoria configurada. O script retoma PDFs válidos já existentes, tenta novamente após falha e registra progresso. Requer Chrome ou Chromium instalado.

Comandos úteis:

```bash
npm run reports:kit -- --dry-run
npm run reports:kit -- --date=2026-08-07
npm run reports:kit -- --force
npm run reports:kit -- --timeout-seconds=240 --retries=3
```

O relatório apresenta `Presença PF (7 dias)` com numerador e denominador. Quando a fonte de presença falha, o indicador mostra indisponibilidade.

## Google Drive privado

1. Ative a Google Drive API e crie credencial OAuth para aplicativo de computador no Google Cloud Console.
2. Baixe o JSON da credencial.
3. Execute `./CONFIGURAR-GOOGLE-DRIVE.sh /caminho/credencial.json` e autorize a conta.
4. Execute `./GERAR-KIT-E-ENVIAR-DRIVE.sh` para gerar e enviar, ou `npm run reports:upload` para enviar o kit existente.

O escopo usado é `drive.file`. Tokens ficam fora do projeto. O script não cria compartilhamento público. O arquivo `_drive-upload.json` em `output/` registra IDs e links para retomada.

Para preparar mensagens e controle de envio manual, use `./PREPARAR-ENVIO-RELATORIOS.sh /caminho/para/pasta-de-PDFs`.
