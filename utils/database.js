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
  databasePool = mysql.createPool({
    host: dbUri.hostname,
    port: dbUri.port || 3306,
    user: dbUri.username || "root",
    password: dbUri.password || "",
    database: dbUri.pathname.replace("/", ""),
    waitForConnections: true,
    connectionLimit: 10,
  });

  console.log("✅ Connected to MySQL database!");
} catch (error) {
  console.error("❌ Failed to parse MySQL URL:", error);
  process.exit(1);
}

// Ensure user preferences table exists
async function ensureTableExists() {
  try {
    await databasePool.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id VARCHAR(50) PRIMARY KEY,
        preference ENUM('male', 'female', 'random') NOT NULL DEFAULT 'random'
      );
    `);
    console.log("✅ Ensured 'user_preferences' table exists!");
  } catch (error) {
    console.error("❌ Error ensuring table exists:", error);
  }
}
ensureTableExists();

// MySQL functions
async function getUserPreference(userId) {
  try {
    const [rows] = await databasePool.execute(
      "SELECT preference FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    return rows.length > 0 ? rows[0].preference : "random";
  } catch (error) {
    console.error("MySQL Error (getUserPreference):", error);
    return "random";
  }
}

async function setUserPreference(userId, preference) {
  if (!["male", "female", "random"].includes(preference)) return false;
  try {
    await databasePool.execute(
      "INSERT INTO user_preferences (user_id, preference) VALUES (?, ?) ON DUPLICATE KEY UPDATE preference = VALUES(preference);",
      [userId, preference]
    );
    return true;
  } catch (error) {
    console.error("MySQL Error (setUserPreference):", error);
    return false;
  }
}

module.exports = { database: databasePool, getUserPreference, setUserPreference };
