// ==========================================
// 美食競速賽 V5 - 完整遊戲邏輯
// ==========================================

// --- 遊戲狀態 ---
let balance = 12345678;
let currentBet = 100000;
let selectedChar = null;
let timer = 28;
let isAutoMode = false;
let isGameRunning = false;
let currentBoard = null;
let countdownInt = null;

// 模擬其他玩家的總下注
let totalBets = { A: 8543210, B: 6234567, C: 10325890 };

// 麻將收集
let mahjongCollected = { wan: false, tong: false, tiao: false };

const oddsMap = { A: 2.35, B: 1.85, C: 2.70 };
const nameMap = { A: '🧁 甜點魔法師', B: '🍣 壽司忍者', C: '🌶️ 辣椒小廚神' };

// --- Symbol 定義 (盤面用，不含 boost/pair/straight，這三個改放賽道格子) ---
const SYMBOLS = [
    { id: 'plus1',     icon: '⬆️', label: '+1',       weight: 20 },
    { id: 'plus2',     icon: '⏫', label: '+2',       weight: 12 },
    { id: 'dice',      icon: '🎲', label: 'Dice',     weight: 10 },
    { id: 'chaosDice', icon: '🌀', label: 'Chaos',    weight: 5  },
    { id: 'block',     icon: '⛔', label: 'Block',    weight: 8  },
    { id: 'swap',      icon: '🔄', label: 'Swap',     weight: 6  },
    { id: 'mjWan',     icon: '🀄', label: '萬',       weight: 5  },
    { id: 'mjTong',    icon: '🀙', label: '筒',       weight: 5  },
    { id: 'mjTiao',    icon: '🀇', label: '條',       weight: 5  },
];

function randomSymbol() {
    const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
    let r = Math.random() * total;
    for (const sym of SYMBOLS) {
        r -= sym.weight;
        if (r <= 0) return { ...sym };
    }
    return { ...SYMBOLS[0] };
}

// --- UI 元素 ---
const $ = id => document.getElementById(id);
let tokens = {};

// ==========================================
// 初始化
// ==========================================
function init() {
    updateUI();
    buildTrack();
    startCountdown();
}

function startCountdown() {
    if (countdownInt) clearInterval(countdownInt);
    timer = 28;
    renderTimer();
    countdownInt = setInterval(() => {
        if (isGameRunning) return;
        timer--;
        if (timer <= 0) {
            // 倒數結束：若沒選角色，隨機選一個
            if (!selectedChar) {
                const chars = ['A', 'B', 'C'];
                const randomChar = chars[Math.floor(Math.random() * chars.length)];
                selectChar(randomChar);
                logToast(`⏰ 時間到！自動選擇了 ${nameMap[randomChar]}`);
            }
            // 自動開始
            if (balance >= currentBet) {
                startGame();
            }
            timer = 28;
        }
        renderTimer();
    }, 1000);
}

function renderTimer() {
    const min = Math.floor(timer / 60).toString().padStart(2, '0');
    const sec = (timer % 60).toString().padStart(2, '0');
    $('countdownTimer').innerText = `${min}:${sec}`;
    // 倒數 5 秒內閃紅
    if (timer <= 5) {
        $('countdownTimer').style.color = '#dc2626';
    } else {
        $('countdownTimer').style.color = '';
    }
}

function logToast(msg) {
    // 簡易 toast 提示
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#ffd54f;padding:10px 20px;border-radius:20px;font-size:0.85rem;font-weight:bold;z-index:9999;pointer-events:none;animation:fadeOut 2s forwards;';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

// 加入 fadeOut 動畫
const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes fadeOut { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 70%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(-20px)} }`;
document.head.appendChild(styleTag);

// ==========================================
// 場景 1 操作
// ==========================================
function selectChar(char) {
    selectedChar = char;
    const grid = $('charGrid');
    grid.classList.add('has-selection');
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.char-card[data-char="${char}"]`).classList.add('selected');
    updateUI();
}

function setBet(amount) {
    if (amount === 'MAX') currentBet = balance;
    else currentBet = amount;
    validateBet();
    highlightQuickBtn();
}

