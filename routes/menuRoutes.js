const express=require("express"); const router=express.Router();
const {getAllMenuItems,getMenuItemById,createMenuItem,updateMenuItem,deleteMenuItem,getACSurcharge,updateACSurcharge}=require("../controllers/menuController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.route("/ac-surcharge").get(getACSurcharge).put(updateACSurcharge);
router.route("/").get(getAllMenuItems).post(createMenuItem);
router.route("/:id").get(getMenuItemById).put(updateMenuItem).delete(deleteMenuItem);
module.exports=router;
