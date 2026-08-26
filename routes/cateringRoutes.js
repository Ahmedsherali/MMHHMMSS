const express=require("express"); const router=express.Router();
const {getAllOrders,getOrderById,createOrder,updateOrder,deleteOrder}=require("../controllers/cateringController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.route("/").get(getAllOrders).post(createOrder);
router.route("/:id").get(getOrderById).put(updateOrder).delete(deleteOrder);
module.exports=router;
