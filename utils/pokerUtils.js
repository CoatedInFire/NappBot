const handEvaluator = require("poker-hand-evaluator");

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

module.exports = { evaluateHand, determineWinner };
