# Publicacao no GitHub Pages

Repositorio: https://github.com/lucaaregis4r-ops/Dashboardolympico

Site: https://lucaaregis4r-ops.github.io/Dashboardolympico/

A versao 2.1.3 substitui a copia estatica enviada manualmente pelo projeto completo.
O workflow gera o site a partir de `src/client/` e das planilhas; os JSONs gerados ficam em `output/github-pages/`, fora do versionamento.

## O que foi preparado

- pasta estatica gerada em `output/github-pages/`;
- dados de atletas, presenca (16 categorias) e fisioterapia convertidos em JSON durante o build;
- caminhos relativos compativeis com `usuario.github.io/nome-do-repositorio/`;
- PWA e service worker preparados para subcaminhos;
- geracao de PDF e kit semanal desativados nesta edicao;
- workflow `.github/workflows/deploy-pages.yml` para publicar e atualizar os dados a cada hora.

## Publicacao recomendada com sincronizacao

1. Envie o projeto completo para um repositorio GitHub.
2. No repositorio, abra `Settings` > `Pages`.
3. Em `Build and deployment`, selecione `GitHub Actions`.
4. Abra a aba `Actions` e execute `Publicar Dashboard no GitHub Pages`.
5. O mesmo workflow sera executado a cada hora para consultar novamente as planilhas e publicar um snapshot atualizado.

O workflow tambem roda quando houver `push` nas branches `main` ou `master`.

## Geracao e validacao local

```powershell
npm run build:pages
npm run verify:pages
npm run preview:pages
```

O preview local abre em `http://127.0.0.1:41740/dashboard-olympico/`, reproduzindo o subcaminho usado por um site de projeto.

Para uma publicacao manual, envie o conteudo de `output/github-pages/` para a raiz do repositorio que sera usado como site. Nesse modo, os dados representam o momento do ultimo build local e nao se atualizam ate que um novo build seja enviado.

## Limitacoes desta edicao

- GitHub Pages nao executa o servidor Node;
- PDFs e pacote semanal nao estao disponiveis;
- a sincronizacao automatica e periodica, nao instantanea;
- o botao `Atualizar` recarrega o ultimo snapshot publicado;
- mudancas na planilha aparecem depois da proxima execucao do workflow.

## Aviso de privacidade

O GitHub Pages e publico, inclusive em muitos cenarios de repositorio privado. Os arquivos JSON publicados podem ser baixados diretamente por qualquer pessoa com acesso ao site. O login que existe no navegador nao constitui protecao dos dados.

Esta edicao inclui nomes, indicadores e registros de fisioterapia porque as fontes atuais estao publicadas sem autenticacao. Antes de divulgar o endereco, confirme formalmente que atletas, lesoes, vetos e observacoes podem ser expostos dessa forma. Para acesso realmente restrito sera necessario hospedar a aplicacao em um servico com autenticacao no servidor.
