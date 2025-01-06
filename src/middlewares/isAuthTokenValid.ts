import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ErrorWithStatusCode } from "../types/custom/error";
import { jwtSecretKey } from "../utils/constants";
import { RequestWithLoggedUser } from "../types/custom/middleware";

export const isAuthTokenValid = (
  req: RequestWithLoggedUser,
  res: Response,
  next: NextFunction
) => {
  const authToken = req.get("Authorization");
  if (!authToken) {
    const error: ErrorWithStatusCode = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }
  let decodedToken: JwtPayload;
  try {
    decodedToken = jwt.verify(authToken, jwtSecretKey) as JwtPayload;
    if (!decodedToken) {
      const error: ErrorWithStatusCode = new Error("Not authorized");
      error.statusCode = 401;
      throw error;
    }
    req.userId = decodedToken.userId.toString();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }

  next();
};
