# Conecta Escola

Rede social escolar responsiva com HTML, CSS, JavaScript, Firebase Authentication e Cloud Firestore.

## Funcionalidades
- Criar conta com nome, e-mail e senha.
- Entrar e sair da conta.
- Perfil com nome de apresentação, turma e descrição.
- Lista pesquisável de alunos.
- Conversas privadas em tempo real.
- Criar turmas, entrar em turmas e trocar mensagens em grupo.
- Regras iniciais do Firestore para restringir acesso a perfis, conversas e grupos.

## 1. Criar o projeto Firebase
1. Abre https://console.firebase.google.com/ e cria um projeto.
2. Dentro do projeto, adiciona uma aplicação Web (ícone `</>`).
3. Copia o objeto de configuração do Firebase.
4. Abre `app.js` e substitui os valores de `firebaseConfig` pelos teus valores.
   - Não publiques nem envies a ninguém senhas de utilizadores ou credenciais privadas.
   - A `apiKey` da aplicação web Firebase faz parte da configuração do cliente; a segurança deve ser feita com Authentication e regras, não escondendo essa chave.

## 2. Ativar Authentication
1. Firebase Console > Authentication > Get started.
2. Em Sign-in method, ativa `Email/Password`.
3. Guarda as alterações.

## 3. Criar Firestore
1. Firebase Console > Firestore Database > Create database.
2. Escolhe uma região adequada para ti.
3. Depois de criar a base de dados, abre o separador Rules.
4. Copia o conteúdo de `firestore.rules` para o editor das regras e carrega em Publish.

Não uses regras abertas como `allow read, write: if true`.

## 4. Executar no computador
Os módulos JavaScript do Firebase precisam de ser servidos por um servidor local; não abras `index.html` diretamente com `file://`.

Opção A — VS Code:
1. Instala o Visual Studio Code.
2. Abre a pasta `ConectaEscola`.
3. Instala a extensão `Live Server`.
4. Clica com o botão direito em `index.html` e escolhe `Open with Live Server`.

Opção B — Python:
1. Abre o terminal dentro da pasta.
2. Executa `python -m http.server 8000`.
3. Abre `http://localhost:8000` no navegador.

## 5. Testar mensagens entre dois alunos
1. Abre a aplicação no navegador e cria uma conta.
2. Abre uma janela privada ou outro navegador e cria uma segunda conta com outro e-mail.
3. Na lista Alunos, escolhe o outro utilizador e carrega em Mensagem.
4. Envia mensagens nos dois lados.
5. Em Turmas, uma conta cria um grupo; a outra entra na turma e pode enviar mensagens.

Para testar em dois telemóveis/computadores diferentes, a aplicação precisa de ser publicada num alojamento HTTPS e ambos precisam de acesso à internet. `localhost` só funciona no próprio dispositivo.

## 6. Publicar online
Podes usar Firebase Hosting:
1. Instala Node.js a partir de https://nodejs.org/.
2. Instala Firebase CLI: `npm install -g firebase-tools`.
3. No terminal: `firebase login`.
4. Dentro da pasta do projeto: `firebase init hosting`.
5. Escolhe o projeto Firebase e define a pasta pública como `.` (ponto), se a CLI permitir.
6. Se a CLI perguntar se é uma aplicação de página única, responde `No`.
7. Publica com `firebase deploy`.

Se preferires não usar a pasta raiz como pasta pública, cria uma pasta `public` e coloca lá `index.html`, `style.css` e `app.js`. Mantém `firestore.rules` no local em que o Firebase CLI te indicar para as regras.

## Notas de segurança e limitações
- Este é um projeto inicial para aprendizagem e demonstração; testa cuidadosamente antes de o usar com uma escola real.
- As regras permitem que alunos autenticados leiam os perfis dos utilizadores registados, para que possam encontrar colegas. Não recolhas dados sensíveis no perfil.
- A criação de turmas está aberta a qualquer conta registada, conforme o requisito “todos os alunos registados”. Para uma escola real, considera aprovação por professor ou código de turma.
- A aplicação não tem upload de fotos, recuperação de senha personalizada, bloqueio/denúncia, moderação, notificações push ou indicadores de leitura.
- A validação de mensagens e a segurança final devem ser revistas antes de uso real. As regras do Firestore são a barreira de segurança principal; a interface do navegador não é uma barreira de segurança.
- Nunca partilhes a tua senha. Se fores menor de idade, combina com um professor/responsável as regras de utilização e privacidade da rede.
