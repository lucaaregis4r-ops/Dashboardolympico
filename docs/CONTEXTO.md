# Contexto atual do Dashboard Olympico

## Arquitetura

- `src/server/index.js` fornece API, integrações de planilhas e HTML/PDF dos relatórios.
- `src/client/` contém dashboard, PWA e `analysis.js`, módulo de regras analíticas compartilhado pelo servidor e pelo navegador.
- `src/server/integrations/attendance.js` e `domain/attendance-reconciliation.js` conciliam presença da preparação física com o elenco.
- `scripts/create-report-kit.js` produz os PDFs das 16 categorias. `scripts/create-github-pages.js` cria a edição estática e `scripts/verify-github-pages.js` a valida.
- `output/`, `dist/` e `dist-linux/` são artefatos gerados e ignorados pelo Git.

## Fontes e identidade

A fonte principal é a planilha pública de check-ins configurada em `src/server/config/data-sources.js`. Cinco planilhas suplementares de presença cobrem 16 categorias. Fisioterapia é lida por modalidade; psicologia permanece em sua fonte separada. A conciliação de nomes preserva identidades aprovadas e o alias `NATAÇÃO JUV` / `NATAÇÃO JUVENIL`. Equipes clínicas sem base de check-in continuam recebendo relatório clínico.

Atletas inativos e com status ainda não confirmado continuam na API, na busca e no histórico. Elegibilidade analítica depende exclusivamente do check-in primário, não do status de presença. A janela de atividade do elenco é de 20 dias. Indicadores da semana e atenção usam 7 dias; a evolução usa 90 dias.

## Metodologia vigente

`loadScore` permanece como chave de dados por compatibilidade, mas aparece como **Desgaste percebido**. Sua fórmula combina autorrelatos de dor, fadiga, sono, dor muscular, estresse e humor. Não representa carga externa nem intensidade de treino.

Na planilha real, `[SONO]` vai de `1 - MUITO TRANQUILO` a `5 - INSÔNIA`, e `[HUMOR]` vai de `1 - MUITO BOM HUMOR` a `5 - MUITO TRISTE`. A recuperação inverte ambos; dor 0 contribui 5 e dor 10 contribui 0. Valores maiores significam melhor recuperação percebida.

A média das três últimas respostas é comparada apenas a janelas históricas anteriores. O percentil pessoal exige ao menos seis janelas anteriores. O percentil da equipe exige seis atletas elegíveis com valor válido e nunca produz alerta isolado. A atenção usa sinal absoluto forte (dor >= 6 ou recuperação <= 2,2), persistência em duas das três respostas, desvio pessoal e combinação entre domínios. Cada atleta aparece uma vez.

## Relatórios e distribuição

O relatório de cada equipe com check-in usa duas páginas A4 paisagem: panorama, quatro indicadores, evolução, leitura e tabela de atenção; depois informações clínicas, contexto histórico, cobertura e metodologia. A página geral compara as equipes na mesma nomenclatura. Relatórios clínicos sem base de check-in permanecem específicos. Não há encaminhamentos automáticos.

Linux é a plataforma operacional principal: `./ABRIR-DASHBOARD.sh` ou `npm start`. Node 22 é recomendado; mínimo 18. `npm run build:linux` monta `dist-linux/`, que requer Node instalado no destino. Chrome/Chromium é necessário para PDFs. Atalhos `.cmd`, `start.ps1` e build Windows são legado.

GitHub Pages serve `src/client/` e JSONs estáticos relativos em `output/github-pages/`. `reportsEnabled` é `false`; `/api/*` e geração de PDF não são oferecidos. O workflow em Ubuntu usa Node 22. Os JSONs publicados são públicos; o login da interface não protege esses dados.
