import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    video: {
      type: mongoose.Types.ObjectId,
      ref: "Video",
    },
    Owner: {
      type: mongoose.Types.ObjectId,
      ref: "User ",
    },
  },
  { timestamps }
);

commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = mongoose.model("Comment", commentSchema);
