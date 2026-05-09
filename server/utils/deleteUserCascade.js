import { createClerkClient } from '@clerk/express';

import User from '../models/user.js';
import House from '../models/house.js';
import Room from '../models/room.js';
import Property from '../models/property.js';
import Booking from '../models/booking.js';
import ViewingRequest from '../models/viewingRequest.js';
import Chat from '../models/chat.js';
import Notification from '../models/notification.js';
import Feedback from '../models/feedback.js';
import Report from '../models/report.js';
import PropertyUnlock from '../models/propertyUnlock.js';
import PushSubscription from '../models/pushSubscription.js';
import LandlordApplication from '../models/landlordApplication.js';
import RoomContact from '../models/roomContact.js';
import RentPayment from '../models/rentPayment.js';
import UtilityEntry from '../models/utilityEntry.js';
import PropertyClaim from '../models/propertyClaim.js';
import SiteVisit from '../models/siteVisit.js';
import UserPass from '../models/userPass.js';
import AgentApplication from '../models/agentApplication.js';
import AgentVacancy from '../models/agentVacancy.js';
import AgentLead from '../models/agentLead.js';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const isClerkNotFoundError = (err) => {
  const status = Number(err?.status || err?.errors?.[0]?.meta?.status || 0);
  const code = String(err?.errors?.[0]?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return status === 404 || code === 'resource_not_found' || msg.includes('not found');
};

export const deleteUserCascade = async ({ userId, requireClerkDeletion = true }) => {
  if (!userId) {
    throw new Error('userId is required');
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return {
      success: false,
      notFound: true,
      message: 'User not found',
      summary: {},
    };
  }

  if (requireClerkDeletion) {
    try {
      await clerk.users.deleteUser(userId);
    } catch (err) {
      if (!isClerkNotFoundError(err)) {
        throw new Error(`Failed to delete Clerk account: ${err.message}`);
      }
    }
  }

  const userIdStr = String(userId);
  const houses = await House.find({ owner: userIdStr }, '_id').lean();
  const houseIds = houses.map((h) => String(h._id));

  const properties = await Property.find({ owner: userIdStr }, '_id').lean();
  const propertyIds = properties.map((p) => p._id);
  const propertyIdStrings = propertyIds.map((p) => String(p));

  const vacancies = await AgentVacancy.find({ agent: userIdStr }, '_id').lean();
  const vacancyIds = vacancies.map((v) => v._id);

  const reportItemIds = [...houseIds, ...propertyIdStrings, ...vacancyIds.map((v) => String(v)), userIdStr];

  const results = {};
  results.rooms = await Room.deleteMany({ house: { $in: houseIds } });
  results.bookingsByUser = await Booking.deleteMany({ user: userIdStr });
  results.bookingsByProperty = await Booking.deleteMany({ property: { $in: propertyIds } });
  results.viewingByUser = await ViewingRequest.deleteMany({ $or: [{ renter: userIdStr }, { owner: userIdStr }] });
  results.viewingByProperty = await ViewingRequest.deleteMany({ property: { $in: propertyIds } });
  results.chatsByUser = await Chat.deleteMany({ $or: [{ tenant: userIdStr }, { houseOwner: userIdStr }] });
  results.chatsByProperty = await Chat.deleteMany({ property: { $in: propertyIds } });
  results.notifications = await Notification.deleteMany({ user: userIdStr });
  results.feedback = await Feedback.deleteMany({ user: userIdStr });
  results.reportsByUser = await Report.deleteMany({ $or: [{ reportedBy: userIdStr }, { reportedUserId: userIdStr }, { reviewedBy: userIdStr }] });
  results.reportsByItem = await Report.deleteMany({ reportedItemId: { $in: reportItemIds } });
  results.unlocksByUser = await PropertyUnlock.deleteMany({ user: userIdStr });
  results.unlocksByProperty = await PropertyUnlock.deleteMany({ property: { $in: propertyIds } });
  results.pushSubscriptions = await PushSubscription.deleteMany({ user: userIdStr });
  results.landlordApplications = await LandlordApplication.deleteMany({ userId: userIdStr });
  results.agentApplications = await AgentApplication.deleteMany({ user: userIdStr });
  results.agentLeads = await AgentLead.deleteMany({
    $or: [
      { agent: userIdStr },
      { student: userIdStr },
      { markedBy: userIdStr },
      { vacancy: { $in: vacancyIds } },
    ],
  });
  results.agentVacancies = await AgentVacancy.deleteMany({ agent: userIdStr });
  results.roomContacts = await RoomContact.deleteMany({ property: { $in: propertyIds } });
  results.rentPaymentsByProperty = await RentPayment.deleteMany({ property: { $in: propertyIdStrings } });
  results.rentPaymentsByRecorder = await RentPayment.deleteMany({ recordedBy: userIdStr });
  results.utilityByProperty = await UtilityEntry.deleteMany({ property: { $in: propertyIdStrings } });
  results.utilityByRecorder = await UtilityEntry.deleteMany({ recordedBy: userIdStr });
  results.propertyClaims = await PropertyClaim.deleteMany({ $or: [{ claimantId: userIdStr }, { reviewedBy: userIdStr }] });
  results.siteVisits = await SiteVisit.deleteMany({ $or: [{ visitor: userIdStr }, { host: userIdStr }] });
  results.userPasses = await UserPass.deleteMany({ user: userIdStr });
  results.propertiesOwned = await Property.deleteMany({ owner: userIdStr });
  results.propertiesClaimed = await Property.updateMany({ claimedBy: userIdStr }, {
    $set: {
      isClaimed: false,
      claimedBy: null,
      claimedByEmail: '',
      claimRole: '',
      claimPhone: '',
      claimSubmittedAt: null,
      claimReviewedAt: null,
      claimReviewNote: '',
      claimStatus: 'none',
    },
  });
  results.houses = await House.deleteMany({ owner: userIdStr });
  results.user = await User.deleteOne({ _id: userIdStr });

  const summary = Object.fromEntries(
    Object.entries(results).map(([key, value]) => [key, Number(value?.deletedCount || value?.modifiedCount || 0)])
  );

  return {
    success: true,
    notFound: false,
    message: 'User and related data deleted successfully',
    summary,
  };
};
