import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const allVideos = await Video.find();

  if (!allVideos) {
    throw new ApiError(404, "No Video Found");
  }

  // return res.send("hello");
  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "All videos Fetched Successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // Ensure `req.files` has the expected structure and files
  if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
    throw new ApiError(400, "Video and Thumbnail files are required");
  }

  // Safely access the file paths using optional chaining
  const videoLocalFilePath = req.files.videoFile?.path;
  const thumbnailLocalFilePath = req.files.thumbnail?.path;

  // Check again after attempting to access the paths
  if (!videoLocalFilePath || !thumbnailLocalFilePath) {
    throw new ApiError(400, "Video and Thumbnail File Not Found");
  }

  // Upload files to Cloudinary
  const video = await uploadOnCloudinary(videoLocalFilePath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

  if (!video.url || !thumbnail.url) {
    throw new ApiError(400, "Failed to upload Video and/or Thumbnail");
  }

  // Create the video document in the database
  const uploadVideo = await Video.create({
    title,
    description,
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    duration: video.duration,
    isPublished: true,
    owner: req.user?._id,
    isPublished: true,
  });

  // Retrieve the just-uploaded video document to ensure it was saved correctly
  const uploadedVideo = await Video.findById(uploadVideo._id);
  if (!uploadedVideo) {
    throw new ApiError(500, "Something went wrong while uploading the video");
  }

  // Respond with the uploaded video information
  return res
    .status(200)
    .json(
      new ApiResponse(
        201,
        uploadedVideo,
        "Video has been published successfully"
      )
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is Invalid");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid userId");
  }

  // const video = await Video.findById({ _id: videoId });

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "Like",
        foreignField: "_id",
        localField: "video",
        as: "Likes",
      },
    },
  ]);

  if (!video) {
    throw new ApiError(400, "No Video Found");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, video[0], "video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  //TODO: update video details like title, description,

  if (!videoId) {
    throw new ApiError(401, "VideoId is Required");
  }

  const NewThumbnailLocalFilePath = req.file.path;
  console.log(NewThumbnailLocalFilePath);
  const newThumbnail = await uploadOnCloudinary(NewThumbnailLocalFilePath);

  const video = await Video.findByIdAndUpdate(
    { _id: videoId },
    {
      $set: {
        title: title,
        description: description,
        // thumbnail: newThumbnail.url,
        thumbnail: {
          public_id: newThumbnail.public_id,
          url: newThumbnail.url,
        },
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Updated Successfully "));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError(401, "VideoId is Required");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(401, "No Vido Found with this id");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    );
  }

  const videoDeleted = await Video.findByIdAndDelete(video?._id);

  if (!videoDeleted) {
    throw new ApiError(400, "Failed to delete the video please try again");
  }

  await deleteOnCloudinary(video.thumbnail.public_id); // video model has thumbnail public_id stored in it->check videoModel
  await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video

  // delete video likes
  await Like.deleteMany({
    video: videoId,
  });

  // delete video comments
  await Comment.deleteMany({
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Deleted Successfully "));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toogle publish status as you are not the owner"
    );
  }
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { isPublished: !video.isPublished } }, // This line toggles the status
    { new: true }
  );

  if (!toggledVideoPublish) {
    throw new ApiError(500, "Failed to toogle video publish status");
  }
  // Check if the video was successfully updated
  if (!updatedVideo) {
    throw new ApiError(
      500,
      "An error occurred while updating the video status"
    );
  }
  // Sending back the updated video information
  return res.status(200).json({
    message: `Video ${updatedVideo.isPublished ? "published" : "unpublished"} successfully`,
    video: updatedVideo,
  });
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

/*

db.users.insertMany([
  {
    name: "yuvraj",
    age: 24,
    language: ["javascript", "nodeJs", "mongoDB", "goLang"],
  },
  { name: "trip", age: 25, language: ["javascript", "nodeJs", "mongoDB"] },
  {
    name: "Goli",
    age: 15,
    language: ["javascript", "CPP", "nodeJs", "mongoDB"],
  },
  {
    name: "sinzo",
    age: 7,
    language: ["javascript", "nodeJs", "python", "mongoDB"],
  },
  { name: "nobita", age: 18, language: ["javascript", "nodeJs"] },
]);

db.users.updateMany(
  { name: "trip" },
  {
    $set: {
      bio: "I am Trip Planner",
    },
  }
);

db.users.find({
  $and: [
    { "experience.company": "google" },
    { "experience.duration": { $gt: 2 } },
  ],
});
db.users.find({
  experience: { $elemMatch: { company: "amazon", duration: "2 Years" } },
});

*/
