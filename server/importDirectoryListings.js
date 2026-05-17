import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import Property from './models/property.js';
import User from './models/user.js';

dotenv.config();

const REQUIRED_COLUMNS = [
  'name',
  'place',
  'estate',
  'address',
  'landlordName',
  'contact',
  'whatsappNumber',
  'propertyType',
  'amenities',
  'declaredUnits',
  'listedRentMin',
  'listedRentMax',
  'sourceType',
  'consentStatus',
];

const HEADER_ALIASES = {
  name: ['name', 'name of hostel', 'hostel name'],
  place: ['place', 'town', 'city'],
  estate: ['estate', 'physical location', 'location'],
  address: ['address', 'physical location', 'location'],
  landlordName: ['landlordname', 'landlord name', 'contact person'],
  contact: ['contact', 'phone number', 'phone', 'contact phone'],
  whatsappNumber: ['whatsappnumber', 'whatsapp number', 'phone number', 'phone'],
  propertyType: ['propertytype', 'property type'],
  amenities: ['amenities', 'brief description', 'description'],
  declaredUnits: ['declaredunits', 'declared units', 'capacity', 'number of units'],
  listedRentMin: ['listedrentmin', 'listed rent min', 'rent min', 'minimum rent'],
  listedRentMax: ['listedrentmax', 'listed rent max', 'rent max', 'maximum rent'],
  sourceType: ['sourcetype', 'source type'],
  consentStatus: ['consentstatus', 'consent status'],
  rentRange: ['range of rent per month (kes)', 'range of rent per month', 'range of rent', 'rent range', 'range of rent per month’s', 'range of rent per months'],
};

const normalizeHeader = (value) => String(value || '')
  .toLowerCase()
  .replace(/\r?\n/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {
    file: path.resolve(process.cwd(), 'imports', 'listings.csv'),
    owner: null,
    ownerEmail: null,
    dryRun: false,
    skipDuplicates: true,
    defaultPlace: 'Eldoret',
  };

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const val = args[i + 1];

    if (key === '--file' && val) {
      out.file = path.resolve(process.cwd(), val);
      i += 1;
      continue;
    }
    if (key === '--owner' && val) {
      out.owner = val;
      i += 1;
      continue;
    }
    if (key === '--owner-email' && val) {
      out.ownerEmail = val.toLowerCase().trim();
      i += 1;
      continue;
    }
    if (key === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (key === '--no-skip-duplicates') {
      out.skipDuplicates = false;
      continue;
    }
    if (key === '--default-place' && val) {
      out.defaultPlace = String(val).trim();
      i += 1;
      continue;
    }
  }

  return out;
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
};

const resolveHeaderMap = (headers) => {
  const normalizedToOriginal = new Map();
  headers.forEach((h) => normalizedToOriginal.set(normalizeHeader(h), h));

  const map = {};
  Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
    const match = aliases.find((alias) => normalizedToOriginal.has(normalizeHeader(alias)));
    if (match) {
      map[canonical] = normalizedToOriginal.get(normalizeHeader(match));
    }
  });

  return map;
};

const parsePhoneNumbers = (value) => {
  const numbers = String(value || '')
    .match(/(?:\+?254|0)\d{8,9}/g) || [];

  const cleaned = numbers.map((n) => n.replace(/\s+/g, ''));
  return [...new Set(cleaned)];
};

