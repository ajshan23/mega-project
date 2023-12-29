import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const registerUser = asyncHandler(async (req,res)=>{
    //get user details from frontend
    //validation -not empty 
    //check if user already exists:username,email
    //check for images,check for avatar
    //upload  them to cloudinary ,avtar check
    //create user object-creaye entry in db
    //remove password and refrsh token field from response
    //check for user creation
    //return response


    const {fullName,email,username,password}= req.body
    console.log("email:",email);

    // if (fullName=="") {
    //     throw new ApiError(400,"fullname is required")
    // }biginers
    if ( [fullName,email,username,password].some((field)=>field?.trim()==="")
        )
     {
       throw new ApiError(400,"All fields are compelsory")
    }

      //check if user already exists:username,email

    const existedUser=User.findOne({
        $or:[{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exits")
    }

     //check for images,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path  //locapath,not in cloudinary
    const coverLocalPath= req.files?.coverImage[0]?.path //loacalpath
    
    //check for avatar

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    //upload  them to cloudinary ,avtar check

   const avatar= await uploadOnCloudinary(avatarLocalPath)
   const coverImage= await uploadOnCloudinary(coverLocalPath)

   if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
   }

 //create user object-creaye entry in db

   const user= await User.create({ //another continent
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

   const createdUser= await User.findById(user._id).select( /// removing pass and refresh from response 
    "-password -refreshToken"
   )

   //check for user creation
   if (!createdUser) {
        throw new ApiError(500,"something went wrong while registerting new user")
   }

   //return response

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered successfully")
   )


})


export {registerUser}