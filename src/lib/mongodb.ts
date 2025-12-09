import { MongoClient, Db } from "mongodb";
import { BusinessUser, normalizeBusinessUser } from "./businessProfile";

const dbName = process.env.MONGO_DB_NAME ?? "booking_hub";
const mongoUri = process.env.MONGODB_URI;

let client: MongoClient;
let db: Db;

async function connectToDatabase() {
  if (!mongoUri) {
    throw new Error("Falta la variable de entorno MONGODB_URI.");
  }
  if (db) return { client, db };

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);

  return { client, db };
}

/**
 * Get the database instance directly
 */
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export async function getReservationsCollection() {
  const { db } = await connectToDatabase();
  return db.collection("reservas");
}

export async function getBusinessUsersCollection() {
  const { db } = await connectToDatabase();
  return db.collection("business_users");
}

export async function getCustomersCollection() {
  const { db } = await connectToDatabase();
  return db.collection("customers");
}

export async function getStaffCollection() {
  const { db } = await connectToDatabase();
  return db.collection("staff");
}

export async function getBusinessConfig(clientId: string): Promise<BusinessUser | null> {
  const usersCol = await getBusinessUsersCollection();
  const doc = await usersCol.findOne({ clientId });
  if (!doc) return null;

  const hasHoursConfig =
    Boolean(doc?.hours) &&
    Boolean(doc.hours.open) &&
    Boolean(doc.hours.close) &&
    typeof doc.hours.slotMinutes !== "undefined";

  const normalized = normalizeBusinessUser(doc);
  if (!normalized.features.reservations || !hasHoursConfig) {
    // Si reservas esta desactivado o sin horario, el bot no debe ofrecer agendamiento.
    return { ...normalized, hours: undefined };
  }
  return normalized;
}

export type ReservationsCollection = Awaited<ReturnType<typeof getReservationsCollection>>;
export type BusinessUsersCollection = Awaited<ReturnType<typeof getBusinessUsersCollection>>;
export type CustomersCollection = Awaited<ReturnType<typeof getCustomersCollection>>;
export type StaffCollection = Awaited<ReturnType<typeof getStaffCollection>>;
