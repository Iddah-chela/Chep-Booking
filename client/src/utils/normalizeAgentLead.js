/**
 * Normalize /api/agent/leads items (nested { type:'lead', lead } or chats)
 * into a flat lead-shaped object for Bookings / Viewings / Dashboard.
 */
export const unwrapAgentLeadItem = (item) => {
  if (!item) return null;

  // Chat merge items — skip for booking/viewing pages
  if (item.type === 'chat' || String(item._id || '').startsWith('chat_')) {
    return null;
  }

  const lead =
    item.type === 'lead' && item.lead
      ? (typeof item.lead.toObject === 'function' ? item.lead.toObject() : item.lead)
      : item.lead && !item.leadType && !item.studentInfo
        ? (typeof item.lead.toObject === 'function' ? item.lead.toObject() : item.lead)
        : item;

  if (!lead || lead.type === 'chat') return null;

  const plain = typeof lead.toObject === 'function' ? lead.toObject() : { ...lead };

  // Preserve nested vacancy/student if they were only on the wrapper
  if (!plain.vacancy && item.vacancy) plain.vacancy = item.vacancy;
  if (!plain.student && item.student) plain.student = item.student;

  return plain;
};

export const resolveTenantName = (lead) => {
  const raw = String(lead?.studentInfo?.name || '').trim();
  const placeholder = ['', 'student', 'tenant', 'n/a', 'user'].includes(raw.toLowerCase());

  if (!placeholder) return raw;

  const u = lead?.student;
  if (u && typeof u === 'object') {
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    if (u.username) return String(u.username).trim();
  }

  return raw || 'Tenant';
};

export const resolveTenantPhone = (lead) => {
  const fromInfo = String(lead?.studentInfo?.phone || '').trim();
  if (fromInfo) return fromInfo;
  const u = lead?.student;
  if (u && typeof u === 'object') {
    return String(u.phoneNumber || u.phone || '').trim() || '—';
  }
  return '—';
};

export const formatVacancyLabel = (vacancy, fallback = 'Listing') => {
  if (!vacancy || typeof vacancy !== 'object') return fallback;
  const title = String(vacancy.title || vacancy.roomType || '').trim() || fallback;
  const area = String(vacancy.location?.area || '').trim();
  const city = String(vacancy.location?.city || '').trim();
  const place = [area, city].filter(Boolean).join(', ');
  return place ? `${title} · ${place}` : title;
};

export const formatRoomLabel = (lead) => {
  const rd = lead?.roomDetails || {};
  const roomType = rd.roomType || lead?.preferredRoomType || lead?.vacancy?.roomType || '';
  const building = rd.buildingName || '';
  const parts = [building, roomType].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
};
