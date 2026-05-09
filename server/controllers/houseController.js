import House from "../models/house.js";
import User from "../models/user.js";
import { derivePrimaryRole, mergeRoles } from '../utils/roleUtils.js';


export const registerHouse = async (req, res)=>{
    try {
        const {name, address, contact, place, estate} = req.body;
        const owner = req.user._id

        // check if house already exists for this owner
        const existingHouse = await House.findOne({owner})
        if(existingHouse){
            return res.json({success: false, message: "You have already registered a house. Each owner can only register one house." })
        }
        
        await House.create({name, address, contact, place, estate, owner});
         
        const ownerUser = await User.findById(owner).select('role roles');
        const mergedRoles = mergeRoles(ownerUser?.roles, ownerUser?.role, 'houseOwner');
        await User.findByIdAndUpdate(owner, {
            role: derivePrimaryRole(mergedRoles, ownerUser?.role),
            roles: mergedRoles
        })

        res.json({success: true, message: "House Registered Successfully"})
    } catch (error) {
         res.json({success: false, message: error.message})
    }
}

