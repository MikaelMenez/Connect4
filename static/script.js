// Configurações do jogo
const ROWS = 6;
const COLS = 7;

// Estado local da UI
let currentEndpoint = '/turn_minimax'; // '/turn_minimax' ou '/turn_alpha_beta'
let isWaitingAi = false;
let isGameOver = false;

// Matriz local do tabuleiro [linha][coluna], iniciando vazia
// linha 0 é a base e linha 5 é o topo (como modelado no Rust)
let boardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));
let previousBoardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));

// Elementos DOM
const boardEl = document.getElementById('board');
const columnSelectorsEl = document.getElementById('column-selectors');
const statusEl = document.getElementById('game-status');
const activeEndpointBadge = document.getElementById('active-endpoint-badge');
const btnMinimax = document.getElementById('btn-minimax');
const btnAlphaBeta = document.getElementById('btn-alphabeta');
const btnRestart = document.getElementById('btn-restart');

/**
 * Inicialização da interface
 */
function init() {
    renderColumnSelectors();
    renderBoard();
    setupEventListeners();
    updateAlgorithmUI();
}

/**
 * Renderiza os botões do topo para cada coluna
 */
function renderColumnSelectors() {
    columnSelectorsEl.innerHTML = '';
    for (let c = 0; c < COLS; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.col = c;
        btn.className = 'w-full py-2 flex items-center justify-center rounded-xl bg-slate-900/60 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border border-slate-800 transition-all duration-150 group disabled:opacity-30 disabled:cursor-not-allowed';
        btn.title = `Jogar na coluna ${c + 1}`;
        btn.innerHTML = `
            <svg class="w-5 h-5 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
        `;
        btn.addEventListener('click', () => handleColumnClick(c));
        btn.addEventListener('mouseenter', () => highlightColumn(c, true));
        btn.addEventListener('mouseleave', () => highlightColumn(c, false));
        columnSelectorsEl.appendChild(btn);
    }
}

/**
 * Destaca visualmente a coluna ao passar o mouse
 */
function highlightColumn(colIdx, highlight) {
    const slots = boardEl.querySelectorAll(`[data-col="${colIdx}"]`);
    slots.forEach(slot => {
        if (highlight && !isGameOver && !isWaitingAi) {
            slot.classList.add('brightness-125', 'ring-2', 'ring-white/20');
        } else {
            slot.classList.remove('brightness-125', 'ring-2', 'ring-white/20');
        }
    });
}

/**
 * Renderiza o tabuleiro na grade
 * No Connect 4 físico, a visualização vai do topo (linha 5) para a base (linha 0).
 */
function renderBoard() {
    boardEl.innerHTML = '';

    // Renderizamos da linha mais alta (5) para a mais baixa (0)
    for (let r = ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < COLS; c++) {
            const slot = document.createElement('div');
            slot.className = 'board-slot bg-blue-900/80 rounded-full flex items-center justify-center shadow-inner cursor-pointer transition-all duration-200 border-2 border-blue-950/40';
            slot.dataset.row = r;
            slot.dataset.col = c;

            const cellValue = boardState[r][c];
            const prevCellValue = previousBoardState[r][c];
            const isNew = cellValue !== 'Empty' && prevCellValue === 'Empty';

            if (cellValue === 'Yellow') {
                const piece = createPiece('bg-amber-400', 'shadow-[0_4px_12px_rgba(251,191,36,0.6)]', 'border-amber-300', isNew);
                slot.appendChild(piece);
            } else if (cellValue === 'Red') {
                const piece = createPiece('bg-rose-500', 'shadow-[0_4px_12px_rgba(244,63,94,0.6)]', 'border-rose-400', isNew);
                slot.appendChild(piece);
            } else {
                // Fundo escuro do buraco vazio
                const emptyHole = document.createElement('div');
                emptyHole.className = 'w-full h-full rounded-full bg-slate-950/90 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)] border border-blue-950/50';
                slot.appendChild(emptyHole);
            }

            slot.addEventListener('click', () => handleColumnClick(c));
            slot.addEventListener('mouseenter', () => highlightColumn(c, true));
            slot.addEventListener('mouseleave', () => highlightColumn(c, false));

            boardEl.appendChild(slot);
        }
    }
}

/**
 * Cria o elemento visual de uma peça
 */
function createPiece(bgClass, shadowClass, borderClass, animated = false) {
    const piece = document.createElement('div');
    piece.className = `w-[88%] h-[88%] rounded-full ${bgClass} ${shadowClass} border-2 ${borderClass} transition-all duration-300 ${animated ? 'piece-drop' : ''}`;
    return piece;
}

/**
 * Ação ao clicar em uma coluna
 */
async function handleColumnClick(col) {
    if (isWaitingAi || isGameOver) return;

    // Verificar se coluna está cheia
    if (boardState[ROWS - 1][col] !== 'Empty') {
        setStatus('Esta coluna já está cheia! Escolha outra.', 'warning');
        return;
    }

    // Bloqueia jogadas
    isWaitingAi = true;
    updateControls();
    setStatus('Processando jogada da IA...', 'loading');

    // Salva estado anterior para animação
    previousBoardState = boardState.map(row => [...row]);

    try {
        const response = await fetch(currentEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ column: col })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || `Erro na requisição: ${response.status}`);
        }

        const data = await response.json();
        handleServerResponse(data);
    } catch (err) {
        console.error('Erro na API:', err);
        setStatus(`Erro: ${err.message}`, 'error');
        isWaitingAi = false;
        updateControls();
    }
}

