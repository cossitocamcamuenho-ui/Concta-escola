// Conecta Escola — aplicação de demonstração com Firebase
// 1) Substitui firebaseConfig pelos dados do teu projeto Firebase.
// 2) Publica firestore.rules no Firebase Console antes de testar mensagens.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc,
  query, where, orderBy, onSnapshot, getDocs, serverTimestamp, arrayUnion,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase Console > Project settings > Your apps > SDK setup and configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLD-BEvtp0Q-D-CKXCNWpzJ6c7uR62WZI",
  authDomain: "conct-escola.firebaseapp.com",
  projectId: "conct-escola",
  storageBucket: "conct-escola.firebasestorage.app",
  messagingSenderId: "80739419191",
  appId: "1:80739419191:web:24f4f140a5e0f28c66ebb2",
  measurementId: "G-0G4PQZJL5V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
let currentUser = null;
let currentProfile = null;
let activeView = "people";
let activeChatId = null;
let activeClassId = null;
let stopChats = null;
let stopMessages = null;
let stopClassMessages = null;
let stopPeople = null;
let stopClasses = null;
let cachedPeople = [];
let cachedChats = [];
let cachedClasses = [];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function initials(name = "A") {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "A";
}
function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => $("toast").classList.add("hidden"), 3500);
}
function setNotice(message = "", isError = false) {
  const notice = $("notice");
  notice.textContent = message;
  notice.classList.toggle("hidden", !message);
  notice.classList.toggle("error", isError);
}
function errorText(error) {
  const messages = {
    "auth/email-already-in-use": "Este e-mail já tem uma conta.",
    "auth/invalid-email": "O formato do e-mail não é válido.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Não existe conta com este e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "permission-denied": "A operação foi bloqueada pelas regras de segurança. Confirma se publicaste firestore.rules.",
    "unavailable": "Sem ligação ao serviço. Verifica a internet e tenta novamente."
  };
  return messages[error?.code] || error?.message || "Ocorreu um erro. Tenta novamente.";
}
function showAuth(mode = "login") {
  $("auth-view").classList.remove("hidden");
  $("app-view").classList.add("hidden");
  $("header-user").classList.add("hidden");
  $("login-form").classList.toggle("hidden", mode !== "login");
  $("register-form").classList.toggle("hidden", mode !== "register");
  $("show-login").classList.toggle("active", mode === "login");
  $("show-register").classList.toggle("active", mode === "register");
}
function showApp() {
  $("auth-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  $("header-user").classList.remove("hidden");
}
function cleanListeners() {
  [stopChats, stopMessages, stopClassMessages, stopPeople, stopClasses].forEach(fn => {
    if (typeof fn === "function") fn();
  });
  stopChats = stopMessages = stopClassMessages = stopPeople = stopClasses = null;
}
function switchView(view) {
  activeView = view;
  document.querySelectorAll(".content-view").forEach(el => el.classList.add("hidden"));
  $(`view-${view}`).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  setNotice("");
  if (view === "people") loadPeople();
  if (view === "chats") loadChats();
  if (view === "classes") loadClasses();
  if (view === "profile") fillProfileForm();
}
async function ensureProfile(user, nameFromForm = "", classFromForm = "") {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      name: nameFromForm || user.displayName || (user.email || "Aluno").split("@")[0],
      email: user.email || "",
      className: classFromForm || "",
      bio: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, profile);
    return profile;
  }
  return snap.data();
}

$("show-login").addEventListener("click", () => showAuth("login"));
$("show-register").addEventListener("click", () => showAuth("register"));

$("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("register-error").textContent = "";
  const name = $("register-name").value.trim();
  const email = $("register-email").value.trim();
  const password = $("register-password").value;
  const className = $("register-class").value.trim();
  if (name.length < 2) { $("register-error").textContent = "Escreve o teu nome completo."; return; }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid, name, email, className, bio: "",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    showToast("Conta criada com sucesso!");
  } catch (error) {
    $("register-error").textContent = errorText(error);
  }
});

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("login-error").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-password").value);
  } catch (error) {
    $("login-error").textContent = errorText(error);
  }
});
$("logout-btn").addEventListener("click", async () => {
  cleanListeners();
  await signOut(auth);
});
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));

