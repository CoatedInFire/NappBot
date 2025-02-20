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

module.exports = {
  database: databasePool,
  getUserPreference,
  setUserPreference,
};
