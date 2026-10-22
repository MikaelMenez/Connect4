// Dimensões do tabuleiro Connect 4
const ROWS = 6;
const COLS = 7;

// Estado local da aplicação
let currentEndpoint = '/turn_minimax';
let isWaitingAi = false;
let isGameOver = false;

// Matriz local [linha][coluna] (linha 0 = base, linha 5 = topo)
let boardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));
let previousBoardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));

// Contadores e métricas de execução
let totalVisitedNodes = 0;
let totalPrunedNodes = 0;

// Referências DOM
const boardEl = document.getElementById('board');
const columnSelectorsEl = document.getElementById('column-selectors');
const statusEl = document.getElementById('game-status');
const activeEndpointBadge = document.getElementById('active-endpoint-badge');
const algoSwitch = document.getElementById('algo-switch');
const labelMinimax = document.getElementById('label-minimax');
const labelAlphaBeta = document.getElementById('label-alphabeta');
const btnRestart = document.getElementById('btn-restart');
const treeAlgoBadge = document.getElementById('tree-algo-badge');
const treeDepthSelect = document.getElementById('tree-depth-select');
const statNodesVisited = document.getElementById('stat-nodes-visited');
const statNodesPruned = document.getElementById('stat-nodes-pruned');
const statBestCol = document.getElementById('stat-best-col');
const statBestScore = document.getElementById('stat-best-score');
const treeContainer = document.getElementById('tree-container');
const treePlaceholder = document.getElementById('tree-placeholder');
const treeSvg = document.getElementById('tree-svg');
const tooltipEl = document.getElementById('node-tooltip');
const aiReasoningLog = document.getElementById('ai-reasoning-log');

/**
 * Inicialização
 */
function init() {
    renderColumnSelectors();
    renderBoard();
    setupEventListeners();
    updateAlgorithmUI();
}

/**
 * Botões das colunas
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
 * Renderização do tabuleiro no grid
 */
function renderBoard() {
    boardEl.innerHTML = '';

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

function createPiece(bgClass, shadowClass, borderClass, animated = false) {
    const piece = document.createElement('div');
    const colorClass = bgClass.includes('amber') ? 'piece-yellow' : 'piece-red';
    piece.className = `piece ${colorClass} rounded-full ${animated ? 'piece-drop' : ''}`;
    return piece;
}

/**
 * Ação de clique de jogada do usuário
 */
const AI_THINK_DELAY = 700; // ms
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function dropLocal(col, color) {
    for (let r = 0; r < ROWS; r++) {
        if (boardState[r][col] === 'Empty') {
            boardState[r][col] = color;
            return r;
        }
    }
    return null;
}

async function handleColumnClick(col) {
    if (isWaitingAi || isGameOver) return;

    if (boardState[ROWS - 1][col] !== 'Empty') {
        setStatus('Esta coluna já está cheia! Escolha outra.', 'warning');
        return;
    }

    isWaitingAi = true;
    updateControls();

    // Backup para rollback em caso de erro
    const backup = cloneBoard(boardState);

    // 1) Turno do usuário: a peça cai imediatamente
    previousBoardState = cloneBoard(boardState);
    dropLocal(col, 'Yellow');
    renderBoard();

    // A árvore mostra a posição que a IA vai analisar
    generateAndRenderTree();
    setStatus('IA pensando...', 'loading');

    try {
        // 2) Turno da IA: espera a resposta e o tempo mínimo de "pensamento"
        const [response] = await Promise.all([
            fetch(currentEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column: col })
            }),
            sleep(AI_THINK_DELAY)
        ]);

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || `Erro na requisição: ${response.status}`);
        }

        const data = await response.json();
        handleServerResponse(data);
    } catch (err) {
        console.error('Erro na API:', err);
        // Desfaz a jogada local para não dessincronizar com o servidor
        boardState = backup;
        previousBoardState = cloneBoard(backup);
        renderBoard();
        generateAndRenderTree();
        setStatus(`Erro ao comunicar com o servidor Rust: ${err.message}`, 'error');
        isWaitingAi = false;
        updateControls();
    }
}

