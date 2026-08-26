const CateringOrder = require("../models/CateringOrder");

const PHONE_REGEX = /^\d{4}-\d{7}$/;

const getAllOrders = async (req,res) => {
  try {
    const {status}=req.query; const filter={}; if(status) filter.status=status;
    const orders = await CateringOrder.find(filter).populate("selectedMenuItems.menuItem","dishName pricePerHead category").sort({eventDate:-1});
    res.status(200).json({success:true,count:orders.length,data:orders});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch orders.",error:error.message});}
};
const getOrderById = async (req,res) => {
  try {
    const order = await CateringOrder.findById(req.params.id).populate("selectedMenuItems.menuItem","dishName pricePerHead category");
    if(!order) return res.status(404).json({success:false,message:"Catering order not found."});
    res.status(200).json({success:true,data:order});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch order.",error:error.message});}
};
const createOrder = async (req,res) => {
  try {
    const { phone } = req.body;
    if (phone && !PHONE_REGEX.test(phone))
      return res.status(400).json({success:false, message:"Invalid phone. Required format: XXXX-XXXXXXX (e.g. 0300-1234567)"});
    const order = await CateringOrder.create(req.body);
    res.status(201).json({success:true,message:"Catering order created.",data:order});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to create order.",error:error.message});
  }
};
const updateOrder = async (req,res) => {
  try {
    const order = await CateringOrder.findById(req.params.id);
    if(!order) return res.status(404).json({success:false,message:"Catering order not found."});
    const incomingPhone = req.body.phone || order.phone;
    if (!PHONE_REGEX.test(incomingPhone))
      return res.status(400).json({success:false, message:"Invalid phone. Required format: XXXX-XXXXXXX (e.g. 0300-1234567)"});
    Object.assign(order,req.body); await order.save();
    res.status(200).json({success:true,message:"Order updated.",data:order});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to update order.",error:error.message});
  }
};
const deleteOrder = async (req,res) => {
  try {
    const order = await CateringOrder.findByIdAndDelete(req.params.id);
    if(!order) return res.status(404).json({success:false,message:"Catering order not found."});
    res.status(200).json({success:true,message:"Catering order deleted."});
  } catch(error){res.status(500).json({success:false,message:"Failed to delete order.",error:error.message});}
};
module.exports = {getAllOrders,getOrderById,createOrder,updateOrder,deleteOrder};

