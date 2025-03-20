import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import { graphhopperApiSecretKey } from "../utils/constants";
import {
  AddTripBody,
  AddTripCommentBody,
  EditTripBody,
  EditTripCommentBody,
  FindRouteBody,
  GraphHopperApiErrorResponse,
  GraphHopperApiSuccessResponse,
  Point,
} from "../types/api/trips";
import { ErrorWithStatusCode } from "../types/custom/error";
import {
  RequestWithFilterSearchParamsAndLoggedUser,
  RequestWithFilterSearchParamsAndOptionalLoggedUser,
  RequestWithLoggedUser,
  RequestWithOptionalLoggedUser,
} from "../types/custom/middleware";
import { Trip } from "../models/trip";
import TripComment from "../models/tripComment";
import { SearchTrip } from "../search/searchTrip";
import { TripWeather } from "../models/tripWeather";

export const findRoute = (
  req: Request<{}, {}, FindRouteBody>,
  res: Response,
  next: NextFunction
) => {
  fetch(`https://graphhopper.com/api/1/route?key=${graphhopperApiSecretKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      points_encoded: false,
      instructions: false,
      details: ["leg_distance", "leg_time"],
      ...req.body,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response
          .json()
          .then((errorResponse: GraphHopperApiErrorResponse) => {
            const error: ErrorWithStatusCode = new Error();
            error.statusCode = response.status;
            error.message = errorResponse.message;
            console.log(errorResponse);
            throw error;
          });
      }
      return response.json();
    })
    .then((data: { paths: GraphHopperApiSuccessResponse[] }) => {
      res.json(data.paths.length > 0 ? data.paths[0] : {});
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const getTrip = (
  req: Request<{ id: string }, {}, {}, { userId?: string }>,
  res: Response,
  next: NextFunction
) => {
  const id = req.params.id;
  const userId = req.query.userId;
  Trip.findById(id, userId)
    .then((trip) => {
      if (!trip) {
        const error: ErrorWithStatusCode = new Error("Trip not found");
        error.statusCode = 404;
        throw error;
      }
      if (!trip.public && trip.tripOwnerId != userId) {
        const error: ErrorWithStatusCode = new Error("Access to trip denied");
        error.statusCode = 403;
        throw error;
      }
      res.status(200).json(trip.toDTO());
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const addTrip = (
  req: RequestWithLoggedUser<AddTripBody>,
  res: Response,
  next: NextFunction
) => {
  const {
    route,
    color,
    isPublic,
    type,
    name,
    description,
    points,
    ascend,
    descend,
    distance,
    time,
  } = req.body;

  const userId = req.userId;

  if (
    !route ||
    !color ||
    !isPublic ||
    !type ||
    !name ||
    !description ||
    !points ||
    !ascend ||
    !descend ||
    !distance ||
    !time
  ) {
    const error: ErrorWithStatusCode = new Error("Missing required fields");
    error.statusCode = 400;
    throw error;
  }

  if (points.length < 2) {
    const error: ErrorWithStatusCode = new Error(
      "At least 2 points are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const fileNames = (req.files as Express.Multer.File[]).map((file) => {
    return { name: file.filename };
  });

  let parsedPoints: Point[] = [];
  try {
    parsedPoints = JSON.parse(points);
  } catch (error) {
    const parseError: ErrorWithStatusCode = new Error("Invalid points format");
    parseError.statusCode = 400;
    throw parseError;
  }

  const trip = new Trip({
    route,
    color,
    public: isPublic,
    type,
    name,
    description,
    tripOwnerId: userId,
    images: fileNames,
    points: parsedPoints,
    ascend,
    descend,
    distance,
    time,
  });

  trip
    .create()
    .then(() => {
      res.status(201).json({ message: "Trip added successfully" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const editTrip = (
  req: RequestWithLoggedUser<EditTripBody>,
  res: Response,
  next: NextFunction
) => {
  const { id, color, isPublic, name, description, deletedImagesIds } = req.body;
  const userId = req.userId;

  if (!id) {
    const error: ErrorWithStatusCode = new Error("Missing id");
    error.statusCode = 400;
    throw error;
  }

  Trip.findById(id)
    .then((trip) => {
      if (trip.tripOwnerId != userId) {
        const error: ErrorWithStatusCode = new Error("Access to trip denied");
        error.statusCode = 403;
        throw error;
      }
      if (color) trip.color = color;
      if (isPublic) trip.public = isPublic;
      if (name) trip.name = name;
      if (description) trip.description = description;
      if (deletedImagesIds) trip.setDeletedImages(deletedImagesIds);
      const fileNames = (req.files as Express.Multer.File[]).map((file) => {
        return { name: file.filename };
      });
      trip.setNewImages(fileNames);
      return trip.update();
    })
    .then(() => {
      res.status(200).json({ message: "Trip updated successfully" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const deleteTrip = (
  req: RequestWithLoggedUser<any, { id: string }>,
  res: Response,
  next: NextFunction
) => {
  const id = req.params.id;
  const userId = req.userId;
  Trip.checkUserPermission(id, userId)
    .then((hasPermission) => {
      if (!hasPermission) {
        const error: ErrorWithStatusCode = new Error("Access to trip denied");
        error.statusCode = 403;
        throw error;
      }
      return Trip.deleteById(id);
    })
    .then(() => {
      res.status(200).json({ message: "Trip deleted successfully" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const getUserFavoriteTrips = (
  req: RequestWithFilterSearchParamsAndLoggedUser,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const searchParams = req.query;
  Trip.getFavouriteTripsByUserId(userId, searchParams, userId)
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

export const addTripComment = (
  req: RequestWithLoggedUser<AddTripCommentBody>,
  res: Response,
  next: NextFunction
) => {
  const { content, tripId } = req.body;
  const userId = req.userId;

  if (!tripId || !content) {
    const error: ErrorWithStatusCode = new Error(
      "Missing comment content content"
    );
    error.statusCode = 422;
    throw error;
  }

  const comment = new TripComment({ tripId, userId, content });
  comment
    .create()
    .then(() => {
      res.status(201).json(comment.toDTO());
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const editTripComment = (
  req: RequestWithLoggedUser<EditTripCommentBody>,
  res: Response,
  next: NextFunction
) => {
  const { commentId, content } = req.body;
  const userId = req.userId;

  if (!commentId || !content) {
    const error: ErrorWithStatusCode = new Error("Missing required fields");
    error.statusCode = 422;
    throw error;
  }

  TripComment.findById(commentId)
    .then((comment) => {
      if (comment.userId != userId) {
        const error: ErrorWithStatusCode = new Error(
          "Access to comment denied"
        );
        error.statusCode = 403;
        throw error;
      }
      comment.content = content;
      return comment.update().then(() => {
        res.status(200).json(comment.toDTO());
      });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const deleteTripComment = (
  req: RequestWithLoggedUser<any, { id: string }>,
  res: Response,
  next: NextFunction
) => {
  const commentId = req.params.id;
  const userId = req.userId;
  TripComment.findById(commentId)
    .then((comment) => {
      if (comment.userId != userId) {
        const error: ErrorWithStatusCode = new Error(
          "Access to comment denied"
        );
        error.statusCode = 403;
        throw error;
      }
      return comment.delete();
    })
    .then((id) => {
      res.status(200).json({ id: id });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

export const getLoggedUserTrips = (
  req: RequestWithFilterSearchParamsAndLoggedUser,
  res: Response,
  next: NextFunction
) => {

  const userId = req.userId;
  const searchTrip = new SearchTrip();
  searchTrip.userId = userId;
  searchTrip.tripOwnerId = userId;
  searchTrip.withPoints = true;
  searchTrip.withComments = false;
  searchTrip.attributes = req.query;
  searchTrip.radius = req.query.radius;
  searchTrip.point = req.query.point;
  searchTrip.query = req.query.query;
  searchTrip.page = req.query.page;
  searchTrip.polygonToIntersectId = req.query.polygonToIntersectId;

  searchTrip.search().then((searchTripData) => {
    res.status(200).json({
      pageCount: searchTripData.pageCount,
      trips: searchTripData.trips.map((trip) => trip.toDTO()),
    });
  }).catch((error) => {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  })


};
