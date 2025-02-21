const mysql = require("mysql2/promise");
const { URL } = require("node:url");

const dbUrl = process.env.MYSQL_PUBLIC_URL;
if (!dbUrl) {
  console.error("❌ MYSQL_PUBLIC_URL is not set in environment variables!");
  process.exit(1);
}

let databasePool;

try {
  const dbUri = new URL(dbUrl);
  const dbName = dbUri.pathname.replace("/", "").trim();
  if (!dbName) {
    console.error("❌ Invalid MySQL Database Name!");
    process.exit(1);
  }

  databasePool = mysql.createPool({
    host: dbUri.hostname,
    port: dbUri.port || "3306",
    user: dbUri.username || "root",
    password: dbUri.password || "",
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4_general_ci",
  });

  console.log("✅ MySQL Connection Pool Created");

  async function testDatabaseConnection() {
    try {
      const conn = await databasePool.getConnection();
      console.log("✅ MySQL Connection Successful");
      conn.release();
    } catch (err) {
      console.error(
        "❌ MySQL Connection Test Failed:",
        err.code,
        "-",
        err.sqlMessage
      );
    }
  }
  testDatabaseConnection();
} catch (error) {
  console.error("❌ Failed to parse MySQL URL:", error.message);
  process.exit(1);
}

async function getUserPreference(userId) {
  try {
    const [rows] = await databasePool.execute(
      "SELECT preference FROM user_preferences WHERE user_id = ?",
      [userId.trim()]
    );
    return rows.length > 0 ? rows[0].preference : "random";
  } catch (error) {
    console.error(
      `❌ MySQL Error (getUserPreference): ${error.code} - ${error.sqlMessage}`
    );
    return "random";
  }
}

async function setUserPreference(userId, preference) {
  if (!["male", "female", "random"].includes(preference)) return false;
  try {
    await databasePool.execute(
      "INSERT INTO user_preferences (user_id, preference) VALUES (?, ?) ON DUPLICATE KEY UPDATE preference = ?;",
      [userId, preference, preference]
    );
    return true;
  } catch (error) {
    console.error(
      `❌ MySQL Error (setUserPreference): ${error.code} - ${error.sqlMessage}`
    );
    return false;
  }
}

async function getUserBalance(userId) {
  try {
    const [rows] = await databasePool.execute(
      "SELECT balance, bank_balance, streak FROM users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      await databasePool.execute(
        "INSERT INTO users (user_id, balance, bank_balance, streak) VALUES (?, ?, ?, 0)",
        [userId, 5000, 0]
      );
      return { balance: 5000, bank_balance: 0, streak: 0 };
    }

    return rows[0];
  } catch (error) {
    console.error("❌ MySQL Error (getUserBalance):", error);
    return null;
  }
}

async function updateUserBalance(userId, walletChange, bankChange) {
  if (!userId) {
    console.error("❌ updateUserBalance Error: userId is undefined or null.");
    return false;
  }

  if (walletChange === undefined || bankChange === undefined) {
    console.error(
      "❌ updateUserBalance Error: walletChange or bankChange is undefined.",
      { walletChange, bankChange }
    );
    return false;
  }

  try {
    await databasePool.execute(
      `UPDATE users 
       SET balance = balance + ?, bank_balance = bank_balance + ? 
       WHERE user_id = ?;`,
      [walletChange, bankChange, userId]
    );
    return true;
  } catch (error) {
    console.error("❌ MySQL Error (updateUserBalance):", error);
    return false;
  }
}

async function getUserStreak(userId) {
  try {
    const [rows] = await databasePool.execute(
      "SELECT streak FROM users WHERE user_id = ?",
      [userId]
    );
    return rows.length ? rows[0].streak : 0;
  } catch (error) {
    console.error("❌ MySQL Error (getUserStreak):", error);
    return 0;
  }
}

async function updateStreak(userId, result) {
  if (!userId || !["win", "loss"].includes(result)) {
    console.error(
      `❌ updateStreak Error: Invalid userId or result - ${userId}, ${result}`
    );
    return false;
  }

  try {
    if (result === "win") {
      await databasePool.execute(
        "UPDATE users SET streak = GREATEST(streak + 1, 1) WHERE user_id = ?",
        [userId]
      );
    } else if (result === "loss") {
      await databasePool.execute(
        "UPDATE users SET streak = LEAST(streak - 1, -1) WHERE user_id = ?",
        [userId]
      );
    }
    return true;
  } catch (error) {
    console.error(
      `❌ MySQL Error (updateStreak): ${error.code} - ${error.sqlMessage}`
    );
    return false;
  }
}

module.exports = {
  database: databasePool,
  getUserPreference,
  setUserPreference,
  getUserBalance,
  updateUserBalance,
  getUserStreak,
  updateStreak,
};
