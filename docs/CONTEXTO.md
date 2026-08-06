# Contexto do Dashboard Olympico

> Documento vivo. Ultima revisao: 2026-08-06.
> O andamento da modernizacao fica em `docs/PLANO-IMPLEMENTACAO.md`.

## Estado atual

- Fase ativa: Fase 6 - homologacao visual e operacional. A rede local foi aprovada; falta a conferencia humana da interface.
- Ultima entrega: validacao final, acessibilidade, PWA e pacote portatil Windows.
- Fonte de verdade do cliente: `src/client/`.
- Fonte de verdade do servidor: `src/server/`.
- Assets compartilhados ficam em `assets/`; dados de referencia e modelos ficam em `data/`.
- Relatorios e releases gerados ficam em `output/`; `dist/` continua sendo um build recriavel.
- O snapshot antigo do GitHub foi preservado em `archive/legacy-snapshots/` e nao deve ser editado.
- O projeto agora possui repositorio Git. O commit `070166e` registra a base funcional anterior a reorganizacao.

## Pedido de modernizacao - 2026-08-06

O trabalho atual tem quatro objetivos:

1. organizar o projeto e separar codigo-fonte, documentacao, dados, saidas e pacotes gerados;
2. ler o novo campo `OBSERVACOES` da planilha de fisioterapia e inclui-lo nos relatorios;
3. criar uma area de Fisioterapia no dashboard, com indicadores e registros ativos por modalidade/equipe;
4. modernizar a interface com linguagem flat, profissional e esportiva, usando a identidade do Olympico.

Direcao visual aprovada como referencia:

- composicao flat e limpa, com hierarquia forte e pouco ruido;
- azul-marinho como base institucional, azul/roxo do escudo como apoio e vermelho como destaque;
- superficies claras no conteudo, alto contraste e graficos com paleta consistente;
- formas geometricas e detalhes esportivos discretos;
- evitar excesso de gradientes, transparencias, sombras pesadas e cantos exageradamente arredondados.

## Sistema visual flat

- O CSS estrutural permanece em `src/client/styles.css`.
- O tema visual fica isolado em `src/client/theme-flat.css` e e carregado depois do CSS estrutural.
- Fundo do conteudo: cinza muito claro `#f1f3f8`; superficies principais: branco.
- Navegacao e elementos institucionais: azul-marinho `#171d49`.
- Cor de apoio: azul/roxo `#4246a6`.
- Acoes e prioridades: vermelho `#df3046`, ajustado para contraste AA sobre branco.
- Status continuam usando verde, amarelo e vermelho com rotulo textual; a cor nao e o unico sinal.
- Raios foram reduzidos, sombras ficaram curtas e gradientes antigos foram neutralizados pelo tema.
- Detalhes esportivos usam faixas e formas diagonais discretas na navegacao, login e cabecalho da fisioterapia.
- Graficos usam uma paleta menos neon, com eixos e legendas adaptados para superficies claras.
- Existe tratamento de `prefers-reduced-motion` e foco visivel reforcado.
- Contrastes verificados: azul-marinho/branco 16,05:1; texto/branco 15,21:1; texto secundario/branco 4,67:1; vermelho/branco 4,52:1; azul de apoio/branco 7,90:1.
- O service worker usa cache `dashboard-olympico-v6` e inclui `theme-flat.css`.

## Estrutura atual

- O front-end estatico usa `src/client/index.html`, `src/client/styles.css` e `src/client/app.js`.
- O back-end usa Node.js sem framework em `src/server/index.js`.
- Caminhos do servidor foram centralizados em `src/server/config/paths.js`.
- `src/server/index.js` ainda concentra API, integracoes Google Sheets, regras de negocio, HTML/CSS do relatorio e exportacao PDF; a extracao por dominio continuara junto das proximas funcionalidades.
- `src/client/app.js` ainda concentra estado, filtros, renderizacao, graficos e eventos da interface.
- O escudo oficial usado pela interface fica em `assets/olympico-crest.png`.
- Cadastros ficam em `data/reference/` e modelos editaveis em `data/templates/`.
- Relatorios antigos foram preservados em `output/reports/`; a pasta de entrega fica em `output/releases/`.
- `dist/` e inteiramente recriavel pelo build e mantem a mesma arvore `src/`, `assets/` e `docs/`.

## Contrato atual da fisioterapia

