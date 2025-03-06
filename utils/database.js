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
    throw new Error("Invalid MySQL Database Name");
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
      console.error("❌ MySQL Connection Test Failed:", err.message || err);
      process.exit(1);
    }
  }

  testDatabaseConnection();
} catch (error) {
  console.error("❌ Failed to initialize MySQL:", error.message || error);
  process.exit(1);
}

async function executeQuery(query, params = []) {
  try {
    const [rows] = await databasePool.execute(query, params);
    return rows;
  } catch (error) {
    console.error(`❌ MySQL Error: ${error.code || "Unknown"} - ${error.sqlMessage || error.message}`);
    return null;
  }
}

async function getUserPreference(userId) {
  const rows = await executeQuery(
    "SELECT preference FROM user_preferences WHERE user_id = ?",
    [userId.trim()]
  );
  return rows?.length ? rows[0].preference : null;
}

async function setUserPreference(userId, preference) {
  if (!["male", "female", "random"].includes(preference)) return false;
  return !!(await executeQuery(
    "INSERT INTO user_preferences (user_id, preference) VALUES (?, ?) ON DUPLICATE KEY UPDATE preference = ?",
    [userId, preference, preference]
  ));
}

async function getUserLastWork(userId) {
  const rows = await executeQuery(
    "SELECT last_work FROM users WHERE user_id = ?",
    [userId]
  );
  return rows?.length ? rows[0].last_work : null;
}

async function updateUserLastWork(userId) {
  await executeQuery("UPDATE users SET last_work = NOW() WHERE user_id = ?", [userId]);
}

async function getUserBalance(userId) {
  const rows = await executeQuery(
    "SELECT balance, bank_balance, streak FROM users WHERE user_id = ?",
    [userId]
  );

  if (!rows?.length) {
    await executeQuery(
      "INSERT INTO users (user_id, balance, bank_balance, streak) VALUES (?, ?, ?, 0)",
      [userId, 5000, 0]
    );
    return { balance: 5000, bank_balance: 0, streak: 0 };
  }

  return rows[0];
}

async function updateUserBalance(userId, walletChange = 0, bankChange = 0) {
  if (!userId) {
    console.error("❌ updateUserBalance Error: userId is undefined or null.");
    return false;
  }

  return !!(await executeQuery(
    `UPDATE users 
     SET balance = balance + ?, bank_balance = bank_balance + ? 
     WHERE user_id = ?`,
    [walletChange, bankChange, userId]
  ));
}

async function getUserStreak(userId) {
  const rows = await executeQuery("SELECT streak FROM users WHERE user_id = ?", [userId]);
  return rows?.length ? rows[0].streak : 0;
}

async function updateStreak(userId, result) {
  if (!userId || !["win", "loss"].includes(result)) {
    console.error(`❌ updateStreak Error: Invalid userId or result - ${userId}, ${result}`);
    return false;
  }

  const query = result === "win"
    ? "UPDATE users SET streak = GREATEST(streak + 1, 1) WHERE user_id = ?"
    : "UPDATE users SET streak = LEAST(streak - 1, -1) WHERE user_id = ?";

  return !!(await executeQuery(query, [userId]));
}

async function markUserActive(userId) {
  await executeQuery("UPDATE users SET active_last = NOW() WHERE user_id = ?", [userId]);
}

if (!databasePool) {
  console.error("❌ MySQL connection pool failed to initialize.");
  process.exit(1);
}

module.exports = {
  database: databasePool,
  getUserPreference,
  setUserPreference,
  getUserBalance,
  updateUserBalance,
  getUserStreak,
  updateStreak,
  getUserLastWork,
  updateUserLastWork,
  markUserActive,
};
