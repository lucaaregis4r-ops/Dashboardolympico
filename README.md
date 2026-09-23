# Dashboard Olympico

Projeto reiniciado do zero com foco inicial na pagina de atletas.

## Documentacao do projeto

- `docs/CONTEXTO.md`: contexto vivo, arquitetura atual, fontes de dados e decisoes vigentes.
- `docs/PLANO-IMPLEMENTACAO.md`: plano faseado, status, criterios de aceite e estrutura de pastas-alvo.
- `docs/VALIDACAO-FINAL.md`: checklist final, resultados dos testes e limites da validacao.
- `docs/PUBLICACAO-GITHUB-PAGES.md`: build estatico, sincronizacao e publicacao no GitHub Pages.
- `docs/PLANO-PRESENCA-PREPARACAO-FISICA.md`: plano e andamento da integracao das fontes suplementares de presenca.

A revisao de nomes entre a base principal e as chamadas e feita na planilha [Unificacao de atletas e equipes - Olympico 2026](https://docs.google.com/spreadsheets/d/1A-B0WNGsiQa-yZsPsoUNieP926QqfioV-WDX9zEdIlw/edit). As fontes originais nao sao alteradas.

Antes de alterar o codigo, consulte os dois arquivos. Ao concluir cada etapa, atualize o status do plano e a secao `Estado atual` do contexto.

## Estrutura principal

- `src/client/`: interface, estilos e arquivos PWA.
- `src/server/`: servidor, regras de negocio, integracoes e relatorios.
- `assets/`: identidade visual compartilhada.
- `data/reference/`: cadastros consolidados usados pelos scripts.
- `data/templates/`: modelos de fisioterapia e psicologia.
- `docs/`: contexto, plano e guias operacionais.
- `scripts/`: automacoes de exportacao, relatorios e distribuicao.
- `output/reports/`: relatorios gerados; nao e codigo-fonte.
- `output/releases/`: pacotes preparados para entrega.
- `dist/`: build portatil recriavel.
- `output/github-pages/`: edicao estatica pronta para publicacao, sem PDF.

## Como rodar

### Linux

Com Node.js 18 ou superior (recomendado: 22), abra um terminal nesta pasta e execute:

```bash
bash ABRIR-DASHBOARD.sh
```

O navegador abre automaticamente na porta disponivel, a partir de `http://localhost:3000`.
Mantenha o terminal aberto enquanto usar o dashboard; `Ctrl+C` encerra o servidor.
O script tambem encontra instalacoes feitas pelo nvm. Nao e necessario instalar dependencias para iniciar o servidor.

Para adicionar **Dashboard Olympico** ao menu de aplicativos:

```bash
bash ABRIR-DASHBOARD.sh --install-shortcut
```

Se mover a pasta do projeto ou trocar a instalacao do Node.js, execute esse comando novamente.
A abertura automatica usa `xdg-open` (pacote `xdg-utils`). Caso ele nao esteja disponivel, abra o endereco mostrado no terminal.
Para exportar PDFs localmente, instale Chrome, Chromium ou Edge; um caminho personalizado pode ser informado em `CHROME_PATH`.

### Windows

De duplo clique em:

`ABRIR-DASHBOARD.cmd`

Esse arquivo sobe o servidor e ja abre o navegador em `http://localhost:3000`.

### Terminal (Linux ou Windows)

Se preferir rodar manualmente:

```bash
npm start
```

Depois, abra `http://localhost:3000`.

## Como gerar um pacote portatil para Windows

Em uma maquina com Node.js instalado, de duplo clique em:

`COMPILAR-EXECUTAVEL.cmd`

O script cria a pasta:

`dist`

Dentro dela ficam:

- `Dashboard-Olympico.exe`: launcher amigavel.
- `runtime/node.exe`: Node portatil usado pelo dashboard.
- arquivos do dashboard.

Copie a pasta `dist` inteira para outros computadores Windows.
Ao abrir, ele sobe o servidor local e abre o navegador automaticamente.

## Kit de relatórios e Google Drive

- `GERAR-KIT-RELATORIOS.cmd` gera os PDFs com timeout, progresso, nova tentativa e retomada automática.
- `CONFIGURAR-GOOGLE-DRIVE.cmd` realiza a autorização OAuth inicial sem guardar credenciais no projeto.
- `GERAR-KIT-E-ENVIAR-DRIVE.cmd` gera o kit e envia os PDFs para uma pasta privada do Google Drive.

Veja a configuração e os comandos em `docs/guides/KIT-RELATORIOS.md`.

## Como usar no celular

1. Abra o dashboard no computador que vai servir os dados.
2. Mantenha computador e celular na mesma rede Wi-Fi.
3. No terminal do servidor, procure a linha `Celular na mesma rede`.
4. Abra no celular o link parecido com `http://192.168.x.x:3000`.
5. No navegador do celular, use `Adicionar a tela inicial` para instalar como app.

O celular nao executa o `.exe`; ele acessa o dashboard pelo navegador/PWA enquanto o computador esta com o servidor ligado.

Se `npm` ou `node` nao estiverem no `PATH`, rode:

```powershell
.\start.ps1
```