function handleServerResponse(data) {
    // previousBoardState = tabuleiro com a jogada do usuário,
    // então só a peça da IA é detectada como "nova" e animada
    previousBoardState = cloneBoard(boardState);
    boardState = data.board;
    renderBoard();

    if (data.status === 'Ongoing') {
        setStatus('Sua vez de jogar! Escolha uma coluna.', 'ready');
        isGameOver = false;
    } else if (data.status === 'Draw') {
        setStatus('Empate! O tabuleiro ficou cheio.', 'draw');
        isGameOver = true;
    } else if (typeof data.status === 'object' && data.status.Victory) {
        const winner = data.status.Victory;
        setStatus(
            winner === 'Yellow' ? 'Parabéns! Você venceu a IA!' : 'A IA venceu esta partida!',
            winner === 'Yellow' ? 'win' : 'defeat'
        );
        isGameOver = true;
    }

    isWaitingAi = false;
    updateControls();
}

function setStatus(msg, type = 'ready') {
    let style = 'bg-slate-950/80 border-slate-800 text-slate-200';
    let icon = '🎮';

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
    }

    statusEl.className = `py-2 px-3 rounded-xl text-center text-xs font-semibold border backdrop-blur-sm flex items-center justify-center gap-2 transition-all duration-300 ${style}`;
    statusEl.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
}

function updateControls() {
    const colButtons = columnSelectorsEl.querySelectorAll('button');
    colButtons.forEach(btn => {
        btn.disabled = isWaitingAi || isGameOver;
    });
    btnRestart.disabled = isWaitingAi;
}

function updateAlgorithmUI() {
    const isAlphaBeta = algoSwitch.checked;
    currentEndpoint = isAlphaBeta ? '/turn_alpha_beta' : '/turn_minimax';

    if (isAlphaBeta) {
        labelAlphaBeta.className = 'text-xs font-semibold text-rose-400 transition-colors';
        labelMinimax.className = 'text-xs font-semibold text-slate-500 transition-colors';
        activeEndpointBadge.textContent = '/turn_alpha_beta';
        activeEndpointBadge.className = 'font-mono text-[11px] font-semibold text-rose-400 truncate mt-0.5';
        treeAlgoBadge.textContent = 'Poda Alfa-Beta';
        treeAlgoBadge.className = 'px-2 py-0.5 text-[10px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30';
    } else {
        labelMinimax.className = 'text-xs font-semibold text-amber-400 transition-colors';
        labelAlphaBeta.className = 'text-xs font-semibold text-slate-500 transition-colors';
        activeEndpointBadge.textContent = '/turn_minimax';
        activeEndpointBadge.className = 'font-mono text-[11px] font-semibold text-amber-400 truncate mt-0.5';
        treeAlgoBadge.textContent = 'Minimax';
        treeAlgoBadge.className = 'px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30';
    }

    generateAndRenderTree();
}

function setupEventListeners() {
    algoSwitch.addEventListener('change', updateAlgorithmUI);
    treeDepthSelect.addEventListener('change', generateAndRenderTree);
    btnRestart.addEventListener('click', resetGameLocally);
}

async function resetGameLocally() {
    if (isWaitingAi) return;

    isWaitingAi = true;
    updateControls();

    try {
        const response = await fetch('/reset', { method: 'POST' });
        if (!response.ok) {
            throw new Error(await response.text() || `Erro na requisição: ${response.status}`);
        }

        boardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));
        previousBoardState = Array.from({ length: ROWS }, () => Array(COLS).fill('Empty'));
        isGameOver = false;
        renderBoard();
        setStatus('Tabuleiro reiniciado! Sua vez.', 'ready');
        generateAndRenderTree();
    } catch (err) {
        console.error('Erro ao reiniciar:', err);
        setStatus(`Erro ao reiniciar: ${err.message}`, 'error');
    } finally {
        isWaitingAi = false;
        updateControls();
    }
}

