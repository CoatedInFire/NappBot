const handEvaluator = require("poker-hand-evaluator");

const HAND_RANKINGS = [
  "High Card",
  "One Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush",
];

function evaluateHand(hand) {
  const formattedHand = hand.map((card) => card.value + card.suit);
  const evaluation = handEvaluator.evalHand(formattedHand);
  if (!evaluation || !evaluation.handType) {
    console.error("Error in evaluateHand:", evaluation);
    return "Error evaluating hand";
  }
  return evaluation.handType;
}

function determineWinner(players, communityCards) {
  let bestHand = null;
  let winner = null;
  const evaluatedHands = [];

  for (const player of players) {
    if (!player.folded) {
      const hand = [...player.hand, ...communityCards];
      const handRank = evaluateHand(hand);
      evaluatedHands.push({
        player: player.name,
        hand: hand.map((c) => `${c.value}${c.suit}`).join(" "),
        ranking: handRank,
      });

      if (
        !bestHand ||
        HAND_RANKINGS.indexOf(handRank) > HAND_RANKINGS.indexOf(bestHand)
      ) {
        bestHand = handRank;
        winner = player;
      }
    }
  }
  return { winner, evaluatedHands };
}

function getHandStrengthTip(handType) {
  const tips = {
    "High Card": "Consider folding if the bet is high.",
    "One Pair": "A decent hand, but be cautious of higher pairs.",
    "Two Pair": "A strong hand, consider raising.",
    "Three of a Kind": "A very strong hand, you should raise.",
    Straight: "A powerful hand, definitely raise.",
    Flush: "A very powerful hand, raise confidently.",
    "Full House": "An extremely strong hand, raise aggressively.",
    "Four of a Kind": "Almost unbeatable, raise as much as possible.",
    "Straight Flush": "An incredibly rare hand, raise all-in.",
    "Royal Flush": "The best possible hand, go all-in.",
  };
  return tips[handType] || "Play cautiously.";
}

module.exports = { evaluateHand, determineWinner, getHandStrengthTip };