- Planilha: `1RzfD3RM0PEBXCPZdthVeIWu7G0mYIENlsP1_ToV6Xzs`.
- Cada modalidade possui uma aba identificada por GID.
- Em 2026-08-06, a secao `ATLETAS EM TRATAMENTO` da aba de Basquete publicou as colunas `NOME`, `CATEGORIA`, `LESAO`, `GRAVIDADE`, `FASE DO TRATAMENTO`, `VETO TREINO`, `VETO PF` e `OBSERVACOES`.
- A secao `ATENDIMENTOS IMEDIATOS DA SEMANA` usa `NOME`, `CATEGORIA`, `LESAO`, `ESCALA DE DOR` e `CONDUTA`.
- Secoes de historico e altas devem continuar excluidas do relatorio ativo.
- O parser le fase, vetos, conduta, escala de dor e os aliases `Observacoes`, `Observações`, `Observacao`, `Observação`, `Obs` e `Notes`.
- O modelo interno mantem `observations` separado de `notes`, permitindo exibicao, filtro e evolucao futura sem perder semantica.
- O relatorio mostra observacoes somente quando preenchidas, com rotulo claro e escape de HTML.

## Fisioterapia no dashboard

- Rota: `GET /api/physiotherapy`.
- Filtros opcionais da API: `modality=<id>` e `team=<categoria>`.
- Resposta: data da consulta, modalidades, categorias, resumo e registros ativos.
- Cada registro expoe separadamente `section`, `injury`, `severity`, `phase`, `trainingVeto`, `pfVeto`, `conduct`, `painScale` e `observations`.
- A API agrega em tratamento, atendimentos imediatos, semaforos e vetos completos/parciais.
- A interface possui item `Fisioterapia` na navegacao lateral.
- A tela oferece busca e filtros por modalidade, categoria e semaforo.
- Os indicadores e a lista reagem aos filtros sem consultar novamente a planilha.
- Dados clinicos permanecem apenas em memoria durante a sessao e nao sao gravados no `localStorage`.
- Observacoes usam escape de HTML e aparecem integralmente nos cartoes.
- Em 2026-08-06, a API real retornou 37 registros ativos, 5 modalidades, 9 categorias e 7 registros com observacoes.
- O service worker usa cache `dashboard-olympico-v6` para distribuir a interface atual.

## Decisoes vigentes

- A modernizacao sera entregue por fases pequenas e validaveis, conforme `docs/PLANO-IMPLEMENTACAO.md`.
- A primeira mudanca funcional, campo de observacoes no relatorio, foi concluida em 2026-08-06.
- A reorganizacao de pastas nao sera feita como uma movimentacao em massa: primeiro os caminhos serao centralizados, depois os arquivos serao movidos e os builds validados.
- O novo dashboard de fisioterapia consumira uma rota JSON dedicada, em vez de duplicar no navegador a leitura e as regras da planilha.
- A area de Fisioterapia foi entregue como consulta somente leitura; edicao continua no Google Sheets.
- Pacotes gerados e copias para entrega nunca serao fonte de verdade.
- Este documento deve ser atualizado ao fim de cada fase com data, decisoes e proximos passos.

## Validacao final da modernizacao

- Em 2026-08-06, a suite final passou com 17 testes automatizados.
- O servidor-fonte respondeu 200 para a interface, CSS, JavaScript, manifesto, service worker, escudo e APIs.
- A API retornou 144 atletas, 14 equipes e 37 registros de fisioterapia; 7 registros continham observacoes.
- O filtro de fisioterapia `basquete` + `SUB-17` retornou 4 registros e modalidade invalida retornou 400.
- Tentativas HTTP de acessar `package.json` fora da area publica retornaram 404.
- O relatorio com fisioterapia confirmou o campo `Observacoes`; o cenario sem registros exibiu o estado vazio esperado.
- Os dois PDFs testados retornaram `application/pdf` com assinatura `%PDF-`.
- O executavel portatil reconstruido respondeu 200 para pagina, tema, PWA e APIs.
- O pacote respondeu 200 para pagina, manifesto e APIs por `127.0.0.1` e pelo IP local `10.0.0.155`, com bind em `0.0.0.0`.
- O checklist completo esta em `docs/VALIDACAO-FINAL.md`.
- Permanecem para homologacao humana a inspecao visual em navegador real e o acesso por um segundo dispositivo fisico; o navegador integrado nao estava disponivel nesta sessao.

