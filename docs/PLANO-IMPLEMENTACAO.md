# Plano de implementacao - Dashboard Olympico

> Criado em 2026-08-06. Este arquivo e o quadro de andamento da modernizacao.

## Resultado esperado

Entregar um dashboard profissional, flat e esportivo, com identidade do Olympico, area propria de Fisioterapia e relatorios que preservem o novo campo de observacoes, mantendo o executavel portatil, o acesso em rede local/PWA e a geracao de PDFs funcionando.

## Estado geral

| Fase | Entrega | Status |
| --- | --- | --- |
| 0 | Inventario, contexto vivo e plano | Concluida em 2026-08-06 |
| 1 | Observacoes da fisioterapia no relatorio | Concluida em 2026-08-06 |
| 2 | Organizacao fisica e modularizacao inicial | Concluida em 2026-08-06 |
| 3 | API e area de Fisioterapia no dashboard | Concluida em 2026-08-06 |
| 4 | Redesign flat/esportivo | Proxima |
| 5 | Validacao, acessibilidade e distribuicao | Pendente |

## Fase 0 - Inventario e base de trabalho

Entregue:

- mapeamento do front-end, servidor, scripts, modelos, relatorios e pacotes;
- definicao da raiz como fonte de verdade temporaria;
- registro da divergencia entre copias geradas;
- confirmacao do cabecalho `OBSERVACOES` na planilha publicada;
- criacao deste plano e atualizacao do contexto vivo.

Risco identificado: a pasta nao possui repositorio Git. A Fase 2 deve comecar com um ponto de restauracao antes de mover arquivos.

## Fase 1 - Observacoes da fisioterapia no relatorio

Objetivo: corrigir primeiro o fluxo clinico sem misturar a mudanca com o redesign.

Implementacao:

1. adicionar aliases de leitura para `Observacoes`, `Observações`, `Obs` e `Notes`;
2. incluir `observations` no objeto normalizado de fisioterapia;
3. manter `notes` para metadados compostos como secao, fase, vetos, conduta e dor;
4. renderizar `Observacoes: <texto>` no cartao de Fisioterapia do relatorio;
5. garantir que linhas de historico/alta continuem excluidas;
6. criar testes de parser com tratamento, atendimento imediato, observacao vazia, acentos e historico.

Criterios de aceite:

- uma observacao preenchida aparece no PDF da equipe correta;
- observacao vazia nao cria linha ou espaco extra;
- caracteres acentuados e separadores CSV sao preservados;
- altas/historico nao reaparecem;
- os relatorios de todas as modalidades continuam sendo gerados.

## Fase 2 - Organizacao fisica e modularizacao inicial

Objetivo: ter uma unica fonte de verdade e separar arquivos editaveis de artefatos gerados.

Estrutura-alvo:

```text
dashboard-olympico/
|-- src/
|   |-- client/
|   |   |-- index.html
|   |   |-- app.js
|   |   `-- styles.css
|   `-- server/
|       |-- index.js
|       |-- config/
|       |-- integrations/
|       |-- domain/
|       `-- reports/
|-- assets/
|   `-- olympico-crest.png
|-- data/
|   |-- reference/
|   `-- templates/
|-- docs/
|   |-- CONTEXTO.md
|   |-- PLANO-IMPLEMENTACAO.md
|   |-- guides/
|   `-- integrations/
|-- scripts/
|-- output/
|   `-- reports/
|-- dist/
|-- package.json
`-- README.md
```

Sequencia segura:

1. criar ponto de restauracao/versionamento;
2. centralizar caminhos em uma configuracao unica;
3. mover primeiro assets e dados, atualizando referencias;
4. mover o cliente e ajustar servidor, PWA e build;
5. extrair do servidor apenas os modulos de fisioterapia e relatorios nesta fase;
6. direcionar PDFs para `output/reports/`;
7. arquivar ou remover copias antigas somente depois de comparar e validar;
8. manter `dist/` e pasta de entrega como saidas recriaveis e ignoradas.

Criterios de aceite:

- `npm start`, atalhos `.cmd`, PWA, API e exportacao PDF funcionam nos novos caminhos;
- o build recria `dist/` sem depender de arquivos copiados manualmente;
- nenhuma copia de distribuicao precisa ser editada para alterar o produto;
- relatorios novos nao aparecem soltos na raiz.

## Fase 3 - API e area de Fisioterapia

Objetivo: tornar a fisioterapia visivel e util dentro do dashboard.

Escopo proposto:

- rota dedicada, por exemplo `GET /api/physiotherapy`, com filtros por modalidade e equipe;
- item `Fisioterapia` na navegacao lateral;
- KPIs de atletas em tratamento, vetos completos/parciais, casos por semaforo e atendimentos imediatos;
- lista por atleta com equipe, lesao, fase, semaforo, vetos e observacoes;
- filtros por modalidade, equipe, status/semaforo e busca por atleta;
- estado vazio, erro de integracao e data da ultima atualizacao;
- leitura somente nesta entrega; edicao da planilha continua no Google Sheets.

Contrato JSON inicial sugerido:

```json
{
  "updatedAt": "ISO-8601",
  "items": [
    {
      "athleteName": "Nome",
      "teamName": "SUB-17",
      "modalityId": "basquete",
      "section": "Em tratamento",
      "injury": "Lesao",
      "severity": "AMARELO",
      "phase": "4",
      "trainingVeto": "SIM, PARCIAL",
      "pfVeto": "NAO",
      "conduct": "",
      "painScale": "",
      "observations": "Texto livre"
    }
  ]
}
```

