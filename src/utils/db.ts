import { Pool } from "pg";

export default new Pool({
  user: "postgres",
  host: "localhost",
  database: "touristic_lesserpoland",
  password: "root",
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
});
