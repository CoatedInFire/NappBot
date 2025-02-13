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

// ✅ Ensure tables exist
async function ensureTablesExist() {
  try {
    // User Preferences Table
    await databasePool.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id VARCHAR(50) PRIMARY KEY,
        preference ENUM('male', 'female', 'random') NOT NULL DEFAULT 'random'
      );
    `);

    // User Installations Table
    await databasePool.execute(`
      CREATE TABLE IF NOT EXISTS user_installations (
        user_id VARCHAR(50) PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Ensured necessary tables exist!");
  } catch (error) {
    console.error(
      "❌ Error ensuring tables exist:",
      error.code,
      "-",
      error.sqlMessage
    );
  }
}
ensureTablesExist();

// ✅ Store User Installation Data
async function storeUserInstallation(userId, accessToken, refreshToken) {
  try {
    await databasePool.execute(
      "INSERT INTO user_installations (user_id, access_token, refresh_token) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE access_token = ?, refresh_token = ?;",
      [userId, accessToken, refreshToken, accessToken, refreshToken]
    );
    console.log(`✅ Stored installation for user ${userId}`);
    return true;
  } catch (error) {
    console.error(
      `❌ MySQL Error (storeUserInstallation): ${error.code} - ${error.sqlMessage}`
    );
    return false;
  }
}

// ✅ Get User Installation Data
async function getUserInstallation(userId) {
  try {
    const [rows] = await databasePool.execute(
      "SELECT access_token, refresh_token FROM user_installations WHERE user_id = ?",
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `❌ MySQL Error (getUserInstallation): ${error.code} - ${error.sqlMessage}`
    );
    return null;
  }
}

// ✅ Get User Preference
async function getUserPreference(userId) {
  try {
    const [rows] = await databasePool.execute(
      "SELECT preference FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    return rows.length > 0 ? rows[0].preference : "random";
  } catch (error) {
    console.error(
      `❌ MySQL Error (getUserPreference): ${error.code} - ${error.sqlMessage}`
    );
    return "random";
  }
}

// ✅ Set User Preference
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

// ✅ Export all functions
module.exports = {
  database: databasePool,
  getUserPreference,
  setUserPreference,
  storeUserInstallation,
  getUserInstallation,
};
