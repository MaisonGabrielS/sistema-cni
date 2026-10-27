# CNI AVA — versão inicial

Ambiente Virtual de Aprendizagem inicial para a CNI Centro de Formação Profissional. A interface é original, em azul e branco, e foi pensada para apoiar cursos EAD e presenciais.

## O que esta primeira etapa já inclui

- Login por e-mail e senha.
- Perfis de administrador, professor e aluno.
- Senhas armazenadas com hash bcrypt.
- Sessão por token JWT com validade de 8 horas.
- Limite de tentativas de login.
- Cadastro de usuários pelo administrador.
- Cadastro de cursos e modalidade EAD, presencial ou híbrida.
- Publicação/retirada de publicação de cursos pelo administrador.
- Alunos veem os cursos vinculados às suas matrículas.
- Banco de dados SQLite local, criado automaticamente.

## Requisitos

- Node.js 20 LTS ou superior.
- npm (incluído no instalador do Node.js).

## Como executar no Windows

1. Extraia o ZIP em uma pasta, por exemplo `C:\\Projetos\\cni-ava`.
2. Abra essa pasta no VS Code.
3. Abra o terminal integrado (**Terminal > Novo Terminal**).
4. Instale as dependências:

   ```powershell
   npm install
   ```

5. Copie `.env.example` para `.env`.
6. Edite `.env`: defina um `JWT_SECRET` longo e aleatório e altere `ADMIN_PASSWORD` para uma senha forte e exclusiva. Não compartilhe esse arquivo.
7. Crie o usuário administrador:

   ```powershell
   npm run seed
   ```

8. Inicie o sistema:

   ```powershell
   npm start
   ```

9. Abra `http://localhost:3000` no navegador e entre usando `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidos no `.env`.

Para desenvolvimento, pode usar `npm run dev` para reiniciar o servidor quando os arquivos do servidor forem alterados.

## Primeiro teste

1. Entre como administrador.
2. Abra **Usuários** e crie um usuário de teste com perfil **Aluno**.
3. Abra **Criar curso**, cadastre um curso e salve.
4. Volte a **Cursos** e clique em **Publicar curso**.
5. Para ligar o curso ao aluno, esta versão inicial ainda exige criar a matrícula pela API (veja abaixo). A interface de matrícula será uma das próximas etapas.

### Criar matrícula de teste (API)

O administrador autenticado pode enviar `POST /api/enrollments` com `userId` e `courseId`. Use um cliente HTTP como Thunder Client no VS Code. Cabeçalho: `Authorization: Bearer SEU_TOKEN` e `Content-Type: application/json`. Corpo:

```json
{
  "userId": 2,
  "courseId": 1
}
```

Use os IDs reais exibidos na tabela de usuários e no banco de dados.

## Rotas disponíveis

- `POST /api/auth/login` — autenticação.
- `GET /api/me` — usuário atual.
- `GET /api/courses` — cursos visíveis ao perfil.
- `POST /api/courses` — cria curso (admin/professor).
- `PATCH /api/courses/:id/publish` — publica/retira curso (admin).
- `POST /api/enrollments` — cria matrícula (admin).
- `GET /api/admin/users` — lista usuários (admin).
- `POST /api/admin/users` — cria usuário (admin).
- `GET /api/health` — verificação básica do servidor.

## Próximas etapas recomendadas

1. **Matrículas pela interface:** buscar aluno, matricular em curso e gerenciar turmas.
2. **Estrutura pedagógica:** módulos, aulas, vídeos, apostilas e anexos.
3. **Atividades e avaliações:** questões objetivas/discursivas, tentativas, correção, notas e feedback.
4. **Progresso e frequência:** conclusão de aulas, acompanhamento EAD e presença para turmas presenciais.
5. **Certificados:** modelo visual CNI, emissão após regras de conclusão e código público de validação.
6. **Produção:** PostgreSQL, HTTPS, política de backup, redefinição de senha, auditoria, logs e revisão de segurança.

## Importante antes de publicar na internet

Este projeto é uma base inicial de desenvolvimento, não um AVA pronto para uso institucional em produção. Ainda faltam funcionalidades pedagógicas importantes, fluxos de recuperação de senha, gestão de consentimento/privacidade, auditoria, backups automatizados e endurecimento de segurança. Não use dados reais de alunos até concluir essas etapas e revisar a aplicação. O SQLite local é adequado para começar e testar; para produção multiusuário, planeje PostgreSQL e armazenamento de arquivos adequado.
