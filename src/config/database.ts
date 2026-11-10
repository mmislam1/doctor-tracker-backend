import { MongoClient, ObjectId, type Db, type Document } from "mongodb";
import { env } from "./env.js";

export const mongoClient = new MongoClient(env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10_000,
});

export const database: Db = mongoClient.db(env.MONGODB_DB_NAME);

async function migrateLegacyPatientAssociations(): Promise<void> {
  const patientCollection = database.collection<Document>("patients");
  const appointmentCollection = database.collection<Document>("appointments");
  const cursor = patientCollection.find({ doctorId: { $exists: true } });

  for await (const patient of cursor) {
    if (!(patient._id instanceof ObjectId) || !(patient.doctorId instanceof ObjectId)) continue;
    const now = new Date();
    const legacyAppointment: Document = {
      _id: patient._id,
      patientId: patient._id,
      doctorId: patient.doctorId,
      status: "unknown",
      createdAt: patient.createdAt instanceof Date ? patient.createdAt : now,
      updatedAt: patient.updatedAt instanceof Date ? patient.updatedAt : now,
    };
    if (patient.appointmentAt instanceof Date) legacyAppointment.appointmentAt = patient.appointmentAt;

    await appointmentCollection.updateOne(
      { _id: legacyAppointment._id },
      { $setOnInsert: legacyAppointment },
      { upsert: true },
    );
    await patientCollection.updateOne(
      { _id: patient._id, doctorId: { $exists: true } },
      { $unset: { doctorId: "", appointmentAt: "" } },
    );
  }
}

export async function connectDatabase(): Promise<void> {
  await mongoClient.connect();
  await migrateLegacyPatientAssociations();
  await Promise.all([
    database.collection("doctors").createIndex({ createdAt: -1, _id: -1 }),
    database.collection("doctors").createIndex({ specialization: 1, createdAt: -1, _id: -1 }),
    database.collection("doctors").createIndex({ hospital: 1, createdAt: -1, _id: -1 }),
    database.collection("doctors").createIndex({ email: 1 }, { unique: true, name: "doctor_email_unique" }),
    database.collection("doctors").createIndex({ name: "text", email: "text" }, { name: "doctor_search_text" }),
    database.collection("patients").createIndex({ condition: 1, createdAt: -1, _id: -1 }),
    database.collection("patients").createIndex({ createdAt: -1, _id: -1 }),
    database.collection("patients").createIndex({ name: "text", condition: "text" }, { name: "patient_search_text" }),
    database.collection("appointments").createIndex({ patientId: 1, appointmentAt: -1, _id: -1 }),
    database.collection("appointments").createIndex({ doctorId: 1, appointmentAt: -1, _id: -1 }),
    database.collection("appointments").createIndex({ status: 1, appointmentAt: -1 }),
  ]);
}

export async function closeDatabase(): Promise<void> {
  await mongoClient.close();
}
