import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary=async (localFilePath)=>{

    try {
        if(!localFilePath) return null
        //upload the file on cloudinary

        const response =await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        //file has been uploaded successfully
        // console.log("file is uploaded on cloudinary:",response);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the localy saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary= async(cloudinaryUrl)=>{
    try {
        if (!cloudinaryUrl) return null
        const parts = cloudinaryUrl.split("/");
        const filename = parts[parts.length - 1];
       const response= await cloudinary.api.delete_resources(filename,{type:'auto',resource_type:'auto'})
       if (!response) return null
    } catch (error) {
        return null;
    }
}

export {uploadOnCloudinary,deleteFromCloudinary}