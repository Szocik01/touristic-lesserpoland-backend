import express, { Request, Response, NextFunction } from "express";
import { ErrorWithStatusCode } from "./src/types/custom/error";
import cors from "cors";
import authRoutes from "./src/routes/auth";
import tripRoutes from "./src/routes/trips";
import userRoutes from "./src/routes/user";
import searchRoutes from "./src/routes/search";
import bodyParser from "body-parser";

const app = express();
const port = 8080;

app.use(cors({ allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(bodyParser.json());
app.use("/auth",authRoutes);

app.use(tripRoutes)
app.use(userRoutes)
app.use(searchRoutes)

app.use(
  (
    error: ErrorWithStatusCode,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    res.status(error.statusCode).json({ message: error.message });
  }
);

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
