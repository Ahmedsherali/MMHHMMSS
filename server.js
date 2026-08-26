const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
//********** */

"use strict";
const path=require("path");
require("dotenv").config({path:path.join(__dirname,".env")});
const express=require("express");
const cors=require("cors");
const connectDB=require("./config/db");
const {notFound,errorHandler}=require("./middleware/errorMiddleware");
const authRoutes    =require("./routes/authRoutes");
const menuRoutes    =require("./routes/menuRoutes");
const bookingRoutes =require("./routes/bookingRoutes");
const cateringRoutes=require("./routes/cateringRoutes");
const expenseRoutes =require("./routes/expenseRoutes");
const workerRoutes  =require("./routes/workerRoutes");

connectDB();
const app=express();

const allowedOrigins=["http://localhost:5173","http://localhost:5174","http://localhost:3000",process.env.CLIENT_URL].filter(Boolean);
app.use(cors({
  origin:(origin,cb)=>{ if(!origin||allowedOrigins.includes(origin)) return cb(null,true); cb(new Error("CORS: "+origin+" not allowed.")); },
  credentials:true, methods:["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders:["Content-Type","Authorization"],
}));
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true,limit:"10mb"}));

app.get("/api/health",(_req,res)=>res.status(200).json({success:true,message:"MHMS API running.",environment:process.env.NODE_ENV,timestamp:new Date().toISOString()}));

app.use("/api/auth",    authRoutes);
app.use("/api/menu",    menuRoutes);
app.use("/api/bookings",bookingRoutes);
app.use("/api/catering",cateringRoutes);
app.use("/api/expenses",expenseRoutes);
app.use("/api/workers", workerRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT=process.env.PORT||5000;
app.listen(PORT,()=>console.log("MHMS Server running in "+process.env.NODE_ENV+" mode on port "+PORT));
module.exports=app;
