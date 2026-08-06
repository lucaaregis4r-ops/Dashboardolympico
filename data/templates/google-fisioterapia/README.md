# Modelo de planilha Google - Fisioterapia

Este modelo prepara uma segunda planilha no Google Sheets para futura integracao com o dashboard.

## Abas sugeridas

1. `Atletas`
   - Lista base de atletas importada de `data/reference/athletes.csv`, gerada a partir da planilha de carga/check-in.
   - O arquivo atual ja vem com 278 atletas preenchidos.
   - A coluna `athlete_id` usa os IDs oficiais de `data/reference/athlete-identifiers.csv`, como `ATL001`.
   - Esta aba nao traz carga, status, ultimo check-in ou dor; ela serve apenas para identificar e selecionar atletas.
   - Use a coluna `enviar_para_tratamento` como checkbox.
   - O checkbox apenas seleciona; para enviar em lote, use o menu `Fisioterapia > Enviar selecionados`.

2. `Em_Tratamento`
   - Lista operacional da fisioterapia.
   - Cada atleta ativo fica com status, fase, lesao e observacoes.
   - Use a coluna `alta` como checkbox quando o atleta sair do tratamento.

3. `Historico_Movimentacoes`
   - Registro permanente de entradas, atualizacoes e altas.
   - Esta aba e a mais importante para auditoria, pois nenhuma movimentacao deve ser apagada.

4. `Listas`
   - Valores padronizados para validacao de dados.

## Fluxo planejado

1. Marcar atletas em lote na aba `Atletas` usando `enviar_para_tratamento`.
2. Copiar/adicionar esses atletas na aba `Em_Tratamento`.
3. Preencher fase, lesao e observacoes na aba `Em_Tratamento`.
4. Registrar cada entrada, atualizacao ou alta na aba `Historico_Movimentacoes`.
5. No proximo passo, integrar o dashboard lendo esta planilha pelo link CSV publicado do Google Sheets.

## Arquivos deste modelo

- `modelo-fisioterapia-olympico.xlsx`: arquivo recomendado, em Excel real, com as quatro abas e os atletas preenchidos.
- `modelo-fisioterapia-olympico.xls`: versao Excel XML; no editor de codigo aparece como texto, mas abre como planilha no Excel/Google Sheets.
- `planilha-fisioterapia-appscript.gs`: codigo para colar no Apps Script da planilha Google.
- `scripts/create-physio-google-workbook.js`: script para recriar os modelos de Fisioterapia e Psicologia.
- `aba-atletas.csv`
- `aba-em-tratamento.csv`
- `aba-historico-movimentacoes.csv`
- `aba-listas.csv`

## Como usar no Google Sheets

1. Suba `modelo-fisioterapia-olympico.xlsx` para o Google Drive.
2. Abra com Google Sheets.
3. Va em Extensoes > Apps Script.
4. Cole o conteudo de `planilha-fisioterapia-appscript.gs`.
5. Salve, recarregue a planilha e use o menu `Fisioterapia`.
6. Execute `Criar/ajustar estrutura` uma vez para aplicar checkboxes, validacoes e formatacao.

## Atualizar atletas

Se `data/reference/athletes.csv` ou `data/reference/athlete-identifiers.csv` for atualizado, recrie o XLS e o XLSX com:

`npm run workbook:fisio`