## Objetivo

Este projeto e um dashboard web simples para acompanhar atletas do Olympico Club a partir de uma planilha publica do Google Sheets. Hoje o foco principal da aplicacao e consolidar os check-ins mais recentes dos atletas e transformar isso em visualizacoes e relatorios.

## Como o projeto funciona

1. O front-end fica em `src/client/index.html`, `src/client/styles.css` e `src/client/app.js`.
2. O servidor local fica em `src/server/index.js`.
3. O servidor baixa a planilha publica do Google Sheets em CSV pela constante `SHEET_CSV_URL`.
4. O CSV bruto e transformado em uma lista consolidada de atletas com:
   - nome
   - categoria
   - historico de check-ins
   - status atual
   - metricas de carga, dor, fadiga, sono e estresse
   - status ativo por recencia: atletas sem check-in nos ultimos 30 dias, contando da data mais recente da base, ficam inativos
5. O dashboard consome esses dados prontos para montar as telas e o relatorio de impressao.

## Arquivos principais

- `src/server/index.js`: baixa as planilhas, transforma os dados, serve a API e gera relatorios.
- `src/client/app.js`: renderiza a interface e consome os dados do servidor.
- `src/client/index.html`: estrutura principal da pagina.
- `src/client/styles.css`: estilos do dashboard.
- `data/reference/athletes.csv`: cadastro consolidado de atletas com identificador proprio.
- `data/templates/physiotherapy-attendances.csv`: modelo de planilha para registrar atendimentos.
- `docs/guides/relatorio-semanal-fisioterapia-modelo.md`: modelo de documento semanal da fisioterapia.
- `scripts/export-athletes.js`: atualiza `data/reference/athletes.csv`.
- `scripts/create-physio-weekly-report.js`: gera um relatorio semanal em Markdown a partir da planilha de atendimentos.
- `scripts/create-report-kit.js`: gera automaticamente o kit de PDFs por equipe/modalidade em uma pasta datada.

## Fonte de dados atual

- Planilha publica: Google Sheets
- URL usada pelo sistema:

`https://docs.google.com/spreadsheets/d/15B29MdEXNsDVq4fCJVUffznul--C1Mb5B7pZtmWqmOY/export?format=csv&gid=1847097737`

- Planilha de demandas da fisioterapia integrada ao relatorio:

`https://docs.google.com/spreadsheets/d/1RzfD3RM0PEBXCPZdthVeIWu7G0mYIENlsP1_ToV6Xzs/edit?gid=0#gid=0`

- Planilha de demandas da psicologia integrada ao relatorio:

`https://docs.google.com/spreadsheets/d/1ZUFyKxUvvxZ41sVGIwr3ophT39SSKjrXDdlnq_S2vI0/export?format=csv&gid=1746478381`

- A fisioterapia agora fica em uma planilha propria com uma aba para cada modalidade.
- O servidor le a fisioterapia preferencialmente por `export?format=csv&gid=<gid>`; isso evita o fallback silencioso do Google Sheets, que devolve a primeira aba quando o nome da aba nao e encontrado.
- GIDs confirmados da fisioterapia: `BASQUETE` = `0`, `VOLEIBOL MASC` = `956162552`, `VOLEIBOL FEM` = `1581953087`, `FUTSAL` = `1577881056`, `NATACAO` = `613790653`.
- Cada aba da fisioterapia pode ter as secoes `ATLETAS EM TRATAMENTO` e `ATENDIMENTOS IMEDIATOS DA SEMANA`.
- A secao de tratamento usa colunas como `NOME`, `CATEGORIA`, `LESAO`, `GRAVIDADE`, `FASE DO TRATAMENTO`, `VETO TREINO` e `VETO PF`.
- A secao de atendimentos imediatos usa colunas como `NOME`, `CATEGORIA`, `LESAO`, `ESCALA DE DOR` e `CONDUTA`.
- As categorias da fisio podem vir como `SUB-14`; o relatorio cruza com equipes completas da modalidade, como `BASQUETE SUB-14`, depois que a modalidade ja foi selecionada.
- O relatorio geral da modalidade deve incluir tambem equipes que aparecem somente na fisioterapia e nao possuem registros de carga/check-in; nesses casos, o servidor cria uma pagina clinica sintetica, por exemplo `BASQUETE SUB-13` ou `VOLEI FEM SUB-14`.
- Quando a equipe ja existe na base de carga, os registros de `ATLETAS EM TRATAMENTO` e `ATENDIMENTOS IMEDIATOS DA SEMANA` entram no cartao de Fisioterapia da propria pagina de carga da equipe.
- Quando a equipe existe apenas na fisioterapia, a pagina deve ser marcada como relatorio de fisioterapia e explicar que nao ha base de carga suficiente para os paineis de carga, recuperacao, estresse e baseline.
- A planilha de psicologia continua na planilha antiga, aba `Psicologia` com `gid=1746478381`.
- A aba de psicologia usa as colunas `Nome do atleta`, `Equipe`, `Demanda` e `Obs`.
- Essas planilhas nao substituem a planilha principal de check-ins/carga; apenas alimentam os cartoes de Fisioterapia e Psicologia em cada pagina de equipe do relatorio.