function adjustBet(amount) {
    currentBet += amount;
    validateBet();
    highlightQuickBtn();
}

function validateBet() {
    if (currentBet < 10000) currentBet = 10000;
    if (currentBet > balance) currentBet = balance;
    // 取整到千
    currentBet = Math.floor(currentBet / 1000) * 1000;
    if (currentBet < 10000) currentBet = 10000;
    updateUI();
}

function highlightQuickBtn() {
    const amounts = [10000, 50000, 100000, 500000, 1000000];
    document.querySelectorAll('.btn-quick').forEach((btn, i) => {
        btn.classList.toggle('active-bet', amounts[i] === currentBet);
    });
}

function updateUI() {
    $('balanceDisplay').innerText = balance.toLocaleString();
    $('betAmountDisplay').innerText = currentBet.toLocaleString();

    // 總下注更新
    $('totalBetA').innerText = totalBets.A.toLocaleString();
    $('totalBetB').innerText = totalBets.B.toLocaleString();
    $('totalBetC').innerText = totalBets.C.toLocaleString();

    // 當前選擇 & 預計可贏
    if (selectedChar) {
        $('currentSelection').innerHTML = `<span style="color:${selectedChar === 'A' ? '#7c3aed' : selectedChar === 'B' ? '#2563eb' : '#dc2626'}">${nameMap[selectedChar]}</span>`;
        const est = Math.floor(currentBet * oddsMap[selectedChar]);
        $('estimatedWin').innerText = est.toLocaleString();
        $('estimatedWin').style.color = '#ffd54f';
    } else {
        $('currentSelection').innerText = '尚未選擇角色';
        $('estimatedWin').innerText = '--';
        $('estimatedWin').style.color = '#fff';
    }

    // GO 按鈕
    $('btnGo').disabled = !selectedChar || currentBet <= 0 || balance < currentBet || isGameRunning;

    // 場景 2 餘額
    const s2b = $('s2BalanceDisplay');
    if (s2b) s2b.innerText = balance.toLocaleString();
}

// ==========================================
// Auto 模式
// ==========================================
function toggleAuto() {
    isAutoMode = !isAutoMode;
    syncAutoButtons();
    if (!isAutoMode) {
        logToast('🛑 Auto 已關閉');
    }
}

function toggleAutoFromScene1() {
    if (isGameRunning) return;
    isAutoMode = !isAutoMode;
    syncAutoButtons();
    // Auto 開啟後，若已選角色且餘額足夠，自動開始
    if (isAutoMode && selectedChar && balance >= currentBet) {
        startGame();
    }
}

function syncAutoButtons() {
    const btnS1 = $('btnAuto');
    const btnS2 = $('btnAutoS2');
    if (btnS1) btnS1.classList.toggle('active', isAutoMode);
    if (btnS2) btnS2.classList.toggle('active', isAutoMode);
}

// ==========================================
// 規則彈窗
// ==========================================
function showRules() {
    $('rulesModal').classList.add('show');
}
function closeRules() {
    $('rulesModal').classList.remove('show');
}

// ==========================================
// 賽道建置 (12格方形環繞)
// ==========================================
// 12 格座標 (方形環繞，順時針)
const trackCoords = [
    { t: 2,  l: 2,  label: 'START' },  // 0: 左上
    { t: 2,  l: 22, label: '' },        // 1
    { t: 2,  l: 42, label: '' },        // 2
    { t: 2,  l: 62, label: '' },        // 3
    { t: 2,  l: 82, label: '' },        // 4: 右上
    { t: 30, l: 82, label: '' },        // 5
    { t: 58, l: 82, label: '' },        // 6
    { t: 82, l: 82, label: '' },        // 7: 右下
    { t: 82, l: 55, label: '' },        // 8
    { t: 82, l: 28, label: '' },        // 9
    { t: 82, l: 2,  label: '' },        // 10: 左下
    { t: 42, l: 2,  label: 'FINISH' },  // 11: 終點
];

// 賽道格子上的特殊 symbol (每局隨機)
const TRACK_SPECIALS = [
    { id: 'boost',    icon: '🚀', label: 'Boost',    desc: '下回合額外 +1！' },
    { id: 'pair',     icon: '👯', label: 'Pair',     desc: '獎金 x2！' },
    { id: 'straight', icon: '📏', label: 'Straight', desc: '所有人 +1！' },
];

