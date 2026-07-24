import Property from '../models/property.js';
import AgentVacancy from '../models/agentVacancy.js';
import UserPass from '../models/userPass.js';
import { approximateCoordinates, normalizeCoordinates } from '../utils/geoUtils.js';
import { hasRole } from '../utils/roleUtils.js';

/** Active global browsing pass (paid / free global). */
const activeGlobalPass = (userId) =>
  UserPass.findOne({
    user: userId,
    paymentStatus: 'completed',
    expiresAt: { $gt: new Date() },
    $or: [{ property: null }, { property: { $exists: false } }],
  });

const hasMapAccess = async (user) => {
  if (!user?._id) return { unlocked: false, unlock: null };
  if (hasRole(user, 'admin')) return { unlocked: true, unlock: null };
  const pass = await activeGlobalPass(user._id);
  if (!pass) return { unlocked: false, unlock: null };
  return {
    unlocked: true,
    unlock: {
      passType: pass.passType,
      expiresAt: pass.expiresAt,
      daysRemaining: Math.ceil((pass.expiresAt - new Date()) / (1000 * 60 * 60 * 24)),
    },
  };
};

const toApproxPin = (id, latitude, longitude, extra) => {
  const approx = approximateCoordinates(latitude, longitude, id);
  return {
    id: String(id),
    lat: approx.latitude,
    lng: approx.longitude,
    ...extra,
  };
};

/**
 * GET /api/map/pins
 * Approximate pins require an active browsing pass (admins always unlocked).
 */
export const getMapPins = async (req, res) => {
  try {
    const { unlocked, unlock } = await hasMapAccess(req.user);

    const [properties, vacancies] = await Promise.all([
      Property.find({
        isExpired: { $ne: true },
        'coordinates.latitude': { $exists: true, $ne: null },
        'coordinates.longitude': { $exists: true, $ne: null },
        $or: [
          { vacantRooms: { $gt: 0 } },
          { vacancyStatus: { $in: ['available', 'limited'] } },
        ],
      })
        .select('name estate place listedRentMin listedRentMax vacantRooms propertyType images coordinates vacancyStatus')
        .lean(),
      AgentVacancy.find({
        isActive: true,
        status: { $in: ['open', 'contacted'] },
        availableRooms: { $gt: 0 },
        'location.coordinates.latitude': { $exists: true, $ne: null },
        'location.coordinates.longitude': { $exists: true, $ne: null },
      })
        .select('title location rent roomType availableRooms photos')
        .lean(),
    ]);

    const propertyCandidates = properties.filter((p) => {
      const c = normalizeCoordinates(p.coordinates);
      return c && (Number(p.vacantRooms) > 0 || ['available', 'limited'].includes(p.vacancyStatus));
    });

    const vacancyCandidates = vacancies.filter((v) =>
      normalizeCoordinates(v.location?.coordinates)
    );

    const pinCount = propertyCandidates.length + vacancyCandidates.length;

    if (!unlocked) {
      return res.json({
        success: true,
        unlocked: false,
        unlock: null,
        pinCount,
        pins: [],
        message: 'Unlock a browsing pass to see vacancy pins on the map.',
      });
    }

    const pins = [
      ...propertyCandidates.map((p) => {
        const c = normalizeCoordinates(p.coordinates);
        return toApproxPin(p._id, c.latitude, c.longitude, {
          sourceType: 'property',
          title: p.name,
          area: p.estate,
          place: p.place,
          rentMin: p.listedRentMin ?? null,
          rentMax: p.listedRentMax ?? null,
          vacantRooms: p.vacantRooms ?? 0,
          roomType: p.propertyType || '',
          image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
          href: `/rooms/${p._id}`,
        });
      }),
      ...vacancyCandidates.map((v) => {
        const c = normalizeCoordinates(v.location.coordinates);
        return toApproxPin(v._id, c.latitude, c.longitude, {
          sourceType: 'agent',
          title: v.title || 'Agent listing',
          area: v.location?.area || '',
          place: v.location?.city || '',
          rentMin: v.rent?.min ?? null,
          rentMax: v.rent?.max ?? null,
          vacantRooms: v.availableRooms ?? 0,
          roomType: v.roomType || '',
          image: Array.isArray(v.photos) && v.photos[0]?.url ? v.photos[0].url : null,
          href: `/rooms/${v._id}`,
        });
      }),
    ];

    return res.json({
      success: true,
      unlocked: true,
      unlock,
      pinCount: pins.length,
      pins,
    });
  } catch (error) {
    console.error('getMapPins error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load map pins' });
  }
};
