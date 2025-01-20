import { GeoJsonLineString, TripTypes, Point } from "../types/api/trips";
import { ErrorWithStatusCode } from "../types/custom/error";
import { clearImages } from "../utils/clearImages";
import db from "../utils/db";
import format from "pg-format";
import TripComment from "./tripComment";
import { SearchTrip } from "../search/searchTrip";
import { AcceptedTripSearchFilters } from "../types/custom/middleware";
import TripPoint from "./tripPoint";

export class Trip {
  id: string | undefined;
  route: GeoJsonLineString;
  color: string;
  public: boolean;
  type: TripTypes;
  name: string;
  description: string;
  tripOwnerId: string;
  ascend: number;
  descend: number;
  distance: number;
  time: number;
  comments: TripComment[] = [];
  points: TripPoint[] = [];
  private _newPoints: Point[] = [];
  private _currentImages: { id: string; name: string }[] = [];
  private _deletedImages: number[] = [];
  private _newImages: { name: string }[] = [];

  private static getImagePathForImageName(name: string): string {
    return `/images/trips/${name}`;
  }

  public get images(): { id?: number; name: string }[] {
    return [...this._currentImages, ...this._newImages];
  }

  public get imagesPaths(): string[] {
    return this.images.map((image) => {
      return Trip.getImagePathForImageName(image.name);
    });
  }

  public setCurrentImages(images: { id: string; name: string }[]): Trip {
    this._currentImages = images;
    return this;
  }

  public setDeletedImages(images: number[]): Trip {
    this._deletedImages = images;
    return this;
  }

  public setNewImages(images: { name: string }[]): Trip {
    this._newImages = images;
    return this;
  }

  public setComments(comments: TripComment[]): Trip {
    this.comments = comments;
    return this;
  }

  public setPoints(points: TripPoint[]): Trip {
    this.points = points;
    return this;
  }

  private imagesToDTO() {
    return this.images.map((image) => {
      return {
        id: image.id,
        name: image.name,
        path: Trip.getImagePathForImageName(image.name),
      };
    });
  }

  public toDTO() {

    return {
      id: this.id,
      route: this.route,
      color: this.color,
      public: this.public,
      type: this.type,
      name: this.name,
      ascend: this.ascend,
      descend: this.descend,
      distance: this.distance,
      time: this.time,
      description: this.description,
      tripOwnerId: this.tripOwnerId,
      images: this.imagesToDTO(),
      comments: this.comments.map((comment) => comment.toDTO()),
      points: this.points.map((point) => point.toDTO() ),
    };
  }

  constructor(data: {
    id?: string;
    route: GeoJsonLineString;
    color: string;
    public: boolean;
    type: TripTypes;
    name: string;
    description: string;
    tripOwnerId: string;
    images?: { name: string }[];
    points?: Point[];
    distance: number;
    ascend: number;
    descend: number;
    time: number;
  }) {
    this.id = data.id;
    this.route = data.route;
    this.color = data.color;
    this.public = data.public;
    this.type = data.type;
    this.name = data.name;
    this.description = data.description;
    this.tripOwnerId = data.tripOwnerId;
    this.distance = data.distance;
    this.ascend = data.ascend;
    this.descend = data.descend;
    this.time = data.time;
    if (data.images) {
      this._newImages = data.images;
    }
    if(data.points) {
      this._newPoints = data.points
    }
  }

  async create() {
   
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const response = await db.query<{ id: number }>(
        "INSERT INTO planned_trips (color, trip_owner_id, public, type, name, description, route, ascend, descend, distance, time) VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromGeoJSON($7), $8, $9, $10, $11) RETURNING id",
        [
          this.color,
          this.tripOwnerId,
          this.public,
          this.type,
          this.name,
          this.description,
          this.route,
          this.ascend,
          this.descend,
          this.distance,
          this.time,
        ]
      );

      if (this.images.length !== 0) {
        const preparedPhotoRows = this.images.map((image) => {
          return [response.rows[0].id, image.name];
        });

        await client.query(
          format(
            "INSERT INTO trip_photos (trip_id, name) VALUES %L",
            preparedPhotoRows
          )
        );
      }
      if(this._newPoints.length !== 0) {
        const tripPoints = this._newPoints.map(point => {
          return new TripPoint({tripId:response.rows[0].id.toString() ,...point})
        })
        await TripPoint.addManyPoints(tripPoints)
      }
      
      return await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      clearImages(true, this.imagesPaths);
      throw error;
    } finally {
      client.release();
    }
  }

  async update() {
    if (!this.id) {
      const error: ErrorWithStatusCode = new Error("Trip id not set");
      error.statusCode = 422;
      throw error;
    }

    let deletedPhotosData: { name: string }[] = [];

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE planned_trips SET color = $1, public = $2, name = $3, description = $4 WHERE id = $5",
        [this.color, this.public, this.name, this.description, this.id]
      );
      if (this._deletedImages.length !== 0) {
        const deleteImagesResult = await client.query<{ name: string }>(
          format(
            "DELETE FROM trip_photos WHERE id IN (%L) and trip_id = $1 RETURNING name",
            this._deletedImages
          ),
          [this.id]
        );
        deletedPhotosData = deleteImagesResult.rows;
      }
      if (this._newImages.length !== 0) {
        const preparedPhotoRows = this._newImages.map((image) => {
          return [this.id, image.name];
        });
        await client.query(
          format(
            "INSERT INTO trip_photos (trip_id, name) VALUES %L",
            preparedPhotoRows
          )
        );
      }
      await client.query("COMMIT");
      await clearImages(
        true,
        deletedPhotosData.map((image) =>
          Trip.getImagePathForImageName(image.name)
        )
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteById(id: string) {
    const client = await db.connect();
    try {
      client.query("BEGIN");
      await client.query("DELETE FROM planned_trips WHERE id = $1", [id]);
      await client.query("DELETE from trip_comments WHERE trip_id = $1", [id]);
      const imagesNames = (
        await client.query<{ name: string }>(
          "Select name from trip_photos where trip_id = $1",
          [id]
        )
      ).rows;
      await client.query("DELETE FROM trip_photos WHERE trip_id = $1", [id]);
      await client.query("COMMIT");
      return await clearImages(
        true,
        imagesNames.map((image) => Trip.getImagePathForImageName(image.name))
      );
    } catch (error) {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<Trip | null> {
    const searchTrip = new SearchTrip();
    searchTrip.id = id;
    const searchTripResponse = await searchTrip.search();
    return searchTripResponse.trips.length === 0 ? null : searchTripResponse.trips[0];
  }

  static async findAllByOwnerId(
    ownerId: string,
    searchParams: AcceptedTripSearchFilters
  ): Promise<{
    pageCount: number;
    trips: Trip[]
  }> {
    const searchTrip = new SearchTrip();
    searchTrip.attributes = searchParams;
    searchTrip.tripOwnerId = ownerId;
    return await searchTrip.search();
  }

  static async checkUserPermission(
    tripId: string,
    userId: string
  ): Promise<boolean> {
    const response = await db.query<{ hasPermission: boolean }>(
      'Select EXISTS (Select 1 from planned_trips where id = $1 and trip_owner_id = $2) as "hasPermission"',
      [tripId, userId]
    );
    return response.rows[0].hasPermission;
  }

  static async getFavouriteTripsByUserId(
    userId: string,
    searchParams: AcceptedTripSearchFilters
  ) {
    const searchTrip = new SearchTrip();
    searchTrip.favoutitesOfUserId = userId;
    searchTrip.attributes = searchParams;
    return await searchTrip.search();
  }
}
