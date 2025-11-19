/* ======================================================
   ADVANCED AI-LIKE CAREER RECOMMENDER ENGINE
====================================================== */

/* SKILL DATA FOR ANALYSIS */
const skillMap = {
    "Software Developer": ["DSA", "Git", "JavaScript", "React", "Backend", "Projects"],
    "Data Scientist": ["Python", "NumPy", "Pandas", "Statistics", "ML Models", "SQL"],
    "ML Engineer": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "Docker", "MLOps"]
};

/* Learning Resources Database */
const resourcesDB = {
    "DSA": [
        {name:"Love Babbar DSA Playlist", url:"https://www.youtube.com/watch?v=3j0SWDX4AtU"},
        {name:"Striver DSA Sheet", url:"https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/"}
    ],
    "JavaScript": [
        {name:"JavaScript Full Course", url:"https://www.youtube.com/watch?v=PkZNo7MFNFg"},
        {name:"MDN Docs", url:"https://developer.mozilla.org/en-US/docs/Web/JavaScript"}
    ],
    "React": [
        {name:"React Roadmap", url:"https://roadmap.sh/react"},
        {name:"React Crash Course", url:"https://www.youtube.com/watch?v=w7ejDZ8SWv8"}
    ],
    "Python": [
        {name:"Python Course – FreeCodeCamp", url:"https://www.youtube.com/watch?v=rfscVS0vtbw"},
        {name:"Python Docs", url:"https://docs.python.org/3/tutorial/"}
    ],
    "ML Models": [
        {name:"Machine Learning Crash Course", url:"https://developers.google.com/machine-learning/crash-course"},
        {name:"Scikit-Learn Docs", url:"https://scikit-learn.org/stable/"}
    ],
    "MLOps": [
        {name:"MLOps Roadmap", url:"https://roadmap.sh/mlops"},
        {name:"MLflow Tutorial", url:"https://mlflow.org/docs/latest/index.html"}
    ]
};

/* AI-Like personality text generator */
function aiPhrase() {
    const phrases = [
        "After analyzing your profile, here's your best career direction 👇",
        "Based on your progress and interests, this path fits you well:",
        "Your saved roles strongly align with this career path:",
        "According to your learning pattern, here’s the next optimized step:",
        "Your skill set suggests the following growth trajectory:"
    ];
    return phrases[Math.floor(Math.random()*phrases.length)];
}

/* Smart Score Calculator */
function computeSmartScore(user, role){
    let score = 0;

    // Weight based on match %
    score += role.match * 1.5;

    // Weight based on progress %
    score += user.progress * 0.8;

    // Skill gap penalty
    let userSkillsLearned = Math.floor(user.progress / 20); // progress = learning
    let requiredSkills = skillMap[role.title].length;
    let gap = Math.max(0, requiredSkills - userSkillsLearned);

    score -= gap * 8; 

    // Add slight randomness
    score += Math.random() * 5;

    return score;
}

/* Smart Path Selector */
function computeSmartPath(user){
    if(!user || !user.savedRoles.length) return null;

    const primaryRole = demoRoles.find(r => r.id === user.savedRoles[0]);

    let bestRole = primaryRole;
    let highest = -Infinity;

    demoRoles.forEach(role => {
        const s = computeSmartScore(user, role);
        if(s > highest){
            highest = s;
            bestRole = role;
        }
    });

    const path = paths[bestRole.title];

    return {
        primary: bestRole,
        desc: path.desc,
        steps: path.steps
    };
}

/* Skill gap calculator */
function computeSkillGap(user, roleTitle){
    const required = skillMap[roleTitle];
    const learnedCount = Math.floor(user.progress / 20);
    return required.slice(learnedCount);
}

/* Learning resources generator */
function getResources(skills){
    let out = [];
    skills.forEach(skill=>{
        if(resourcesDB[skill]){
            out.push(...resourcesDB[skill]);
        }
    });
    return out.slice(0,5); // top 5
}

/* Render the new AI-based path */
function renderCareerPath(user){
    let title = document.getElementById("pathTitle");
    let desc = document.getElementById("pathDescription");
    let stepsBox = document.getElementById("pathSteps");

    if(!user){
        title.innerText = "No Path Available";
        desc.innerText = "Login and save a role to generate your personalized path.";
        stepsBox.innerHTML = "";
        return;
    }

    let path = computeSmartPath(user);
    if(!path){
        title.innerText = "No Path Found";
        desc.innerText = "Save a role to generate your path.";
        stepsBox.innerHTML = "";
        return;
    }

    const gaps = computeSkillGap(user, path.primary.title);
    const resources = getResources(gaps);

    title.innerHTML = aiPhrase() + "<br><br>🔥 " + path.primary.title + " Path";
    desc.innerText = path.desc;

    stepsBox.innerHTML = "";

    path.steps.forEach(step=>{
        stepsBox.innerHTML += `<li>${step}</li>`;
    });

    if(gaps.length){
        stepsBox.innerHTML += `<br><strong>Skill Gaps:</strong> ${gaps.join(", ")}`;
    }

    if(resources.length){
        stepsBox.innerHTML += "<br><br><strong>Recommended Resources:</strong><br>";
        resources.forEach(r=>{
            stepsBox.innerHTML += `
                <div style="margin:6px 0;">
                    <a href="${r.url}" target="_blank" style="color:#79a7ff;">
                        • ${r.name}
                    </a>
                </div>
            `;
        });
    }
}
