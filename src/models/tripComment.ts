import format, { string } from "pg-format";
import db from "../utils/db";

class TripComment {
  id?: string;
  tripId: string;
  userId: string;
  content: string;
  dateAdd?: string;

  constructor(data: {
    tripId: string;
    userId: string;
    content: string;
    id?: string;
    dateAdd?: string;
  }) {
    this.tripId = data.tripId;
    this.userId = data.userId;
    this.content = data.content;
    if (data.id) this.id = data.id;
    if (data.dateAdd) this.dateAdd = data.dateAdd;
  }

  toDTO() {
    return {
      id: this.id,
      tripId: this.tripId,
      userId: this.userId,
      content: this.content,
      dateAdd: this.dateAdd,
    };
  }

  async create() {
    await db.query(
      "Insert into trip_comments (trip_id, user_id, content, date_add) values ($1, $2, $3, NOW()::TIMESTAMP)",
      [this.tripId, this.userId, this.content]
    );
  }

  async update() {
    if (!this.id) {
      throw new Error("Cannot update comment that was not created");
    }
    await db.query("Update trip_comments set content = $1 where id = $2", [
      this.content,
      this.id,
    ]);
  }

  async delete() {
    if (!this.id) {
      throw new Error("Cannot delete comment that was not created");
    }
    await db.query("Delete from trip_comments where id = $1", [this.id]);
  }

  static async findAllByTripsIds(tripsIds: string[]): Promise<TripComment[]> {
    const comments = (
      await db.query<{
        id: string;
        userId: string;
        tripId: string;
        dateAdd: string;
        content: string;
      }>(
        format(
          "Select id, user_id as \"userId\", trip_id as \"tripId\", date_add as \"dateAdd\", content from trip_comments where trip_id in (%L)",
          tripsIds
        )
      )
    ).rows;
    if (comments.length === 0) {
      return [];
    }
    return comments.map((comment) => {
      return new TripComment(comment);
    });
  }

  static async findById(commentId: string): Promise<TripComment | null> {
    const commentResponse = await db.query<{
      id: string;
      userId: string;
      tripId: string;
      dateAdd: string;
      content: string;
    }>(
      "Select id, user_id as \"userId\", trip_id as \"tripId\", date_add as \"dateAdd\", content from trip_comments where id = $1",
      [commentId]
    );
    if (commentResponse.rowCount === 0) {
      return null;
    }
    return new TripComment(commentResponse.rows[0]);
  }

  static async findAllByTripId(tripId: number): Promise<TripComment[]> {
    const comments = (
      await db.query<{
        id: string;
        userId: string;
        tripId: string;
        dateAdd: string;
        content: string;
      }>(
        "Select id, user_id as userId, trip_id as tripId, date_add as dateAdd, content from trip_comments where trip_id = $1",
        [tripId]
      )
    ).rows;
    if (comments.length === 0) {
      return [];
    }
    return comments.map((comment) => {
      return new TripComment(comment);
    });
  }
}

export default TripComment;
