const path = require("path");
const dns = require("dns");
dns.setServers(['8.8.8.8', '1.1.1.1']); // Bypass local network DNS block

require("dotenv").config({ path: path.join(__dirname, "../.env") });


// Rest of your seed code stays the same...





//****** */


//const path=require("path");
require("dotenv").config({path:path.join(__dirname,"../.env")});
const mongoose=require("mongoose");
const Admin=require("../models/Admin");
const MenuPricing=require("../models/MenuPricing");

const DEFAULT_ADMIN={name:"MHMS Admin",email:"admin@mhms.com",password:"Admin@1234"};
const DEFAULT_MENU=[
  {dishName:"Chicken Biryani",     category:"Rice",  pricePerHead:350,description:"Aromatic basmati rice with tender chicken"},
  {dishName:"Zarda Chawal",        category:"Rice",  pricePerHead:150,description:"Sweet saffron rice with dry fruits"},
  {dishName:"Gurr Waly Chawal",    category:"Rice",  pricePerHead:120,description:"Jaggery-flavored sweet rice"},
  {dishName:"Chana Pulao",         category:"Rice",  pricePerHead:200,description:"Fragrant rice with chickpeas"},
  {dishName:"Beef Salan",          category:"Curry", pricePerHead:400,description:"Rich slow-cooked beef curry"},
  {dishName:"Chicken Qorma Salan", category:"Curry", pricePerHead:350,description:"Creamy chicken qorma"},
  {dishName:"Simple Chicken Salan",category:"Curry", pricePerHead:250,description:"Classic homestyle chicken curry"},
];

const seedDB=async()=>{
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected. Seeding...");
    const existingAdmin=await Admin.findOne({email:DEFAULT_ADMIN.email});
    if(existingAdmin){console.log("Admin already exists. Skipping.");}
    else{await Admin.create(DEFAULT_ADMIN);console.log("Admin created: "+DEFAULT_ADMIN.email+" / "+DEFAULT_ADMIN.password);}
    let created=0,skipped=0;
    for(const item of DEFAULT_MENU){
      const exists=await MenuPricing.findOne({dishName:item.dishName});
      if(exists){skipped++;continue;}
      await MenuPricing.create(item);
      console.log("Seeded: "+item.dishName+" - Rs."+item.pricePerHead+"/head");
      created++;
    }
    console.log("Done. Created:"+created+" Skipped:"+skipped);
    process.exit(0);
  } catch(error){console.error("Seed Error:",error.message);process.exit(1);}
};
seedDB();
