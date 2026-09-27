import mongoose from "mongoose";

let _connected = false;

export async function connectMongo(): Promise<void> {
  if (_connected || mongoose.connection.readyState >= 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");

  await mongoose.connect(uri);
  _connected = true;
}
