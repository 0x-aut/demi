import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IMessage {
  role:      "user" | "assistant" | "system" | "summary";
  content:   string;
  tokens:    number;
  timestamp: Date;
  archived:  boolean;
}

export interface IChatHistory extends Document {
  sessionId:   string;
  messages:    IMessage[];
  totalTokens: number;
  createdAt:   Date;
  updatedAt:   Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role:      { type: String, enum: ["user", "assistant", "system", "summary"], required: true },
    content:   { type: String, required: true },
    tokens:    { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    archived:  { type: Boolean, default: false },
  },
  { _id: false },
);

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    sessionId:   { type: String, required: true, index: true },
    messages:    { type: [MessageSchema], default: [] },
    totalTokens: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ChatHistory: Model<IChatHistory> =
  mongoose.models.ChatHistory ??
  mongoose.model<IChatHistory>("ChatHistory", ChatHistorySchema);
