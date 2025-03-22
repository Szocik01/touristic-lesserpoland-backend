import { Pool } from "pg";

export default new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  max: 20,
  idleTimeoutMillis: 30000,
});
