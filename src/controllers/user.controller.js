import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateRefreshAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something Went Wrong While Generating Refresh and Access Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
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

  const { username, email, fullName, password } = req.body;
  console.log("email: ", email);

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are Required ");
  }

  const existedUsed = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUsed) {
    throw new ApiError(409, "User with this username or email already exists");
  }

  const avatarLocalFilePath = req.files.avatar[0]?.path;
  // console.log(req.files);
  // const coverImageLocalFilePath = req.files?.coverImage[0]?.path;

  let coverImageLocalFilePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalFilePath = req.files.coverImage[0].path;
  }

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

const loginUser = asyncHandler(async (req, res) => {
  // req.body = data
  // login with username or email
  // find this user
  // password check
  // access and refresh token
  // send cookie

  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }
  // console.log(username, email);

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not  exists");
  }

  // console.log(password);
  const isPasswordValid = await user.isPasswordCorrect(password);

  // console.log(isPasswordValid);
  // console.log(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentians ");
  }

  const { accessToken, refreshToken } = await generateRefreshAndAccessToken(
    user._id
  );

  // console.log({ accessToken: accessToken, refreshToken: refreshToken });
  const loggedInUser = await User.find(user._id).select(
    "-password -refreshToken "
  );

  // console.log(loggedInUser);
  const options = {
    httpOnly: true,
    secure: true,
  };

  // console.log(res);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          data: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User LoggedIn Succesfully"
      )
    );
});

const LogoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log(res);
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out  "));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incommingToken) {
    throw new ApiError(401, "Unauthorised Request");
  }

  try {
    const decodedToken = jwt.verify(
      incommingToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incommingToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token expired or Used ");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { newAccessToken, newRefreshToken } =
      await generateRefreshAndAccessToken(user._id);

    return res
      .status(200)
      .cookie("accessToken: ", newAccessToken, options)
      .cookie("refreshToken: ", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken: newAccessToken, newRefreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Refresh Token ");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid Old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Currect User Fetched Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;

  if (!fullName || !email || !username) {
    throw new ApiError(401, "All Fields are Required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
        username: username,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully "));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "ERROR While uploading file on Cloudinary");
  }

  const avatarUpdated = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, avatarUpdated, "Avatar  Updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }

  const CoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!CoverImage.url) {
    throw new ApiError(400, "ERROR While uploading file on Cloudinary");
  }

  const CoverImageUpdated = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        CoverImage: CoverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, CoverImageUpdated, "CoverImage Updated Successfully")
    );
});

export {
  registerUser,
  loginUser,
  LogoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
