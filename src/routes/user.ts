import express from 'express';
const router = express.Router();
import * as userController from '../controllers/user';
import { isAuthTokenValid } from '../middlewares/isAuthTokenValid';

router.post("/toggle-favourite-trip/:id", isAuthTokenValid, userController.toggleFavouriteTrip);

export default router;