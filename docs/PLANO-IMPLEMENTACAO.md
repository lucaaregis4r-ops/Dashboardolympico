# Plano de implementação — estado atual

A revisão v3 do Dashboard Olympico está implementada no código desta branch. O arquivo de plano fornecido para a revisão foi tratado como especificação de trabalho; as escalas reais da fonte prevaleceram onde ele supunha direção oposta para sono e humor.

## Metodologia

- [x] Recuperação coerente com os rótulos reais de sono e humor, limitada à escala de 0 a 5.
- [x] Elegibilidade por check-in primário, mantendo atletas inativos no elenco e no histórico.
- [x] Indicadores semanais em 7 dias e tendência em 90 dias.
- [x] Histórico pessoal e da equipe exclui a janela atual; percentil histórico exige seis janelas anteriores.
- [x] Percentil de equipe exige seis atletas elegíveis e não gera alerta.
- [x] Atenção única por atleta, com regras explícitas de sinal absoluto, persistência, padrão pessoal e combinação.

## Interface e relatórios

- [x] Painel da comissão com lista única de atletas em atenção.
- [x] Cards sinalizam quando não há check-in recente ou base histórica suficiente.
- [x] `Desgaste percebido` substitui o rótulo antigo do índice composto.
- [x] Relatório de equipe em duas páginas A4 paisagem, com indicadores, atenção, informações clínicas, cobertura e metodologia.
- [x] Página geral da modalidade usa a nova nomenclatura e sete dias.
- [x] Recomendações automáticas removidas do relatório.
- [x] PWA atualizado para invalidar o cache após a mudança.

## Linux e publicação

- [x] Linux documentado como fluxo principal, com equivalentes Bash para todos os atalhos `.cmd`.
- [x] `npm run build:linux` gera pacote sem runtime embutido e launcher executável.
- [x] GitHub Pages mantém fontes JSON relativas e PDF desativado.
- [x] Renderização visual e contagem de páginas conferidas em PDFs reais e cenários clínicos densos.

Veja `VALIDACAO-FINAL.md` para os comandos e resultados executados nesta revisão.
