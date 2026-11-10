import { database } from "../../config/database.js";
import type { ObjectId } from "mongodb";

interface CountResult { count: number }
interface DailyCount { _id: string; count: number }
interface DoctorPatientCount { _id: ObjectId; name: string; specialization: string; hospital: string; patientCount: number }

export async function getDashboardSummary() {
  const doctors = database.collection("doctors");
  const patients = database.collection("patients");
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);

  const [doctorCounts, patientCounts, perDoctor, patientsDaily, doctorsDaily] = await Promise.all([
    doctors.aggregate<CountResult>([{ $count: "count" }]).toArray(),
    patients.aggregate<CountResult>([{ $count: "count" }]).toArray(),
    doctors.aggregate<DoctorPatientCount>([
      {
        $lookup: {
          from: "appointments",
          let: { doctorRef: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$doctorId", "$$doctorRef"] } } },
            { $group: { _id: "$patientId" } },
            { $count: "count" },
          ],
          as: "patientTotals",
        },
      },
      { $project: { name: 1, specialization: 1, hospital: 1, patientCount: { $ifNull: [{ $arrayElemAt: ["$patientTotals.count", 0] }, 0] } } },
      { $sort: { patientCount: -1, name: 1, _id: 1 } },
    ]).toArray(),
    patients.aggregate<DailyCount>([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    doctors.aggregate<DailyCount>([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  const daily = new Map<string, { date: string; patientsCreated: number; doctorsCreated: number }>();
  for (let offset = 0; offset < 30; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    const key = day.toISOString().slice(0, 10);
    daily.set(key, { date: key, patientsCreated: 0, doctorsCreated: 0 });
  }
  for (const item of patientsDaily) {
    const day = daily.get(item._id);
    if (day) day.patientsCreated = item.count;
  }
  for (const item of doctorsDaily) {
    const day = daily.get(item._id);
    if (day) day.doctorsCreated = item.count;
  }

  return {
    totals: { doctors: doctorCounts[0]?.count ?? 0, patients: patientCounts[0]?.count ?? 0 },
    patientsPerDoctor: perDoctor.map(({ _id, name, specialization, hospital, patientCount }) => ({
      doctorId: _id.toHexString(), name, specialization, hospital, patientCount,
    })),
    dailyStats: [...daily.values()],
  };
}
