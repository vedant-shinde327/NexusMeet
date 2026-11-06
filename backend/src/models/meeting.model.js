import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    organizerToken: {
      type: String,
      default: "",
      index: true,
    },
    organizerName: {
      type: String,
      default: "Organizer",
    },
    meetingCode: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "NexusMeet Session",
      trim: true,
    },
    scheduledAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    isScheduled: {
      type: Boolean,
      default: false,
      index: true,
    },
    waitingRoomEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "history"],
      default: "history",
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };
export default Meeting;