// 美食裝飾 emoji
const FOOD_EMOJIS = ['🍣', '🍰', '🍜', '🍕', '🌮', '🍔', '🧁', '🍩', '🥟', '🍱', '🍦', '🥐'];

let trackCellData = []; // 每局的格子資料

function buildTrack() {
    randomizeTrackCells();
    renderTrackCells();

    // 建立 Tokens
    ['A', 'B', 'C'].forEach((char, i) => {
        const token = document.createElement('div');
        token.className = `token token-${char}`;
        token.id = `token-${char}`;
        token.innerText = `${i + 1}`;
        setTokenPosition(token, 0, i);
        $('board').appendChild(token);
        tokens[char] = token;
    });
}

function randomizeTrackCells() {
    // 初始化 12 格
    trackCellData = trackCoords.map((coord, i) => ({
        ...coord,
        index: i,
        special: null,  // boost/pair/straight
        food: null,      // 美食 emoji
    }));

    // 格子 0 (START) 和 11 (FINISH) 不放東西
    const availableIndices = [];
    for (let i = 1; i <= 10; i++) availableIndices.push(i);

    // 隨機 3 格放 Boost/Pair/Straight
    const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
    const specialIndices = shuffled.slice(0, 3);
    specialIndices.forEach((idx, si) => {
        trackCellData[idx].special = TRACK_SPECIALS[si];
        trackCellData[idx].label = TRACK_SPECIALS[si].icon;
    });

    // 剩下的空格中隨機 6 格放美食圖
    const remaining = shuffled.slice(3);
    const foodIndices = remaining.slice(0, Math.min(6, remaining.length));
    const shuffledFoods = [...FOOD_EMOJIS].sort(() => Math.random() - 0.5);
    foodIndices.forEach((idx, fi) => {
        trackCellData[idx].food = shuffledFoods[fi % shuffledFoods.length];
        if (!trackCellData[idx].label) trackCellData[idx].label = shuffledFoods[fi % shuffledFoods.length];
    });
}

function renderTrackCells() {
    const board = $('board');
    // 移除舊格子 (保留 slot-grid 和 headers)
    board.querySelectorAll('.cell').forEach(c => c.remove());

    trackCellData.forEach((data, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.id = `cell-${i}`;
        cell.style.top = data.t + '%';
        cell.style.left = data.l + '%';

        if (i === 0) cell.classList.add('cell-start');
        if (i === 11) cell.classList.add('cell-finish');
        if (data.special) cell.classList.add('cell-special');
        if (data.food) cell.classList.add('cell-food');

        cell.innerHTML = data.label || `${i}`;
        board.appendChild(cell);
    });
}

function setTokenPosition(token, spaceIndex, charOffsetIndex) {
    if (spaceIndex > 11) spaceIndex = 11;
    const pos = trackCoords[spaceIndex];
    const offsetX = [2, 15, 30][charOffsetIndex];
    const offsetY = [2, 25, 15][charOffsetIndex];
    token.style.top = `calc(${pos.t}% + ${offsetY}px)`;
    token.style.left = `calc(${pos.l}% + ${offsetX}px)`;
}

// 角色踩到特殊格子時的處理
async function checkCellEffect(char, cellIndex, raceState) {
    const cellData = trackCellData[cellIndex];
    if (!cellData || !cellData.special) return;

    const cellEl = $(`cell-${cellIndex}`);
    const charIdx = ['A', 'B', 'C'].indexOf(char);

    // 觸發特效動畫
    if (cellEl) {
        cellEl.classList.add('cell-triggered');
        setTimeout(() => cellEl.classList.remove('cell-triggered'), 1200);
    }

    switch (cellData.special.id) {
        case 'boost':
            raceState.boostNext[char] = true;
            log(`✨ ${nameMap[char]} 踩到 🚀 Boost！下回合額外 +1！`);
            break;
        case 'pair':
            raceState.pairMultiplier *= 2;
            log(`✨ ${nameMap[char]} 踩到 👯 Pair！獎金 x2！`);
            break;
        case 'straight':
            log(`✨ ${nameMap[char]} 踩到 📏 Straight！所有人 +1！`);
            ['A', 'B', 'C'].forEach((c, i) => {
                raceState.pos[c] = Math.min(raceState.pos[c] + 1, 11);
                setTokenPosition(tokens[c], raceState.pos[c], i);
            });
            break;
    }
    await sleep(400);
}

