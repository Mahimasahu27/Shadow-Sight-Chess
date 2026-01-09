// =========================
// ♟️ SHADOW SIGHT CHESS
// =========================

const game = new Chess();
const boardEl = document.getElementById("board");

// =========================
// 🟡 CRAZYGAMES AD HELPER
// =========================
function showAd() {
    try {
        if (window.cg && window.cg.ad) {
            window.cg.ad.requestAd("midgame");
        }
    } catch (e) {
        console.warn("Ad not ready");
    }
}

// =========================
// 🔊 SOUND SYSTEM
// =========================
const Sound = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    play(type) {
        if (this.ctx.state === "suspended") this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        switch (type) {
            case "move":
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                break;
            case "capture":
                osc.type = "square";
                osc.frequency.setValueAtTime(120, now);
                gain.gain.setValueAtTime(0.03, now);
                break;
            case "end":
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.5);
                gain.gain.setValueAtTime(0.05, now);
                break;
        }

        osc.start();
        osc.stop(now + 0.5);
    }
};

// =========================
// 📈 PROGRESSION SYSTEM
// =========================
const RANKS = ["Novice", "Acolyte", "Warden", "Shadow", "Master", "Legend"];

let stats = {
    elo: parseInt(localStorage.getItem("m_chess_elo")) || 400,
    streak: parseInt(localStorage.getItem("m_chess_streak")) || 0,
    shadowSight: false
};

let selectedSquare = null;
let lastMove = null;

function getRank(elo) {
    const index = Math.min(Math.floor(elo / 400), RANKS.length - 1);
    const progress = ((elo % 400) / 400) * 100;
    return { name: RANKS[index], progress };
}

// =========================
// ♟️ BOARD LOGIC
// =========================
function initBoard() {
    boardEl.innerHTML = "";

    for (let i = 0; i < 64; i++) {
        const sq = document.createElement("div");
        const row = Math.floor(i / 8);
        const col = i % 8;
        const name = String.fromCharCode(97 + col) + (8 - row);

        sq.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
        sq.dataset.square = name;
        sq.addEventListener("click", () => handleInput(name));

        boardEl.appendChild(sq);
    }

    updateBoard();
    updateUI();
}

function updateBoard() {
    const position = game.board();
    const squares = boardEl.querySelectorAll(".square");

    squares.forEach((sq, idx) => {
        const row = Math.floor(idx / 8);
        const col = idx % 8;
        const piece = position[row][col];

        sq.innerHTML = "";
        sq.className = sq.className.split(" ")[0] + " " + sq.className.split(" ")[1];

        if (piece) {
            const el = document.createElement("div");
            el.className = `piece ${piece.type}-${piece.color}`;
            sq.appendChild(el);
        }

        if (lastMove && (sq.dataset.square === lastMove.from || sq.dataset.square === lastMove.to)) {
            sq.classList.add("last-move");
        }

        if (selectedSquare === sq.dataset.square) {
            sq.classList.add("selected");
        }
    });
}

// =========================
// 🧠 GAMEPLAY
// =========================
function handleInput(square) {
    if (game.game_over() || game.turn() === "b") return;

    const piece = game.get(square);

    if (piece && piece.color === "w") {
        selectedSquare = square;
        updateBoard();
        return;
    }

    if (selectedSquare) {
        const move = game.move({ from: selectedSquare, to: square, promotion: "q" });

        if (move) {
            Sound.play(move.captured ? "capture" : "move");
            lastMove = move;
            selectedSquare = null;
            updateBoard();

            if (!game.game_over()) {
                setTimeout(aiTurn, 500);
            }

            checkGameOver();
        } else {
            selectedSquare = null;
            updateBoard();
        }
    }
}

function aiTurn() {
    const moves = game.moves();
    if (!moves.length) return;

    const move = moves[Math.floor(Math.random() * moves.length)];
    const result = game.move(move);

    Sound.play(result.captured ? "capture" : "move");
    lastMove = result;
    updateBoard();
    checkGameOver();
    updateUI();
}

// =========================
// 🟡 GAME OVER + ADS
// =========================
function checkGameOver() {
    if (!game.game_over()) return;

    Sound.play("end");

    let change = 0;
    if (game.in_checkmate()) {
        const win = game.turn() === "b";
        change = win ? 15 + stats.streak * 2 : -10;
        stats.elo += change;
        stats.streak = win ? stats.streak + 1 : 0;

        if (!win) setTimeout(showAd, 500);
    }

    localStorage.setItem("m_chess_elo", stats.elo);
    localStorage.setItem("m_chess_streak", stats.streak);

    setTimeout(() => {
        showAd();
        document.getElementById("modal").classList.remove("hidden");
    }, 800);
}

// =========================
// 🎮 UI
// =========================
function updateUI() {
    const rank = getRank(stats.elo);
    document.getElementById("rank-name").innerText = rank.name;
    document.getElementById("rank-progress").style.width = rank.progress + "%";
    document.getElementById("elo-display").innerText = stats.elo;
    document.getElementById("splash-elo").innerText = stats.elo;
    document.getElementById("splash-streak").innerText = stats.streak;
}

// =========================
// ▶️ START GAME (FIXED)
// =========================
function startGame() {
    console.log("START GAME");
    showAd();

    document.getElementById("splash").classList.add("hidden");
    document.getElementById("modal").classList.add("hidden");

    game.reset();
    lastMove = null;
    selectedSquare = null;

    initBoard();
}

// =========================
// 🔗 BUTTON BINDING (CRITICAL)
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn");
    if (startBtn) {
        startBtn.addEventListener("click", startGame);
    } else {
        console.error("Start button not found");
    }
});
