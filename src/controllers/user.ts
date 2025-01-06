import { NextFunction, Response } from "express";
import { RequestWithLoggedUser } from "../types/custom/middleware";
import User from "../models/user";

export const toggleFavouriteTrip = (
  req: RequestWithLoggedUser<any, { id: string }>,
  res: Response,
  next: NextFunction
) => {
  const tripId = req.params.id;
  const userId = req.userId;

  User.toggleTripInUsersFavourite(userId, tripId)
    .then((isAdded) => {
      res
        .status(200)
        .json({
          message: isAdded
            ? "Trip added to favourites"
            : "Trip removed from favourites",
        });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};