// ==========================================
// 盤面產生 & 渲染
// ==========================================
function generateBoard() {
    const board = [];
    for (let row = 0; row < 3; row++) {
        board[row] = [];
        for (let col = 0; col < 5; col++) {
            board[row][col] = randomSymbol();
        }
    }
    return board;
}

function renderBoard(board) {
    const slotGrid = $('slotGrid');
    slotGrid.innerHTML = '';
    const oldCH = document.querySelector('.slot-col-headers');
    const oldRH = document.querySelector('.slot-row-headers');
    if (oldCH) oldCH.remove();
    if (oldRH) oldRH.remove();

    const boardEl = $('board');

    // 欄標題 (角色 1/2/3)
    const colHeaders = document.createElement('div');
    colHeaders.className = 'slot-col-headers';
    for (let c = 0; c < 3; c++) {
        const h = document.createElement('div');
        h.className = 'slot-col-header';
        h.innerText = `${c + 1}`;
        colHeaders.appendChild(h);
    }
    boardEl.appendChild(colHeaders);

    // 列標題 (回合 R1~R5)
    const rowHeaders = document.createElement('div');
    rowHeaders.className = 'slot-row-headers';
    for (let r = 0; r < 5; r++) {
        const h = document.createElement('div');
        h.className = 'slot-row-header';
        h.innerText = `R${r + 1}`;
        rowHeaders.appendChild(h);
    }
    boardEl.appendChild(rowHeaders);

    // 填入盤面: 3欄(角色) x 5列(回合)
    // grid order: row-first → 先填 round0 的 3 個角色，再 round1 的 3 個...
    for (let round = 0; round < 5; round++) {
        for (let ci = 0; ci < 3; ci++) {
            const item = document.createElement('div');
            item.className = 'slot-item';
            item.id = `slot-${ci}-${round}`;
            const sym = board[ci][round];
            item.innerHTML = `<span class="symbol-icon">${sym.icon}</span><span class="symbol-label">${sym.label}</span>`;
            slotGrid.appendChild(item);
        }
    }
}

// ==========================================
// 核心遊戲流程
// ==========================================
async function startGame() {
    if (!selectedChar || balance < currentBet || isGameRunning) return;

    isGameRunning = true;
    balance -= currentBet;
    totalBets[selectedChar] += currentBet;
    mahjongCollected = { wan: false, tong: false, tiao: false };
    updateUI();

    // 切到場景 2
    switchScene('scene2');
    setupScene2();

    // 產生新盤面
    currentBoard = generateBoard();
    renderBoard(currentBoard);

    if (isAutoMode) {
        // === AUTO 模式：跳過動畫，直接計算結果 ===
        log('⚡ AUTO 模式 — 快速計算中...');
        const raceResult = calculateInstantResult(currentBoard);

        // 瞬間移動 Token 到最終位置
        ['A', 'B', 'C'].forEach((char, i) => {
            setTokenPosition(tokens[char], raceResult.positions[char], i);
        });

        // 檢查麻將 Bonus
        let bonusMultiplier = 1;
        let bonusType = null;
        if (mahjongCollected.wan && mahjongCollected.tong && mahjongCollected.tiao) {
            log('🀄 麻將收集完成！進入 Bonus Game！');
            await sleep(800);
            const bonusResult = await runBonusGame(raceResult);
            bonusMultiplier = bonusResult.multiplier;
            bonusType = bonusResult.type;
            switchScene('scene2');
        }

        // 直接顯示結算（Auto 模式 3 秒後自動下一輪）
        showResult(raceResult.winner, raceResult.positions, bonusMultiplier, bonusType);

    } else {
        // === 一般模式：完整動畫演出 ===
        log('🎰 盤面已產生！開始比賽！');
        await sleep(500);

        const raceResult = await runRace(currentBoard);

        let bonusMultiplier = 1;
        let bonusType = null;
        if (mahjongCollected.wan && mahjongCollected.tong && mahjongCollected.tiao) {
            log('🀄 麻將收集完成！進入 Bonus Game！');
            await sleep(800);
            const bonusResult = await runBonusGame(raceResult);
            bonusMultiplier = bonusResult.multiplier;
            bonusType = bonusResult.type;
            switchScene('scene2');
            await sleep(300);
        }

        showResult(raceResult.winner, raceResult.positions, bonusMultiplier, bonusType);
    }
}

