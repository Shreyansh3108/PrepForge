import mongoose, { Schema, Document } from "mongoose";
import { Kit as KitType } from "@prepforge/shared-types";

// Merge our strict Zod type with Mongoose's Document type
export interface IKit extends Omit<KitType, "edits">, Document {
  userId: mongoose.Types.ObjectId;
  status: "pending" | "researching" | "generating" | "ready" | "failed";
  progress: {
    step: string;
    pct: number;
    message: string;
  };
  edits: {
    pinnedQuestionIds: string[];
    pinnedFlashcardIds: string[];
    lastEditedAt?: Date;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KitSchema = new Schema<IKit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { 
      type: String, 
      enum: ["pending", "researching", "generating", "ready", "failed"], 
      default: "pending" 
    },
    progress: {
      step: { type: String, default: "pending" },
      pct: { type: Number, default: 0 },
      message: { type: String, default: "Starting generation pipeline..." }
    },
    error: { type: String },
    
    // We store the Appendix A data as flexible mixed types 
    // because Zod guarantees its shape before it ever reaches this save function.
    source: { type: Schema.Types.Mixed },
    company_brief: { type: Schema.Types.Mixed },
    role: { type: Schema.Types.Mixed },
    questions: { type: Schema.Types.Mixed },
    flashcards: { type: Schema.Types.Mixed },
    schedule: { type: Schema.Types.Mixed },
    coverage: { type: Schema.Types.Mixed },
    
    // UI state persistence
    edits: {
      pinnedQuestionIds: [{ type: String }],
      pinnedFlashcardIds: [{ type: String }],
      lastEditedAt: { type: Date }
    }
  },
  { timestamps: true }
);

export const Kit = mongoose.models.Kit || mongoose.model<IKit>("Kit", KitSchema);