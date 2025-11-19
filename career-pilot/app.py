# app.py
# Full backend code was provided in the previous response.
# Replace this placeholder with the full app.py content.
# app.py
import os
import json
import time
import threading
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from flask_cors import CORS

# Config
DATA_FILE = os.environ.get("CC_DATA_FILE", "data.json")
JWT_SECRET = os.environ.get("CC_JWT_SECRET", "change-me-to-a-secure-secret")
JWT_ALGO = "HS256"
JWT_EXP_MINUTES = 60 * 24 * 7  # 7 days

app = Flask(__name__)
CORS(app)  # allow cross-origin (adjust in production)

# Thread lock to avoid concurrent JSON writes
file_lock = threading.Lock()

# Default demo roles & path definitions (same as frontend)
DEMO_ROLES = [
    {"id": "r1", "title": "Software Developer", "match": 87, "skill": "Data Structures & Algorithms", "desc": "Design and implement software systems."},
    {"id": "r2", "title": "Data Scientist", "match": 74, "skill": "Statistics & Feature Engineering", "desc": "Analyze data to extract insights."},
    {"id": "r3", "title": "ML Engineer", "match": 65, "skill": "MLOps", "desc": "Productionise ML models robustly."}
]

PATHS = {
    "Software Developer": {
        "desc": "Full-stack development path.",
        "steps": ["Programming basics", "DSA", "Frontend (React)", "Backend (Node)", "Full-stack projects", "Interview prep"]
    },
    "Data Scientist": {
        "desc": "Data science path.",
        "steps": ["Python", "Pandas & NumPy", "Statistics", "ML models", "Model evaluation", "Project case studies"]
    },
    "ML Engineer": {
        "desc": "ML deployment path.",
        "steps": ["ML fundamentals", "Deep learning", "Model optimization", "Docker", "MLOps tools", "Deploy & monitor"]
    }
}

SKILL_MAP = {
    "Software Developer": ["DSA", "Git", "JavaScript", "React", "Backend", "Projects"],
    "Data Scientist": ["Python", "NumPy", "Pandas", "Statistics", "ML Models", "SQL"],
    "ML Engineer": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "Docker", "MLOps"]
}

RESOURCES_DB = {
    "DSA": [{"name": "Striver DSA Sheet", "url": "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/"}],
    "JavaScript": [{"name": "MDN JS", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript"}],
    "Python": [{"name": "Python Tutorial", "url": "https://docs.python.org/3/tutorial/"}],
    "MLOps": [{"name": "MLOps Roadmap", "url": "https://roadmap.sh/mlops"}]
}


### Helper: read/write JSON safely ###
def read_data():
    if not os.path.exists(DATA_FILE):
        # create initial minimal structure
        initial = {"users": {}}
        with file_lock:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(initial, f, indent=2)
        return initial
    with file_lock:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)


def write_data(data):
    with file_lock:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)