// Auto 模式用：瞬間計算比賽結果（不播動畫）
function calculateInstantResult(board) {
    const pos = { A: 0, B: 0, C: 0 };
    const chars = ['A', 'B', 'C'];
    const boostNext = { A: false, B: false, C: false };
    let pairMultiplier = 1;

    for (let round = 0; round < 5; round++) {
        const roundSymbols = [board[0][round], board[1][round], board[2][round]];

        // Chaos Dice
        if (roundSymbols.some(s => s.id === 'chaosDice')) {
            const positions = chars.map(c => pos[c]);
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            chars.forEach((c, i) => { pos[c] = positions[i]; });
        }

        for (let ci = 0; ci < 3; ci++) {
            const char = chars[ci];
            const sym = board[ci][round];
            let move = 0;

            switch (sym.id) {
                case 'plus1': move = 1; break;
                case 'plus2': move = 2; break;
                case 'dice': move = Math.floor(Math.random() * 7); break;
                case 'block': {
                    const opp = chars.filter(c => c !== char);
                    const tgt = opp[Math.floor(Math.random() * opp.length)];
                    board[chars.indexOf(tgt)][round] = { ...sym, id: 'blocked' };
                    break;
                }
                case 'blocked': break;
                case 'swap': {
                    const st = chars.filter(c => c !== char);
                    const sw = st[Math.floor(Math.random() * st.length)];
                    const tmp = pos[char]; pos[char] = pos[sw]; pos[sw] = tmp;
                    break;
                }
                case 'mjWan': mahjongCollected.wan = true; break;
                case 'mjTong': mahjongCollected.tong = true; break;
                case 'mjTiao': mahjongCollected.tiao = true; break;
            }

            if (!['swap', 'chaosDice', 'blocked', 'block'].includes(sym.id) || sym.id === 'block') {
                if (sym.id !== 'block' && sym.id !== 'blocked') {
                    if (boostNext[char] && round > 0) { move += 1; boostNext[char] = false; }
                    pos[char] = Math.min(pos[char] + move, 11);
                    // 檢查格子效果 (instant)
                    const cellData = trackCellData[pos[char]];
                    if (cellData && cellData.special) {
                        switch (cellData.special.id) {
                            case 'boost': boostNext[char] = true; break;
                            case 'pair': pairMultiplier *= 2; break;
                            case 'straight':
                                chars.forEach(c => { pos[c] = Math.min(pos[c] + 1, 11); });
                                break;
                        }
                    }
                }
            }
        }
    }

    updateMahjongUI();
    const sorted = [...chars].sort((a, b) => pos[b] - pos[a]);
    const topPos = pos[sorted[0]];
    const isTie = sorted.filter(c => pos[c] === topPos).length > 1;
    return { winner: isTie ? null : sorted[0], positions: pos, pairMultiplier, isTie };
}

function setupScene2() {
    ['A', 'B', 'C'].forEach(char => {
        const betText = (char === selectedChar) ? `<span style="color:#ff5722;font-weight:bold;">押: ${(currentBet / 1000).toLocaleString()}K</span>` : '未押注';
        $(`s2-bet-${char}`).innerHTML = betText;
        $(`s2-char-${char}`).className = 's2-char ' + (char === selectedChar ? 'highlight' : '');
        setTokenPosition(tokens[char], 0, char.charCodeAt(0) - 65);
    });
    $('eventLog').innerHTML = '';
    updateMahjongUI();
    syncAutoButtons();
    // 每局重新隨機賽道格子
    randomizeTrackCells();
    renderTrackCells();
}

