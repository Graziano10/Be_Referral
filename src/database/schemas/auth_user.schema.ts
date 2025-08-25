import { Schema } from "mongoose";
import { TAuth_userSchema } from "../types";

export const Auth_userSchema = new Schema<TAuth_userSchema>(
  {
    id: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    last_login: {
      type: Date,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    first_name: {
      type: String,
      default: "",
    },
    last_name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_staff: {
      type: Boolean,
      default: false,
    },
    date_joined: {
      type: Date,
      required: true,
    },
  },
  { collection: "auth_user" }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthUser:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 123
 *         password:
 *           type: string
 *           format: password
 *           example: "$2b$10$kqZK..."
 *         last_login:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2024-12-01T14:30:00Z"
 *         username:
 *           type: string
 *           example: "mario.rossi"
 *         first_name:
 *           type: string
 *           example: "Mario"
 *         last_name:
 *           type: string
 *           example: "Rossi"
 *         email:
 *           type: string
 *           format: email
 *           example: "mario.rossi@email.com"
 *         is_active:
 *           type: boolean
 *           default: true
 *         is_staff:
 *           type: boolean
 *           default: false
 *         date_joined:
 *           type: string
 *           format: date-time
 *           example: "2024-06-15T10:00:00Z"
 */
