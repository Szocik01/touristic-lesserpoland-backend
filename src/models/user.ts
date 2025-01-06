import db from "../utils/db";

export default class User {
  email: string;
  hashedPassword: string;
  userName: string;

  constructor(email: string, userName: string, hashedPassword: string) {
    this.email = email;
    this.hashedPassword = hashedPassword;
    this.userName = userName;
  }

  addUser() {
    return db.query(
      "Insert into users (email, username ,password) values ($1, $2, $3)",
      [this.email, this.userName, this.hashedPassword]
    );
  }

  static getUserByEmail(email: string) {
    return db.query(
      "select users.id, email, password, username from users where email = $1",
      [email]
    );
  }

  static async toggleTripInUsersFavourite(userId: string, tripId: string) {
    const isAddedResult = await db.query<{ isAdded: boolean }>(
      'Select EXISTS (SELECT 1 FROM public.user_favourites WHERE user_id = $1 AND trip_id = $2) as "isAdded"',
      [userId, tripId]
    );
    const isAdded = isAddedResult.rows[0].isAdded;
    if (!isAdded) {
      await db.query<{ isAdded: boolean }>(
        "INSERT INTO user_favourites (user_id, trip_id) VALUES ($1, $2)",
        [userId, tripId]
      );
      return true;
    } else {
      await db.query<{ isAdded: boolean }>(
        "DELETE FROM user_favourites WHERE user_id = $1 AND trip_id = $2",
        [userId, tripId]
      );
      return false;
    }
  }

}
