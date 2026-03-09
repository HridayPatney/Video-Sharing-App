import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'
import dns from "node:dns"

dns.setServers(["1.1.1.1", "8.8.8.8"])
console.log("Mongo URI:", process.env.MONGODB_URL_WORK)
const connectDB=async()=>{
    try{
       const connectionInstance= await(mongoose.connect(`${process.env.MONGODB_URL_WORK}`))
        
       console.log(`Connected to database ${connectionInstance.connection.host} successfully`)
    
    
    }catch(error){
        console.log('Error connecting to database',error)
        process.exit(1)
    }
}

export default connectDB