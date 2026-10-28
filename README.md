# CNI AVA — Sistema de Ambiente Virtual de Aprendizagem

Sistema web de gestão educacional desenvolvido para o **CNI Centro de Formação Profissional**, com foco na organização de cursos, usuários e matrículas, além da evolução para uma plataforma integrada de gestão acadêmica.

O projeto utiliza tecnologias modernas de desenvolvimento web, banco de dados PostgreSQL e implantação em nuvem.

## Sobre o projeto

O CNI AVA tem como objetivo centralizar as operações acadêmicas em uma plataforma acessível pela internet, com autenticação de usuários e funcionalidades específicas conforme o perfil de acesso.

A proposta é evoluir o sistema para uma solução integrada que conecte secretaria, gestão pedagógica, professores e alunos.

## Tecnologias utilizadas

- **Node.js** — ambiente de execução JavaScript.
- **Express.js** — desenvolvimento das rotas e da API.
- **PostgreSQL** — banco de dados relacional.
- **Neon** — banco de dados PostgreSQL em nuvem.
- **JWT (JSON Web Token)** — autenticação baseada em tokens.
- **bcryptjs** — proteção de senhas por hash.
- **HTML5, CSS3 e JavaScript** — interface web.
- **Helmet** — configuração de proteções HTTP.
- **Vercel** — hospedagem e implantação.
- **Git e GitHub** — versionamento e gerenciamento do código-fonte.

## Funcionalidades identificadas

### Autenticação e usuários

- Login com e-mail e senha.
- Autenticação por token JWT.
- Perfis de acesso para administrador, professor e aluno.
- Consulta aos dados do usuário autenticado.
- Cadastro administrativo de usuários.
- Armazenamento de senhas utilizando hash.

### Gestão de cursos

- Cadastro de cursos.
- Descrição e modalidade do curso.
- Modalidades presencial, EAD e híbrida.
- Publicação e despublicação de cursos.
- Consulta de cursos conforme o perfil de acesso.

### Matrículas

- Associação de alunos aos cursos.
- Registro do progresso do aluno.
- Prevenção de matrículas duplicadas para o mesmo aluno e curso.
- Estrutura preparada para a evolução do gerenciamento acadêmico.

### Administração

- Listagem de usuários.
- Controle de permissões por perfil.
- Endpoint de verificação de saúde da aplicação.
- Integração com banco de dados PostgreSQL.

> **Observação:** esta lista descreve funcionalidades identificadas na versão inicial do projeto. Os módulos adicionais apresentados no roadmap abaixo ainda precisam ser implementados e testados antes de serem considerados concluídos.

## Roadmap — CNI AVA 2.0

O desenvolvimento prevê a expansão gradual do sistema para incluir:

- **Secretaria:** cadastro completo de alunos, CPF, responsáveis e documentos.
- **Gestão de turmas:** professores, horários, capacidade e vagas disponíveis.
- **Gestão de matrículas:** múltiplos cursos simultâneos por aluno e acompanhamento da situação acadêmica.
- **Gestão pedagógica:** frequência, notas, módulos e materiais didáticos.
- **Portal do aluno:** acompanhamento de cursos, progresso, frequência e documentos.
- **Gestão financeira:** mensalidades, pagamentos, inadimplência e relatórios.
- **Certificados:** organização da emissão e do histórico de certificados.
- **Relatórios gerenciais:** indicadores acadêmicos e administrativos.
- **Segurança e auditoria:** aprimoramento de permissões e registro de operações relevantes.

As funcionalidades serão incorporadas progressivamente, preservando os dados existentes sempre que possível e utilizando migrações controladas do banco de dados.

## Arquitetura

A aplicação segue uma estrutura baseada em servidor Node.js com Express, interface web estática e banco de dados PostgreSQL.

```text
CNI-AVA/
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── server.js
├── db.js
├── schema.sql
├── seed.js
├── package.json
└── README.md
```

**Principais arquivos:**

- `server.js`: servidor Express, autenticação e rotas da API.
- `db.js`: conexão com PostgreSQL e inicialização das tabelas.
- `schema.sql`: estrutura inicial do banco de dados.
- `seed.js`: criação inicial do usuário administrador.
- `public/index.html`: estrutura da interface.
- `public/app.js`: lógica e interações do frontend.
- `public/styles.css`: estilos visuais.
- `package.json`: dependências e comandos do projeto.

## Como executar localmente

### 1. Pré-requisitos

Instale:

- Node.js, preferencialmente na versão 22.
- npm.
- Uma instância PostgreSQL, como um banco Neon.

### 2. Clone o repositório

```bash
git clone https://github.com/MaisonGabrielS/sistema-cni.git
cd sistema-cni
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=sua_url_de_conexao_postgresql
JWT_SECRET=uma_chave_secreta_com_pelo_menos_32_caracteres
NODE_ENV=development

ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=uma_senha_forte_com_pelo_menos_12_caracteres
```

Substitua os valores de exemplo pelos dados do seu ambiente. Não compartilhe credenciais reais.

### 5. Inicialize o administrador

```bash
npm run seed
```

Execute esse comando somente depois de configurar o banco e as variáveis de ambiente. O script verifica se o administrador já existe antes de criá-lo.

### 6. Inicie o servidor

Para desenvolvimento:

```bash