function updateMahjongUI() {
    $('mjWan').innerHTML = `萬 ${mahjongCollected.wan ? '✅' : '❌'}`;
    $('mjWan').className = 'mj-item' + (mahjongCollected.wan ? ' collected' : '');
    $('mjTong').innerHTML = `筒 ${mahjongCollected.tong ? '✅' : '❌'}`;
    $('mjTong').className = 'mj-item' + (mahjongCollected.tong ? ' collected' : '');
    $('mjTiao').innerHTML = `條 ${mahjongCollected.tiao ? '✅' : '❌'}`;
    $('mjTiao').className = 'mj-item' + (mahjongCollected.tiao ? ' collected' : '');
}

// ==========================================
// 比賽邏輯
// ==========================================
async function runRace(board) {
    const pos = { A: 0, B: 0, C: 0 };
    const chars = ['A', 'B', 'C'];
    const boostNext = { A: false, B: false, C: false };
    let pairMultiplier = 1;
    const raceState = { pos, boostNext, pairMultiplier };

    for (let round = 0; round < 5; round++) {
        log(`▶️ 第 ${round + 1} 回合`);
        highlightColumn(round);
        await sleep(400);

        const roundSymbols = [];
        for (let ci = 0; ci < 3; ci++) roundSymbols.push(board[ci][round]);

        // Chaos Dice
        if (roundSymbols.some(s => s.id === 'chaosDice')) {
            log('🌀 Chaos Dice! 位置隨機洗牌！');
            const positions = chars.map(c => pos[c]);
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            chars.forEach((c, i) => { pos[c] = positions[i]; setTokenPosition(tokens[c], pos[c], i); });
            await sleep(500);
        }

        // 逐角色處理
        for (let ci = 0; ci < 3; ci++) {
            const char = chars[ci];
            const sym = board[ci][round];
            let move = 0;
            let blocked = false;

            switch (sym.id) {
                case 'plus1': move = 1; log(`${nameMap[char]} ⬆️ +1`); break;
                case 'plus2': move = 2; log(`${nameMap[char]} ⏫ +2`); break;
                case 'dice': move = Math.floor(Math.random() * 7); log(`${nameMap[char]} 🎲 +${move}`); break;
                case 'chaosDice': log(`${nameMap[char]} 🌀 (已處理)`); break;
                case 'block': {
                    const opp = chars.filter(c => c !== char);
                    const tgt = opp[Math.floor(Math.random() * opp.length)];
                    log(`${nameMap[char]} ⛔ 阻擋 ${nameMap[tgt]}`);
                    board[chars.indexOf(tgt)][round] = { ...sym, id: 'blocked', icon: '⛔', label: 'X' };
                    break;
                }
                case 'blocked': log(`${nameMap[char]} 被阻擋！`); blocked = true; break;
                case 'swap': {
                    const st = chars.filter(c => c !== char);
                    const sw = st[Math.floor(Math.random() * st.length)];
                    log(`${nameMap[char]} 🔄 與 ${nameMap[sw]} 交換`);
                    const tmp = pos[char]; pos[char] = pos[sw]; pos[sw] = tmp;
                    setTokenPosition(tokens[char], pos[char], ci);
                    setTokenPosition(tokens[sw], pos[sw], chars.indexOf(sw));
                    await sleep(300);
                    break;
                }
                case 'mjWan': mahjongCollected.wan = true; log(`${nameMap[char]} 🀄 萬！`); updateMahjongUI(); break;
                case 'mjTong': mahjongCollected.tong = true; log(`${nameMap[char]} 🀙 筒！`); updateMahjongUI(); break;
                case 'mjTiao': mahjongCollected.tiao = true; log(`${nameMap[char]} 🀇 條！`); updateMahjongUI(); break;
            }

            if (!blocked && !['swap', 'chaosDice', 'blocked'].includes(sym.id)) {
                if (raceState.boostNext[char] && round > 0) { move += 1; log(`${nameMap[char]} 🚀 Boost +1`); raceState.boostNext[char] = false; }
                pos[char] = Math.min(pos[char] + move, 11);
                setTokenPosition(tokens[char], pos[char], ci);
                // 檢查踩到的格子是否有特殊效果
                await checkCellEffect(char, pos[char], raceState);
            }
            await sleep(250);
        }

        await sleep(350);
    }

    const sorted = [...chars].sort((a, b) => pos[b] - pos[a]);
    const topPos = pos[sorted[0]];
    const isTie = sorted.filter(c => pos[c] === topPos).length > 1;
    return { winner: isTie ? null : sorted[0], positions: pos, pairMultiplier: raceState.pairMultiplier, isTie };
}

