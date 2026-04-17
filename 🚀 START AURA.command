#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  🌍 AURA Air Quality Platform — One-Click Launcher
#  Double-click this file in Finder to launch the full project.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ── Colours ────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"

# ── Helpers ─────────────────────────────────────────────────────
print_header() {
  echo -e ""
  echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}  ║   🌍  AURA Air Quality Platform          ║${RESET}"
  echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════╝${RESET}"
  echo -e ""
}

step()  { echo -e "  ${CYAN}▶${RESET}  $1"; }
ok()    { echo -e "  ${GREEN}✔${RESET}  $1"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
error() { echo -e "  ${RED}✖${RESET}  $1"; }
divider(){ echo -e "  ${DIM}──────────────────────────────────────────${RESET}"; }

# ── Change to script's own directory ────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Locate Node / npm (works even when PATH is minimal on macOS) ─
# macOS double-click leaves PATH stripped; add common install paths.
export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$HOME/.volta/bin:/usr/bin:/bin:$PATH"

print_header

# ── Check prerequisites ──────────────────────────────────────────
step "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  error "Node.js not found! Please install it from https://nodejs.org"
  echo ""
  read -n1 -r -p "  Press any key to close..." _; echo ""
  exit 1
fi

if ! command -v npm &>/dev/null; then
  error "npm not found! Please install Node.js from https://nodejs.org"
  echo ""
  read -n1 -r -p "  Press any key to close..." _; echo ""
  exit 1
fi

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
ok "Node ${NODE_VER}  |  npm v${NPM_VER}"

# Check Python for ML backend
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
  PYTHON_CMD="python"
fi

if [ -n "$PYTHON_CMD" ]; then
  PY_VER=$($PYTHON_CMD --version 2>&1)
  ok "$PY_VER (for ML backend)"
else
  warn "Python not found — ML backend will not start"
fi

divider

# ── Clear ports ──────────────────────────────────────────────────
step "Clearing ports 3000 & 5001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && ok "Port 3000 cleared" || true
lsof -ti:5001 | xargs kill -9 2>/dev/null && ok "Port 5001 cleared" || true
sleep 1
divider

# ── Install frontend dependencies (if needed) ───────────────────
install_if_needed() {
  local dir="$1"
  local label="$2"
  if [ ! -d "$dir/node_modules" ] || [ ! -f "$dir/node_modules/.package-lock.json" ] && [ ! -f "$dir/node_modules/.modules.yaml" ]; then
    step "Installing dependencies for ${label}..."
    (cd "$dir" && npm install --silent) && ok "${label} dependencies ready" || {
      error "Failed to install ${label} dependencies!"
      read -n1 -r -p "  Press any key to close..." _; echo ""
      exit 1
    }
  else
    ok "${label} dependencies already installed"
  fi
}

install_if_needed "$SCRIPT_DIR/frontend" "Frontend"
divider

# ── Start servers ────────────────────────────────────────────────
LOG_FRONTEND="/tmp/aura_frontend_$$.log"
LOG_BACKEND="/tmp/aura_backend_$$.log"

step "Starting  Frontend (React)  →  http://localhost:3000"
(cd "$SCRIPT_DIR/frontend" && npm run dev -- --port 3000 --host 0.0.0.0) >"$LOG_FRONTEND" 2>&1 &
PID_FRONTEND=$!

PID_BACKEND=""
if [ -n "$PYTHON_CMD" ] && [ -f "$SCRIPT_DIR/backend/predict.py" ]; then
  step "Starting  Backend  (Flask)  →  http://localhost:5001"
  # Activate venv if it exists
  if [ -f "$SCRIPT_DIR/backend/venv/bin/activate" ]; then
    (source "$SCRIPT_DIR/backend/venv/bin/activate" && cd "$SCRIPT_DIR/backend" && $PYTHON_CMD predict.py) >"$LOG_BACKEND" 2>&1 &
  else
    (cd "$SCRIPT_DIR/backend" && $PYTHON_CMD predict.py) >"$LOG_BACKEND" 2>&1 &
  fi
  PID_BACKEND=$!
else
  warn "Skipping ML backend (Python or predict.py not found)"
fi

divider

# ── Wait until ports respond ─────────────────────────────────────
wait_for_port() {
  local port=$1
  local label=$2
  local logfile=$3
  local max=40   # up to 20 seconds (40 × 0.5 s)
  local count=0
  printf "  ${CYAN}⏳${RESET}  Waiting for %s" "$label"
  while ! nc -z 127.0.0.1 "$port" 2>/dev/null; do
    sleep 0.5
    count=$((count+1))
    printf "."
    if [ $count -ge $max ]; then
      echo ""
      error "${label} did not start in time. Check log:"
      tail -20 "$logfile"
      cleanup
      exit 1
    fi
  done
  echo ""
  ok "${label} is ready!"
}

wait_for_port 3000 "Frontend (port 3000)" "$LOG_FRONTEND"
if [ -n "$PID_BACKEND" ]; then
  wait_for_port 5001 "ML Backend (port 5001)" "$LOG_BACKEND"
fi
divider

# ── Open in browser ──────────────────────────────────────────────
step "Opening in browser..."
open "http://localhost:3000"
divider

# ── Success banner ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ✅  AURA is running!${RESET}"
echo ""
echo -e "  ${CYAN}Web App     ${RESET}  →  http://localhost:3000"
if [ -n "$PID_BACKEND" ]; then
  echo -e "  ${CYAN}ML Backend  ${RESET}  →  http://localhost:5001"
fi
echo -e "  ${CYAN}Dashboard   ${RESET}  →  http://localhost:3000/dashboard"
echo -e "  ${CYAN}Map         ${RESET}  →  http://localhost:3000/map"
echo -e "  ${CYAN}Analytics   ${RESET}  →  http://localhost:3000/analytics"
echo ""
echo -e "  ${DIM}Admin Login:${RESET}"
echo -e "  ${DIM}  Email    →  admin@aura.ai${RESET}"
echo -e "  ${DIM}  Password →  AuraAdmin2024${RESET}"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all servers.${RESET}"
divider
echo ""

# ── Cleanup on exit ──────────────────────────────────────────────
cleanup() {
  echo ""
  step "Shutting down servers..."
  kill "$PID_FRONTEND" 2>/dev/null
  [ -n "$PID_BACKEND" ] && kill "$PID_BACKEND" 2>/dev/null
  # Also kill any leftover processes on our ports
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  lsof -ti:5001 | xargs kill -9 2>/dev/null
  rm -f "$LOG_FRONTEND" "$LOG_BACKEND"
  ok "All servers stopped. Goodbye!"
  echo ""
}
trap cleanup INT TERM EXIT

# ── Keep terminal open & watch child processes ───────────────────
# If the frontend server dies unexpectedly, we alert and keep the window open.
while true; do
  if ! kill -0 "$PID_FRONTEND" 2>/dev/null; then
    error "Frontend crashed! Last log lines:"
    tail -20 "$LOG_FRONTEND"
    break
  fi
  if [ -n "$PID_BACKEND" ] && ! kill -0 "$PID_BACKEND" 2>/dev/null; then
    error "ML Backend crashed! Last log lines:"
    tail -20 "$LOG_BACKEND"
    break
  fi
  sleep 3
done

echo ""
warn "A server stopped unexpectedly. Press Enter to close this window."
read -r _
