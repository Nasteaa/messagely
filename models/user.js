"use strict";

/** User of the site. */

const db = require("../db");
const { NotFoundError } = require("../expressError");
const bcrypt = require("bcrypt");


const { BCRYPT_WORK_FACTOR } = require("../config");


class User {

  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users (username, password, first_name,
        last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );

    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users
      WHERE username = $1`,
      [username]
    );
    if (!result.rows.length) return false;
    const hashedPassword = result.rows[0].password;
    return await bcrypt.compare(password, hashedPassword);
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE username = $1
      RETURNING username`,
      [username]
    );
    if (!result.rows.length) throw new NotFoundError(`User cannot be found: ${username}`);
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name FROM users`
    );

    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
        FROM users
        WHERE username = $1`,
      [username]
    );
    if (!result.rows.length) throw new NotFoundError(`User cannot be found: ${username}`);
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `SELECT m.id, m.to_username AS to_user, m.body, m.sent_at, m.read_at,
      u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.to_username = u.username
      WHERE m.from_username = $1`,
      [username]
    );
    if (!result.rows.length) throw new NotFoundError(`User cannot be found: ${username}`);
    const messageList = result.rows;


    return messageList.map(message => {
      return {
        id: message.id,
        to_user: {
          username: message.to_user,
          first_name: message.first_name,
          last_name: message.last_name,
          phone: message.phone
        },
        body: message.body,
        sent_at: message.sent_at,
        read_at: message.read_at,
      }
    });
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT m.id, m.from_username AS from_user, m.body, m.sent_at, m.read_at,
      u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.from_username = u.username
      WHERE m.to_username = $1`,
      [username]
    );
    if (!result.rows.length) throw new NotFoundError(`User cannot be found: ${username}`);
    const messageList = result.rows;

    return messageList.map(message => {
      return {
        id: message.id,
        from_user: {
          username: message.from_user,
          first_name: message.first_name,
          last_name: message.last_name,
          phone: message.phone
        },
        body: message.body,
        sent_at: message.sent_at,
        read_at: message.read_at,
      }
    });
  }
}


module.exports = User;
