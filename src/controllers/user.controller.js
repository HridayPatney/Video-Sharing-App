import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';

import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
const registerUser= asyncHandler(async (req, res) => {
    // get user details from frontend 
    // validation of user details - not empty
    // check if user already exists in db : username and db
    // check for images, check for avatar 
    // upload them to cloudinary and get the url
    // create user object - create entry in db 
    // remove password and refresh token from response
    // check for user creation success and send response to frontend

    const {fullName,email, username,password}=req.body
    console.log(email)

    if(
        [fullName,email,username,password].some((field)=> field?.trim()==="" )
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({
        $or:[
            {email},
            {username}]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists with this email or username")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar")
    }
    
    const user=await User.create({
        fullName:fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email:email.toLowerCase(),
        username:username.toLowerCase(),
        password:password
    })

   const createdUser=await User.findById(user._id).select("-password -refreshToken")

   if(!createdUser){
    throw new ApiError(500,"Failed to create user")
   }

   return res.status(201).json(new ApiResponse(200,createdUser,"User registered successfully"))
    
})

export {registerUser}