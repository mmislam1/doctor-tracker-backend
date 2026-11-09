import { MongoClient, type Db } from "mongodb";
import { env } from "./env.js";

export const mongoClient = new MongoClient(env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10_000,
});

export const database: Db = mongoClient.db(env.MONGODB_DB_NAME);

export async function connectDatabase(): Promise<void> {
  await mongoClient.connect();
  await Promise.all([
    database.collection("doctors").createIndex({ createdAt: -1, _id: -1 }),
    database.collection("doctors").createIndex({ specialization: 1, createdAt: -1, _id: -1 }),
    database.collection("doctors").createIndex({ hospital: 1, createdAt: -1, _id: -1 }),
    database.collection("doctors").createIndex({ email: 1 }, { unique: true, name: "doctor_email_unique" }),
    database.collection("doctors").createIndex({ name: "text", email: "text" }, { name: "doctor_search_text" }),
    database.collection("patients").createIndex({ doctorId: 1, createdAt: -1, _id: -1 }),
    database.collection("patients").createIndex({ condition: 1, createdAt: -1, _id: -1 }),
    database.collection("patients").createIndex({ createdAt: -1, _id: -1 }),
    database.collection("patients").createIndex({ name: "text", condition: "text" }, { name: "patient_search_text" }),
  ]);
}

export async function closeDatabase(): Promise<void> {
  await mongoClient.close();
}