### Auth utilities ###
def create_token(email):
    payload = {
        "sub": email,
        "iat": int(time.time()),
        "exp": int((datetime.utcnow() + timedelta(minutes=JWT_EXP_MINUTES)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth or not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid auth token"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            email = payload.get("sub")
            # load user
            data = read_data()
            user = data.get("users", {}).get(email)
            if not user:
                return jsonify({"error": "User not found"}), 401
            # attach user to request context
            request.user_email = email
            return fn(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception as e:
            return jsonify({"error": "Invalid token", "details": str(e)}), 401
    return wrapper


### Routes ###

@app.route("/api/ping")
def ping():
    return jsonify({"pong": True, "time": int(time.time())})


@app.route("/api/roles", methods=["GET"])
def get_roles():
    return jsonify({"roles": DEMO_ROLES})


@app.route("/api/signup", methods=["POST"])
def signup():
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not name or not email or not password:
        return jsonify({"error": "name, email, password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password length min 6"}), 400

    data = read_data()
    users = data.setdefault("users", {})
    if email in users:
        return jsonify({"error": "user exists"}), 400

    users[email] = {
        "name": name,
        "password_hash": generate_password_hash(password),
        "progress": 0,
        "savedRoles": [],
        "history": [{"t": int(time.time()), "progress": 0}]
    }
    write_data(data)
    token = create_token(email)
    return jsonify({"message": "created", "token": token, "user": {"email": email, "name": name}}), 201


@app.route("/api/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    data = read_data()
    users = data.get("users", {})
    user = users.get(email)
    if not user:
        return jsonify({"error": "invalid credentials"}), 401
    if not check_password_hash(user.get("password_hash", ""), password):
        return jsonify({"error": "invalid credentials"}), 401
    token = create_token(email)
    return jsonify({"message": "ok", "token": token, "user": {"email": email, "name": user.get("name")}})


@app.route("/api/me", methods=["GET"])
@login_required
def me():
    email = request.user_email
    data = read_data()
    user = data.get("users", {}).get(email)
    safe = {
        "email": email,
        "name": user.get("name"),
        "progress": user.get("progress", 0),
        "savedRoles": user.get("savedRoles", []),
        "history": user.get("history", [])
    }
    return jsonify({"user": safe})


@app.route("/api/role/save", methods=["POST"])
@login_required
def save_role():
    body = request.get_json() or {}
    role_id = body.get("role_id")
    if not role_id:
        return jsonify({"error": "role_id required"}), 400
    email = request.user_email
    data = read_data()
    users = data.setdefault("users", {})
    user = users.get(email)
    user.setdefault("savedRoles", [])
    if role_id in user["savedRoles"]:
        return jsonify({"message": "already saved"}), 200
    user["savedRoles"].insert(0, role_id)
    user.setdefault("history", []).append({"t": int(time.time()), "action": f"saved:{role_id}"})
    write_data(data)
    return jsonify({"message": "saved", "savedRoles": user["savedRoles"]})


@app.route("/api/progress/update", methods=["POST"])
@login_required
def update_progress():
    body = request.get_json() or {}
    progress = body.get("progress")
    if progress is None:
        return jsonify({"error": "progress required"}), 400
    try:
        progress = int(progress)
    except:
        return jsonify({"error": "progress must be integer between 0 and 100"}), 400
    progress = max(0, min(100, progress))
    email = request.user_email
    data = read_data()
    user = data.get("users", {}).get(email)
    user["progress"] = progress
    user.setdefault("history", []).append({"t": int(time.time()), "progress": progress})
    write_data(data)
    return jsonify({"message": "updated", "progress": progress})


@app.route("/api/progress/history", methods=["GET"])
@login_required
def progress_history():
    email = request.user_email
    data = read_data()
    user = data.get("users", {}).get(email)
    hist = user.get("history", [])
    return jsonify({"history": hist})


# Simple recommender endpoint - server-side version of AI-like logic
@app.route("/api/recommendation", methods=["GET"])
@login_required
def recommendation():
    email = request.user_email
    data = read_data()
    user = data.get("users", {}).get(email)
    if not user or not user.get("savedRoles"):
        return jsonify({"error": "no saved roles, save a role first"}), 400

    # Score roles
    def score_role(user, role):
        s = role.get("match", 50) * 1.5 + (user.get("progress", 0)) * 0.8
        required = len(SKILL_MAP.get(role["title"], []))
        learned = (user.get("progress", 0)) // 20
        gap = max(0, required - learned)
        s -= gap * 8
        # small noise
        s += (os.urandom(1)[0] % 5) / 2.0
        return s

    scored = []
    for r in DEMO_ROLES:
        scored.append({"role": r, "score": round(score_role(user, r), 2)})

    scored = sorted(scored, key=lambda x: x["score"], reverse=True)
    best = scored[0]
    # server side path
    path_def = PATHS.get(best["role"]["title"], {})
    skill_gap = compute_skill_gap(user, best["role"]["title"])
    resources = get_resources(skill_gap)

    return jsonify({
        "best": best,
        "scored": scored,
        "path": path_def,
        "skill_gap": skill_gap,
        "resources": resources
    })


def compute_skill_gap(user, role_title):
    req = SKILL_MAP.get(role_title, [])
    learned = (user.get("progress", 0)) // 20
    return req[learned:]


def get_resources(skills):
    out = []
    for s in skills:
        if s in RESOURCES_DB:
            out.extend(RESOURCES_DB[s])
    return out[:8]


@app.route("/api/resources", methods=["GET"])
@login_required
def resources():
    # optional ?skills=CSV
    skills_param = request.args.get("skills", "")
    skills = [s.strip() for s in skills_param.split(",") if s.strip()]
    if not skills:
        return jsonify({"available": list(RESOURCES_DB.keys()), "resources": RESOURCES_DB})
    res = []
    for sk in skills:
        res.extend(RESOURCES_DB.get(sk, []))
    return jsonify({"resources": res})


# For testing convenience: create demo user if requested
@app.route("/api/setup-demo", methods=["POST"])
def setup_demo():
    data = read_data()
    users = data.setdefault("users", {})
    if "demo@careercraft.test" not in users:
        users["demo@careercraft.test"] = {
            "name": "Demo User",
            "password_hash": generate_password_hash("password"),
            "progress": 46,
            "savedRoles": ["r1", "r3"],
            "history": [
                {"t": int(time.time()) - 60*60*24*30, "progress": 10},
                {"t": int(time.time()) - 60*60*24*14, "progress": 20},
                {"t": int(time.time()) - 60*60*24*7, "progress": 33},
                {"t": int(time.time()) - 60*60*24*1, "progress": 46}
            ]
        }
        write_data(data)
        return jsonify({"message": "demo user created", "email": "demo@careercraft.test", "password": "password"})
    else:
        return jsonify({"message": "demo already present"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=bool(os.environ.get("DEBUG", True)))
