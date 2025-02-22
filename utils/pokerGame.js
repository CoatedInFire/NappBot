const PokerAI = require("./pokerai");
const { evaluateHand } = require("./pokerUtils");

class PokerGame {
  constructor(players, bigBlind = 100) {
    this.players = players.map((p, i) =>
      typeof p === "string" ? new PokerAI(`AI ${i + 1}`, p) : p
    );
    this.pot = 0;
    this.currentBet = 0;
    this.bigBlind = bigBlind;
    this.turnIndex = 0;
    this.communityCards = [];
    this.round = "preflop";
    this.deck = this.initializeDeck();
    this.dealStartingHands();
  }

  initializeDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const values = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];
    const deck = [];
    for (let suit of suits) {
      for (let value of values) {
        deck.push({ value, suit });
      }
    }
    return deck.sort(() => Math.random() - 0.5);
  }

  dealStartingHands() {
    for (let player of this.players) {
      player.hand = [this.deck.pop(), this.deck.pop()];
    }
  }

  dealCommunityCards(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.deck.pop());
    }
    return cards;
  }

  nextTurn() {
    if (this.isRoundOver()) {
      this.progressRound();
      return;
    }

    let player = this.players[this.turnIndex];

    if (player.folded) {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      return this.nextTurn();
    }

    let action;
    if (player instanceof PokerAI) {
      action = player.decideAction(
        this.currentBet,
        this.pot,
        this.communityCards,
        this.players
      );
    } else {
      return { actionRequired: true, player };
    }

    this.handleAction(player, action);
  }

  handleAction(player, action) {
    if (action.action === "fold") {
      player.folded = true;
    } else if (action.action === "call") {
      let amount = Math.min(action.amount, player.chips);
      player.chips -= amount;
      this.pot += amount;
    } else if (action.action === "raise") {
      let amount = Math.min(action.amount, player.chips);
      player.chips -= amount;
      this.pot += amount;
      this.currentBet = amount;
    }

    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    this.nextTurn();
  }

  isRoundOver() {
    return this.players.every(
      (p) => p.folded || p.currentBet === this.currentBet
    );
  }

  progressRound() {
    const rounds = ["preflop", "flop", "turn", "river", "showdown"];
    let currentIndex = rounds.indexOf(this.round);
    if (currentIndex < rounds.length - 1) {
      this.round = rounds[currentIndex + 1];
      this.turnIndex = 0;
      this.currentBet = 0;
      if (this.round === "flop")
        this.communityCards.push(...this.dealCommunityCards(3));
      else if (this.round === "turn" || this.round === "river")
        this.communityCards.push(...this.dealCommunityCards(1));
    } else {
      this.showdown();
    }
  }

  showdown() {
    console.log("Showdown! Evaluating hands...");
    let bestHand = null;
    let winner = null;

    for (let player of this.players) {
      if (!player.folded) {
        const fullHand = [...player.hand, ...this.communityCards];
        const handRank = evaluateHand(fullHand);

        if (!bestHand || HAND_RANKINGS.indexOf(handRank) > HAND_RANKINGS.indexOf(bestHand)) {
          bestHand = handRank;
          winner = player;
        }
      }
    }

    console.log(`Winner: ${winner.name} with a ${bestHand}`);
    winner.chips += this.pot;
    this.resetGame();
    return { id: winner.id, name: winner.name, bestHand };
  }

  resetGame() {
    this.pot = 0;
    this.currentBet = 0;
    this.turnIndex = 0;
    this.communityCards = [];
    this.round = "preflop";
    this.deck = this.initializeDeck();
    this.dealStartingHands();
    for (let player of this.players) {
      player.folded = false;
    }
  }
}

module.exports = PokerGame;
