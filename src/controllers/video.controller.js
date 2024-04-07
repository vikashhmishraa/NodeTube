import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

// const publishAVideos = asyncHandler(async (req, res) => {
//   const { title, description } = req.body;
//   // TODO: get video, upload to cloudinary, create video

//   const videoLocalFilePath = req.files.videoFile[0]?.path;
//   const thumbnailLocalFilePath = req.files.thumbnail[0]?.path;

//   if (!videoLocalFilePath || !thumbnailLocalFilePath) {
//     throw new ApiError(400, "Video and Thumbnail File Not Found");
//   }

//   const video = await uploadOnCloudinary(videoLocalFilePath);
//   const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

//   if (!video || !thumbnail) {
//     throw new ApiError(400, "Video and Thumbnail File is Required");
//   }

//   const uploadVideo = await Video.create({
//     title,
//     description,
//     videoFile: video.url || "",
//     thumbnail: thumbnail.url || "",
//     duration: video.duration || 0,
//     isPublished: true,
//     owner: req.user._id,
//   });

//   const uploadedVideo = await Video.findById(uploadVideo._id);

//   if (!uploadedVideo) {
//     throw new ApiError(500, "something Went Wrong while Uploading Video");
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         201,
//         uploadedVideo,
//         "Video has beed Published successfully"
//       )
//     );
// });

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // Ensure `req.files` has the expected structure and files
  if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
    throw new ApiError(400, "Video and Thumbnail files are required");
  }

  // Safely access the file paths using optional chaining
  const videoLocalFilePath = req.files.videoFile[0]?.path;
  const thumbnailLocalFilePath = req.files.thumbnail[0]?.path;

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
    videoFile: video.url,
    thumbnail: thumbnail.url,
    duration: video.duration || 0,
    isPublished: true,
    owner: req.user._id,
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

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(400, "No Video Found");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, video, "video fetched successfully"));
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
        thumbnail: newThumbnail.url,
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

  const video = await Video.findByIdAndDelete({ _id: videoId });

  if (!video) {
    throw new ApiError(401, "No Vido Found with this id");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Deleted Successfully "));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "VideoId is Required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { isPublished: !video.isPublished } }, // This line toggles the status
    { new: true }
  );

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
