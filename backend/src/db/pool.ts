import mysql from "mysql2/promise";
import { config } from "../config.js";

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  charset: "utf8mb4",
  // Return DECIMAL columns (prices) as numbers to match the frontend's pricePhp: number.
  decimalNumbers: true,
  // DATETIME columns hold UTC; read and write them as UTC regardless of the host time zone.
  timezone: "Z"
});

// Separate connection for running trusted SQL files (migrations/seeds) that contain multiple statements.
export const createScriptConnection = () =>
  mysql.createConnection({ ...config.db, charset: "utf8mb4", multipleStatements: true });
