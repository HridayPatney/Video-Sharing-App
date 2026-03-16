import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=await user.generateAccessToken()
        const refreshToken=await user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"Failed to generate tokens")
    }
}
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

const loginUser= asyncHandler(async (req,res)=>{
    // get email and password from frontend
    // validation of email and password - not empty
    // check if user exists in db with email 
    // if user exists, compare password with hashed password in db
    // if password matches, generate access token and refresh token
    // send cookie 

    const {email,username,password}=req.body

    if(!username && !email){
        throw new ApiError(400,"Email or username is required")
    }

    const user=await User.findOne({$or:[{email:email.toLowerCase(),username:username.toLowerCase()}]})
    if(!user){
        throw new ApiError(404,"User not found with this email or username")
    }

   const isPasswordValid= await user.comparePassword(password)
   if(!isPasswordValid){
    throw new ApiError(401,"Invalid password")
   }
   const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id)

   const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
   
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
            user:loggedInUser,
            accessToken,
            refreshToken
        },"User logged in successfully"
       )
   )
})

const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined,

            }
        },{
                new:true
            }    )

    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out successfully"))
    
    })

const refreshAccessToken= asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unathorized request")
    }

    try{
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

        const user=await User.findById(decodedToken._id)

        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }

        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used")
        }             

        const options={
            httpOnly:true,
            secure:true
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options)
        .json( new ApiResponse(200,{accessToken, newRefreshToken},"Access token refreshed successfully"))
    }catch(error){
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})
export {registerUser,loginUser,logoutUser,refreshAccessToken}