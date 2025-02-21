const { database } = require("./database");

function getInterestRate(balance, isActive) {
  let baseRate;

  if (balance < 10000) baseRate = 0.1; // 10% for < 10k
  else if (balance < 50000) baseRate = 0.07; // 7% for < 50k
  else if (balance < 100000) baseRate = 0.05; // 5% for < 100k
  else if (balance < 500000) baseRate = 0.03; // 3% for < 500k
  else if (balance < 1000000) baseRate = 0.02; // 2% for < 1M
  else baseRate = 0.01; // 1% for 1M+

  if (isActive) baseRate += 0.01;

  return baseRate;
}

async function getActiveUsers() {
  try {
    const [rows] = await database.execute(
      "SELECT user_id FROM users WHERE active_last >= NOW() - INTERVAL 24 HOUR"
    );
    return new Set(rows.map((row) => row.user_id));
  } catch (error) {
    console.error("❌ MySQL Error (getActiveUsers):", error);
    return new Set();
  }
}

async function wasInterestAppliedRecently() {
  try {
    const [rows] = await database.execute(
      "SELECT MAX(last_interest) AS last_applied FROM users"
    );
    const lastApplied = rows[0]?.last_applied;
    if (!lastApplied) return false;

    const lastTime = new Date(lastApplied).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    return lastTime > oneHourAgo; 
  } catch (error) {
    console.error("❌ MySQL Error (wasInterestAppliedRecently):", error);
    return false;
  }
}

async function applyInterest() {
  try {
    if (await wasInterestAppliedRecently()) {
      console.log("⏳ Interest already applied recently. Skipping...");
      return;
    }

    const activeUsers = await getActiveUsers();
    const [users] = await database.execute(
      "SELECT user_id, bank_balance FROM users WHERE bank_balance > 0"
    );

    let affectedUsers = 0;
    for (const { user_id, bank_balance } of users) {
      const isActive = activeUsers.has(user_id);
      const interestRate = getInterestRate(bank_balance, isActive);
      const interest = Math.floor(bank_balance * interestRate);

      if (interest > 0) {
        await database.execute(
          "UPDATE users SET bank_balance = bank_balance + ?, last_interest = NOW() WHERE user_id = ?",
          [interest, user_id]
        );
        affectedUsers++;
        console.log(
          `💰 Applied ${interest} coins to ${user_id} (Active: ${isActive})`
        );
      }
    }

    console.log(`✅ Interest applied to ${affectedUsers} users.`);
  } catch (error) {
    console.error("❌ MySQL Error (applyInterest):", error);
  }
}


setTimeout(async () => {
  if (!(await wasInterestAppliedRecently())) {
    await applyInterest();
  }
}, 5000);

setInterval(applyInterest, 60 * 60 * 1000);
module.exports = { applyInterest };
