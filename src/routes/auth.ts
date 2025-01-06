import express from "express";
const router = express.Router();
import * as authController from "../controllers/auth";

router.post("/signup",authController.signup);

router.post("/login",authController.login);


export default router;