import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userId) =>{
  try {
      const user = await User.findById(userId)
      
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false })//it will hit the password validation in user model,too prevent that we use validateBeforeSave:false

      return {accessToken, refreshToken}


  } catch (error) {
      throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}



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

    // if (fullName=="") {
    //     throw new ApiError(400,"fullname is required")
    // }biginers
    if ( [fullName,email,username,password].some((field)=>field?.trim()==="")
        )
     {
       throw new ApiError(400,"All fields are compelsory")
    }

      //check if user already exists:username,email

    const existedUser=await User.findOne({
        $or:[{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exits")
    }

     //check for images,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path  //locapath,not in cloudinary
    // const coverLocalPath= req.files?.coverImage[0]?.path //loacalpath
    // console.log(req.files)
    //check for avatar

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    //upload  them to cloudinary ,avtar check

   const avatar= await uploadOnCloudinary(avatarLocalPath)
   const coverImage= await uploadOnCloudinary(coverImageLocalPath)// if no cover image cloudinary will return  empty string,good side of cloudinary

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

const loginUser=asyncHandler(async (req,res)=>{

    //req.body-> data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies


    //req.body-> data
    //username or email 
    const {email,username,password} =req.body
    if(!username && !email)
    {
      throw new ApiError(400,"username or email is required")
    }
   
    //find the user
    const user =await User.findOne({
      $or:[{username},{email}]
    })

    if (!user) {
      throw new ApiError(404,"user does not exist")
    }

     //password check
    const isPasswordValid= await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
      throw new ApiError(401,"Invalid credentials")
    }
   
   const {accessToken,refreshToken}= await generateAccessAndRefereshTokens(user._id)

    //send cookies

    const loggedInUser =await User.findById(user._id).select("-password -refreshToken")

    const options={
      httpOnly:true,
      secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,
        {
          user:loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"

      )
    )


})

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
      req.user._id,
      {
          $set: {
              refreshToken: undefined
          }
      },
      {
          new: true
      }
  )

  const options = {
      httpOnly: true,
      secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken =asyncHandler(async(req,res)=>{

  const incomingRefreshToken =req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken)
  {
    throw new ApiError(401,"unauthorized request:")
  }

  try {
    const decodedToken =jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user=  await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401,"invalid refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401," refresh token is expired or used")
    }
  
    const options={
      httpOnly:true,
      secure:true
    }
    const {accessToken,newrefreshToken}=await generateAccessAndRefereshTokens(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
      new ApiResponse(
        200,
        {accessToken,newrefreshToken},
        "Access token refreshed "
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "invalid refresh token")
  }

})

const changeCurrentPassword=asyncHandler(async (req,res)=>{
  const {oldPassword,newPassword}= req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
  if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password")
  }
  user.password=newPassword
  await user.save({validateBeforeSave:false})

  return res.status(200).json(new ApiResponse(200,{},"Password Changed successfully"))
})

const getCurrentUser=asyncHandler(async (req,res)=>{
  return res.status(200).json(new ApiResponse(200,req.user, "current user fetch successfull"))
})

const updateAccoutDetails=asyncHandler(async (req,res)=>{/// if i want to change a file make another method instaed of adding to this one,bcz while updating files only part the user data gets updated each time
  const {fullName,email}= req.body

  if (!fullName || !email) {
    throw new ApiError(400,"all fields are required")
  }
   const user= await  User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email:email
      }
    },
    {new:true}// return information is based on new updated information instead of old information
    
    ).select("-password")
    return res
      .status(200)
      .json(new ApiResponse(200,user,"account details updated successfully"))
})

const updateUserAvatar=asyncHandler(async (req,res)=>{

    const avatarLocalPath =req.file?.path

    if(!avatarLocalPath){
      throw new ApiError(400,"avatar file is missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
      throw new ApiError(400,"error while uploading on avatar ")
    }
    const olddetailsofuser=await User.findById(req.user?._id)
    if (!olddetailsofuser.avatar) {
      throw new ApiError(400,"no avatar found on cloudinary to get replaced")
    }
    const isdeleteFromCloudinary = await deleteFromCloudinary(olddetailsofuser.avatar)
    if (isdeleteFromCloudinary) {
      throw new ApiError(400,"old avatar deleting failed")
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          avatar:avatar.url
        }
      },
      {new:true}
      ).select("-password")
      return res
      .status(200)
      .json(new ApiResponse(200,user,"avatar updated successfully"))
})


const updateUserCoverImage=asyncHandler(async (req,res)=>{

  const coverImageLocalPath=req.file?.path

if (!coverImageLocalPath) {
    throw new ApiError(400,"cover image is missing")
  }
  const coverImage= await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
      throw new ApiError(400,"error while uploading cover image to cloudinary")
  }
  const olddetailsofuser=await User.findById(req.user?._id)
    if (!olddetailsofuser.coverImage) {
      throw new ApiError(400,"no cover image found on cloudinary to get replaced")
    }
    const isdeleteFromCloudinary = await deleteFromCloudinary(olddetailsofuser.coverImage)
    if (isdeleteFromCloudinary) {
      throw new ApiError(400,"old coverImage deleting failed")
    }
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    }, 
    {
      new:true
    }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"cover image updated successfully"))
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
  const {username}=req.params
  if (!username?.trim()) {
    throw new ApiError(400,"username is missing")
  }
  const channel =await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount:{
          $size:"$subscribers"
        },
        channelSubscribedToCount:{
          $size:"subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in : [req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },{
      $project:{
        fullName:1,
        username:1,
        subscribersCount:1,
        channelSubscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
        email:1
      }
    }
  ])

  console.log(channel);

  if (!channel.length) {
    throw new ApiError(404,"channel does not exist")
  }
  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"user channel fetched successfully "))
})


const getWatchHistory=asyncHandler(async (req,res)=>{
  const user=await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      },
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",

        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                $project:{
                  fullName:1,
                  username:1,
                  avatar:1,
                }
              
                }]
            }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})





export {registerUser,
  loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccoutDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
  }