// ============================================================================
// FUNÇÃO DE AVALIAÇÃO HEURÍSTICA E CONSTRUÇÃO DINÂMICA DA ÁRVORE D3
// ============================================================================

function cloneBoard(b) {
    return b.map(row => [...row]);
}

function dropPieceInBoard(b, color, col) {
    for (let r = 0; r < ROWS; r++) {
        if (b[r][col] === 'Empty') {
            b[r][col] = color;
            return r;
        }
    }
    return null;
}

function checkWinInBoard(b, color) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (b[r][c] !== color) continue;
            if (c + 3 < COLS && [1, 2, 3].every(x => b[r][c + x] === color)) return true;
            if (r + 3 < ROWS && [1, 2, 3].every(x => b[r + x][c] === color)) return true;
            if (r + 3 < ROWS && c + 3 < COLS && [1, 2, 3].every(x => b[r + x][c + x] === color)) return true;
            if (r >= 3 && c + 3 < COLS && [1, 2, 3].every(x => b[r - x][c + x] === color)) return true;
        }
    }
    return false;
}

/**
 * Avalia a qualidade tática do tabuleiro para a IA (Red)
 */
function evaluateBoardHeuristic(b) {
    let score = 0;

    // Favororizar coluna central (Coluna 3)
    let centerArray = [];
    for (let r = 0; r < ROWS; r++) {
        centerArray.push(b[r][3]);
    }
    const centerCount = centerArray.filter(cell => cell === 'Red').length;
    score += centerCount * 4;

    function evaluateWindow(window) {
        let redCount = window.filter(c => c === 'Red').length;
        let yellowCount = window.filter(c => c === 'Yellow').length;
        let emptyCount = window.filter(c => c === 'Empty').length;

        if (redCount === 4) return 1000;
        if (redCount === 3 && emptyCount === 1) return 12;
        if (redCount === 2 && emptyCount === 2) return 4;
        if (yellowCount === 3 && emptyCount === 1) return -15;
        if (yellowCount === 4) return -1000;
        return 0;
    }

    // Janelas horizontais
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]];
            score += evaluateWindow(window);
        }
    }

    // Janelas verticais
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            const window = [b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]];
            score += evaluateWindow(window);
        }
    }

    // Janelas diagonais positivas
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
            score += evaluateWindow(window);
        }
    }

    // Janelas diagonais negativas
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]];
            score += evaluateWindow(window);
        }
    }

    return score;
}

/**
 * Constrói recursivamente a árvore Minimax / Alfa-Beta a partir do estado atual
 */
