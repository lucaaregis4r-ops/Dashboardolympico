# Plano de integracao da presenca da preparacao fisica

> Criado em 2026-08-21. Este documento registra o escopo e o andamento da integracao das novas planilhas de presenca.

## Decisao de arquitetura

A base atual de atletas, carga e check-ins sera mantida como fonte principal. Ela nao sera substituida, mesclada fisicamente ou reinterpretada pelas planilhas de presenca.

As planilhas de chamada da preparacao fisica serao fontes suplementares e independentes. O cruzamento acontecera somente na camada de aplicacao, por modalidade, categoria e identidade normalizada do atleta.

## Fontes de presenca

A pasta de origem e `1JWrUMVtkYrH2geuaoPN3hiFWz4zncno0` e contem cinco planilhas:

| Modalidade | Abas utilizadas | Categorias do dashboard |
| --- | --- | --- |
| Basquete | `B14`, `B15`, `B16`, `B17` | Sub-14, Sub-15, Sub-16 e Sub-17 |
| Natacao | `NAT JUV`, `NAT JR` | Juvenil e Junior |
| Volei feminino | `VF 15`, `VF 16`, `VF 17`, `VF 19` | Sub-15, Sub-16, Sub-17 e Sub-19 |
| Volei masculino | `VM 15`, `VM 16`, `VM 17`, `VM 19` | Sub-15, Sub-16, Sub-17 e Sub-19 |
| Futsal | `F15`, `F17` | Sub-15 e Sub-17 |

Abas `PSR`, `PSE` e `Pagina6` ficam explicitamente fora da importacao de presenca.

## Plano de implementacao

| Etapa | Entrega | Status |
| --- | --- | --- |
| 1 | Configurar e validar as fontes sem substituir a base atual | Concluida em 2026-08-21; 16 abas publicas validadas |
| 2 | Criar o importador e normalizador dos registros de presenca | Concluida em 2026-08-21 |
| 3 | Adicionar API e area de Preparacao Fisica ao dashboard | Concluida em 2026-08-21 |
| 4 | Incluir a presenca semanal nos relatorios de cada Sub | Concluida em 2026-08-21 |
| 5 | Unificar identidades, validar e atualizar para `2.1.2` | Concluida em 2026-08-21; commit nao criado |

## Etapa 1 - Configuracao e validacao

Implementado:

- registro central da base principal com papel `primary`;
- cadastro das cinco planilhas de presenca com papel `supplementary`;
- mapeamento explicito das 16 abas validas para as categorias do dashboard;
- lista explicita das abas ignoradas;
- validacao contra IDs, abas ou categorias duplicadas;
- comando `npm run sources:validate` para testar a configuracao e a leitura publica das abas;
- testes automatizados que impedem que a base principal seja cadastrada como presenca.

Esta etapa nao adiciona presenca a API, ao dashboard ou aos relatorios. A URL e o fluxo da base principal permanecem os mesmos.

### Resultado da validacao online

Em 2026-08-21, depois da liberacao de leitura por link, o comando `npm run sources:validate` confirmou acesso publico as cinco fontes e as 16 abas. O importador foi validado com 320 nomes de chamada e 3.501 registros de presenca ate 2026-08-21.

## Etapa 2 - Importador e normalizador

Implementado:

- parser de CSV independente para as fontes suplementares;
- deteccao do cabecalho `ATLETA` nas primeiras linhas, sem posicao fixa;
- leitura dos blocos de mes e dia e conversao para datas ISO;
- suporte a virada de ano em planilhas organizadas do mes mais recente para o mais antigo;
- deduplicacao de datas repetidas com aviso de qualidade da fonte;
- normalizacao de nome, modalidade, categoria, planilha, aba, data e presenca;
- identificacao de sessao realizada quando ao menos um atleta tem presenca marcada;
- retorno de falhas por categoria sem interromper as outras fontes;
- janela de atividade alterada de 70 para 20 dias; a composicao com a presenca foi concluida na etapa 3.

O importador e consumido diretamente pela API. Ele aceita tanto o cabecalho original em duas linhas quanto o cabecalho achatado entregue pelo CSV publico do Google Sheets.

## Etapa 3 - API, dashboard e conciliacao de identidades

Implementado:

- endpoint `GET /api/attendance` com resumo, filtros, percentuais semanais e situacao das fontes;
- area `Preparacao fisica` no dashboard com busca e filtros por modalidade, equipe e conciliacao;
- arquivo `attendance.json` no build estatico do GitHub Pages;
- cache de cinco minutos para evitar 16 leituras repetidas a cada consulta;
- unificacao das 16 categorias entre as duas bases por uma chave normalizada de equipe;
- conciliacao automatica apenas para nomes exatos ou abreviacoes unicas dentro da mesma equipe;
- sugestoes de grafia separadas para revisao, sem associacao automatica;
- regra dos 20 dias calculada pela atividade mais recente entre o check-in da base principal e a presenca suplementar vinculada com seguranca.

