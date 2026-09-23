# Kit de PDFs dos relatórios

## Atalho principal

Use `GERAR-KIT-RELATORIOS.cmd` para gerar automaticamente uma pasta datada, por exemplo:

`output/reports/Relatórios 7 de agosto`

Dentro dela entram 16 PDFs, um por categoria configurada: quatro de basquete, duas de Natação, duas de Futsal, quatro de vôlei feminino e quatro de vôlei masculino.

Cada PDF apresenta `Presença PF (7 dias)`, calculada pelas presenças divididas pelas oportunidades nas sessões válidas da categoria. O relatório mostra também o numerador e o denominador. Quando a planilha suplementar não pode ser consultada, o PDF é gerado normalmente com o indicador `Indisponível`.

## Comandos

- Gerar normalmente: `npm run reports:kit`
- Conferir a lista sem gerar: `npm run reports:kit -- --dry-run`
- Forçar uma data: `npm run reports:kit -- --date=2026-08-07`
- Regenerar todos os PDFs: `npm run reports:kit -- --force`
- Ajustar prazo e tentativas: `npm run reports:kit -- --timeout-seconds=240 --retries=3`

## Travamento, retomada e nova tentativa

- O terminal mostra uma mensagem a cada 10 segundos enquanto o navegador processa um PDF.
- Cada PDF possui limite padrão de 180 segundos e até duas tentativas; uma renderização presa não bloqueia o kit indefinidamente.
- Ao rodar novamente, PDFs válidos existentes são pulados. O kit retoma do primeiro arquivo ausente ou inválido.
- Arquivos em construção usam `.partial` e só recebem o nome final após a validação da assinatura `%PDF-`.
- O Edge ou Chrome em modo automático pode levar de 10 a 30 segundos por relatório, dependendo do tamanho.

## Envio direto para o Google Drive

O envio usa OAuth do Google com o escopo restrito `drive.file`: o dashboard acessa somente arquivos e pastas que ele próprio cria. Os PDFs permanecem privados; o script não cria compartilhamento público.

### Configuração única

1. No Google Cloud Console, crie ou selecione um projeto.
2. Habilite a **Google Drive API**.
3. Configure a tela de consentimento e crie uma credencial OAuth do tipo **Aplicativo para computador**.
4. Baixe o JSON da credencial.
5. Arraste esse JSON sobre `CONFIGURAR-GOOGLE-DRIVE.cmd`, ou execute:

   `npm run drive:auth -- --client-file="C:\caminho\client_secret.json"`

6. Autorize a conta na janela do Google.

O token fica fora do projeto em `%LOCALAPPDATA%\DashboardOlympico`; ele não entra no Git nem na pasta dos relatórios.

### Uso normal

- `GERAR-KIT-E-ENVIAR-DRIVE.cmd`: gera, retoma PDFs existentes e envia o kit.
- `npm run reports:upload`: envia apenas a pasta de relatórios mais recente.
- `npm run reports:upload -- --dir="C:\caminho\Relatórios 7 de agosto"`: envia uma pasta específica.
- `--drive-parent-id=ID_DA_PASTA`: usa uma pasta-pai que o aplicativo já tenha permissão para acessar.

Na primeira execução sem pasta-pai, o aplicativo cria `Relatorios Olympico` no Meu Drive. Cada kit recebe uma subpasta com a data local. Se um PDF já existir, seu conteúdo é atualizado, evitando duplicatas. O arquivo local `_drive-upload.json` registra os IDs e links retornados pelo Google.

## Observações

- O script sobe o servidor local temporariamente e usa a API `/api/export-pdf`.
- `NATAÇÃO JUV` e `NATAÇÃO JUVENIL` são tratadas como a mesma equipe.
- Credenciais OAuth e tokens nunca devem ser copiados para o repositório, para a pasta `output` ou para o Google Drive.