onAuthStateChanged(auth, async (user) => {
  cleanListeners();
  currentUser = user;
  activeChatId = null;
  activeClassId = null;
  if (!user) {
    currentProfile = null;
    showAuth("login");
    return;
  }
  try {
    currentProfile = await ensureProfile(user);
    showApp();
    renderCurrentProfile();
    $("header-name").textContent = currentProfile.name || user.email;
    switchView("people");
  } catch (error) {
    showApp();
    setNotice("Não foi possível carregar o perfil: " + errorText(error), true);
  }
});

function renderCurrentProfile() {
  const name = currentProfile?.name || currentUser?.displayName || "Aluno";
  $("sidebar-name").textContent = name;
  $("sidebar-class").textContent = currentProfile?.className || "Sem turma definida";
  $("sidebar-avatar").textContent = initials(name);
  $("header-name").textContent = name;
}
function fillProfileForm() {
  if (!currentProfile || !currentUser) return;
  $("profile-name").value = currentProfile.name || "";
  $("profile-class").value = currentProfile.className || "";
  $("profile-bio").value = currentProfile.bio || "";
  $("profile-preview-name").textContent = currentProfile.name || "Aluno";
  $("profile-preview-email").textContent = currentUser.email || "";
  $("profile-avatar").textContent = initials(currentProfile.name);
}
$("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("profile-error").textContent = "";
  const name = $("profile-name").value.trim();
  const className = $("profile-class").value.trim();
  const bio = $("profile-bio").value.trim();
  if (name.length < 2) { $("profile-error").textContent = "O nome deve ter pelo menos 2 caracteres."; return; }
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { name, className, bio, updatedAt: serverTimestamp() });
    await updateProfile(currentUser, { displayName: name });
    currentProfile = { ...currentProfile, name, className, bio };
    renderCurrentProfile();
    fillProfileForm();
    showToast("Perfil atualizado.");
  } catch (error) { $("profile-error").textContent = errorText(error); }
});

function loadPeople() {
  if (stopPeople) stopPeople();
  const q = query(collection(db, "users"), orderBy("name"), limit(100));
  stopPeople = onSnapshot(q, snapshot => {
    cachedPeople = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(person => person.uid !== currentUser.uid);
    renderPeople();
  }, error => setNotice("Erro ao carregar alunos: " + errorText(error), true));
}
function renderPeople() {
  const term = $("people-search").value.trim().toLowerCase();
  const people = cachedPeople.filter(person =>
    (person.name || "").toLowerCase().includes(term) || (person.className || "").toLowerCase().includes(term)
  );
  $("people-list").innerHTML = people.length ? people.map(person => `
    <article class="person-card">
      <div class="avatar avatar-large">${escapeHTML(initials(person.name))}</div>
      <div class="person-info"><strong>${escapeHTML(person.name || "Aluno")}</strong><span>${escapeHTML(person.className || "Turma não indicada")}</span></div>
      <button class="button button-light" data-message-user="${escapeHTML(person.uid)}" type="button">Mensagem</button>
    </article>`).join("") : `<div class="empty-state">Não foram encontrados alunos. Tenta outra pesquisa.</div>`;
  $("people-list").querySelectorAll("[data-message-user]").forEach(button => button.addEventListener("click", () => openDirectChat(button.dataset.messageUser)));
}
$("people-search").addEventListener("input", renderPeople);