## Padrao de identificacao de atletas

O arquivo `data/reference/athletes.csv` usa um `athlete_id` proprio para facilitar integracoes futuras, especialmente com:

- planilha de atendimentos da fisioterapia
- relatorios semanais
- historico por atleta
- cruzamento entre modalidades e categorias

Formato atual:

- `ath-<categoria-normalizada>-<nome-normalizado>`
- se houver duplicidade, o sistema adiciona sufixos como `-2`, `-3`

## Fluxo sugerido para a fisioterapia

1. Atualizar o cadastro de atletas:

`node scripts/export-athletes.js`

2. Registrar cada atendimento em `data/templates/physiotherapy-attendances.csv`, sempre usando o `athlete_id`.

3. Gerar um relatorio automatico com:

`node scripts/create-physio-weekly-report.js 2026-S22`

4. Se preferir ajuste manual, usar `docs/guides/relatorio-semanal-fisioterapia-modelo.md` como base.

## Melhorias futuras recomendadas

- criar rota no servidor para expor o cadastro de atletas em JSON
- criar importacao automatica dos atendimentos da fisioterapia
- gerar o relatorio semanal automaticamente a partir da planilha de atendimentos
- adicionar filtros por modalidade, profissional e status de retorno

## Distribuicao do dashboard

- O servidor agora escuta em `HOST=0.0.0.0` por padrao, para permitir acesso de celulares na mesma rede Wi-Fi.
- Se a porta padrao `3000` estiver ocupada e `PORT` nao tiver sido definido manualmente, o servidor tenta automaticamente as proximas portas.
- Ao iniciar, o servidor imprime `http://localhost:<porta>` para o computador e tambem links `http://<ip-local>:<porta>` para celular.
- Para Windows, o caminho recomendado passou a ser um pacote portatil em `dist`, com `Dashboard-Olympico.exe` como launcher e `runtime/node.exe` embutido.
- O fluxo com `@yao-pkg/pkg` ficou apenas como opcional/experimental em `build:pkg`, porque o executavel gerado pelo `pkg` pode ficar preso antes de subir a porta nesta maquina.
- Scripts adicionados no `package.json`: `start:open`, `build:win` e `build:portable`.
- O `build:win` roda `scripts/create-portable-windows.js`, que copia os arquivos do dashboard, baixa/copia `node.exe` para `dist/runtime` e compila um launcher com `csc.exe`.
- Em 2026-06-16, o pacote portatil foi validado: `dist/Dashboard-Olympico.exe` iniciou o servidor, `/` respondeu 200 e `/api/athletes` respondeu 200.
- `downloadText` em `src/server/index.js` tem timeout de 30 segundos para evitar que o executavel fique preso indefinidamente quando uma planilha demora ou a rede oscila.
- Atletas ficam fora da API, das medias de equipe, dos alertas e dos relatorios quando o ultimo check-in tem mais de 30 dias em relacao a data mais recente da planilha principal; se voltarem a responder, entram automaticamente de novo.
- O `build:pkg` usa `node22-win-x64`, porque o cache remoto `@yao-pkg/pkg-fetch` tag `v3.6` tem binarios Windows para Node 22/24/26, mas nao para `node-v20.20.2-win-x64`.
- Arquivo amigavel para compilar: `COMPILAR-EXECUTAVEL.cmd`, que roda `npm run build:win` sem `npm install`.
- Arquivo amigavel para abrir o executavel gerado: `ABRIR-EXECUTAVEL.cmd`.
- Guia de distribuicao fica em `docs/guides/DISTRIBUICAO.md`.
- `scripts/create-delivery-folder.js` cria `output/releases/ENTREGAR-DASHBOARD-OLYMPICO`, copiando tudo de `dist` e adicionando `LEIA-ME.txt`.
- A validacao historica de 2026-06-16 foi feita na antiga pasta de entrega da raiz; desde a Fase 2, releases ficam em `output/releases/`.
- O executavel final esperado e `dist/Dashboard-Olympico.exe`; ao abrir, ele sobe o servidor e abre o navegador automaticamente.
- Quando empacotado, `src/server/config/paths.js` usa `path.dirname(process.execPath)` como raiz; portanto a pasta `dist` inteira deve ser copiada, nao apenas o `.exe`.
- `scripts/copy-dist-assets.js` copia `src/`, `assets/` e `docs/` para `dist` depois do build.
- Para celular, a abordagem definida e PWA/rede local, nao executavel nativo: o celular acessa o IP local do computador e pode usar `Adicionar a tela inicial`.
- Arquivos PWA adicionados: `manifest.webmanifest` e `service-worker.js`; o service worker cacheia a casca do app e mantem `/api/*` e `/print-report` sempre em rede.

