import express from "express";
const router = express.Router();
import * as tripsController from "../controllers/trips";
import { isAuthTokenValid } from "../middlewares/isAuthTokenValid";
import { uploadPhoto } from "../middlewares/uploadPhoto";

router.post("/find-route", tripsController.getRoutes)
router.post("/add-trip", isAuthTokenValid, uploadPhoto, tripsController.addTrip);
router.post("/edit-trip", isAuthTokenValid, uploadPhoto, tripsController.editTrip);
router.delete("/delete-trip/:id", isAuthTokenValid, tripsController.deleteTrip);
router.get("/get-users-favourite",isAuthTokenValid, tripsController.getUserFavoriteTrips)
router.post("/add-trip-comment", isAuthTokenValid, tripsController.addTripComment);
router.post("/edit-trip-comment", isAuthTokenValid, tripsController.editTripComment);
router.delete("/delete-trip-comment/:id", isAuthTokenValid, tripsController.deleteTripComment);

export default router;