function chatIdFor(uid1, uid2) { return [uid1, uid2].sort().join("__"); }
async function openDirectChat(otherUid) {
  if (!otherUid || otherUid === currentUser.uid) return;
  try {
    const other = cachedPeople.find(person => person.uid === otherUid) || (await getDoc(doc(db, "users", otherUid))).data();
    if (!other) { showToast("Este perfil já não está disponível."); return; }
    const chatId = chatIdFor(currentUser.uid, otherUid);
    const chatRef = doc(db, "chats", chatId);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      await setDoc(chatRef, {
        type: "direct",
        members: [currentUser.uid, otherUid].sort(),
        memberNames: { [currentUser.uid]: currentProfile.name, [otherUid]: other.name || "Aluno" },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: ""
      });
    }
    switchView("chats");
    await loadChats();
    openChat(chatId, other.name || "Aluno", otherUid);
  } catch (error) { showToast(errorText(error)); }
}
function loadChats() {
  if (stopChats) stopChats();
  const q = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
  stopChats = onSnapshot(q, snapshot => {
    cachedChats = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() || 0, tb = b.updatedAt?.toMillis?.() || 0;
      return tb - ta;
    });
    $("chat-count").textContent = String(cachedChats.length);
    renderChatList();
  }, error => setNotice("Erro ao carregar conversas: " + errorText(error), true));
}
function renderChatList() {
  const list = $("chat-list");
  if (!cachedChats.length) {
    list.innerHTML = `<div class="empty-state">Ainda não tens conversas. Vai a “Alunos” e carrega em Mensagem.</div>`;
    return;
  }
  list.innerHTML = cachedChats.map(chat => {
    const otherUid = chat.members.find(uid => uid !== currentUser.uid);
    const name = chat.memberNames?.[otherUid] || "Colega";
    return `<button class="chat-list-item ${chat.id === activeChatId ? "active" : ""}" data-chat-id="${escapeHTML(chat.id)}" data-other-uid="${escapeHTML(otherUid || "")}" type="button">
      <div class="avatar">${escapeHTML(initials(name))}</div><div><strong>${escapeHTML(name)}</strong><small>${escapeHTML(chat.lastMessage || "Iniciar conversa")}</small></div>
    </button>`;
  }).join("");
  list.querySelectorAll("[data-chat-id]").forEach(button => button.addEventListener("click", () => {
    const chat = cachedChats.find(item => item.id === button.dataset.chatId);
    const otherUid = button.dataset.otherUid;
    const name = chat?.memberNames?.[otherUid] || cachedPeople.find(p => p.uid === otherUid)?.name || "Colega";
    openChat(button.dataset.chatId, name, otherUid);
  }));
}
function openChat(chatId, name, otherUid) {
  activeChatId = chatId;
  if (stopMessages) stopMessages();
  renderChatList();
  const room = $("chat-room");
  room.innerHTML = `
    <div class="room-header"><div class="avatar">${escapeHTML(initials(name))}</div><div><strong>${escapeHTML(name)}</strong><small>Conversa privada</small></div></div>
    <div id="private-messages" class="message-list"><div class="empty-state">A carregar mensagens...</div></div>
    <form id="private-message-form" class="message-form"><input id="private-message-input" type="text" maxlength="2000" placeholder="Escreve uma mensagem..." autocomplete="off" required><button class="button button-primary" type="submit">Enviar</button></form>`;
  const messagesRef = collection(db, "chats", chatId, "messages");
  stopMessages = onSnapshot(query(messagesRef, orderBy("createdAt"), limit(200)), snapshot => {
    const container = $("private-messages");
    if (!container) return;
    container.innerHTML = snapshot.empty ? `<div class="empty-state">Esta conversa está vazia. Envia a primeira mensagem.</div>` : snapshot.docs.map(d => renderMessage(d.data())).join("");
    container.scrollTop = container.scrollHeight;
  }, error => showToast("Não foi possível carregar mensagens: " + errorText(error)));
  $("private-message-form").addEventListener("submit", async event => {
    event.preventDefault();
    const input = $("private-message-input");
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    try {
      await addDoc(messagesRef, { text, senderId: currentUser.uid, senderName: currentProfile.name, createdAt: serverTimestamp() });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: text.slice(0, 80), updatedAt: serverTimestamp() });
      input.value = "";
    } catch (error) { showToast(errorText(error)); }
    finally { input.disabled = false; input.focus(); }
  });
}
function renderMessage(message) {
  const mine = message.senderId === currentUser.uid;
  const time = message.createdAt?.toDate ? message.createdAt.toDate().toLocaleString("pt-PT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "agora";
  return `<div class="message ${mine ? "mine" : ""}">${escapeHTML(message.text || "")}<small>${mine ? "Tu" : escapeHTML(message.senderName || "Colega")} · ${escapeHTML(time)}</small></div>`;
}

$("create-class-form").addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("new-class-name").value.trim();
  const description = $("new-class-description").value.trim();
  if (!name) return;
  try {
    await addDoc(collection(db, "classes"), {
      name, description, creatorId: currentUser.uid,
      members: [currentUser.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: ""
    });
    $("new-class-name").value = "";
    $("new-class-description").value = "";
    showToast("Turma criada. Outros alunos já podem entrar.");
  } catch (error) { showToast(errorText(error)); }
});
function loadClasses() {
  if (stopClasses) stopClasses();
  const q = query(collection(db, "classes"), orderBy("name"), limit(100));
  stopClasses = onSnapshot(q, snapshot => {
    cachedClasses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClasses();
  }, error => setNotice("Erro ao carregar turmas: " + errorText(error), true));
}
function renderClasses() {
  const container = $("classes-list");
  if (!cachedClasses.length) {
    container.innerHTML = `<div class="empty-state">Ainda não há turmas. Cria a primeira turma.</div>`;
    return;
  }
  container.innerHTML = cachedClasses.map(item => {
    const joined = (item.members || []).includes(currentUser.uid);
    return `<article class="class-card">
      <div class="avatar">${escapeHTML(initials(item.name))}</div>
      <div class="class-info"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.description || "Grupo de comunicação da turma")}</span><span>${(item.members || []).length} participante(s)</span></div>
      <button class="button ${joined ? "button-light" : "button-primary"}" data-class-action="${joined ? "open" : "join"}" data-class-id="${escapeHTML(item.id)}" type="button">${joined ? "Abrir grupo" : "Entrar na turma"}</button>
    </article>`;
  }).join("");
  container.querySelectorAll("[data-class-id]").forEach(button => button.addEventListener("click", async () => {
    const classId = button.dataset.classId;
    const item = cachedClasses.find(c => c.id === classId);
    if (!item) return;
    if (button.dataset.classAction === "join") {
      try {
        await updateDoc(doc(db, "classes", classId), { members: arrayUnion(currentUser.uid), updatedAt: serverTimestamp() });
        showToast("Entraste na turma!");
      } catch (error) { showToast(errorText(error)); }
    } else openClassRoom(item);
  }));
}
function openClassRoom(item) {
  activeClassId = item.id;
  if (stopClassMessages) stopClassMessages();
  const room = $("class-room");
  room.classList.remove("hidden");
  room.innerHTML = `
    <div class="room-header"><div class="avatar">${escapeHTML(initials(item.name))}</div><div><strong>${escapeHTML(item.name)}</strong><small>Grupo da turma · ${(item.members || []).length} participante(s)</small></div></div>
    <div id="class-messages" class="message-list"><div class="empty-state">A carregar mensagens...</div></div>
    <form id="class-message-form" class="message-form"><input id="class-message-input" type="text" maxlength="2000" placeholder="Escreve para a turma..." autocomplete="off" required><button class="button button-primary" type="submit">Enviar</button></form>`;
  room.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const messagesRef = collection(db, "classes", item.id, "messages");
  stopClassMessages = onSnapshot(query(messagesRef, orderBy("createdAt"), limit(200)), snapshot => {
    const container = $("class-messages");
    if (!container) return;
    container.innerHTML = snapshot.empty ? `<div class="empty-state">Ainda não há mensagens nesta turma.</div>` : snapshot.docs.map(d => renderMessage(d.data())).join("");
    container.scrollTop = container.scrollHeight;
  }, error => showToast("Não foi possível carregar o grupo: " + errorText(error)));
  $("class-message-form").addEventListener("submit", async event => {
    event.preventDefault();
    const input = $("class-message-input");
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    try {
      await addDoc(messagesRef, { text, senderId: currentUser.uid, senderName: currentProfile.name, createdAt: serverTimestamp() });
      await updateDoc(doc(db, "classes", item.id), { lastMessage: text.slice(0, 80), updatedAt: serverTimestamp() });
      input.value = "";
    } catch (error) { showToast(errorText(error)); }
    finally { input.disabled = false; input.focus(); }
  });
}
