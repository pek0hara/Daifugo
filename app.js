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
  selectedCards: [], // Track selected cards for multi-card play
};

const pileEl = document.getElementById("pile");
const turnEl = document.getElementById("turn");
const logEl = document.getElementById("log");
const handEl = document.getElementById("hand");
const passButton = document.getElementById("pass");
const restartButton = document.getElementById("restart");
const playSelectedButton = document.createElement("button");
playSelectedButton.id = "play-selected";
playSelectedButton.className = "button";
playSelectedButton.textContent = "選択したカードを出す";
playSelectedButton.type = "button";

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

const cardsLabel = (cards) => cards.map(cardLabel).join("");

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
  state.selectedCards = [];
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

// Check if cards form a valid stairs (consecutive same-suit cards)
const isStairs = (cards) => {
  if (cards.length < 3) return false;
  
  // Check same suit
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  
  // Sort by value
  const sorted = [...cards].sort((a, b) => a.value - b.value);
  
  // Check consecutive
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].value !== sorted[i-1].value + 1) return false;
  }
  return true;
};

// Check if all cards have the same rank
const isSameRank = (cards) => {
  if (cards.length < 1) return false;
  const rank = cards[0].rank;
  return cards.every(c => c.rank === rank);
};

// Determine play type and validate
const getPlayType = (cards) => {
  if (cards.length === 1) return 'single';
  if (isSameRank(cards)) return 'pair';
  if (isStairs(cards)) return 'stairs';
  return null; // Invalid combination
};

// Get the strength of a play (highest card value for stairs, card value for others)
const getPlayStrength = (cards, type) => {
  if (cards.length === 0) return -1;
  if (type === 'stairs') {
    return Math.max(...cards.map(c => c.value));
  }
  return cards[0].value; // For single and pair, all cards have same value
};

const canPlayCards = (cards) => {
  if (!cards || cards.length === 0) return false;
  
  const playType = getPlayType(cards);
  if (!playType) return false; // Invalid combination
  
  if (!state.pile) {
    return true; // Can play anything when pile is empty
  }
  
  // Must match the number of cards and play type
  if (cards.length !== state.pile.cards.length) return false;
  if (playType !== state.pile.type) return false;
  
  // Must be stronger
  const ourStrength = getPlayStrength(cards, playType);
  const pileStrength = getPlayStrength(state.pile.cards, state.pile.type);
  return ourStrength > pileStrength;
};

const canPlayCard = (card) => {
  return canPlayCards([card]);
};

const playCards = (playerIndex, cards) => {
  const player = state.players[playerIndex];
  
  // Remove played cards from hand efficiently
  player.hand = player.hand.filter(handCard => !cards.includes(handCard));
  
  const playType = getPlayType(cards);
  state.pile = { cards, playerIndex, type: playType };
  state.lastPlayedBy = playerIndex;
  state.passCount = 0;
  
  // Log message
  let message = `${player.name}が${cardsLabel(cards)}を出しました`;
  if (playType === 'stairs') {
    message += '（階段）';
  }
  log(message + '。');
};

const playCard = (playerIndex, card) => {
  playCards(playerIndex, [card]);
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
  let display = `${state.players[state.pile.playerIndex].name} : ${cardsLabel(state.pile.cards)}`;
  if (state.pile.type === 'stairs') {
    display += '（階段）';
  }
  pileEl.textContent = display;
};

const renderTurn = () => {
  turnEl.textContent = `${currentPlayer().name}の番です`;
};

const renderHand = () => {
  handEl.innerHTML = "";
  const player = state.players[0];
  const isMyTurn = state.currentPlayer === 0 && !state.isGameOver;
  
  player.hand.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.textContent = cardLabel(card);
    
    const isSelected = state.selectedCards.includes(card);
    if (isSelected) {
      button.classList.add("card--selected");
    }
    
    if (isMyTurn) {
      button.classList.add("card--selectable");
    }
    
    button.addEventListener("click", () => {
      if (!isMyTurn) return;
      
      // Toggle selection
      if (isSelected) {
        state.selectedCards = state.selectedCards.filter(c => c !== card);
      } else {
        state.selectedCards.push(card);
      }
      render();
    });
    
    handEl.appendChild(button);
  });

  // Update play selected button
  const canPlay = isMyTurn && state.selectedCards.length > 0 && canPlayCards(state.selectedCards);
  playSelectedButton.disabled = !canPlay;
  
  passButton.disabled = !isMyTurn;
};

const render = () => {
  renderPlayers();
  renderPile();
  renderTurn();
  renderHand();
};

const cpuPlay = (playerIndex) => {
  const player = state.players[playerIndex];
  
  // Try to find valid plays
  const validPlays = [];
  
  // Try single cards
  player.hand.forEach(card => {
    if (canPlayCards([card])) {
      validPlays.push([card]);
    }
  });
  
  // Try pairs and multiples of same rank
  const rankGroups = {};
  player.hand.forEach(card => {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  });
  
  Object.values(rankGroups).forEach(group => {
    if (group.length >= 2) {
      for (let i = 2; i <= group.length; i++) {
        const combo = group.slice(0, i);
        if (canPlayCards(combo)) {
          validPlays.push(combo);
        }
      }
    }
  });
  
  // Try stairs (3+ consecutive same suit)
  const suitGroups = {};
  player.hand.forEach(card => {
    if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
    suitGroups[card.suit].push(card);
  });
  
  Object.values(suitGroups).forEach(group => {
    if (group.length >= 3) {
      const sorted = [...group].sort((a, b) => a.value - b.value);
      // Try all possible consecutive sequences
      for (let start = 0; start < sorted.length; start++) {
        for (let len = 3; len <= sorted.length - start; len++) {
          const combo = sorted.slice(start, start + len);
          if (isStairs(combo) && canPlayCards(combo)) {
            validPlays.push(combo);
          }
        }
      }
    }
  });
  
  if (validPlays.length === 0) {
    passTurn(playerIndex);
    return;
  }
  
  // Play the weakest valid combination (first single, or lowest strength)
  validPlays.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    const typeA = getPlayType(a);
    const typeB = getPlayType(b);
    return getPlayStrength(a, typeA) - getPlayStrength(b, typeB);
  });
  
  playCards(playerIndex, validPlays[0]);
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

playSelectedButton.addEventListener("click", () => {
  if (state.currentPlayer !== 0 || state.isGameOver) return;
  if (state.selectedCards.length === 0) return;
  if (!canPlayCards(state.selectedCards)) return;
  
  playCards(0, state.selectedCards);
  state.selectedCards = [];
  
  if (checkGameOver()) {
    render();
    return;
  }
  advanceTurn();
  render();
  runCpuTurns();
});

passButton.addEventListener("click", () => {
  if (state.currentPlayer !== 0 || state.isGameOver) {
    return;
  }
  state.selectedCards = [];
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

// Insert play selected button into the DOM
const handActionsEl = document.querySelector(".hand__actions");
handActionsEl.insertBefore(playSelectedButton, passButton);

setupPlayers();
render();
runCpuTurns();
