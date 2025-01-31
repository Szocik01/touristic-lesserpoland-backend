import format from "pg-format";
import { Trip } from "../models/trip";
import {
  GeoJsonLineString,
  GeoJsonPoint,
  LatLng,
  TripTypes,
} from "../types/api/trips";
import db from "../utils/db";
import { escapeLiteral, escapeIdentifier } from "pg";
import TripComment from "../models/tripComment";
import TripPoint from "../models/tripPoint";

export class SearchTrip {
  id: string;
  tripOwnerId: string;
  public: boolean = true;
  favoutitesOfUserId: string = "";
  limit: number = 12;
  withComments: boolean = true;
  withPoints: boolean = true;
  polygonToIntersectId: string;

  private _page: number = 1;
  private _point: GeoJsonPoint;
  private _radius: number = 5;
  private _sortBy: string = "";
  private _sortOrder: "asc" | "desc" = "asc";
  private _exactAttributes: { [key: string]: string } = {};
  private _likeAttributes: { [key: string]: string } = {};

  private supportedSearchAttributesMap = {
    exact: ["color", "type"],
    like: ["name", "description"],
  };

  public set page(value: string) {
    const parsedValue = parseInt(value);
    this._page = isNaN(parsedValue) ? 1 : parsedValue;
  }

  public set radius(value: string) {
    const radius = parseFloat(value);
    if (isNaN(radius)) return;
    this._radius = radius;
  }

  public set query(value: string) {
    if (!value) return;
    this._likeAttributes["name"] = value;
    this._likeAttributes["description"] = value;
  }

