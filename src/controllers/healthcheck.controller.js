import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  // Always returns a 200 OK response with a status message
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: "OK", message: "Service is running" },
        "Everythig is OK"
      )
    );
});

export { healthcheck };
