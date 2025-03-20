import express from "express";
const router = express.Router();
import * as searchController from "../controllers/search";
import { getTokenData } from "../middlewares/getTokenData";

router.get("/search-trips", getTokenData ,searchController.searchTrips);
router.get("/search-locations-hints", searchController.locationsHints);
router.get("/search-find-routes-hints", searchController.findRoutesHints);
router.get("/find-hint/:id/:type", searchController.findRouteHintByIdAndType);

export default router;