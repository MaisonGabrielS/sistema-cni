# CNI AVA — adaptação para Vercel + Neon PostgreSQL

Este pacote é uma **atualização dos arquivos do projeto existente**, não uma cópia completa do repositório. Ele não contém os arquivos de interface `index.html`, `app.js` e `styles.css`; eles devem ser preservados e movidos para `public/`.

## O que foi alterado

- Troca do `better-sqlite3` por `pg` (PostgreSQL).
- Tabelas PostgreSQL compatíveis com o sistema atual: `users`, `courses` e `enrollments`.
- Consultas assíncronas com parâmetros `$1`, `$2` etc.
- `server.js` exporta a aplicação Express e só abre uma porta quando executado localmente.
- `seed.js` cria o administrador no PostgreSQL, sem senha padrão embutida.
- `vercel.json` para o projeto.
- Script PowerShell para mover os arquivos de interface para `public/`.

## Antes de começar

1. Baixe ou clone o repositório atual e faça uma cópia de segurança.
2. Extraia este pacote dentro da pasta local do projeto e substitua `server.js`, `db.js`, `seed.js`, `package.json` e `.env.example`. Adicione `vercel.json`, `schema.sql` e este guia.
3. Abra o PowerShell na pasta raiz do projeto e execute:
   ```powershell
   .\prepare-public.ps1
   ```
4. Se o PowerShell bloquear a execução do script, abra `public` manualmente e mova para lá `index.html`, `app.js` e `styles.css`. Não apague esses arquivos.
5. Crie o banco no Neon e copie a string de conexão **pooled** (a conexão cujo host normalmente contém `-pooler`).
6. Crie um `.env` local baseado em `.env.example`. Preencha `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Não envie `.env` ao GitHub.
7. Na pasta do projeto, execute:
   ```powershell
   npm.cmd install
   npm.cmd run seed
   npm.cmd start
   ```
   Abra `http://localhost:3000` e teste login, criação de curso e cadastro de usuário.
8. Faça commit e push das alterações para o GitHub.
9. Na Vercel, importe o repositório `MaisonGabrielS/sistema-cni`.
10. Em **Project Settings → Environment Variables**, configure:
    - `DATABASE_URL` = string pooled do Neon
    - `JWT_SECRET` = chave aleatória forte com pelo menos 32 caracteres
    - `ADMIN_NAME` = nome do administrador
    - `ADMIN_EMAIL` = e-mail do administrador
    - `ADMIN_PASSWORD` = senha forte de pelo menos 12 caracteres
11. Publique (Deploy) e teste `/api/health`.

## Importante sobre o administrador

O `seed.js` não é executado automaticamente na Vercel. Para criar o administrador inicial, execute `npm.cmd run seed` localmente com `.env` apontando para o banco Neon. Isso grava o usuário no banco remoto. Não deixe a senha no repositório.

Se o `ADMIN_EMAIL` já existir, o seed não altera a senha existente. Para redefinir senha, use um fluxo administrativo seguro ou atualize o hash conscientemente.

## Banco novo e dados antigos

Esta adaptação cria um banco PostgreSQL novo. Ela **não copia automaticamente** os dados que eventualmente existam no arquivo SQLite `data/cni-ava.sqlite`. Se esse banco tiver registros importantes, faça uma migração de dados separada antes de deixar o sistema em uso.

## Limites e segurança

Este é o AVA inicial. Ele ainda não tem todas as funções pedagógicas previstas, recuperação de senha, auditoria, política de privacidade completa ou backups institucionais testados. Não use dados reais de alunos até revisar a segurança, configurar backup e validar o sistema em produção.

Use uma string de conexão Neon com pooler. Não exponha `DATABASE_URL` nem `JWT_SECRET` no frontend, em commits ou em mensagens públicas.