function highlightColumn(roundIndex) {
    // 高亮當前回合的整列（現在回合是 row）
    document.querySelectorAll('.slot-item').forEach(el => el.style.outline = 'none');
    for (let ci = 0; ci < 3; ci++) {
        const el = $(`slot-${ci}-${roundIndex}`);
        if (el) el.style.outline = '3px solid #ff5722';
    }
}

// ==========================================
// Bonus Game
// ==========================================
async function runBonusGame(raceResult) {
    switchScene('scene3');
    const bc = $('bonusContent');
    const isFoodFestival = Math.random() < 0.5;

    // 撒彩條 HTML
    const confettiHTML = createConfettiHTML();

    if (isFoodFestival) {
        bc.className = 'bonus-scene bonus-food-festival bonus-anim';
        const bonusMove = Math.floor(Math.random() * 3) + 1;
        bc.innerHTML = `
            ${confettiHTML}
            <div class="bonus-text-panel">
                <h1>🎪 Food Festival!</h1>
                <p>美食節加速賽跑！</p>
                <div class="bonus-result">你的角色額外前進 +${bonusMove} 格！</div>
                <p style="font-size:0.9rem;opacity:0.8;">3秒後返回賽道...</p>
            </div>`;
        raceResult.positions[selectedChar] = Math.min(raceResult.positions[selectedChar] + bonusMove, 9);
        await sleep(3000);
        return { type: 'foodFestival', multiplier: 1, bonusMove };
    } else {
        bc.className = 'bonus-scene bonus-michelin bonus-anim';
        bc.innerHTML = `
            ${confettiHTML}
            <div class="bonus-text-panel">
                <h1>⭐ Michelin Award!</h1>
                <p>米其林評比！最終獎金加倍！</p>
                <div class="bonus-result">獎金 x10！</div>
                <p style="font-size:0.9rem;opacity:0.8;">3秒後返回結算...</p>
            </div>`;
        await sleep(3000);
        return { type: 'michelin', multiplier: 10 };
    }
}

// 產生撒彩條 HTML
function createConfettiHTML() {
    const colors = ['#ff5722', '#ffc107', '#4caf50', '#2196f3', '#e91e63', '#9c27b0', '#ff9800', '#00bcd4'];
    let html = '<div class="confetti-container">';
    for (let i = 0; i < 40; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const width = 6 + Math.random() * 6;
        const height = 10 + Math.random() * 12;
        html += `<div class="confetti" style="left:${left}%;background:${color};width:${width}px;height:${height}px;animation-delay:${delay}s;animation-duration:${duration}s;border-radius:${Math.random() > 0.5 ? '50%' : '2px'};"></div>`;
    }
    html += '</div>';
    return html;
}

let autoReturnInt = null; // 用來讓 cancelAuto 能清除倒數

