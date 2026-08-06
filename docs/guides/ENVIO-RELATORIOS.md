# Envio dos relatorios para treinadores

## Fluxo simples

1. Baixe/salve os PDFs dos relatorios em uma pasta, por exemplo:

`output/reports/2026-06-18-original`

2. Rode o atalho:

`PREPARAR-ENVIO-RELATORIOS.cmd`

Ou pelo terminal:

`npm run reports:delivery -- "output/reports/2026-06-18-original"`

3. Abra o arquivo gerado:

`output/reports/2026-06-18-original/_envio/controle-envio-relatorios.csv`

4. Preencha as colunas:

- `treinador`
- `telefone`: usar DDI e DDD, por exemplo `5531999999999`
- `link_drive`: link compartilhado do PDF ou da pasta no Google Drive
- `status_envio`: `pendente`, `enviado` ou `revisar`
- `observacoes`: opcional

5. Rode o mesmo comando de novo.

6. Abra:

`output/reports/2026-06-18-original/_envio/links-whatsapp.md`

7. Clique/copiar os links do WhatsApp gerados para enviar as mensagens.

## Observacoes

- O script preserva treinador, telefone, link do Drive, status e observacoes quando e rodado novamente.
- Se um PDF novo aparecer na pasta, ele entra automaticamente no controle.
- Para automatizar tambem o upload no Drive, sera preciso configurar uma credencial do Google Drive ou usar uma ferramenta como Google Drive para desktop/rclone.
