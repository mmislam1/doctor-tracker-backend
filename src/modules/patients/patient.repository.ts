import { database } from "../../config/database.js";
import type { ObjectId } from "mongodb";

export interface Patient {
  _id: ObjectId;
  name: string;
  condition: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const patients = database.collection<Patient>("patients");