// ==========================================
// 結算
// ==========================================
function showResult(winnerId, finalPositions, bonusMultiplier = 1, bonusType = null) {
    const title = $('resultTitle');
    const desc = $('resultDesc');
    const prize = $('resultPrize');
    const bonusInfo = $('bonusInfo');
    const cancelBtn = $('btnCancelAuto');

    bonusInfo.style.display = 'none';

    // 檢查是否平手
    const chars = ['A', 'B', 'C'];
    const topPos = Math.max(...chars.map(c => finalPositions[c]));
    const topChars = chars.filter(c => finalPositions[c] === topPos);
    const isTie = topChars.length > 1 && topChars.includes(selectedChar);
    const isWin = winnerId && (selectedChar === winnerId);
    let winAmount = 0;

    if (isTie) {
        // 平手：退回本金
        const tieMessages = [
            '🤝 勢均力敵！大家都太強了啦！',
            '🍜 煮到一半瓦斯沒了，誰都沒贏！',
            '🏃 撞線瞬間分不出高下！',
            '⚡ 三位大廚實力相當，裁判也傻眼！',
            '🎭 這場比賽...居然是平手收場！'
        ];
        balance += currentBet; // 退回本金
        title.innerText = '🤝 DRAW! 🤝';
        title.style.color = '#29b6f6';
        desc.innerText = tieMessages[Math.floor(Math.random() * tieMessages.length)];
        prize.innerText = `本金退回 ${currentBet.toLocaleString()}`;
        prize.style.color = '#29b6f6';
    } else if (isWin) {
        winAmount = Math.floor(currentBet * oddsMap[selectedChar] * bonusMultiplier);
        balance += winAmount;
        title.innerText = '🎉 WIN! 🎉';
        title.style.color = '#ffeb3b';
        desc.innerText = `${nameMap[winnerId]} 率先抵達終點！`;
        prize.innerText = `贏得 + ${winAmount.toLocaleString()}`;
        prize.style.color = '#1b5e20';
        if (bonusType === 'michelin') { bonusInfo.style.display = 'block'; bonusInfo.innerText = '⭐ Michelin Award 獎金 x10！'; }
        else if (bonusType === 'foodFestival') { bonusInfo.style.display = 'block'; bonusInfo.innerText = '🎪 Food Festival 加速效果已套用！'; }
    } else {
        desc.innerText = winnerId ? `${nameMap[winnerId]} 率先抵達終點！` : '比賽結束！';
        if (finalPositions[selectedChar] >= 9 && finalPositions[selectedChar] <= 10) {
            winAmount = Math.floor(currentBet * 0.2);
            balance += winAmount;
            title.innerText = '🔥 NEAR MISS! 🔥';
            title.style.color = '#ff9800';
            prize.innerText = `差一點！安慰獎 + ${winAmount.toLocaleString()}`;
            prize.style.color = '#ff9800';
        } else {
            title.innerText = '💀 YOU LOSE 💀';
            title.style.color = '#e0e0e0';
            prize.innerText = '下次再接再厲！';
            prize.style.color = '#e0e0e0';
        }
    }

    // Auto 模式顯示取消按鈕
    cancelBtn.style.display = isAutoMode ? 'inline-block' : 'none';

    updateUI();
    $('resultModal').classList.add('show');

    let timeLeft = isAutoMode ? 3 : 5;
    const cText = $('returnCountdown');
    cText.innerText = isAutoMode ? `${timeLeft} 秒後自動下一輪...` : `${timeLeft} 秒後返回大廳...`;

    autoReturnInt = setInterval(() => {
        timeLeft--;
        cText.innerText = isAutoMode ? `${timeLeft} 秒後自動下一輪...` : `${timeLeft} 秒後返回大廳...`;
        if (timeLeft <= 0) {
            clearInterval(autoReturnInt);
            autoReturnInt = null;
            $('resultModal').classList.remove('show');
            isGameRunning = false;

            if (isAutoMode && balance >= currentBet) {
                setTimeout(() => startGame(), 300);
            } else {
                if (isAutoMode) {
                    isAutoMode = false;
                    syncAutoButtons();
                    logToast('💰 餘額不足，Auto 已停止');
                }
                switchScene('scene1');
                timer = 28;
                renderTimer();
                updateUI();
            }
        }
    }, 1000);
}

// 取消 Auto 並返回場景 1
function cancelAuto() {
    if (autoReturnInt) {
        clearInterval(autoReturnInt);
        autoReturnInt = null;
    }
    isAutoMode = false;
    syncAutoButtons();
    isGameRunning = false;
    $('resultModal').classList.remove('show');
    switchScene('scene1');
    timer = 28;
    renderTimer();
    updateUI();
    logToast('🛑 Auto 已取消，返回大廳');
}

// ==========================================
// 工具函式
// ==========================================
function switchScene(sceneId) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    $(sceneId).classList.add('active');
}

function log(msg) {
    const el = $('eventLog');
    const p = document.createElement('p');
    p.innerText = msg;
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// 啟動
// ==========================================
init();
