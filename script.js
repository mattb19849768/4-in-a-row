(function(){
/* =========================================================
   Connect Four - script.js
   - Full version with fixed-depth minimax AI
   - AI always yellow (player2)
   - AI vs AI loop
   - Player names used in status & win modal
   - Modal centered & neon ready
   ========================================================= */

// --- URL PARAMS ---
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'pvp';
const player1Name = urlParams.get('p1') || 'Player 1';
const player2Name = urlParams.get('p2') || (mode === 'pve' ? 'Computer' : 'Player 2');
const aiDepth = parseInt(urlParams.get('aiDepth') || '5', 10);

// --- ELEMENTS ---
const board = document.getElementById('board');
const statusEl = document.getElementById('status');
const winModal = document.getElementById('winModal');
const winnerText = document.getElementById('winnerText');
const modalClose = document.getElementById('modalClose');
const modalRestart = document.getElementById('modalRestart');

const aiVsAiBtn = document.getElementById('aiVsAiBtn');
const restartBtn = document.getElementById('startBtn');
const homeBtn = document.getElementById('homeBtn');

// --- STATE ---
let currentPlayer = 'red';
let grid = Array.from({length:6}, ()=> Array(7).fill(null));
let aiVsAiRunning = false;
let aiLoopHandle = null;

// --- BOARD / RENDER ---
function createBoard(){
  board.innerHTML = '';
  for(let r=0;r<6;r++){
    for(let c=0;c<7;c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.onclick = ()=> handleMove(c);
      board.appendChild(cell);
    }
  }
  render();
  updateStatus();
}

function render(){
  document.querySelectorAll('.cell').forEach(cell=>{
    const r = +cell.dataset.row, c = +cell.dataset.col;
    cell.classList.remove('red','yellow','filled');
    if(grid[r][c]){
      cell.classList.add(grid[r][c],'filled');
    }
  });
}

function updateStatus(){
  if(aiVsAiRunning){
    statusEl.textContent = 'AI vs AI running…';
  } else {
    const name = currentPlayer==='red'?player1Name:player2Name;
    statusEl.textContent = `${name}'s Turn`;
  }
}

// --- WIN / DRAW CHECK ---
function isDraw(){
  return grid[0].every(v => v !== null);
}

function checkWin(p){
  // horizontal
  for(let r=0;r<6;r++) for(let c=0;c<4;c++)
    if(grid[r][c]===p && grid[r][c+1]===p && grid[r][c+2]===p && grid[r][c+3]===p) return true;
  // vertical
  for(let c=0;c<7;c++) for(let r=0;r<3;r++)
    if(grid[r][c]===p && grid[r+1][c]===p && grid[r+2][c]===p && grid[r+3][c]===p) return true;
  // diag \
  for(let r=0;r<3;r++) for(let c=0;c<4;c++)
    if(grid[r][c]===p && grid[r+1][c+1]===p && grid[r+2][c+2]===p && grid[r+3][c+3]===p) return true;
  // diag /
  for(let r=3;r<6;r++) for(let c=0;c<4;c++)
    if(grid[r][c]===p && grid[r-1][c+1]===p && grid[r-2][c+2]===p && grid[r-3][c+3]===p) return true;
  return false;
}

function getPlayerNameForColor(color){
  return color==='red'?player1Name:player2Name;
}

// --- MODAL ---
function showModal(text){
  winnerText.textContent = text;
  winModal.style.display = 'flex';
}

function hideModal(){
  winModal.style.display = 'none';
}

// --- HANDLER ---
function handleMove(col){
  if(winModal.style.display==='flex') return;

  for(let r=5;r>=0;r--){
    if(!grid[r][col]){
      grid[r][col]=currentPlayer;
      render();

      if(checkWin(currentPlayer)){
        showModal(`${getPlayerNameForColor(currentPlayer)} Wins!`);
        stopAiLoop();
        return;
      }

      if(isDraw()){
        showModal("It's a Draw!");
        stopAiLoop();
        return;
      }

      // switch player
      currentPlayer = currentPlayer==='red'?'yellow':'red';
      updateStatus();

      if(mode==='pve' && currentPlayer==='yellow' && !aiVsAiRunning){
        setTimeout(aiMove, 200);
      }

      return;
    }
  }
}

// --- AI MINIMAX ---
function evaluateBoard(grid, color){
  const opponent = color==='yellow'?'red':'yellow';
  let score = 0;

  function countLine(r1,c1,r2,c2,r3,c3,r4,c4){
    let arr=[grid[r1]?.[c1],grid[r2]?.[c2],grid[r3]?.[c3],grid[r4]?.[c4]];
    let myCount = arr.filter(x=>x===color).length;
    let oppCount = arr.filter(x=>x===opponent).length;
    if(myCount>0 && oppCount===0){
      if(myCount===2) score+=10;
      else if(myCount===3) score+=50;
      else if(myCount===4) score+=1000;
    }
    if(oppCount>0 && myCount===0){
      if(oppCount===2) score-=10;
      else if(oppCount===3) score-=50;
      else if(oppCount===4) score-=1000;
    }
  }

  // horizontal
  for(let r=0;r<6;r++) for(let c=0;c<4;c++)
    countLine(r,c,r,c+1,r,c+2,r,c+3);
  // vertical
  for(let c=0;c<7;c++) for(let r=0;r<3;r++)
    countLine(r,c,r+1,c,r+2,c,r+3,c);
  // diag \
  for(let r=0;r<3;r++) for(let c=0;c<4;c++)
    countLine(r,c,r+1,c+1,r+2,c+2,r+3,c+3);
  // diag /
  for(let r=3;r<6;r++) for(let c=0;c<4;c++)
    countLine(r,c,r-1,c+1,r-2,c+2,r-3,c+3);

  return score;
}

function nextRow(grid,col){
  for(let r=5;r>=0;r--){
    if(!grid[r][col]) return r;
  }
  return -1;
}

function minimax(grid, depth, maximizingPlayer){
  const available=[];
  for(let c=0;c<7;c++) if(!grid[0][c]) available.push(c);
  const color = maximizingPlayer?'yellow':'red';

  if(depth===0 || available.length===0 || checkWin('red') || checkWin('yellow')){
    return {score:evaluateBoard(grid,'yellow')};
  }

  let bestMove=null;
  if(maximizingPlayer){
    let maxEval=-Infinity;
    for(const col of available){
      const r = nextRow(grid,col);
      grid[r][col]='yellow';
      let evalScore = minimax(grid, depth-1, false).score;
      grid[r][col]=null;
      if(evalScore>maxEval){ maxEval=evalScore; bestMove=col; maxEval=evalScore; }
    }
    return {score:maxEval, col:bestMove};
  } else {
    let minEval=Infinity;
    for(const col of available){
      const r = nextRow(grid,col);
      grid[r][col]='red';
      let evalScore = minimax(grid, depth-1, true).score;
      grid[r][col]=null;
      if(evalScore<minEval){ minEval=evalScore; bestMove=col; minEval=evalScore; }
    }
    return {score:minEval, col:bestMove};
  }
}

// --- AI MOVE ---
function aiMove(){
  const result = minimax(grid, aiDepth, true);
  if(result.col!==null && result.col!==undefined){
    handleMove(result.col);
  } else {
    // fallback random
    const available=[];
    for(let c=0;c<7;c++) if(!grid[0][c]) available.push(c);
    if(available.length>0){
      const col=available[Math.floor(Math.random()*available.length)];
      handleMove(col);
    }
  }
}

// --- AI VS AI LOOP ---
function startAiLoop(){
  if(aiVsAiRunning) return;
  aiVsAiRunning = true;
  aiLoop();
}

function stopAiLoop(){
  aiVsAiRunning = false;
  if(aiLoopHandle){ clearTimeout(aiLoopHandle); aiLoopHandle=null; }
  updateStatus();
}

function aiLoop(){
  if(!aiVsAiRunning) return;
  if(checkWin('red')||checkWin('yellow')||isDraw()){ aiVsAiRunning=false; updateStatus(); return; }
  aiMove();
  aiLoopHandle = setTimeout(aiLoop, 300);
}

// --- CONTROLS ---
restartBtn && restartBtn.addEventListener('click', restartGame);
aiVsAiBtn && aiVsAiBtn.addEventListener('click', ()=>{
  if(aiVsAiRunning) stopAiLoop();
  else { restartGame(); startAiLoop(); }
});
homeBtn && homeBtn.addEventListener('click', ()=> window.location.href='index.html');
modalClose && (modalClose.onclick=hideModal);
modalRestart && (modalRestart.onclick=()=>{ hideModal(); restartGame(); });

// --- RESTART ---
function restartGame(){
  grid = Array.from({length:6}, ()=> Array(7).fill(null));
  currentPlayer='red';
  aiVsAiRunning=false;
  if(aiLoopHandle){ clearTimeout(aiLoopHandle); aiLoopHandle=null; }
  createBoard();
  updateStatus();
}

// --- Modal close handler ---
const modalCloseBtn = document.querySelector('.modal-close');
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    // Optional small fade-out animation
    const winModal = document.getElementById('winModal');
    if (winModal) {
      winModal.style.animation = 'fadeIn 0.3s reverse ease';
      setTimeout(() => {
        window.location.href = 'index.html'; // redirect to home
      }, 200);
    } else {
      window.location.href = 'index.html';
    }
  });
}


// --- INIT ---
createBoard();
updateStatus();

})();