const parseRentRange = (value) => {
  const nums = (String(value || '').match(/\d[\d,]*/g) || [])
    .map((x) => Number(x.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!nums.length) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

const extractAmenities = (description) => {
  const text = String(description || '').toLowerCase();
  if (!text) return '';

  const tags = [];
  if (text.includes('wifi')) tags.push('wifi');
  if (text.includes('eldowas') || text.includes('water') || text.includes('bore hole') || text.includes('borehole')) tags.push('water');
  if (text.includes('token')) tags.push('electricity_tokens');
  if (text.includes('gate is closed at 10pm') || text.includes('closed at 10pm')) tags.push('gate_closes_10pm');
  if (text.includes('share a room') || text.includes('allows two people')) tags.push('allows_sharing');
  if (text.includes('pit latrine')) tags.push('pit_latrine');
  if (text.includes('parking')) tags.push('parking');

  if (!tags.length) return '';
  return [...new Set(tags)].join('|');
};

const mapRawRowToCanonical = (rawRow, headerMap, options) => {
  const pick = (canonical) => String(rawRow[headerMap[canonical]] ?? '').trim();

  const rentText = pick('rentRange');
  const parsedRent = parseRentRange(rentText);

  const declaredUnitsRaw = pick('declaredUnits');
  const declaredUnitsMatch = declaredUnitsRaw.match(/\d+/);

  const contactText = [pick('contact'), pick('landlordName')].filter(Boolean).join(' ');
  const phones = parsePhoneNumbers(contactText);
  const fallbackPhone = pick('contact').replace(/\s+/g, '');

  const amenitiesSource = pick('amenities');
  const amenities = amenitiesSource.includes('|')
    ? amenitiesSource
    : extractAmenities(amenitiesSource);

  const row = {
    name: pick('name'),
    place: pick('place') || options.defaultPlace || 'Eldoret',
    estate: pick('estate'),
    address: pick('address') || pick('estate'),
    landlordName: pick('landlordName'),
    contact: phones[0] || fallbackPhone,
    whatsappNumber: phones[1] || phones[0] || fallbackPhone,
    propertyType: pick('propertyType') || 'hostel',
    amenities,
    declaredUnits: declaredUnitsMatch ? declaredUnitsMatch[0] : '',
    listedRentMin: pick('listedRentMin') || (parsedRent.min ?? ''),
    listedRentMax: pick('listedRentMax') || (parsedRent.max ?? ''),
    sourceType: pick('sourceType') || 'field_list',
    consentStatus: pick('consentStatus') || 'unknown',
  };

  return row;
};

const readTabularRows = (headers, rawRows, options) => {
  const headerMap = resolveHeaderMap(headers);
  if (!headerMap.name) {
    throw new Error('Could not find a listing name column. Expected something like "name" or "Name of Hostel".');
  }
  if (!headerMap.estate) {
    throw new Error('Could not find a location column. Expected something like "estate" or "Physical Location".');
  }

  const rows = [];
  for (const rawRow of rawRows) {
    const row = mapRawRowToCanonical(rawRow, headerMap, options);
    if (!row.name || !row.estate) continue;
    rows.push(row);
  }

  return rows;
};

const readCsv = (filePath, options) => {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((x) => x.trim().length > 0);
  if (!lines.length) throw new Error('CSV file is empty.');

  const headers = parseCsvLine(lines[0]);
  const rawRows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const rawRow = {};

    headers.forEach((h, idx) => {
      rawRow[h] = (values[idx] || '').trim();
    });
    rawRows.push(rawRow);
  }

  return readTabularRows(headers, rawRows, options);
};

const readXlsx = (filePath, options) => {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  if (!workbook.SheetNames.length) {
    throw new Error('XLSX has no sheets.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const aoa = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!aoa.length) {
    throw new Error('XLSX first sheet has no rows.');
  }

  // Find the row that contains actual table headers (skip title rows).
  let headerRowIndex = -1;
  for (let i = 0; i < aoa.length; i += 1) {
    const candidateHeaders = (aoa[i] || []).map((h) => String(h).trim());
    const headerMap = resolveHeaderMap(candidateHeaders);
    if (headerMap.name && headerMap.estate) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex < 0) {
    throw new Error('Could not detect header row in XLSX. Ensure a row contains "Name of Hostel" and "Physical Location".');
  }

  const headers = (aoa[headerRowIndex] || []).map((h) => String(h).trim());
  const dataRows = aoa.slice(headerRowIndex + 1);
  const jsonRows = dataRows.map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    return obj;
  });

  return readTabularRows(headers, jsonRows, options);
};

const readRows = (filePath, options) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return readCsv(filePath, options);
  if (ext === '.xlsx' || ext === '.xls') return readXlsx(filePath, options);
  throw new Error(`Unsupported file extension: ${ext}. Use .csv or .xlsx`);
};

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
};

const normalizeAmenities = (value) => {
  if (!value) return [];
  return value
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
};

const resolveOwner = async ({ owner, ownerEmail }) => {
  if (owner) return owner;
  if (!ownerEmail) {
    throw new Error('Provide --owner <clerkUserId> or --owner-email <email>.');
  }

  const user = await User.findOne({ email: ownerEmail }).select('_id').lean();
  if (!user?._id) {
    throw new Error(`No user found for owner email: ${ownerEmail}`);
  }

  return user._id;
};

const buildDocument = (row, ownerId) => {
  const min = toNumberOrNull(row.listedRentMin);
  const max = toNumberOrNull(row.listedRentMax);

  return {
    owner: ownerId,
    name: row.name,
    place: row.place,
    estate: row.estate,
    address: row.address || `${row.estate}, ${row.place}`,
    landlordName: row.landlordName || '',
    contact: row.contact || 'Contact available on request',
    whatsappNumber: row.whatsappNumber || '',
    propertyType: row.propertyType || 'mixed',
    amenities: normalizeAmenities(row.amenities),
    declaredUnits: toNumberOrNull(row.declaredUnits),
    listedRentMin: min,
    listedRentMax: max,
    sourceType: row.sourceType || 'field_list',
    consentStatus: row.consentStatus || 'unknown',

    listingTier: 'directory',
    vacancyStatus: 'unknown',
    actionability: 'info_only',
    hasRoomLevelData: false,

    buildings: [],
    images: [],
    isVerified: false,
    needsRefresh: false,
    isExpired: false,
  };
};

const main = async () => {
  const opts = parseArgs();

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing in environment.');
  }

  if (!fs.existsSync(opts.file)) {
    throw new Error(`Import file not found at: ${opts.file}`);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 60000,
  });

  const ownerId = await resolveOwner(opts);
  const rows = readRows(opts.file, opts);

  console.log(`Loaded ${rows.length} rows from ${path.basename(opts.file)}`);
  console.log(`Owner: ${ownerId}`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (opts.skipDuplicates) {
      const duplicate = await Property.findOne({
        owner: ownerId,
        name: row.name,
        place: row.place,
        estate: row.estate,
      }).select('_id').lean();

      if (duplicate?._id) {
        skipped += 1;
        continue;
      }
    }

    const doc = buildDocument(row, ownerId);

    if (opts.dryRun) {
      inserted += 1;
      continue;
    }

    await Property.create(doc);
    inserted += 1;
  }

  console.log(`Done. ${opts.dryRun ? 'Would insert' : 'Inserted'}: ${inserted}`);
  console.log(`Skipped duplicates: ${skipped}`);

  await mongoose.disconnect();
};

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Import failed:', err.message);
    console.error(err.stack);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