/**
 * Trata o retorno do servidor
 */
function handleServerResponse(data) {
    boardState = data.board;
    renderBoard();

    // Avalia o Status vindo da API
    // Status pode ser: { Victory: "Yellow" }, { Victory: "Red" }, "Draw", "Ongoing"
    if (data.status === 'Ongoing') {
        setStatus('Sua vez de jogar! Escolha uma coluna.', 'ready');
        isGameOver = false;
        isWaitingAi = false;
    } else if (data.status === 'Draw') {
        setStatus('Empate! O tabuleiro ficou cheio.', 'draw');
        isGameOver = true;
        isWaitingAi = false;
    } else if (typeof data.status === 'object' && data.status.Victory) {
        const winner = data.status.Victory;
        if (winner === 'Yellow') {
            setStatus('🎉 Parabéns! Você venceu a IA!', 'win');
        } else {
            setStatus('🤖 A IA venceu esta partida!', 'defeat');
        }
        isGameOver = true;
        isWaitingAi = false;
    } else {
        setStatus('Partida encerrada.', 'ready');
        isGameOver = true;
        isWaitingAi = false;
    }

    updateControls();
}

/**
 * Atualiza o texto e estilo da caixa de status
 */
function setStatus(msg, type = 'ready') {
    let style = 'bg-slate-950/80 border-slate-800 text-slate-200';
    let icon = '';

    switch (type) {
        case 'loading':
            style = 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300 animate-pulse';
            icon = `<svg class="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>`;
            break;
        case 'win':
            style = 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300';
            icon = '🏆';
            break;
        case 'defeat':
            style = 'bg-rose-950/50 border-rose-500/50 text-rose-300';
            icon = '💀';
            break;
        case 'draw':
            style = 'bg-amber-950/50 border-amber-500/50 text-amber-300';
            icon = '⚖️';
            break;
        case 'warning':
            style = 'bg-amber-950/40 border-amber-500/30 text-amber-300';
            icon = '⚠️';
            break;
        case 'error':
            style = 'bg-rose-950/60 border-rose-500/60 text-rose-200';
            icon = '❌';
            break;
        default:
            icon = '🎮';
            break;
    }

    statusEl.className = `py-2.5 px-4 rounded-xl text-center text-sm font-semibold border backdrop-blur-sm flex items-center justify-center gap-2 transition-all duration-300 ${style}`;
    statusEl.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
}

/**
 * Desabilita ou reabilita botões de controle de acordo com o estado
 */
function updateControls() {
    const colButtons = columnSelectorsEl.querySelectorAll('button');
    colButtons.forEach(btn => {
        btn.disabled = isWaitingAi || isGameOver;
    });
}

/**
 * Atualiza botões visuais de algoritmo
 */
function updateAlgorithmUI() {
    const isMinimax = currentEndpoint === '/turn_minimax';

    if (isMinimax) {
        btnMinimax.className = 'flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-amber-500 text-slate-950 shadow-md';
        btnAlphaBeta.className = 'flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200';
        activeEndpointBadge.textContent = '/turn_minimax';
        activeEndpointBadge.className = 'font-mono text-xs font-semibold text-amber-400 truncate mt-0.5';
    } else {
        btnAlphaBeta.className = 'flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-rose-500 text-white shadow-md';
        btnMinimax.className = 'flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200';
        activeEndpointBadge.textContent = '/turn_alpha_beta';
        activeEndpointBadge.className = 'font-mono text-xs font-semibold text-rose-400 truncate mt-0.5';
    }
}

/**
 * Registra listeners dos controles da UI
 */
function setupEventListeners() {
    btnMinimax.addEventListener('click', () => {
        if (currentEndpoint !== '/turn_minimax') {
            currentEndpoint = '/turn_minimax';
            updateAlgorithmUI();
            setStatus('Algoritmo alterado para Minimax.', 'ready');
        }
    });

    btnAlphaBeta.addEventListener('click', () => {
        if (currentEndpoint !== '/turn_alpha_beta') {
            currentEndpoint = '/turn_alpha_beta';
            updateAlgorithmUI();
            setStatus('Algoritmo alterado para Poda Alfa-Beta (/turn_alpha_beta).', 'ready');
        }
    });

    btnRestart.addEventListener('click', () => {
        resetGameLocally();
    });
}

/**
 * Reinicia o estado visual local
 */
function resetGameLocally() {
    boardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));
    previousBoardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));
    isGameOver = false;
    isWaitingAi = false;
    renderBoard();
    updateControls();
    setStatus('Tabuleiro resetado localmente! Sua vez.', 'ready');
}

// Inicia aplicação
window.addEventListener('DOMContentLoaded', init);
