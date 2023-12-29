import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}))


app.use(express.json({
    limit:"16kb"
}))

app.use(express.urlencoded({extended:true,limit:"16kb"}))

app.use(express.static("public"))

app.use(cookieParser())


//routes

import userRouter from './routes/user.routes.js'


//routes decleration 
// app.get() it is not used,bcz we are not using routes and app in same file like index,so we use app.use instead of app.get or whateverr,moti moti bath -<we are using> middleware

app.use("/api/v1/users",userRouter)
//api/v1/users for standard practices
export {app}