  public set point(value: string) {
    const regexValidationResult = value?.match(
      /^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)$/
    );
    if (!regexValidationResult) {
      return;
    }
    const point: LatLng = [
      parseFloat(regexValidationResult[1]),
      parseFloat(regexValidationResult[3]),
    ];
    this._point = {
      type: "Point",
      coordinates: point,
    };
  }

  public set attributes(value: { [key: string]: string }) {
    const filteredExactAttributes: { [key: string]: string } = {};
    for (const supportedExactAttribute of this.supportedSearchAttributesMap[
      "exact"
    ]) {
      if (value[supportedExactAttribute]) {
        filteredExactAttributes[supportedExactAttribute] =
          value[supportedExactAttribute];
      }
    }
    for (const supportedLikeAttribute of this.supportedSearchAttributesMap[
      "like"
    ]) {
      if (value[supportedLikeAttribute]) {
        this._likeAttributes[supportedLikeAttribute] =
          value[supportedLikeAttribute];
      }
    }
    this._exactAttributes = filteredExactAttributes;
    this._likeAttributes = this._likeAttributes;
  }

  public set sort(value: string) {
    const sortParams = value.split(".");
    if (sortParams[0]) {
      this._sortBy = sortParams[0];
    }
    if (sortParams[1] && sortParams[1] === "desc") {
      this._sortOrder = "desc";
    }
  }

  private processFilterAttributes(
    whereAndConditions: string[],
    whereOrConditions: string[]
  ) {
    if (this.id) {
      whereAndConditions.push(`id = ${escapeLiteral(this.id)}`);
    }
    if (this.tripOwnerId) {
      whereAndConditions.push(
        `trip_owner_id = ${escapeLiteral(this.tripOwnerId)}`
      );
    }
    if (this.public) {
      whereAndConditions.push(
        `public = ${escapeLiteral(this.public ? "true" : "false")}`
      );
    }
    if (this.favoutitesOfUserId) {
      whereAndConditions.push(
        `user_favourites.user_id = ${escapeLiteral(this.favoutitesOfUserId)}`
      );
    }
    for (const key in this._exactAttributes) {
      whereAndConditions.push(
        `${key} = ${escapeLiteral(this._exactAttributes[key])}`
      );
    }
    for (const key in this._likeAttributes) {
      whereOrConditions.push(
        `${key} like ${escapeLiteral(`%${this._likeAttributes[key]}%`)}`
      );
    }
  }

  private processGeoJsonAttributes(whereConditions: string[]) {
    if (this._point) {
      whereConditions.push(
        `ST_DWithin(route, ST_GeomFromGeoJSON('${JSON.stringify(
          this._point
        )}'), ${this._radius})`
      );
    }
    if (this.polygonToIntersectId) {
      whereConditions.push(
        `ST_Intersects(route, (select ST_Transform(way,4326) from planet_osm_polygon where osm_id = ${escapeLiteral(
          this.polygonToIntersectId
        )}))`
      );
    }
  }

  private procesPaginationAttributes(paginationParams: string[]) {
    if (this._sortBy) {
      paginationParams.push(
        `order by ${escapeIdentifier(this._sortBy)} ${this._sortOrder}`
      );
    }
    if (this.limit) {
      paginationParams.push(`limit ${this.limit}`);
    }
    if (this._page) {
      paginationParams.push(`offset ${(this._page - 1) * this.limit}`);
    }
  }

  private processTableJoins(tableJoins: string[]) {
    if (this.favoutitesOfUserId) {
      tableJoins.push(
        `join user_favourites on user_favourites.trip_id = planned_trips.id`
      );
    }
  }

  private processSearchQuery(): {query: string, pageCountQuery: string} {
    const whereAndConditions: string[] = [];
    const whereOrConditions: string[] = [];
    const paginationParams: string[] = [];
    const tableJoins: string[] = [];

    let query =
      'Select planned_trips.id, color, trip_owner_id as "tripOwnerId", public, type, name, description, ST_AsGeoJSON(ST_Transform(route,4326)) as route, distance, ascend, descend, time from planned_trips';
    let pageCountQuery = "SELECT COUNT(id) FROM planned_trips";
    if (
      this.id ||
      this.tripOwnerId ||
      this.favoutitesOfUserId ||
      this._point ||
      this.polygonToIntersectId ||
      Object.keys(this._exactAttributes).length > 0 ||
      Object.keys(this._likeAttributes).length > 0
    ) {
      this.processTableJoins(tableJoins);
      this.processFilterAttributes(whereAndConditions, whereOrConditions);
      this.processGeoJsonAttributes(whereAndConditions);
      if (tableJoins.length > 0) {
        query += " " + tableJoins.join(" ");
        pageCountQuery += " " + tableJoins.join(" ");
      }
      if (whereAndConditions.length > 0 || whereOrConditions.length > 0) {
        query += " where";
        pageCountQuery += " where";
        query += " " + whereAndConditions.join(" and ");
        pageCountQuery += " " + whereAndConditions.join(" and ");
        query +=
          whereAndConditions.length > 0 && whereOrConditions.length > 0
            ? " and (" + whereOrConditions.join(" or ") + ")"
            : " " + whereOrConditions.join(" or ");
        pageCountQuery +=
          whereAndConditions.length > 0 && whereOrConditions.length > 0
            ? " and (" + whereOrConditions.join(" or ") + ")"
            : " " + whereOrConditions.join(" or ");
      }
    }
    this.procesPaginationAttributes(paginationParams);
    if (paginationParams.length > 0) {
      query += " " + paginationParams.join(" ");
    }
    return {query, pageCountQuery};
  }

  async search(): Promise<{
    pageCount: number;
    trips: Trip[];
  }> {
    const processedQueries = this.processSearchQuery();
    try {
      const tripResult = await db.query<{
        id: string;
        color: string;
        tripOwnerId: string;
        public: boolean;
        type: TripTypes;
        name: string;
        description: string;
        route: GeoJsonLineString;
        distance: number;
        ascend: number;
        descend: number;
        time: number;
      }>(processedQueries.query);
      const trips = tripResult.rows;
      if (trips.length === 0) {
        return { trips: [], pageCount: 0 };
      }
      const tripsIds = trips.map((trip) => trip.id);
      const imagesResponse = await db.query<{
        name: string;
        id: string;
        tripId: string;
      }>(
        format(
          'SELECT id, trip_id as "tripId" ,name FROM trip_photos WHERE trip_id IN (%L)',
          tripsIds
        )
      );
      const images = imagesResponse.rows;
      const points = this.withPoints
        ? await TripPoint.findAllByTripsIds(tripsIds)
        : [];
      const comments = this.withComments
        ? await TripComment.findAllByTripsIds(tripsIds)
        : [];
      const itemsCount = (await db.query<{ count: number }>(processedQueries.pageCountQuery)).rows[0].count;

      return {
        pageCount: Math.ceil(itemsCount / this.limit),
        trips: trips.map((trip) => {
          return new Trip(trip)
            .setCurrentImages(
              images.filter((image) => image.tripId === trip.id)
            )
            .setComments(
              comments.filter((comment) => comment.tripId === trip.id)
            )
            .setPoints(points.filter((point) => point.tripId === trip.id));
        }),
      };
    } catch (error) {
      console.log(error);
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }
}
