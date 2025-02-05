import format, { string } from "pg-format";
import db from "../utils/db";

class TripComment {
  id?: string;
  tripId: string;
  userId: string;
  userName?: string;
  content: string;
  dateAdd?: string;
  private static _selectTripQueryBase =
    'Select trip_comments.id, user_id as "userId", trip_id as "tripId", date_add as "dateAdd", content, username as "userName" from trip_comments join users on trip_comments.user_id = users.id';

  constructor(data: {
    tripId: string;
    userId: string;
    content: string;
    id?: string;
    dateAdd?: string;
    userName?: string;
  }) {
    this.tripId = data.tripId;
    this.userId = data.userId;
    this.content = data.content;
    if (data.id) this.id = data.id;
    if (data.dateAdd) this.dateAdd = data.dateAdd;
    if (data.userName) this.userName = data.userName;
  }

  toDTO() {
    return {
      id: this.id,
      tripId: this.tripId,
      userId: this.userId,
      content: this.content,
      dateAdd: this.dateAdd,
      userName: this.userName,
    };
  }

  async create() {
    const commentResponse = await db.query<{
      id: number;
      dateAdd: string;
      userName: string;
    }>(
      'Insert into trip_comments (trip_id, user_id, content, date_add) values ($1, $2, $3, NOW()::TIMESTAMP) RETURNING id, date_add as "dateAdd", (Select username from users where id = $2) as "userName"',
      [this.tripId, this.userId, this.content]
    );
    this.id = commentResponse.rows[0].id.toString();
    this.dateAdd = commentResponse.rows[0].dateAdd;
    this.userName = commentResponse.rows[0].userName;
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
    await db.query<{id?: number}>(
      "Delete from trip_comments where id = $1",
      [this.id]
    );
    return this.id;
  }

  static async findAllByTripsIds(tripsIds: string[]): Promise<TripComment[]> {
    const comments = (
      await db.query<{
        id: string;
        userId: string;
        tripId: string;
        dateAdd: string;
        content: string;
        userName: string;
      }>(
        format(
          `${TripComment._selectTripQueryBase} where trip_id in (%L)`,
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
      userName: string;
    }>(`${TripComment._selectTripQueryBase} where trip_comments.id = $1`, [
      commentId,
    ]);
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
        userName: string;
      }>(`${TripComment._selectTripQueryBase} where trip_id = $1`, [tripId])
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