### Resultado da verificacao de nomes e equipes

As 16 equipes das planilhas de presenca possuem correspondencia com as categorias da base principal depois da normalizacao de acentos, espacos e formato do nome da categoria.

Na leitura autenticada realizada em 2026-08-21, foram encontrados 320 nomes nas listas de chamada e 274 atletas distintos na base principal. Apenas 71 nomes coincidem literalmente entre as fontes. Os demais incluem nomes abreviados, nomes completos, divergencias de grafia e atletas presentes em somente uma das bases. Por isso, aproximacoes incertas ficam visiveis como `Revisar` ou `Sem cadastro` e nao reativam atletas.

A API mantem a base principal disponivel mesmo se uma fonte suplementar falhar e identifica separadamente equipes sem cobertura de presenca.

## Etapa 4 - Presenca semanal nos relatorios por Sub

Implementado:

- indicador `Presenca PF (7 dias)` em cada relatorio de categoria;
- percentual calculado pela soma das presencas dividida pela soma das oportunidades nas sessoes validas da categoria;
- numerador e denominador exibidos junto ao percentual para permitir conferencia;
- estado `Sem sessao` quando a categoria nao possui sessao valida na janela;
- estado `Indisponivel` quando a fonte suplementar da categoria nao pode ser lida;
- coluna `Presenca PF` no panorama geral de cada modalidade;
- kit semanal alterado para gerar 16 PDFs, um para cada categoria configurada;
- Natacao Juvenil/Junior e Futsal Sub-15/Sub-17 deixam de ser consolidados em um unico PDF por modalidade.

O calculo coletivo do Sub utiliza todos os nomes registrados na chamada, mesmo quando um atleta ainda precisa de revisao de identidade. A conciliacao com a base principal continua sendo exigida somente para alterar a situacao de atividade individual pela regra dos 20 dias.

## Etapa 5 - Unificacao, revisao e versao

Implementado:

- 16 equipes confirmadas como correspondentes nas duas bases pela mesma chave canonica;
- 320 nomes de chamada comparados com 281 atletas distintos da base principal na leitura de 2026-08-21;
- 259 identidades aprovadas persistidas no projeto: 206 conciliacoes seguras, 17 aprovacoes manuais e 36 correspondencias confirmadas no pente fino;
- overrides aprovados passam a ter prioridade sobre a conciliacao automatica;
- 61 casos sem evidencia suficiente mantidos fora da atividade individual ate nova revisao humana;
- 259 nomes de chamada vinculados aos atletas da base principal e 61 mantidos para revisao;
- regra combinada de 20 dias validada com as 16 equipes carregadas: 182 atletas ativos e 99 inativos na sincronizacao de 2026-08-21;
- planilha `Unificacao de atletas e equipes - Olympico 2026` criada na pasta original do Drive;
- aba `Atletas` com filtros, cores de status e dropdown para decisao final;
- aba `Equipes` com as 16 correspondencias canonicas;
- duas divergencias de categoria confirmadas pelo nome exato foram registradas com a equipe canonica da base principal;
- atletas inativos continuam visiveis na base e recebem a marcacao `INATIVO`, sem serem removidos da API;
- versao do projeto atualizada para `2.1.2` e cache PWA atualizado para `v10`.

Planilha de revisao: `https://docs.google.com/spreadsheets/d/1A-B0WNGsiQa-yZsPsoUNieP926QqfioV-WDX9zEdIlw/edit`

### Como revisar

Na aba `Atletas`, use a coluna `decisao_final`:

- `APROVADO`: confirma o nome sugerido; preencha ou ajuste `nome_canonico_final`;
- `REVISAR`: mantem o caso pendente;
- `NOVO ATLETA`: confirma que o nome existe somente na chamada;
- `IGNORAR`: marca uma linha duplicada ou operacional que nao representa um atleta.

As bases originais permanecem intactas. As decisoes aprovadas foram sincronizadas em `src/server/config/athlete-identity-reviewed.json`; novos casos aprovados na planilha devem ser incorporados a esse arquivo antes da publicacao seguinte.

## Criterios de aceite gerais

- a API atual de atletas retorna os mesmos dados antes e depois da integracao;
- indisponibilidade de uma fonte de presenca nao derruba a base principal;
- nenhuma aba administrativa e interpretada como chamada;
- percentuais do dashboard e do PDF batem com uma amostra conferida nas planilhas;
- dados estaticos do GitHub Pages deixam claro quando foram sincronizados;
- alteracoes existentes no repositorio nao relacionadas a esta integracao sao preservadas.
