import { NextFunction, Request, Response } from "express";
import { SearchTrip } from "../search/searchTrip";
import { RequestWithFilterSearchParams } from "../types/custom/middleware";
import { PlaceHint } from "../models/placeHint";
import { FindRouteHint } from "../models/findRouteHint";

export const searchTrips = (
  req: RequestWithFilterSearchParams,
  res: Response,
  next: NextFunction
) => {
  const searchTrip = new SearchTrip();
  searchTrip.id = req.query.id;
  searchTrip.withComments = false;
  searchTrip.withPoints = false;
  searchTrip.attributes = req.query;
  searchTrip.radius = req.query.radius;
  searchTrip.point = req.query.point;
  searchTrip.query = req.query.query;
  searchTrip.page = req.query.page;
  searchTrip.polygonToIntersectId = req.query.polygonToIntersectId;
  // tutaj dodać poligony i punkty do obiektu zwracanego, oraz radius tak żeby móc go potem ustawić na froncie tak by wszystko było spójne, choćby domyślny radius.
  searchTrip
    .search()
    .then((searchTripResponse) => {
      res
        .status(200)
        .json({
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
