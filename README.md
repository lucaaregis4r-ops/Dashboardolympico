# Dashboard Olympico

Painel do Olympico Club para acompanhar check-ins de atletas, presença na preparação física e registros de fisioterapia e psicologia. A execução local em Linux oferece PDFs e kit semanal; a edição GitHub Pages é estática e não oferece relatórios.

As cinco planilhas de modalidade fornecem os dois tipos de dado: as abas `PSR`/`PSE` contêm respostas de bem-estar e as abas de chamada contêm presenças. O dashboard e os relatórios leem as respostas diretamente das 16 abas de bem-estar configuradas em `src/server/config/data-sources.js`.

## Iniciar no Linux

Recomendado: Node.js 22. A versão mínima suportada é 18.

```bash
./ABRIR-DASHBOARD.sh
```

O script aceita caminhos com espaços, procura o Node instalado pelo nvm e abre a porta disponível no navegador. `Ctrl+C` encerra o servidor. Para iniciar sem abrir o navegador, use `npm start`. Para instalar o atalho no menu de aplicativos, use `./ABRIR-DASHBOARD.sh --install-shortcut`.

Chrome ou Chromium é necessário para exportar PDF. O navegador pode ser indicado por `CHROME_PATH`. Um celular na mesma rede pode acessar o endereço de rede mostrado no terminal e instalar o PWA.

## Relatórios e pacote Linux

- `./GERAR-KIT-RELATORIOS.sh` gera os PDFs das 16 categorias em `output/reports/`.
- `./PREPARAR-ENVIO-RELATORIOS.sh <pasta-dos-pdfs>` gera o controle de envio.
- `./CONFIGURAR-GOOGLE-DRIVE.sh <credencial.json>` autoriza o Google Drive.
- `./GERAR-KIT-E-ENVIAR-DRIVE.sh` gera e envia o kit para uma pasta privada do Drive.
- `./COMPILAR-EXECUTAVEL.sh` cria `dist-linux/`. `./ABRIR-EXECUTAVEL.sh` abre esse pacote.

O pacote `dist-linux/` contém o código e um launcher Linux. Ele requer Node.js instalado no computador de destino; copie a pasta inteira. Os atalhos `.cmd` e o build Windows permanecem apenas como legado, sem fazer parte da validação desta versão. Veja [Distribuição](docs/guides/DISTRIBUICAO.md) e [Kit de relatórios](docs/guides/KIT-RELATORIOS.md).

## Metodologia

Atletas permanecem no elenco e no histórico mesmo quando inativos. Indicadores atuais usam check-ins primários recentes; os indicadores semanais cobrem sete dias, e a evolução cobre 90 dias. O índice chamado **Desgaste percebido** resume autorrelatos e não mede volume ou intensidade do treinamento. A recuperação foi orientada pelas escalas reais da planilha: em sono e humor, valores menores representam condição mais favorável.

A lista **Atletas em atenção** é única por atleta. Seus níveis consideram sinais absolutos, persistência, mudança em relação ao próprio histórico e combinação entre domínios. O percentil da equipe só fornece contexto quando há pelo menos seis atletas elegíveis. O percentil histórico requer seis janelas anteriores, excluindo a janela atual.

## GitHub Pages

`npm run build:pages` gera a edição estática em `output/github-pages/` e `npm run verify:pages` confere as fontes obrigatórias. PDFs e kit ficam desativados no Pages. Os JSONs estáticos contêm dados dos atletas e das áreas clínicas; o Pages é público e o login visual não restringe acesso a esses arquivos. Consulte [Publicação](docs/PUBLICACAO-GITHUB-PAGES.md) antes de divulgar o endereço.

## Validação

```bash
npm test
npm run sources:validate
npm run build:pages
npm run verify:pages
```

O contexto técnico está em [docs/CONTEXTO.md](docs/CONTEXTO.md), o status de implementação em [docs/PLANO-IMPLEMENTACAO.md](docs/PLANO-IMPLEMENTACAO.md) e os resultados em [docs/VALIDACAO-FINAL.md](docs/VALIDACAO-FINAL.md).