## Contexto para programar o relatorio de equipe

- O relatorio visual/PDF fica em `src/server/index.js`, principalmente nas funcoes `buildPrintReportHtml`, `buildTeamReportSection`, `buildCoachSummaryHtml`, `buildBaselinePanelHtml` e `buildLineChartSvg`.
- A exportacao abre `/print-report?modality=<id>` a partir de `src/client/app.js`; para relatorio individual por equipe, usa tambem `team=<nome da equipe>`.
- O menu de exportacao oferece `Todas equipes` para a modalidade completa e botoes individuais para gerar relatorios separados por equipe.
- Para gerar o pacote semanal mais rapido, existe `scripts/create-report-kit.js` e o atalho `GERAR-KIT-RELATORIOS.cmd`. O kit cria uma pasta como `Relatórios 18 de junho` com PDFs de `BASQUETE SUB14`, `BASQUETE SUB 15`, `BASQUETE SUB16`, `BASQUETE SUB17`, `Natação`, `Futsal` e todas as equipes de volei separadas.
- `NATAÇÃO JUV` e `NATAÇÃO JUVENIL` devem ser tratadas como a mesma equipe, inclusive em categorias da planilha principal, demandas clinicas e selecao de relatorio.
- Para facilitar envio manual dos PDFs por Drive/WhatsApp, ainda existe `scripts/prepare-report-delivery.js` e o atalho `PREPARAR-ENVIO-RELATORIOS.cmd`. O script le uma pasta de PDFs, cria `_envio/controle-envio-relatorios.csv` para preencher treinador, telefone e link do Drive, e gera `_envio/links-whatsapp.md` com mensagens/links prontos.
- O PDF deve iniciar com uma pagina de panorama geral da modalidade, criada por `buildOverviewPageHtml`, comparando equipes por atletas, carga mediana da semana, recuperacao, estresse, atletas em atencao, fisioterapia, psicologia e sintese.
- Cada equipe e renderizada em `<section class="report-page report-page--team">`, com `page-break-after`/`break-after`; a pagina de equipe usa `overflow: visible` para poder ocupar ate duas paginas impressas sem cortar conteudo.
- O layout atual do miolo usa `.report-main-grid`: grafico de evolucao como um cartao compacto em `.report-panel--chart` e observacoes da semana em `.report-coach-grid`.
- As planilhas de demandas entram em `.report-clinical-grid`, com `.report-panel--physio` e `.report-panel--psychology`; a fisioterapia filtra por categoria/equipe dentro da modalidade selecionada.
- O semaforo da fisioterapia deve usar as classes `report-semaphore--green`, `report-semaphore--yellow` e `report-semaphore--red`.
- O grafico de evolucao deve ordenar datas como `Date`, filtrar a janela dos ultimos 90 dias e manter o eixo X em ordem crescente.
- A leitura da semana deve ser interpretativa, com sintese final, e nao repetir frases genericas.
- O bloco `Atletas para atencao` usa niveis `Prioridade alta`, `Prioridade media` e `Monitorar`, considerando percentil equipe, MM3, recuperacao e estresse.
- Casos vermelhos, vetados ou amarelos da fisioterapia devem permanecer apenas no cartao de Fisioterapia; nao usar alerta clinico destacado para treinadores.
- As paginas de equipe incluem `Encaminhamentos sugeridos` e `Nota metodologica`, explicando carga mediana da semana, MM3, percentil historico, percentil equipe e a natureza de autorrelato dos check-ins.
- O grafico nao deve voltar a ocupar uma faixa larga isolada; ele deve manter peso visual parecido com os cartoes de observacao.
- Para evitar quebra de pagina interna, manter os paineis com `break-inside: avoid` e revisar alturas/paddings quando adicionar novos blocos.
- O bloco de baseline deve permanecer compacto em uma grade horizontal, para fechar a leitura da equipe sem empurrar conteudo para uma segunda pagina.
- Ao ajustar visual do relatorio, priorizar mudancas dentro do CSS embutido de `buildPrintReportHtml`, porque esse CSS e especifico da impressao e nao interfere no dashboard principal.

