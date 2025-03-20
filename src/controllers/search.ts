import { NextFunction, Request, Response } from "express";
import { SearchTrip } from "../search/searchTrip";
import { RequestWithFilterSearchParams, RequestWithFilterSearchParamsAndOptionalLoggedUser } from "../types/custom/middleware";
import { PlaceHint } from "../models/placeHint";
import { FindRouteHint } from "../models/findRouteHint";
import { ErrorWithStatusCode } from "../types/custom/error";

export const searchTrips = (
  req: RequestWithFilterSearchParamsAndOptionalLoggedUser,
  res: Response,
  next: NextFunction
) => {
  const searchTrip = new SearchTrip();
  searchTrip.public = true;
  searchTrip.userId = req.userId;
  searchTrip.id = req.query.id;
  searchTrip.withComments = false;
  searchTrip.attributes = req.query;
  searchTrip.radius = req.query.radius;
  searchTrip.point = req.query.point;
  searchTrip.query = req.query.query;
  searchTrip.page = req.query.page;
  searchTrip.polygonToIntersectId = req.query.polygonToIntersectId;

  searchTrip
    .search()
    .then((searchTripResponse) => {
      res.status(200).json({
        pageCount: searchTripResponse.pageCount,
        trips: searchTripResponse.trips.map((trip) => trip.toDTO()),
      });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const locationsHints = (
  req: Request<any, any, any, { query?: string }>,
  res: Response,
  next: NextFunction
) => {
  const query = req.query.query || "";
  if (query?.length < 3) {
    return res.status(200).json([]);
  }
  PlaceHint.getPlaceHintsByQuery(query)
    .then((result) => {
      res.status(200).json(result.map((place) => place.toDTO()));
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const findRoutesHints = (
  req: Request<any, any, any, any, { query: string }>,
  res: Response,
  next: NextFunction
) => {
  const query = req.query.query || "";
  if (query?.length < 3) {
    return res.status(200).json([]);
  }
  FindRouteHint.getFindRouteHintsByQuery(query)
    .then((hints) => {
      res.status(200).json(
        hints.map((hint) => {
          return hint.toDTO();
        })
      );
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const findRouteHintByIdAndType = (
  req: Request<{ id: string; type: "place" | "polygon" }>,
  res: Response,
  next: NextFunction
) => {
  if (!req.params.id || !req.params.type) {
    const error: ErrorWithStatusCode = new Error("Missing body values");
    error.statusCode = 422;
    throw error;
  }
  if (req.params.type !== "place" && req.params.type !== "polygon") {
    const error: ErrorWithStatusCode = new Error("Invalid type");
    error.statusCode = 400;
    throw error;
  }

  FindRouteHint.getFindRouteHintByIdAndType(req.params.id, req.params.type).then((hint)=>{
    if(hint === null){
      const error: ErrorWithStatusCode = new Error("Hint not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(hint.toDTO());
  }).catch((error) => {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  })
};
