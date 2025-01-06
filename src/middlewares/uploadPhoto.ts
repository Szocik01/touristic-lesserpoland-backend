import multer from "multer";
import {v4 as uuidv4} from "uuid";
import crypto from "crypto"
import path from "path";
import { Request, Response, NextFunction } from "express";
import { ErrorWithStatusCode } from "../types/custom/error";

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "images", "trips"));
  },
  filename: (req, file, cb) => {
    cb(null,crypto.randomBytes(7).toString("hex") + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage: fileStorage, fileFilter: fileFilter });

export const uploadPhoto = (req: Request, res: Response, next: NextFunction) => {
  upload.array("images")(req, res, (err) => {
    if (err) {
      console.log(err);
      const error: ErrorWithStatusCode = new Error("File upload failed");
      error.statusCode = 422;
      next(error);
      return;
    }
    next();
  });
};