## Pedido atual - registro de fisioterapia em lote

- Sempre verificar este arquivo de contexto antes de programar e atualiza-lo quando houver mudanca relevante.
- Nao alterar ainda o dashboard para salvar registros localmente.
- Primeiro passo correto: criar uma nova planilha no Google Drive/Google Sheets para a fisioterapia.
- Essa nova planilha sera integrada ao dashboard em um proximo passo, de forma parecida com a planilha atual de atletas.
- A planilha precisa permitir registrar atletas em lote e controlar quem esta "Em tratamento".
- Campos desejados para a futura integracao: atleta, categoria/equipe, status, fase, lesao, observacoes e historico de movimentacao.
- Foi criado um workbook unico em `data/templates/google-fisioterapia/modelo-fisioterapia-olympico.xls` com as abas `Atletas`, `Em_Tratamento`, `Historico_Movimentacoes` e `Listas`.
- O Apps Script `data/templates/google-fisioterapia/planilha-fisioterapia-appscript.gs` automatiza checkboxes, envio em lote, alta e historico.
- O workbook foi atualizado para preencher a aba `Atletas` com 278 atletas vindos de `data/reference/athletes.csv`, que e a base consolidada da planilha de carga/check-in.
- O script `scripts/create-physio-google-workbook.js` recria o XLS e tambem o XLSX quando a base de atletas mudar.
- Para uso normal, preferir `data/templates/google-fisioterapia/modelo-fisioterapia-olympico.xlsx`; o `.xls` e XML Spreadsheet e aparece como texto quando aberto no editor de codigo.
- A coluna `athlete_id` da planilha de fisioterapia deve usar os IDs oficiais de `data/reference/athlete-identifiers.csv` (`ATL001`, `ATL002`, etc.), cruzando por nome e categoria.
- Ajuste solicitado: a planilha de fisioterapia nao deve trazer dados de carga/check-in/dor; a aba `Atletas` deve conter apenas checkbox, ID oficial, nome, categoria e modalidade.
- Ajuste solicitado: marcar o checkbox da aba `Atletas` nao deve desmarcar automaticamente nem enviar sozinho; o envio em lote acontece pelo menu `Enviar selecionados`.
- Foi criada uma planilha equivalente para Psicologia em `data/templates/google-psicologia/`, com workbook `modelo-psicologia-olympico.xlsx` e Apps Script `planilha-psicologia-appscript.gs`.
- A planilha de Psicologia usa o mesmo fluxo: `Atletas` -> `Em_Acompanhamento` -> `Historico_Movimentacoes`, com listas de fase, demanda e risco.
- Ajuste solicitado: registros da fisioterapia que estejam abaixo da secao de historico/altas nao devem entrar nos relatorios; altas fora do historico devem ser registradas normalmente.
- Em 2026-07-03, a planilha real foi conferida pelos GIDs da fisioterapia. O titulo `HISTORICO DE ATENDIMENTOS IMEDIATOS ANTERIORES + ALTAS` contem o texto `ATENDIMENTOS IMEDIATOS`, entao a regra de exclusao de historico/altas precisa ter prioridade antes de reconhecer a secao ativa de atendimentos imediatos.
