import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME ?? "booking_hub";

if (!uri) {
  throw new Error("Falta la variable de entorno MONGO_URI.");
}

let client: MongoClient;
let db: Db;

async function connectToDatabase() {
  if (db) return { client, db };

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  return { client, db };
}

export async function getReservationsCollection() {
  const { db } = await connectToDatabase();
  return db.collection("reservas");
}

export async function getBusinessUsersCollection() {
  const { db } = await connectToDatabase();
  return db.collection("business_users");
}

export type ReservationsCollection = Awaited<ReturnType<typeof getReservationsCollection>>;
export type BusinessUsersCollection = Awaited<ReturnType<typeof getBusinessUsersCollection>>;
