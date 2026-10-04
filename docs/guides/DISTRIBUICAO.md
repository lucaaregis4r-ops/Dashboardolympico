# Distribuição do Dashboard Olympico no Linux

## Uso direto

Com Node.js 22 recomendado (mínimo 18), execute `./ABRIR-DASHBOARD.sh`. O script funciona mesmo quando chamado de outro diretório. Também é possível usar `npm start` e abrir o endereço mostrado no terminal.

## Pacote Linux

Execute `./COMPILAR-EXECUTAVEL.sh` ou `npm run build:linux`. O resultado é `dist-linux/`, com `Dashboard-Olympico`, `src/`, `assets/`, `data/` e `docs/`. Copie a pasta inteira ao destino. O launcher requer Node.js instalado na máquina de destino e abre o navegador automaticamente. Use `./ABRIR-EXECUTAVEL.sh` na pasta do projeto, ou `./Dashboard-Olympico` dentro do pacote.

O pacote não inclui runtime: sua compatibilidade depende da instalação de Node 18+ no destino. Para PDFs, instale Chrome ou Chromium. `CHROME_PATH` aceita um caminho personalizado.

## Celular

Mantenha computador e celular na mesma rede. Use no celular o endereço mostrado como `Celular na mesma rede` no terminal. O PWA pode ser instalado pelo navegador; o servidor continua rodando no computador.

Os scripts `.cmd`, `start.ps1` e o pacote Windows antigo permanecem no repositório apenas para compatibilidade legada.
