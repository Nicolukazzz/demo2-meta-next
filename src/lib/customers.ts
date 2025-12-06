import { ObjectId } from "mongodb";
import { getCustomersCollection } from "./mongodb";

export type Customer = {
  _id: ObjectId;
  clientId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastReservationAt?: Date;
};

type UpsertInput = {
  clientId: string;
  name?: string;
  phone?: string;
  date?: string | Date;
};

export async function listCustomers(clientId: string, search?: string) {
  const col = await getCustomersCollection();
  const filter: Record<string, any> = { clientId };
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ name: regex }, { phone: regex }];
  }
  const docs = await col.find(filter).sort({ updatedAt: -1 }).toArray();
  return docs.map((doc) => ({
    ...doc,
    _id: doc._id as ObjectId,
    lastReservationAt: doc.lastReservationAt ? new Date(doc.lastReservationAt) : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
  })) as Customer[];
}

export async function upsertCustomerFromReservation(input: UpsertInput) {
  if (!input.clientId || !input.name || !input.phone) return null;
  const col = await getCustomersCollection();
  const now = new Date();
  const lastReservationAt =
    input.date instanceof Date
      ? input.date
      : input.date
        ? new Date(input.date)
        : now;

  const existing = await col.findOne({ clientId: input.clientId, phone: input.phone });
  if (existing) {
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: input.name,
          lastReservationAt,
          updatedAt: now,
        },
      },
    );
    return existing._id as ObjectId;
  }

  const doc: Omit<Customer, "_id"> = {
    clientId: input.clientId,
    name: input.name,
    phone: input.phone,
    createdAt: now,
    updatedAt: now,
    lastReservationAt,
  };
  const insert = await col.insertOne(doc as any);
  return insert.insertedId;
}

export async function createCustomer(data: Omit<Customer, "_id">) {
  const col = await getCustomersCollection();
  const now = new Date();
  const doc = {
    ...data,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc as any);
  return res.insertedId;
}

export async function updateCustomer(id: string, clientId: string, data: Partial<Customer>) {
  const col = await getCustomersCollection();
  await col.updateOne(
    { _id: new ObjectId(id), clientId },
    { $set: { ...data, updatedAt: new Date() } },
  );
}

export async function deleteCustomer(id: string, clientId: string) {
  const col = await getCustomersCollection();
  await col.deleteOne({ _id: new ObjectId(id), clientId });
}
