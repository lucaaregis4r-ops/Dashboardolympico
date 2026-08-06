# Dashboard Olympico

Projeto reiniciado do zero com foco inicial na pagina de atletas.

## Documentacao do projeto

- `docs/CONTEXTO.md`: contexto vivo, arquitetura atual, fontes de dados e decisoes vigentes.
- `docs/PLANO-IMPLEMENTACAO.md`: plano faseado, status, criterios de aceite e estrutura de pastas-alvo.

Antes de alterar o codigo, consulte os dois arquivos. Ao concluir cada etapa, atualize o status do plano e a secao `Estado atual` do contexto.

## Como rodar

O jeito mais simples e recomendado e dar duplo clique em:

`ABRIR-DASHBOARD.cmd`

Esse arquivo sobe o servidor e ja abre o navegador em `http://localhost:3000`.

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