function buildTreeData(board, depth, player, isAlphaBeta, alpha = -Infinity, beta = Infinity) {
    totalVisitedNodes++;

    const isRedWin = checkWinInBoard(board, 'Red');
    const isYellowWin = checkWinInBoard(board, 'Yellow');
    const isFull = board[ROWS - 1].every(cell => cell !== 'Empty');

    if (isRedWin) {
        return { name: `Red Win`, player, col: null, score: 1000 + depth, children: [], pruned: false };
    }
    if (isYellowWin) {
        return { name: `Yellow Win`, player, col: null, score: -1000 - depth, children: [], pruned: false };
    }
    if (depth === 0 || isFull) {
        const evalScore = evaluateBoardHeuristic(board);
        return { name: `Eval: ${evalScore}`, player, col: null, score: evalScore, children: [], pruned: false };
    }

    const node = {
        name: player === 'Max' ? 'Max (IA)' : 'Min (Você)',
        player,
        col: null,
        score: player === 'Max' ? -Infinity : Infinity,
        children: [],
        pruned: false,
        alpha,
        beta
    };

    let prunedRemaining = false;

    for (let col = 0; col < COLS; col++) {
        if (board[ROWS - 1][col] !== 'Empty') continue;

        if (prunedRemaining) {
            totalPrunedNodes++;
            node.children.push({
                name: `Col ${col + 1}`,
                player: player === 'Max' ? 'Min' : 'Max',
                col: col,
                score: '-',
                children: [],
                pruned: true
            });
            continue;
        }

        const nextBoard = cloneBoard(board);
        const color = player === 'Max' ? 'Red' : 'Yellow';
        dropPieceInBoard(nextBoard, color, col);

        const nextPlayer = player === 'Max' ? 'Min' : 'Max';
        const childNode = buildTreeData(nextBoard, depth - 1, nextPlayer, isAlphaBeta, alpha, beta);
        childNode.col = col;
        childNode.name = `Col ${col + 1}`;

        node.children.push(childNode);

        if (player === 'Max') {
            if (childNode.score > node.score) {
                node.score = childNode.score;
                node.bestCol = col;
            }
            if (isAlphaBeta) {
                alpha = Math.max(alpha, node.score);
                if (beta <= alpha) {
                    prunedRemaining = true;
                }
            }
        } else {
            if (childNode.score < node.score) {
                node.score = childNode.score;
                node.bestCol = col;
            }
            if (isAlphaBeta) {
                beta = Math.min(beta, node.score);
                if (beta <= alpha) {
                    prunedRemaining = true;
                }
            }
        }
    }

    // Destaca o caminho ótimo
    if (node.children.length > 0) {
        node.children.forEach(child => {
            if (child.col === node.bestCol && !child.pruned) {
                child.isBestPath = true;
            }
        });
    }

    return node;
}

/**
 * Gera a estrutura da árvore e preenche o painel explicativo do raciocínio da IA
 */
function generateAndRenderTree() {
    totalVisitedNodes = 0;
    totalPrunedNodes = 0;

    const maxDepth = parseInt(treeDepthSelect.value, 10);
    const isAlphaBeta = algoSwitch.checked;

    const treeData = buildTreeData(boardState, maxDepth, 'Max', isAlphaBeta);

    statNodesVisited.textContent = totalVisitedNodes;
    statNodesPruned.textContent = totalPrunedNodes;
    statBestCol.textContent = treeData.bestCol !== undefined && treeData.bestCol !== null ? `Coluna ${treeData.bestCol + 1}` : '-';
    statBestScore.textContent = treeData.score !== undefined ? treeData.score : '-';

    renderD3Tree(treeData);
    renderReasoningExplanation(treeData, isAlphaBeta);
}

/**
 * Escreve em texto estruturado o raciocínio tomado pela IA
 */
function renderReasoningExplanation(treeData, isAlphaBeta) {
    if (!treeData.children || treeData.children.length === 0) {
        aiReasoningLog.innerHTML = `<div class="text-slate-500">Nenhuma jogada disponível ou jogo finalizado.</div>`;
        return;
    }

    let logHTML = '';
    logHTML += `<div>• <span class="text-amber-400 font-bold">Estado Atual:</span> Avaliados <span class="text-white font-bold">${totalVisitedNodes}</span> nós com profundidade = <span class="text-white font-bold">${treeDepthSelect.value}</span>.</div>`;

    if (isAlphaBeta) {
        logHTML += `<div>• <span class="text-rose-400 font-bold">Poda Alfa-Beta:</span> <span class="text-white font-bold">${totalPrunedNodes}</span> ramificações foram cortadas (condição α ≥ β atendida).</div>`;
    } else {
        logHTML += `<div>• <span class="text-indigo-400 font-bold">Minimax Puro:</span> Todos os estados possíveis foram explorados sem cortes.</div>`;
    }

    logHTML += `<div class="mt-1 font-semibold text-slate-200">Avaliador de Colunas (Nível Raiz):</div>`;

    treeData.children.forEach(child => {
        if (child.pruned) {
            logHTML += `<div class="pl-2 text-slate-500">  [Coluna ${child.col + 1}]: Ramo Podado ✂️</div>`;
        } else if (child.isBestPath) {
            logHTML += `<div class="pl-2 text-emerald-400 font-bold">  ➔ [Coluna ${child.col + 1}]: Score = ${child.score} (Melhor Jogada Escolhida)</div>`;
        } else {
            logHTML += `<div class="pl-2 text-slate-400">  [Coluna ${child.col + 1}]: Score = ${child.score}</div>`;
        }
    });

    aiReasoningLog.innerHTML = logHTML;
}

