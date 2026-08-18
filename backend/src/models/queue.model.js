import mongoose from "mongoose";

const queueSchema = new mongoose.Schema({
  branch:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"Branch",
    required:true,
    index:true
  },

  serviceName:{
    type: String,
    required: true,
    trim:true
  },

  lastTicketNumber: {
    type:Number,
    default:0,
  },

  isActive: {
    type: Boolean,
    default:true
  }
}, {timestamps:true})

queueSchema.index({ branch: 1, serviceName: 1 }, { unique: true });

const Queue= mongoose.model("Queue", queueSchema);
export default Queue;