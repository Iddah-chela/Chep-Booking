import mongoose, { mongo } from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: {
        type: String, 
        ref: "User",
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Property",
        required: true
    },
    roomDetails: {
        buildingId: { type: String, required: true },
        buildingName: { type: String, required: true },
        row: { type: Number, required: true },
        col: { type: Number, required: true },
        roomType: { type: String, required: true },
        pricePerMonth: { type: Number, required: true }
    },
    moveInDate: {
        type: Date, 
        required: true
    },
    hasMoved: {
        type: Boolean,
        default: false
    },
    moveInNudgeSentAt: { type: Date, default: null },
    moveInOwnerNudgeSentAt: { type: Date, default: null },
    moveInOwnerToken: { type: String, default: null },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending"
    },
    viewingRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ViewingRequest",
        required: false
    }

   
}, {timestamps: true});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;