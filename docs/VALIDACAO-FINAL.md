# Validação final — revisão v3

Execução no Linux em 04/10/2026, com Node.js 22 e Google Chrome disponível.

| Verificação | Resultado |
|---|---|
| Baseline antes da edição | 52/52 testes aprovados |
| `npm test` final | 59/59 testes aprovados |
| `npm run sources:validate` | 5 fontes de presença e 16 categorias acessíveis |
| `npm run build:pages` | Sucesso; 281 atletas, 16 equipes e 34 registros de fisioterapia |
| `npm run verify:pages` | Sucesso; 16 categorias e 328 atletas nas chamadas; PDFs desativados |
| `./COMPILAR-EXECUTAVEL.sh` | Pacote Linux criado em `dist-linux/` |
| `./ABRIR-DASHBOARD.sh` e `./ABRIR-EXECUTAVEL.sh` | Iniciaram fora da pasta do projeto, em caminho com espaços e acentos; `/` e `/api/athletes` responderam 200 |
| Abertura automática | URL da porta escolhida foi encaminhada ao `xdg-open` em teste com capturador local |
| `./GERAR-KIT-RELATORIOS.sh` | 16 PDFs criados em `output/reports/Relatórios 4 de outubro/`; todos com duas páginas A4 paisagem |
| `./PREPARAR-ENVIO-RELATORIOS.sh` | Encontrou 16 PDFs e criou controle e links de envio |
| `git diff --check` | Sem erros de whitespace |

Os PDFs de Basquete Sub-14, Basquete Sub-15 com seis demandas de fisioterapia e três de psicologia, Basquete Sub-17 com psicologia densa, e a visão geral de Basquete foram renderizados e inspecionados visualmente. O relatório clínico sem base de check-in permaneceu disponível. A tabela de atletas, os registros clínicos e a nota metodológica cabem nas duas páginas das equipes com check-in.

A fonte principal tinha atualização mais recente em 25/09/2026 durante a validação. A maioria das equipes estava sem check-in na janela semanal; o relatório mostra a cobertura e não interpreta ausência de respostas como condição favorável. A autorização OAuth e o envio ao Google Drive não foram executados porque dependem das credenciais e da conta operacional.

O pacote Linux usa o Node instalado no destino. Os scripts Windows e `.cmd` permanecem apenas como legado. O GitHub Pages é público e os JSONs estáticos contêm dados de atletas e áreas clínicas, como já ocorria antes desta revisão.

## Correção das fontes de bem-estar — 05/10/2026

As respostas de bem-estar foram movidas para as abas PSR/PSE das cinco planilhas de modalidade. O servidor e o exportador de atletas agora leem essas 16 abas como fonte principal. As outras 16 abas continuam fornecendo presença. A validação online confirmou acesso às 32 abas.

Na leitura de verificação, as abas PSR/PSE tinham 2.111 respostas válidas, 243 atletas em 16 equipes e resposta mais recente em 05/10/2026 às 19:11. A API local retornou esses números; um PDF de Basquete Sub-14 foi gerado com período de 28/09 a 05/10, oito atletas com resposta na semana e indicador de presença. O build do GitHub Pages e sua verificação passaram com os dados novos. PDFs já gerados antes desta correção precisam ser recriados; o kit agora atualiza arquivos existentes por padrão.
