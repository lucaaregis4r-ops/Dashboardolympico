# Distribuicao do Dashboard Olympico

## Executavel Windows

Use uma maquina com Node.js instalado para montar o pacote.

1. Abra a pasta do projeto.
2. De duplo clique em `COMPILAR-EXECUTAVEL.cmd`.
3. Aguarde a criacao da pasta `dist`.
4. Copie a pasta `dist` inteira para o computador de destino.
5. No computador de destino, abra `Dashboard-Olympico.exe`.

O executavel e um launcher amigavel. Ele usa `runtime/node.exe`, que fica dentro da propria pasta `dist`, sobe o servidor local e abre o navegador automaticamente.

## Uso em celulares

O celular nao executa o `.exe`. Ele acessa o dashboard pelo navegador.

1. Abra o dashboard no computador.
2. Mantenha computador e celular na mesma rede Wi-Fi.
3. No terminal, procure o link `Celular na mesma rede`, por exemplo `http://192.168.0.20:3000`.
4. Abra esse link no navegador do celular.
5. Use a opcao do navegador `Adicionar a tela inicial`.

## Observacoes

- A exportacao de PDF continua acontecendo pelo computador que esta rodando o servidor.
- As planilhas do Google precisam estar acessiveis pela internet.
- Se o firewall do Windows bloquear o acesso do celular, libere o acesso de rede para o dashboard/Node.
