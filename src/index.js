// require('dotenv').config({path:'./env'})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`app is running on${process.env.PORT}`);
    })
})
.catch((eroor)=>console.log("mongodb connection failed !!!",eroor))

























// ;(
// async()=>{
//         try {
//             await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
            
//         } catch (error) {
//             console.error("ERRor:",error)
//             throw error
//         }
//     }
// )()