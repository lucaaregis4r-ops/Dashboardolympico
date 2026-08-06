# Modelo de planilha Google - Psicologia

Este modelo prepara uma planilha separada para acompanhamento da Psicologia, usando a mesma base de atletas e os IDs oficiais `ATLxxx`.

## Abas

1. `Atletas`
   - Lista de atletas vindos de `data/reference/athletes.csv`.
   - A coluna `athlete_id` usa `data/reference/athlete-identifiers.csv`.
   - Marque `enviar_para_acompanhamento` e use o menu para enviar em lote.

2. `Em_Acompanhamento`
   - Lista operacional da Psicologia.
   - Permite registrar fase, demanda, risco, profissional, proxima sessao e observacoes.

3. `Historico_Movimentacoes`
   - Registro permanente de entradas, atualizacoes e altas.

4. `Listas`
   - Valores padronizados para validacao de dados.

## Como usar

1. Suba `modelo-psicologia-olympico.xlsx` para o Google Drive.
2. Abra com Google Sheets.
3. Va em Extensoes > Apps Script.
4. Cole o conteudo de `planilha-psicologia-appscript.gs`.
5. Salve, recarregue a planilha e use o menu `Psicologia`.
6. Execute `Criar/ajustar estrutura` uma vez.

## Atualizar atletas

Se `data/reference/athletes.csv` ou `data/reference/athlete-identifiers.csv` mudar, rode:

`npm run workbook:fisio`

Esse comando recria os modelos de Fisioterapia e Psicologia.
