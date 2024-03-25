import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINADY_CLOUD_NAME,
  api_key: process.env.CLOUDINADY_API_NAME,
  api_secret: process.env.CLOUDINADY_API_SECERET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // Upload the File on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // File has been Uploaded Successfully
    console.log("File has been Uploaded on Cloudinerary", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file  as the upload operation got failed.
    return null;
  }
};
export { uploadOnCloudinary };
