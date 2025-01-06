import User from "../models/user";
import { LoginBody, User as UserBody } from "../types/api/user";
import bcrypt from "bcryptjs";
import { ErrorWithStatusCode } from "../types/custom/error";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { jwtSecretKey } from "../utils/constants";

export const login = (
  req: Request<{}, {}, LoginBody>,
  res: Response,
  next: NextFunction
) => {
  const email = req.body.email;
  const password = req.body.password;
  let userData;
  User.getUserByEmail(email)
    .then((response) => {
      if (response.rowCount === 0) {
        const error: ErrorWithStatusCode = new Error(
          "Given email is not correct"
        );
        error.statusCode = 401;
        throw error;
      }
      userData = response.rows[0];
      return bcrypt.compare(password, userData.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error: ErrorWithStatusCode = new Error("Incorrect password");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          userId: userData.id,
        },
        jwtSecretKey,
        { expiresIn: "2h" }
      );
      res.status(200).json({ token: token });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const signup = (
  req: Request<{}, {}, UserBody>,
  res: Response,
  next: NextFunction
) => {
  const email: string = req.body.email;
  const password: string = req.body.password;
  const userName: string = req.body.userName;

  if (!email.includes("@") || !email.includes(".")) {
    const error: ErrorWithStatusCode = new Error("Invalid email");
    error.statusCode = 422;
    throw error;
  }
  if (password.length < 8) {
    const error: ErrorWithStatusCode = new Error("Invalid password");
    error.statusCode = 422;
    throw error;
  }

  User.getUserByEmail(email)
    .then((response) => {
      if (response.rowCount > 0) {
        const error: ErrorWithStatusCode = new Error(
          "User with given email already exists."
        );
        error.statusCode = 422;
        throw error;
      }
      return bcrypt.hash(password, 12);
    })
    .then((hashedPassword) => {
      const user = new User(email, userName, hashedPassword);
      return user.addUser();
    })
    .then((result) => {
      res.status(201).json({ message: "User created succesfully." });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};
