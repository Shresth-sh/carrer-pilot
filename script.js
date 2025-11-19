/* CareerPilot — Frontend-only logic (no backend).
   Data persisted to localStorage under key "cp_data_v1".
   Features: signup/login, theme toggle, add/delete roles, progress, roadmap.
*/

(() => {
  // ---------- Utilities ----------
  const STORAGE_KEY = "cp_data_v1";

  function readStore(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: {} };
    } catch(e) {
      return { users: {} };
    }
  }
  function writeStore(obj){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  function getLoggedEmail(){
    return localStorage.getItem("cp_logged_email") || null;
  }
  function setLoggedEmail(email){
    if(email) localStorage.setItem("cp_logged_email", email);
    else localStorage.removeItem("cp_logged_email");
  }

  function hashSimple(str){
    // simple SHA-256 using Web Crypto (async but we use then)
    if(!str) return Promise.resolve("");
    const enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(str)).then(buf => {
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
    });
  }

  // Default global roles (starter set)
  const GLOBAL_ROLES_KEY = "cp_global_roles_v1";
  const defaultGlobalRoles = [
    { id: "r1", title: "Software Developer", match: 87, skill: "Data Structures & Algorithms", desc: "Design and implement applications." },
    { id: "r2", title: "Data Scientist", match: 78, skill: "Python, ML", desc: "Analyze data and build models." },
    { id: "r3", title: "ML Engineer", match: 72, skill: "MLOps", desc: "Deploy and monitor ML systems." }
  ];

  function readGlobalRoles(){
    try {
      const raw = localStorage.getItem(GLOBAL_ROLES_KEY);
      if(raw) return JSON.parse(raw);
    } catch(e){}
    localStorage.setItem(GLOBAL_ROLES_KEY, JSON.stringify(defaultGlobalRoles));
    return defaultGlobalRoles;
  }
  function writeGlobalRoles(arr){ localStorage.setItem(GLOBAL_ROLES_KEY, JSON.stringify(arr)); }

  // ---------- Elements ----------
  const authArea = document.getElementById("authArea");
  const signupBox = document.getElementById("signupBox");
  const loginBox = document.getElementById("loginBox");
  const showLogin = document.getElementById("showLogin");
  const showSignup = document.getElementById("showSignup");

  const suName = document.getElementById("suName");
  const suEmail = document.getElementById("suEmail");
  const suPass = document.getElementById("suPass");
  const signupBtn = document.getElementById("signupBtn");

  const liEmail = document.getElementById("liEmail");
  const liPass = document.getElementById("liPass");
  const loginBtn = document.getElementById("loginBtn");

  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeSub = document.getElementById("welcomeSub");
  const roleMatchDisplay = document.getElementById("roleMatchDisplay");
  const nextSkillDisplay = document.getElementById("nextSkillDisplay");
  const levelText = document.getElementById("levelText");
  const progressBar = document.getElementById("progressBar");
  const incProgress = document.getElementById("incProgress");
  const decProgress = document.getElementById("decProgress");
  const resetProgress = document.getElementById("resetProgress");

  const rolesList = document.getElementById("rolesList");
  const addRoleForm = document.getElementById("addRoleForm");
  const newRoleTitle = document.getElementById("newRoleTitle");
  const newRoleSkill = document.getElementById("newRoleSkill");
  const savedRolesEl = document.getElementById("savedRoles");

  const pathTitle = document.getElementById("pathTitle");
  const pathDescription = document.getElementById("pathDescription");
  const pathSteps = document.getElementById("pathSteps");

  const historyList = document.getElementById("historyList");
  const btnRefresh = document.getElementById("btnRefresh");
  const themeToggle = document.getElementById("themeToggle");

  const exportDataBtn = document.getElementById("exportData");
  const importDataBtn = document.getElementById("importDataBtn");
  const importFile = document.getElementById("importFile");

  // ---------- Theme ----------
  (function initTheme(){
    const theme = localStorage.getItem("cp_theme") || "light";
    if(theme === "dark") document.documentElement.setAttribute("data-theme","dark");
    else document.documentElement.removeAttribute("data-theme");
  })();

  themeToggle.addEventListener("click", ()=>{
    const current = document.documentElement.hasAttribute("data-theme") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    if(next === "dark") document.documentElement.setAttribute("data-theme","dark");
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("cp_theme", next);
  });

  // ---------- Auth UI ----------
  function showLoggedUI(email){
    const store = readStore();
    const user = store.users[email];
    authArea.innerHTML = `
      <div class="user-info">
        <span class="muted small">Signed in as</span>
        <div style="font-weight:700">${user.name}</div>
        <div style="font-size:13px;color:var(--muted)">${email}</div>
        <div style="margin-top:8px"><button id="btnLogout" class="btn btn-light">Logout</button></div>
      </div>
    `;
    document.getElementById("btnLogout").addEventListener("click", ()=>{
      setLoggedEmail(null);
      renderApp();
    });
  }

  function showAuthForm(){
    authArea.innerHTML = `
      <button id="openSignup" class="btn btn-light">Sign up</button>
      <button id="openLogin" class="btn btn-ghost">Login</button>
    `;
    document.getElementById("openSignup").addEventListener("click", ()=> {
      signupBox.style.display = "block";
      loginBox.style.display = "none";
    });
    document.getElementById("openLogin").addEventListener("click", ()=> {
      signupBox.style.display = "none";
      loginBox.style.display = "block";
    });
  }

  // swap links
  showLogin && showLogin.addEventListener("click", (e)=>{ e.preventDefault(); signupBox.style.display="none"; loginBox.style.display="block"; });
  showSignup && showSignup.addEventListener("click", (e)=>{ e.preventDefault(); signupBox.style.display="block"; loginBox.style.display="none"; });

  // ---------- Signup / Login ----------
  signupBtn.addEventListener("click", async ()=>{
    const name = suName.value.trim();
    const email = (suEmail.value || "").trim().toLowerCase();
    const pass = suPass.value || "";
    if(!name || !email || !pass){ alert("Fill all fields"); return; }
    if(pass.length < 6){ alert("Password must be at least 6 characters"); return; }

    const store = readStore();
    if(store.users[email]){ alert("User already exists. Please login."); return; }

    const passHash = await hashSimple(pass);
    store.users[email] = { name, passwordHash: passHash, progress: 0, savedRoles: [], history: [{t: Date.now(), progress: 0}] };
    writeStore(store);
    setLoggedEmail(email);
    suName.value = suEmail.value = suPass.value = "";
    renderApp();
  });

  loginBtn.addEventListener("click", async ()=>{
    const email = (liEmail.value || "").trim().toLowerCase();
    const pass = liPass.value || "";
    if(!email || !pass){ alert("Fill login fields"); return; }
    const store = readStore();
    const user = store.users[email];
    if(!user){ alert("No such user. Please sign up."); return; }
    const passHash = await hashSimple(pass);
    if(passHash !== user.passwordHash){ alert("Incorrect password"); return; }
    setLoggedEmail(email);
    liEmail.value = liPass.value = "";
    renderApp();
  });

  // ---------- Role UI ----------
  function renderGlobalRoles(){
    const arr = readGlobalRoles();
    rolesList.innerHTML = "";
    arr.forEach(r => {
      const el = document.createElement("div");
      el.className = "role-item";
      el.innerHTML = `<div>
          <div class="role-title">${r.title}</div>
          <div class="muted small">${r.desc}</div>
        </div>
        <div>
          <button class="btn btn-light" data-id="${r.id}" data-action="save">Save</button>
        </div>`;
      rolesList.appendChild(el);
    });

    // attach save listeners
    rolesList.querySelectorAll("button[data-action='save']").forEach(b=>{
      b.addEventListener("click", (ev)=>{
        const id = ev.currentTarget.dataset.id;
        const logged = getLoggedEmail();
        if(!logged){ alert("Login to save roles"); return; }
        const store = readStore();
        const user = store.users[logged];
        user.savedRoles = user.savedRoles || [];
        if(!user.savedRoles.includes(id)) user.savedRoles.unshift(id);
        user.history = user.history || [];
        user.history.push({ t: Date.now(), action: `saved:${id}` });
        writeStore(store);
        renderSavedRoles(user.savedRoles);
        generateRoadmap(user);
      });
    });
  }

  addRoleForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const title = newRoleTitle.value.trim();
    const skill = newRoleSkill.value.trim() || "General";
    if(!title){ alert("Role title required"); return; }
    const arr = readGlobalRoles();
    const id = "r_" + Date.now().toString(36);
    const r = { id, title, match: Math.floor(60 + Math.random()*30), skill, desc: `${skill} focused role` };
    arr.unshift(r);
    writeGlobalRoles(arr);
    newRoleTitle.value = newRoleSkill.value = "";
    renderGlobalRoles();
  });

  function renderSavedRoles(list){
    savedRolesEl.innerHTML = "";
    if(!list || !list.length){ savedRolesEl.innerHTML = "<div class='muted small'>No saved roles yet</div>"; return; }
    const roles = readGlobalRoles();
    list.forEach(id=>{
      const r = roles.find(rr=>rr.id===id);
      if(!r) return;
      const el = document.createElement("div");
      el.className = "role-item";
      el.innerHTML = `<div><div class="role-title">${r.title}</div><div class="muted small">${r.skill}</div></div>
        <div>
          <button class="btn btn-light" data-id="${r.id}" data-action="remove">Remove</button>
        </div>`;
      savedRolesEl.appendChild(el);
    });

    savedRolesEl.querySelectorAll("button[data-action='remove']").forEach(b=>{
      b.addEventListener("click", (ev)=>{
        const id = ev.currentTarget.dataset.id;
        const logged = getLoggedEmail();
        if(!logged) return;
        const store = readStore();
        const user = store.users[logged];
        user.savedRoles = (user.savedRoles || []).filter(x=>x!==id);
        user.history = user.history || []; user.history.push({ t: Date.now(), action: `removed:${id}` });
        writeStore(store);
        renderSavedRoles(user.savedRoles);
        generateRoadmap(user);
      });
    });
  }

  // ---------- Progress ----------
  incProgress.addEventListener("click", ()=>{
    const logged = getLoggedEmail();
    if(!logged){ alert("Login to update progress"); return; }
    const store = readStore(); const user = store.users[logged];
    user.progress = Math.min(100, (user.progress || 0) + 10);
    user.history = user.history || []; user.history.push({ t: Date.now(), progress: user.progress });
    writeStore(store);
    renderProgress(user);
    generateRoadmap(user);
  });
  decProgress.addEventListener("click", ()=>{
    const logged = getLoggedEmail();
    if(!logged){ alert("Login to update progress"); return; }
    const store = readStore(); const user = store.users[logged];
    user.progress = Math.max(0, (user.progress || 0) - 10);
    user.history = user.history || []; user.history.push({ t: Date.now(), progress: user.progress });
    writeStore(store);
    renderProgress(user);
    generateRoadmap(user);
  });
  resetProgress.addEventListener("click", ()=>{
    const logged = getLoggedEmail();
    if(!logged){ alert("Login to update progress"); return; }
    const store = readStore(); const user = store.users[logged];
    user.progress = 0;
    user.history = user.history || []; user.history.push({ t: Date.now(), progress: 0 });
    writeStore(store);
    renderProgress(user);
    generateRoadmap(user);
  });

  function renderProgress(user){
    const p = Math.min(100, user.progress || 0);
    levelText.innerText = `Level ${Math.max(1, Math.round(p/25))} (${p}%)`;
    progressBar.style.width = p + "%";
    // update history list
    historyList.innerHTML = (user.history || []).slice(-8).reverse().map(h=>{
      if(h.action) return `<li>${new Date(h.t).toLocaleString()} — ${h.action}</li>`;
      return `<li>${new Date(h.t).toLocaleDateString()} — progress ${h.progress}%</li>`;
    }).join("");
  }

  // ---------- Roadmap generation ----------
  const PATHS = {
    "Software Developer": {
      desc: "A path to become a versatile software developer.",
      steps: ["Programming fundamentals (Python/JS)", "Data Structures & Algorithms", "Version control (Git)", "Frontend (HTML, CSS, React)", "Backend (Node/Express)", "Build full-stack projects", "Interview prep"]
    },
    "Data Scientist": {
      desc: "Data science learning path.",
      steps: ["Python & NumPy", "Pandas & Data Wrangling", "Statistics", "Machine Learning algorithms", "Model evaluation", "Data storytelling & projects"]
    },
    "ML Engineer": {
      desc: "ML engineering and deployment path.",
      steps: ["Python & ML basics", "Deep Learning fundamentals", "Model optimization", "Docker & Containers", "CI/CD for ML", "MLOps tools & deployment"]
    }
  };

  function findBestSavedRole(user){
    // pick first saved role that matches known PATHS by title heuristics
    const roles = readGlobalRoles();
    const saved = user.savedRoles || [];
    for(const id of saved){
      const r = roles.find(rr=>rr.id===id);
      if(!r) continue;
      const title = r.title.toLowerCase();
      if(title.includes("software") || title.includes("developer")) return "Software Developer";
      if(title.includes("data") && title.includes("scientist")) return "Data Scientist";
      if(title.includes("ml") || title.includes("engineer") && title.includes("ml")) return "ML Engineer";
    }
    // fallback: if user has saved at least one, try to map by skill
    if(saved.length){
      const r0 = roles.find(rr=>rr.id===saved[0]);
      if(r0 && r0.skill){
        const s = r0.skill.toLowerCase();
        if(s.includes("ml") || s.includes("deep")) return "ML Engineer";
        if(s.includes("python") || s.includes("pandas")) return "Data Scientist";
      }
    }
    return null;
  }

  function generateRoadmap(user){
    if(!user || !(user.savedRoles && user.savedRoles.length)){
      pathTitle.innerText = "No Path Available";
      pathDescription.innerText = "Save a role to generate a personalized roadmap.";
      pathSteps.innerHTML = "";
      return;
    }

    const best = findBestSavedRole(user) || "Software Developer";
    const path = PATHS[best] || PATHS["Software Developer"];
    pathTitle.innerText = `${best} Path`;
    pathDescription.innerText = path.desc;
    pathSteps.innerHTML = path.steps.map(s=>`<li>${s}</li>`).join("");
    // also update top match displays
    const roles = readGlobalRoles();
    const primary = roles.find(r=>r.id===user.savedRoles[0]) || roles[0];
    roleMatchDisplay.innerText = `${primary.title} — ${primary.match}%`;
    nextSkillDisplay.innerText = primary.skill;
  }

  // ---------- Export / Import ----------
  exportDataBtn.addEventListener("click", ()=>{
    const data = localStorage.getItem(STORAGE_KEY) || JSON.stringify({ users: {} });
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "career-pilot-data.json"; a.click();
    URL.revokeObjectURL(url);
  });

  importDataBtn.addEventListener("click", ()=> importFile.click());
  importFile.addEventListener("change", (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        writeStore(obj);
        alert("Data imported. Reloading UI.");
        renderApp();
      } catch(err){
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(f);
  });

  // ---------- Render app ----------
  function renderApp(){
    const logged = getLoggedEmail();
    const store = readStore();
    const user = logged ? store.users[logged] : null;

    if(logged && user){
      welcomeTitle.innerText = `Welcome, ${user.name}`;
      welcomeSub.innerText = `You're signed in — your progress and roles are stored locally in your browser.`;
      showLoggedUI(logged);
      renderProgress(user);
      renderSavedRoles(user.savedRoles || []);
      generateRoadmap(user);
    } else {
      welcomeTitle.innerText = `Welcome`;
      welcomeSub.innerText = `Create an account or log in to save roles and generate a roadmap.`;
      showAuthForm();
      roleMatchDisplay.innerText = "—";
      nextSkillDisplay.innerText = "—";
      levelText.innerText = "Level 0";
      progressBar.style.width = "0%";
      pathTitle.innerText = "No Path Available";
      pathDescription.innerText = "Please sign up and save roles to view a roadmap.";
      pathSteps.innerHTML = "";
      historyList.innerHTML = "";
      savedRolesEl.innerHTML = "<div class='muted small'>No saved roles</div>";
    }

    renderGlobalRoles();
  }

  // ---------- quick refresh button ----------
  btnRefresh.addEventListener("click", ()=> { renderApp(); });

  // ---------- init ----------
  // ensure default global roles exist
  readGlobalRoles();
  renderApp();

  // expose a small API for console/testing
  window.CP = {
    readStore, writeStore, setLoggedEmail, getLoggedEmail, generateRoadmap
  };
})();