Criterios de aceite:

- contagens do dashboard batem com os registros ativos da planilha;
- filtros nao misturam categorias de modalidades diferentes;
- observacoes aparecem sem truncar o acesso ao texto completo;
- dados clinicos nao sao persistidos no navegador.

## Fase 4 - Redesign flat e esportivo

Objetivo: aplicar a referencia visual sem perder densidade informacional ou legibilidade.

Sistema visual:

- fundo principal claro e superficies solidas;
- azul-marinho institucional para navegacao e cabecalhos;
- azul/roxo para informacao e series principais;
- vermelho Olympico para acao, prioridade e destaque controlado;
- amarelo e verde reservados a status;
- sombras curtas e discretas, bordas simples, raios moderados;
- tipografia forte em titulos e numerais, com espacamento consistente;
- icones lineares e motivos esportivos geometricos discretos.

Ordem de implementacao:

1. tokens de cor, tipografia, espacamento, raio e sombra;
2. shell, navegacao, topo e filtros;
3. cards de KPI e estados clinicos;
4. cards de atletas/equipes e detalhes;
5. graficos e legendas;
6. area de Fisioterapia;
7. login, drawer e calendario;
8. responsividade para notebook, tablet e celular.

Criterios de aceite:

- contraste minimo WCAG AA para texto e controles essenciais;
- interface utilizavel em 1366x768, tablet e celular;
- cor nao e o unico meio de comunicar semaforo ou alerta;
- nenhuma informacao ou acao existente desaparece no redesign;
- relatorio impresso mantem seu CSS independente do dashboard.

## Fase 5 - Validacao e distribuicao

Checklist:

- testes unitarios do parser e normalizacao de equipes;
- smoke test das rotas `/`, `/api/athletes`, `/api/physiotherapy`, `/print-report` e exportacoes;
- comparacao de contagens entre planilhas, API, dashboard e PDF;
- teste de impressao de equipe com e sem fisioterapia;
- teste do executavel portatil e acesso por outro dispositivo na rede;
- verificacao do service worker/cache apos mudanca de caminhos;
- revisao de teclado, foco, labels, contraste e estados vazios;
- regeneracao limpa de `dist/` e da pasta de entrega.

## Registro de decisoes e atualizacoes

Ao finalizar uma fase:

1. alterar o status na tabela `Estado geral`;
2. registrar data, arquivos alterados e validacoes executadas nesta secao;
3. atualizar `Estado atual` e `Decisoes vigentes` em `docs/CONTEXTO.md`;
4. anotar qualquer desvio de escopo antes de iniciar a fase seguinte.

### 2026-08-06

- A raiz foi definida como fonte de verdade temporaria.
- A integracao de observacoes sera entregue antes da reorganizacao e do redesign.
- A area de Fisioterapia sera inicialmente somente leitura.
- A reorganizacao sera incremental porque scripts, PWA, executavel e exportacao usam caminhos da raiz.
- Fase 1 concluida em `server.js`: aliases de observacao, propriedade `observations` separada e bloco visual proprio no relatorio.
- Criado `tests/physiotherapy.test.js` com quatro cenarios e comando `npm test`.
- Validacao ao vivo: `/print-report` retornou 200 e exibiu uma observacao publicada na planilha de Basquete.
- Validacao de PDF: `/api/export-pdf` retornou `application/pdf`, assinatura `%PDF-` e 228.609 bytes para `BASQUETE SUB-13`.
- Fase 2 iniciou um repositorio Git e registrou a base anterior no commit `070166e`.
- Codigo-fonte movido para `src/client/` e `src/server/`; caminhos do servidor centralizados em `src/server/config/paths.js`.
- Escudo movido para `assets/`; cadastros e modelos movidos para `data/reference/` e `data/templates/`.
- Guias operacionais movidos para `docs/guides/`; relatorios e releases passaram para `output/`.
- Snapshot divergente do GitHub preservado em `archive/legacy-snapshots/`.
- Scripts, atalhos, PWA, testes, pacote portatil e release foram atualizados para os novos caminhos.
- Validacao do servidor-fonte: pagina, asset, manifesto, service worker, API e relatorio responderam 200.
- Validacao do executavel: launcher encerrou corretamente, pagina e asset responderam 200, e a API retornou 144 atletas em 14 equipes.
- `npm test` passou com quatro testes; `npm run reports:kit -- --dry-run` confirmou a nova saida em `output/reports/`.
- Fase 3 criou `GET /api/physiotherapy`, com filtros opcionais por modalidade/equipe e resumo de secoes, semaforos e vetos.
- O modelo clinico passou a expor lesao, secao, fase, vetos, conduta, dor e observacoes separadamente.
- Adicionado workspace `Fisioterapia` com seis KPIs, busca, filtros e cartoes clinicos somente leitura.
- Dados clinicos nao sao persistidos no navegador; textos livres sao escapados antes da renderizacao.
- A API real retornou 37 registros, 5 modalidades, 9 categorias e 7 observacoes; filtro Basquete/Sub-17 retornou 4 casos.
- Modalidade invalida foi validada com resposta 400.
- Suite ampliada para dez testes automatizados, incluindo contrato, filtros, seguranca do texto e responsividade estrutural.
- A validacao visual interativa no navegador integrado nao esteve disponivel nesta sessao; foram executadas validacoes HTTP, DOM, CSS responsivo e eventos declarados.
