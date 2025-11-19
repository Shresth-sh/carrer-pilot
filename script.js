/* ======================================================
   THEME SWITCHER
====================================================== */
function applyTheme(mode){
    if(mode === "light"){
        document.documentElement.setAttribute("data-theme","light");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", mode);
}
applyTheme(localStorage.getItem("theme") || "dark");

document.getElementById("themeToggle").onclick = () => {
    let isLight = document.documentElement.getAttribute("data-theme")==="light";
    applyTheme(isLight ? "dark" : "light");
};


/* ======================================================
   MOBILE SIDEBAR
====================================================== */
const hamBtn = document.getElementById("hamBtn");
const sidebar = document.getElementById("sidebar");

hamBtn.onclick = () => sidebar.classList.add("open");

document.addEventListener("click", (e)=>{
    if(!sidebar.contains(e.target) && !hamBtn.contains(e.target)){
        sidebar.classList.remove("open");
    }
});


/* ======================================================
   TOAST MESSAGE
====================================================== */
function toast(msg){
    let t = document.getElementById("toast");
    t.innerText = msg;
    t.style.display="block";
    setTimeout(()=> t.style.display="none", 2000);
}


/* ======================================================
   LOCAL STORAGE HELPERS
====================================================== */
function readUsers(){
    return JSON.parse(localStorage.getItem("users") || "{}");
}
function writeUsers(u){
    localStorage.setItem("users", JSON.stringify(u));
}
function setLogged(email){
    if(email) localStorage.setItem("logged", email);
    else localStorage.removeItem("logged");
}


/* ======================================================
   DEMO ROLES DATA
====================================================== */
const demoRoles = [
    {id:"r1",title:"Software Developer",match:87,skill:"Data Structures & Algorithms",desc:"Build and maintain scalable applications."},
    {id:"r2",title:"Data Scientist",match:74,skill:"Statistics & ML",desc:"Analyze, model, and interpret complex data."},
    {id:"r3",title:"ML Engineer",match:65,skill:"MLOps",desc:"Deploy and optimize machine learning models."}
];


/* ======================================================
   SIGNUP + LOGIN SYSTEM
====================================================== */
const signupBox = document.getElementById("signupBox");
const loginBox = document.getElementById("loginBox");
const authTitle = document.getElementById("authTitle");

document.getElementById("showLogin").onclick = ()=>{
    signupBox.style.display="none";
    loginBox.style.display="block";
    authTitle.innerText="Login";
};

document.getElementById("showSignup").onclick = ()=>{
    loginBox.style.display="none";
    signupBox.style.display="block";
    authTitle.innerText="Create Account";
};

document.getElementById("signupBtn").onclick = ()=>{
    let name = suName.value.trim();
    let email = suEmail.value.trim().toLowerCase();
    let pass = suPass.value;

    if(!name || !email || !pass) return toast("Fill all fields");
    if(pass.length < 6) return toast("Password must be 6+ characters");

    let users = readUsers();
    if(users[email]) return toast("User already exists");

    users[email] = {
        name,
        pass,
        progress: 20,
        savedRoles: []
    };

    writeUsers(users);
    setLogged(email);
    toast("Signup successful!");
    updateUI();
};

document.getElementById("loginBtn").onclick = ()=>{
    let email = liEmail.value.trim().toLowerCase();
    let pass = liPass.value;
    let users = readUsers();

    if(!users[email]) return toast("User not found");
    if(users[email].pass !== pass) return toast("Incorrect password");

    setLogged(email);
    toast("Login successful");
    updateUI();
};


/* ======================================================
   DASHBOARD UPDATE
====================================================== */
function updateUI(){
    let logged = localStorage.getItem("logged");
    let users = readUsers();
    let u = users[logged];

    if(!u){
        document.getElementById("usernameTitle").innerText = "Welcome, Guest";
        renderCareerPath(null);
        return;
    }

    // Show username
    document.getElementById("usernameTitle").innerText = "Welcome, " + u.name;

    // Progress
    document.getElementById("progressBar").style.width = u.progress + "%";
    document.getElementById("levelText").innerText = 
        "Level " + Math.max(1, Math.round(u.progress / 25));

    // Role + skill
    if(u.savedRoles.length){
        let r = demoRoles.find(x => x.id === u.savedRoles[0]) || demoRoles[0];
        document.getElementById("roleMatch").innerText = `${r.title} – ${r.match}%`;
        document.getElementById("nextSkill").innerText = r.skill;
    } else {
        document.getElementById("roleMatch").innerText = "—";
        document.getElementById("nextSkill").innerText = "—";
    }

    // Saved roles
    renderSavedRoles(u.savedRoles);

    // CAREER PATH RECOMMENDER
    renderCareerPath(u);
}


/* ======================================================
   PROGRESS BUTTONS
====================================================== */
document.getElementById("incProgress").onclick = ()=>{
    let logged = localStorage.getItem("logged");
    if(!logged) return toast("Login to continue");

    let users = readUsers();
    users[logged].progress = Math.min(100, users[logged].progress + 10);
    writeUsers(users);
    updateUI();
};

document.getElementById("resetProgress").onclick = ()=>{
    let logged = localStorage.getItem("logged");
    if(!logged) return toast("Login to continue");

    let users = readUsers();
    users[logged].progress = 0;
    writeUsers(users);
    updateUI();
};


/* ======================================================
   RENDER ROLE CARDS
====================================================== */
function renderRoles(){
    rolesList.innerHTML="";
    demoRoles.forEach(r=>{
        let div = document.createElement("div");
        div.className = "role-card";
        div.dataset.id = r.id;

        div.innerHTML = `
            <strong>${r.title}</strong> – ${r.match}%
            <button class="cta-btn" style="float:right;padding:6px" onclick="saveRole('${r.id}')">Save</button>
            <div class="role-desc">${r.desc}</div>
        `;

        div.onclick = () => div.classList.toggle("open");
        rolesList.appendChild(div);
    });
}
renderRoles();


/* ======================================================
   SAVE ROLE
====================================================== */
function saveRole(id){
    event.stopPropagation();

    let logged = localStorage.getItem("logged");
    if(!logged) return toast("Login to save roles");

    let users = readUsers();
    let u = users[logged];

    if(!u.savedRoles.includes(id)){
        u.savedRoles.unshift(id);
    }

    writeUsers(users);
    toast("Role saved");
    updateUI();
}

function renderSavedRoles(list){
    let box = document.getElementById("savedRoles");
    if(list.length===0){
        box.innerHTML = "No saved roles yet.";
        return;
    }

    box.innerHTML = list.map(id=>{
        let r = demoRoles.find(x=>x.id===id);
        return `<div style="padding:6px; margin:4px 0; background:rgba(255,255,255,0.1); border-radius:6px;">${r.title}</div>`;
    }).join("");
}


/* ======================================================
   CAREER PATH RECOMMENDER ENGINE
====================================================== */

const paths = {
    "Software Developer": {
        desc: "Structured learning roadmap to become a full-stack developer.",
        steps: [
            "Learn programming basics (JS/Python)",
            "Master DSA fundamentals",
            "Learn Git/GitHub",
            "Build static websites (HTML/CSS)",
            "Learn React or Vue",
            "Backend: Node.js + Express",
            "Create full-stack projects",
            "Practice coding interview problems"
        ]
    },
    "Data Scientist": {
        desc: "Mathematical + ML-focused roadmap.",
        steps: [
            "Learn Python thoroughly",
            "NumPy, Pandas, Matplotlib",
            "Statistics + Probability",
            "Machine learning algorithms",
            "Build ML models in scikit-learn",
            "Learn SQL",
            "Build data case studies",
            "Deploy ML models (Flask/FastAPI)"
        ]
    },
    "ML Engineer": {
        desc: "Production-level AI deployment roadmap.",
        steps: [
            "Master Python + ML basics",
            "Learn deep learning (TensorFlow/PyTorch)",
            "Model optimization",
            "Learn Docker + Linux basics",
            "APIs + microservices",
            "Learn MLOps tools (Airflow, MLflow)",
            "Deploy ML models to cloud",
            "Build full ML pipelines"
        ]
    }
};


function computePath(user){
    if(!user || !user.savedRoles.length) return null;

    let roleId = user.savedRoles[0];
    let role = demoRoles.find(r=>r.id === roleId);

    if(!role) return null;

    return paths[role.title] ? {
        title: role.title,
        desc: paths[role.title].desc,
        steps: paths[role.title].steps
    } : null;
}

function renderCareerPath(user){
    let box = document.getElementById("pathBox");
    let title = document.getElementById("pathTitle");
    let desc = document.getElementById("pathDescription");
    let steps = document.getElementById("pathSteps");

    if(!user){
        title.innerText = "No Path Available";
        desc.innerText = "Login and save a career role to get a personalized path.";
        steps.innerHTML = "";
        return;
    }

    let path = computePath(user);

    if(!path){
        title.innerText = "No Path Found";
        desc.innerText = "Save a role to generate your roadmap.";
        steps.innerHTML = "";
        return;
    }

    title.innerText = path.title + " Path";
    desc.innerText = path.desc;
    steps.innerHTML = path.steps.map(s=>`<li>${s}</li>`).join("");
}


/* ======================================================
   INITIAL LOAD
====================================================== */
updateUI();
