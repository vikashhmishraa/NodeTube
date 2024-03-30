import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res, next) => {
  // res.status(200).json({ data: "vikas" });
  // Logic
  // get user detaisl from frontend
  // check if any fiels are empty / validate not empty
  // check if user is already exists : username. email
  // check for image, check for avatar
  // upload images on cloudinary, get response of cloudinary with image link
  // create user object - create user in db
  // remove password and refresh token fields from respons   e
  // check for user creation
  // return res

  // ********  START  ********

  const { username, email, fullName, password } = req.body;
  console.log("email: ", email);

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are Required ");
  }

  const existedUsed = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUsed) {
    throw new ApiError(409, "User with this username or email already exists");
  }

  const avatarLocalFilePath = req.files?.avatar[0]?.path;
  const coverImageLocalFilePath = req.files?.coverImage[0]?.path;

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar File is Required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    " -password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something Went Wrong while registring the User ");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
