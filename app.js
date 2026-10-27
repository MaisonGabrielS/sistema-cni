const $ = (selector) => document.querySelector(selector);
let token = localStorage.getItem("cni_ava_token") || "";
let currentUser = null;
let allCourses = [];

$("#year").textContent = new Date().getFullYear();

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/api/auth/login") logout(false);
    throw new Error(data.error || "Não foi possível concluir a solicitação.");
  }
  return data;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function setPage(name) {
  document.querySelectorAll(".nav-item[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  const titles = { home: "Visão geral", courses: currentUser?.role === "student" ? "Meus cursos" : "Cursos", users: "Usuários", create: "Criar curso" };
  $("#page-title").textContent = titles[name] || "Visão geral";
  if (name === "home") renderHome();
  if (name === "courses") renderCourses();
  if (name === "users") renderUsers();
  if (name === "create") renderCreateCourse();
}
function openApp(user) {
  currentUser = user;
  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  $("#profile-name").textContent = user.name;
  $("#profile-role").textContent = ({ admin: "Administrador", teacher: "Professor", student: "Aluno" })[user.role] || user.role;
  $("#avatar").textContent = user.name.trim().charAt(0).toUpperCase();
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", user.role !== "admin"));
  setPage("home");
}
function logout(showMessage = true) {
  token = ""; currentUser = null; localStorage.removeItem("cni_ava_token");
  $("#app-view").classList.add("hidden"); $("#login-view").classList.remove("hidden");
  $("#password").value = "";
  if (showMessage) showToast("Você saiu do sistema.");
}
$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").textContent = "";
  const button = event.submitter;
  button.disabled = true; button.textContent = "Entrando...";
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: $("#email").value, password: $("#password").value }) });
    token = data.token; localStorage.setItem("cni_ava_token", token);
    openApp(data.user);
  } catch (error) { $("#login-error").textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = 'Entrar no ambiente <span aria-hidden="true">→</span>'; }
});
$("#logout").addEventListener("click", () => logout());
document.querySelectorAll(".nav-item[data-page]").forEach(button => button.addEventListener("click", () => setPage(button.dataset.page)));

