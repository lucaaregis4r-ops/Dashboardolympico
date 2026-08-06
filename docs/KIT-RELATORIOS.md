# Kit de PDFs dos relatorios

## Atalho principal

Use:

`GERAR-KIT-RELATORIOS.cmd`

O atalho gera automaticamente uma pasta com a data da planilha, por exemplo:

`Relatórios 18 de junho`

Dentro dela entram os PDFs:

- `Relatório BASQUETE SUB14.pdf`
- `Relatório BASQUETE SUB 15.pdf`
- `Relatório BASQUETE SUB16.pdf`
- `Relatório BASQUETE SUB17.pdf`
- `Relatório Natação.pdf`
- `Relatório Futsal.pdf`
- um PDF para cada equipe do volei feminino
- um PDF para cada equipe do volei masculino

## Comando pelo terminal

`npm run reports:kit`

Para testar a lista sem gerar PDFs:

`npm run reports:kit -- --dry-run`

Para forcar uma data especifica no nome da pasta:

`npm run reports:kit -- --date=2026-06-18`

## Observacoes

- O script sobe o servidor local temporariamente e usa a API `/api/export-pdf`.
- O Edge/Chrome em modo automatico pode demorar alguns segundos para finalizar cada PDF.
- `NATAÇÃO JUV` e `NATAÇÃO JUVENIL` sao tratadas como a mesma equipe.
