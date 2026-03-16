import {Router} from 'express'
import {registerUser} from '../controllers/user.controller.js'
const router=Router()
import {upload} from "../middlewares/multer.js"
import {verifyJWT} from '../middlewares/auth.middleware.js'
import {loginUser, logoutUser} from '../controllers/user.controller.js'
import {refreshAccessToken} from '../controllers/user.controller.js'

router.route('/register').post(upload.fields([
    {
        name:'avatar',
        maxCount:1
    },
    {
        name:'coverImage',
        maxCount:1

    }
]),registerUser)

router.route('/login').post(loginUser)

// secured routes 

router.route('/logout').post(verifyJWT,logoutUser)

router.route('/refresh-token').post(refreshAccessToken)
export default router