async function loadCourses() {
  const data = await api("/api/courses");
  allCourses = data.courses || [];
  return allCourses;
}
function courseCard(course) {
  const description = course.description || "Conteúdo de aprendizagem da CNI.";
  const status = course.published ? "Publicado" : "Rascunho";
  return `<article class="course-card"><div class="course-cover"><span>▤</span><span class="pill">${escapeHtml(course.modality)}</span></div><div class="course-body"><h4>${escapeHtml(course.title)}</h4><p>${escapeHtml(description)}</p><div class="course-meta">${currentUser.role === "student" ? `Progresso: ${course.progress || 0}%` : `${course.enrolled_count || 0} matrícula(s) • ${status}`}</div>${currentUser.role === "admin" ? `<div style="margin-top:14px"><button class="secondary publish-btn" data-id="${course.id}">${course.published ? "Retirar publicação" : "Publicar curso"}</button></div>` : ""}</div></article>`;
}
async function renderHome() {
  const content = $("#content");
  content.innerHTML = `<div class="empty">Carregando seu ambiente...</div>`;
  try {
    const courses = await loadCourses();
    const isAdmin = currentUser.role === "admin";
    const published = courses.filter(c => c.published).length;
    content.innerHTML = `
      <section class="welcome"><div><h2>Olá, ${escapeHtml(currentUser.name.split(" ")[0])}! 👋</h2><p>Bem-vindo(a) ao ambiente virtual da CNI.<br>Seu desenvolvimento profissional começa aqui.</p></div><div class="welcome-bubble">✦</div></section>
      <div class="stats">
        <article class="stat-card"><div class="stat-top"><span>${isAdmin ? "Cursos cadastrados" : "Cursos disponíveis para você"}</span><span class="stat-icon">▤</span></div><div class="stat-number">${courses.length}</div><div class="stat-caption">${isAdmin ? `${published} publicado(s)` : "Na sua área de aprendizagem"}</div></article>
        <article class="stat-card"><div class="stat-top"><span>Modalidades</span><span class="stat-icon">⌘</span></div><div class="stat-number">EAD +</div><div class="stat-caption">Presencial e híbrido</div></article>
        <article class="stat-card"><div class="stat-top"><span>Seu perfil</span><span class="stat-icon">♙</span></div><div class="stat-number" style="font-size:21px">${({admin:"Admin",teacher:"Professor",student:"Aluno"})[currentUser.role]}</div><div class="stat-caption">Acesso personalizado</div></article>
      </div>
      <div class="section-head"><div><h3>${isAdmin ? "Cursos recentes" : "Continue aprendendo"}</h3><p>${isAdmin ? "Gerencie os cursos do ambiente" : "Acesse seus cursos matriculados"}</p></div><button class="secondary" id="see-courses">Ver todos</button></div>
      ${courses.length ? `<div class="course-grid">${courses.slice(0,3).map(courseCard).join("")}</div>` : `<div class="empty">${isAdmin ? "Você ainda não cadastrou cursos. Use “Criar curso” para começar." : "Você ainda não possui cursos vinculados ao seu usuário. Procure a coordenação da CNI."}</div>`}
    `;
    $("#see-courses").addEventListener("click", () => setPage("courses"));
    bindPublishButtons();
  } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
}
async function renderCourses() {
  const content = $("#content");
  try {
    const courses = await loadCourses();
    content.innerHTML = `<div class="section-head" style="margin-top:0"><div><h3>${currentUser.role === "student" ? "Sua jornada de aprendizagem" : "Catálogo de cursos"}</h3><p>${courses.length} curso(s) listado(s)</p></div></div>${courses.length ? `<div class="course-grid">${courses.map(courseCard).join("")}</div>` : `<div class="empty">${currentUser.role === "student" ? "Nenhum curso vinculado à sua matrícula ainda." : "Nenhum curso cadastrado. Crie seu primeiro curso."}</div>`}`;
    bindPublishButtons();
  } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
}
function bindPublishButtons() {
  document.querySelectorAll(".publish-btn").forEach(button => button.addEventListener("click", async () => {
    try { await api(`/api/courses/${button.dataset.id}/publish`, { method: "PATCH" }); showToast("Status do curso atualizado."); renderCourses(); }
    catch (error) { showToast(error.message); }
  }));
}
function renderCreateCourse() {
  $("#content").innerHTML = `<div class="panel"><div class="section-head" style="margin-top:0"><div><h3>Informações do curso</h3><p>Cadastre o curso. Ele começa como rascunho.</p></div></div><form id="course-form"><label class="field">Nome do curso<input class="form-input" name="title" required minlength="3" maxlength="120" placeholder="Ex.: Informática Básica"></label><label class="field">Descrição<textarea name="description" placeholder="Apresente os objetivos e conteúdos do curso."></textarea></label><label class="field">Modalidade<select class="form-input" name="modality"><option>EAD</option><option>Presencial</option><option>Híbrido</option></select></label><button class="primary" type="submit">Salvar curso como rascunho</button></form></div>`;
  $("#course-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/courses", { method: "POST", body: JSON.stringify({ title: form.get("title"), description: form.get("description"), modality: form.get("modality") }) });
      showToast("Curso cadastrado como rascunho."); setPage("courses");
    } catch (error) { showToast(error.message); }
  });
}
async function renderUsers() {
  const content = $("#content");
  try {
    const data = await api("/api/admin/users");
    content.innerHTML = `<div class="panel" style="margin-bottom:20px"><div class="section-head" style="margin-top:0"><div><h3>Cadastrar usuário</h3><p>Crie acessos para alunos, professores ou administradores.</p></div></div><form id="user-form"><div class="form-grid"><label class="field">Nome completo<input class="form-input" name="name" required minlength="2"></label><label class="field">E-mail<input class="form-input" name="email" type="email" required></label><label class="field">Senha inicial (mín. 10 caracteres)<input class="form-input" name="password" type="password" minlength="10" required></label><label class="field">Perfil<select class="form-input" name="role"><option value="student">Aluno</option><option value="teacher">Professor</option><option value="admin">Administrador</option></select></label></div><button class="primary" type="submit">Cadastrar usuário</button></form></div><div class="section-head"><div><h3>Usuários cadastrados</h3><p>${data.users.length} registro(s)</p></div></div><div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>${data.users.map(u=>`<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${({admin:"Administrador",teacher:"Professor",student:"Aluno"})[u.role]}</td><td>${u.active ? "Ativo" : "Inativo"}</td></tr>`).join("")}</tbody></table></div>`;
    $("#user-form").addEventListener("submit", async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      try { await api("/api/admin/users", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) }); showToast("Usuário cadastrado com sucesso."); renderUsers(); }
      catch (error) { showToast(error.message); }
    });
  } catch (error) { content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; }
}

async function boot() {
  if (!token) return;
  try {
    const data = await api("/api/me");
    openApp(data.user);
  } catch { logout(false); }
}
boot();
