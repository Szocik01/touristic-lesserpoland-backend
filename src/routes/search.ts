import express from "express";
const router = express.Router();
import * as searchController from "../controllers/search";

router.get("/search-trips", searchController.searchTrips);
router.get("/search-locations-hints", searchController.locationsHints);
router.get("/search-find-routes-hints", searchController.findRoutesHints);

export default router;