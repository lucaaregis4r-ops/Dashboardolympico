# Guia rapido da planilha de fisioterapia

## Objetivo

Registrar cada atendimento em uma linha, de forma simples, para depois filtrar por:

- semana
- atleta
- modalidade
- fisioterapeuta
- status de retorno

## Campos recomendados

- `attendance_id`: identificador unico do atendimento
- `attendance_date`: data do atendimento em `AAAA-MM-DD`
- `week_reference`: referencia da semana, por exemplo `2026-S22`
- `athlete_id`: usar o mesmo ID do arquivo `data/reference/athletes.csv`
- `athlete_name`: nome do atleta
- `category`: categoria/equipe
- `modality_id`: modalidade padronizada
- `physiotherapist`: profissional responsavel
- `attendance_type`: avaliacao, retorno, liberacao, tratamento, preventivo
- `body_region`: regiao corporal principal
- `main_complaint`: queixa principal
- `pain_scale_0_10`: escala de dor
- `procedure_1`, `procedure_2`, `procedure_3`: procedimentos realizados
- `session_status`: em acompanhamento, liberado, retorno parcial, encaminhado
- `return_to_training`: sim, parcial, nao
- `next_step`: conduta seguinte
- `next_session_date`: proxima sessao
- `notes`: observacoes livres

## Preenchimento pratico

- Uma linha por atendimento
- Nao misturar dois atletas na mesma linha
- Sempre preencher `athlete_id` antes de salvar
- Se o atleta nao estiver no cadastro, atualizar primeiro `data/reference/athletes.csv`
- Usar os mesmos nomes de modalidade para evitar duplicidades

## Geracao do relatorio semanal

Depois de preencher a planilha, voce pode gerar um relatorio automaticamente:

`node scripts/create-physio-weekly-report.js 2026-S22`

Se nao informar a semana, o script usa a `week_reference` mais recente encontrada no CSV.
