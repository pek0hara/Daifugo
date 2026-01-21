const suits = ["♣", "♦", "♥", "♠"];
const ranks = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const rankValues = new Map(ranks.map((rank, index) => [rank, index]));

const state = {
  players: [],
  currentPlayer: 0,
  pile: null,
  passCount: 0,
  lastPlayedBy: null,
  isGameOver: false,
};

const pileEl = document.getElementById("pile");
const turnEl = document.getElementById("turn");
const logEl = document.getElementById("log");
const handEl = document.getElementById("hand");
const passButton = document.getElementById("pass");
const restartButton = document.getElementById("restart");
const playerEls = [
  document.getElementById("player-1"),
  document.getElementById("player-2"),
  document.getElementById("player-3"),
];

const createDeck = () => {
  const deck = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({ suit, rank, value: rankValues.get(rank) });
    });
  });
  return deck;
};

const shuffle = (deck) => {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const cardLabel = (card) => `${card.rank}${card.suit}`;

const log = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  logEl.prepend(item);
};

const sortHand = (hand) =>
  hand.sort((a, b) => {
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    return suits.indexOf(a.suit) - suits.indexOf(b.suit);
  });

const setupPlayers = () => {
  const deck = shuffle(createDeck());
  state.players = [
    { name: "あなた", hand: [] },
    { name: "CPU 1", hand: [] },
    { name: "CPU 2", hand: [] },
    { name: "CPU 3", hand: [] },
  ];

  deck.forEach((card, index) => {
    state.players[index % 4].hand.push(card);
  });

  state.players.forEach((player) => sortHand(player.hand));
  state.currentPlayer = findStartingPlayer();
  state.pile = null;
  state.passCount = 0;
  state.lastPlayedBy = null;
  state.isGameOver = false;
  logEl.innerHTML = "";
  log("新しいゲームを開始しました。");
};

const findStartingPlayer = () => {
  let starter = 0;
  state.players.forEach((player, index) => {
    if (player.hand.some((card) => card.rank === "3" && card.suit === "♣")) {
      starter = index;
    }
  });
  return starter;
};

const currentPlayer = () => state.players[state.currentPlayer];

const canPlayCard = (card) => {
  if (!state.pile) {
    return true;
  }
  return card.value > state.pile.card.value;
};

const playCard = (playerIndex, card) => {
  const player = state.players[playerIndex];
  player.hand = player.hand.filter((c) => c !== card);
  state.pile = { card, playerIndex };
  state.lastPlayedBy = playerIndex;
  state.passCount = 0;
  log(`${player.name}が${cardLabel(card)}を出しました。`);
};

const passTurn = (playerIndex) => {
  const player = state.players[playerIndex];
  state.passCount += 1;
  log(`${player.name}はパスしました。`);

  const activePlayers = state.players.filter((p) => p.hand.length > 0).length;
  if (state.passCount >= activePlayers - 1) {
    state.pile = null;
    state.passCount = 0;
    state.currentPlayer = state.lastPlayedBy ?? state.currentPlayer;
    log("場が流れました。次の人は好きなカードを出せます。");
  }
};

const advanceTurn = () => {
  let next = state.currentPlayer;
  do {
    next = (next + 1) % state.players.length;
  } while (state.players[next].hand.length === 0 && !state.isGameOver);
  state.currentPlayer = next;
};

const checkGameOver = () => {
  const human = state.players[0];
  if (human.hand.length === 0) {
    state.isGameOver = true;
    log("あなたの勝利！おめでとうございます。");
    return true;
  }

  const activePlayers = state.players.filter((p) => p.hand.length > 0);
  if (activePlayers.length === 1) {
    state.isGameOver = true;
    log("ゲーム終了。CPUが先に上がりました。");
    return true;
  }

  return false;
};

const renderPlayers = () => {
  playerEls.forEach((el, index) => {
    const player = state.players[index + 1];
    if (!player) {
      return;
    }
    el.innerHTML = `
      <div class="player__name">${player.name}</div>
      <div class="player__status">残り ${player.hand.length} 枚</div>
    `;
  });
};

const renderPile = () => {
  if (!state.pile) {
    pileEl.textContent = "まだ場にカードがありません";
    return;
  }
  pileEl.textContent = `${state.players[state.pile.playerIndex].name} : ${cardLabel(
    state.pile.card,
  )}`;
};

const renderTurn = () => {
  turnEl.textContent = `${currentPlayer().name}の番です`;
};

const renderHand = () => {
  handEl.innerHTML = "";
  const player = state.players[0];
  player.hand.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.textContent = cardLabel(card);
    const isPlayable = state.currentPlayer === 0 && !state.isGameOver && canPlayCard(card);
    if (isPlayable) {
      button.classList.add("card--playable");
    }
    button.disabled = !isPlayable;
    button.addEventListener("click", () => {
      if (!isPlayable) {
        return;
      }
      playCard(0, card);
      if (checkGameOver()) {
        render();
        return;
      }
      advanceTurn();
      render();
      runCpuTurns();
    });
    handEl.appendChild(button);
  });

  passButton.disabled = state.currentPlayer !== 0 || state.isGameOver;
};

const render = () => {
  renderPlayers();
  renderPile();
  renderTurn();
  renderHand();
};

const cpuPlay = (playerIndex) => {
  const player = state.players[playerIndex];
  const playable = player.hand.filter((card) => canPlayCard(card));
  if (playable.length === 0) {
    passTurn(playerIndex);
    return;
  }
  const card = playable[0];
  playCard(playerIndex, card);
};

const runCpuTurns = () => {
  if (state.isGameOver) {
    return;
  }
  while (state.currentPlayer !== 0 && !state.isGameOver) {
    cpuPlay(state.currentPlayer);
    if (checkGameOver()) {
      break;
    }
    advanceTurn();
  }
  render();
};

passButton.addEventListener("click", () => {
  if (state.currentPlayer !== 0 || state.isGameOver) {
    return;
  }
  passTurn(0);
  advanceTurn();
  render();
  runCpuTurns();
});

restartButton.addEventListener("click", () => {
  setupPlayers();
  render();
  runCpuTurns();
});

setupPlayers();
render();
runCpuTurns();