/**
 * Renderiza o gráfico da árvore com D3.js
 */
function renderD3Tree(data) {
    treePlaceholder.classList.add('hidden');
    treeSvg.classList.remove('hidden');

    d3.select('#tree-svg').selectAll('*').remove();

    const margin = { top: 25, right: 30, bottom: 25, left: 30 };
    const width = 640 - margin.left - margin.right;
    const height = 320 - margin.top - margin.bottom;

    const svg = d3.select('#tree-svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([width, height - 20]);
    treeLayout(root);

    // Links (Arestas)
    svg.selectAll('.tree-link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', d => {
            let classes = 'tree-link';
            if (d.target.data.pruned) classes += ' pruned';
            else if (d.target.data.isBestPath) classes += ' best-path';
            return classes;
        })
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y)
        );

    // Nós
    const node = svg.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);

    node.append('circle')
        .attr('r', 13)
        .attr('class', 'node-circle')
        .attr('fill', d => {
            if (d.data.pruned) return '#334155';
            return d.data.player === 'Max' ? '#f43f5e' : '#f59e0b';
        })
        .attr('stroke', d => d.data.isBestPath ? '#10b981' : '#0f172a')
        .attr('stroke-width', d => d.data.isBestPath ? 2.5 : 1.5)
        .on('mouseover', (event, d) => showTooltip(event, d.data))
        .on('mouseout', hideTooltip);

    // Texto no centro do nó (Número da coluna ou R de Raiz)
    node.append('text')
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .text(d => d.data.pruned ? '✂️' : (d.data.col !== null ? `C${d.data.col + 1}` : 'Raiz'));

    // Rótulo da pontuação avaliada abaixo do nó
    node.append('text')
        .attr('dy', '2.4em')
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.data.pruned ? '#64748b' : '#cbd5e1')
        .attr('font-size', '8.5px')
        .attr('font-weight', '600')
        .text(d => d.data.pruned ? 'podado' : `v:${d.data.score}`);
}

function showTooltip(event, nodeData) {
    tooltipEl.innerHTML = `
        <div class="font-bold border-b border-slate-700 pb-1 mb-1 text-amber-400">
            ${nodeData.name} ${nodeData.pruned ? '(Ramo Podado)' : ''}
        </div>
        <div class="space-y-0.5 text-[11px]">
            <div><span class="text-slate-400">Jogador:</span> <span class="font-semibold">${nodeData.player}</span></div>
            <div><span class="text-slate-400">Pontuação:</span> <span class="font-mono text-emerald-400 font-bold">${nodeData.score}</span></div>
            ${nodeData.col !== null ? `<div><span class="text-slate-400">Coluna Inserida:</span> Coluna ${nodeData.col + 1}</div>` : ''}
            ${nodeData.alpha !== undefined ? `<div><span class="text-slate-400">Alfa (α):</span> ${nodeData.alpha}</div>` : ''}
            ${nodeData.beta !== undefined ? `<div><span class="text-slate-400">Beta (β):</span> ${nodeData.beta}</div>` : ''}
        </div>
    `;

    const containerRect = treeContainer.getBoundingClientRect();
    const x = event.clientX - containerRect.left + 10;
    const y = event.clientY - containerRect.top + 10;

    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
    tooltipEl.classList.remove('opacity-0');
}

function hideTooltip() {
    tooltipEl.classList.add('opacity-0');
}

window.addEventListener('DOMContentLoaded', init);
