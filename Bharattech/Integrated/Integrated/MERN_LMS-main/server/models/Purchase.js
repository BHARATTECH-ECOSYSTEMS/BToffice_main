import mongoose from "mongoose";

const PurchaseSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Purchase Model Indexes
PurchaseSchema.index({ userId: 1, courseId: 1 }, { unique: true });
PurchaseSchema.index({ status: 1, updatedAt: -1 });
PurchaseSchema.index({ courseId: 1, status: 1 });

const Purchase = mongoose.model("Purchase", PurchaseSchema);
export default Purchase;
