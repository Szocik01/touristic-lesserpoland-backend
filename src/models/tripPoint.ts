import db from "../utils/db";
import { GeoJsonPoint, LatLng } from "../types/api/trips";
import format from "pg-format";

class TripPoint {
  id?: string;
  osmPointId?: number;
  tripId: string;
  name?: string;
  private _coordinates?: string;
  order: number;

  public get jsonCoordinates(): string | null {
    if (!this._coordinates) {
      return null;
    }
    if (this.osmPointId == null) {
      return `{"type":"Point","coordinates":[${this._coordinates}]}`;
    }
    return this._coordinates;
  }

  public get coordinates(): GeoJsonPoint | null {
    if (!this.jsonCoordinates) {
      return null;
    }
    try {
      return JSON.parse(this.jsonCoordinates);
    } catch (error) {
      return null;
    }
  }

  public set coordinates(value: LatLng | undefined) {
    if (!value) {
      this._coordinates = null;
      return;
    }
    this._coordinates = value.join(",");
  }
  constructor(data: {
    id?: string;
    osmPointId?: number;
    tripId: string;
    coordinates?: LatLng;
    order: number;
    name?: string;
  }) {
    this.id = data.id;
    this.osmPointId = data.osmPointId;
    this.tripId = data.tripId;
    this.coordinates = data.coordinates;
    this.order = data.order;
    this.name = data.name;
  }

  toDTO() {
    return {
      id: this.id,
      name: this.name,
      osmPointId: this.osmPointId,
      tripId: this.tripId,
      coordinates: this.jsonCoordinates,
      order: this.order,
    };
  }

  async create() {
    await db.query(
      'Insert into trip_points (osm_point_id, trip_id, custom_coordinates, "order") values ($1, $2, $3, $4)',
      [this.osmPointId, this.tripId, this._coordinates, this.order]
    );
  }

  async update() {
    if (!this.id) {
      throw new Error("Cannot update point that was not created");
    }
    await db.query(
      'Update trip_points set osm_point_id = $1, custom_coordinates = $2, "order" = $3 where id = $4',
      [this.osmPointId, this._coordinates, this.order, this.id]
    );
  }

  async delete() {
    if (!this.id) {
      throw new Error("Cannot delete point that was not created");
    }
    await db.query("Delete from trip_points where id = $1", [this.id]);
  }

  static async addManyPoints(points: TripPoint[]): Promise<void> {
    const values = points.map((point) => [
      point.osmPointId,
      point.tripId,
      point._coordinates,
      point.order,
    ]);
    await db.query(
      format(
        'Insert into trip_points (osm_point_id, trip_id, custom_coordinates, "order") values %L',
        values
      )
    );
  }

  static async findAllByTripsIds(ids: string[]): Promise<TripPoint[]> {
    const points = (
      await db.query<{
        id: string;
        name?: string;
        osmPointId: number;
        tripId: string;
        coordinates: string;
        order: number;
      }>(
        format(
          'Select id, pop.name ,osm_point_id as "osmPointId", trip_id as "tripId", CASE WHEN tp.osm_point_id is not null THEN ST_AsGeoJSON(ST_Transform(pop.way,4326)) ELSE tp.custom_coordinates END as coordinates, "order" from trip_points tp left join public.planet_osm_point pop on pop.osm_id = tp.osm_point_id where trip_id in (%L) order by "order"',
          ids
        )
      )
    ).rows;
    if (points.length === 0) {
      return [];
    }
    return points.map((point) => {
      const { coordinates, ...rest } = point;
      const tripPoint = new TripPoint(rest);
      tripPoint._coordinates = coordinates;
      return tripPoint;
    });
  }

  static async findAllByTripId(id: string): Promise<TripPoint[]> {
    const points = (
      await db.query<{
        id: string;
        osmPointId: number;
        tripId: string;
        name?: string;
        coordinates: string;
        order: number;
      }>(
        'Select id, pop.name ,osm_point_id as "osmPointId", trip_id as "tripId", CASE WHEN tp.osm_point_id is not null THEN ST_AsGeoJSON(ST_Transform(pop.way,4326)) ELSE tp.custom_coordinates END as coordinates, "order" from trip_points tp left join public.planet_osm_point pop on pop.osm_id = tp.osm_point_id where trip_id = $1 order by "order"',
        [id]
      )
    ).rows;
    if (points.length === 0) {
      return [];
    }
    return points.map((point) => {
      const { coordinates, ...rest } = point;
      const tripPoint = new TripPoint(rest);
      tripPoint._coordinates = coordinates;
      return tripPoint;
    });
  }

  static async findById(id: string): Promise<TripPoint | null> {
    const point = (
      await db.query<{
        id: string;
        osmPointId: number;
        tripId: string;
        name?: string;
        coordinates: string;
        order: number;
      }>(
        'Select id, pop.name ,osm_point_id as "osmPointId", trip_id as "tripId", CASE WHEN tp.osm_point_id is not null THEN ST_AsGeoJSON(ST_Transform(pop.way,4326)) ELSE tp.custom_coordinates END as coordinates, "order" from trip_points tp left join public.planet_osm_point pop on pop.osm_id = tp.osm_point_id where id = $1',
        [id]
      )
    ).rows[0];
    if (!point) {
      return null;
    }
    const { coordinates, ...rest } = point;
    const tripPoint = new TripPoint(rest);
    tripPoint._coordinates = coordinates;
    return tripPoint;
  }
}

export default TripPoint;
