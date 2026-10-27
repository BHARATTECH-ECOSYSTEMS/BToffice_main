// Shared persistence API.
// The app historically imported this module as "kv"; it now prefers MongoDB
// and uses local JSON only as a development fallback when MongoDB is unavailable.

import fs from 'fs/promises';
import path from 'path';
import { Types } from 'mongoose';
import { connectDB, isMongoConfigured } from '@/lib/mongodb';
import Interview from '@/models/Interview';
import ParticipantToken from '@/models/ParticipantToken';
import Study from '@/models/Study';
import UsedLaunchPass from '@/models/UsedLaunchPass';
import { StoredInterview, StoredStudy } from '@/types';
import { DEMO_INTERVIEWS, DEMO_STUDY_CONFIG } from '@/lib/demoData';

/** One interview turn on a link: the candidate's answer and the interviewer's reply. */
export type ParticipantExchange = { answer: string; question: string; at: number };

type LocalStore = {
  interviews: Record<string, StoredInterview>;
  studies: Record<string, StoredStudy>;
  studyInterviews: Record<string, string[]>;
  participantTokens: Record<string, {
    studyId: string;
    studyConfig: StoredStudy['config'];
    expiresAt: number;
    terminationReason?: string;
    terminatedAt?: number;
    completedAt?: number;
    turns?: number;
    exchanges?: ParticipantExchange[];
  }>;
  usedLaunchPasses: Record<string, number>;
};

const LOCAL_STORE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), '.data', 'local-store.json');

let mongoAvailableCache: boolean | null = null;
let warnedAboutLocalFallback = false;
let lastMongoError: unknown = null;

function isLocalFileStorageEnabled() {
  return process.env.LOCAL_FILE_STORAGE === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.LOCAL_FILE_STORAGE !== 'false');
}

function shouldLogStorageFallback() {
  return process.env.DEBUG_STORAGE === 'true' || process.env.LOCAL_FILE_STORAGE === 'true';
}

function createEmptyStore(): LocalStore {
  return {
    interviews: {},
    studies: {},
    studyInterviews: {},
    participantTokens: {},
    usedLaunchPasses: {}
  };
}

function stripMongoFields<T extends Record<string, any>>(document: T) {
  const { __v, ...clean } = document;
  return clean;
}

function stripMongoWriteFields<T extends Record<string, any>>(document: T) {
  const { _id, __v, ...clean } = document;
  return clean;
}

function toTimestamp(value: any, fallback = Date.now()): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : fallback;
  }
  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : fallback;
  }
  if (value && typeof value === 'object' && '$date' in value) {
    return toTimestamp(value.$date, fallback);
  }
  return fallback;
}

function normalizeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function getProfileValue(profile: any, keys: string[]) {
  if (!profile || typeof profile !== 'object') return null;

  for (const key of keys) {
    const value = profile[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  const fields = normalizeArray(profile.fields);
  const match = fields.find((field: any) => {
    const fieldId = `${field?.fieldId || field?.id || field?.label || ''}`.toLowerCase();
    return keys.some(key => fieldId.includes(key.toLowerCase())) && field?.value;
  });

  return typeof match?.value === 'string' ? match.value.trim() : null;
}

function normalizeParticipantProfile(profile: any, documentId: string, timestamp: number) {
  const fields = normalizeArray(profile?.fields);

  return {
    id: profile?.id || `profile-${documentId}`,
    fields,
    rawContext: typeof profile?.rawContext === 'string' ? profile.rawContext : '',
    timestamp: toTimestamp(profile?.timestamp, timestamp)
  };
}

function interviewLookupQuery(id: string) {
  const conditions: any[] = [{ id }];

  if (Types.ObjectId.isValid(id)) {
    conditions.push({ _id: new Types.ObjectId(id) });
  }

  return { $or: conditions };
}

function toStoredInterview(document: any): StoredInterview {
  const clean = stripMongoFields(document);
  const mongoId = clean._id?.toString();
  const id = clean.id || mongoId;
  const objectIdTimestamp = mongoId && Types.ObjectId.isValid(mongoId)
    ? new Types.ObjectId(mongoId).getTimestamp().getTime()
    : Date.now();
  const createdAt = toTimestamp(clean.createdAt || clean.completedAt || clean.updatedAt, objectIdTimestamp);
  const completedAt = clean.completedAt ? toTimestamp(clean.completedAt, createdAt) : (clean.status === 'completed' ? createdAt : null);
  const transcript = normalizeArray(clean.transcript).length
    ? normalizeArray(clean.transcript)
    : normalizeArray(clean.messages).length
      ? normalizeArray(clean.messages)
      : normalizeArray(clean.history);
  const messages = normalizeArray(clean.messages).length ? normalizeArray(clean.messages) : transcript;
  const history = normalizeArray(clean.history).length ? normalizeArray(clean.history) : messages;
  const participantProfile = normalizeParticipantProfile(clean.participantProfile, id, createdAt);
  const participantName =
    clean.participantName ||
    getProfileValue(clean.participantProfile, ['participantName', 'name', 'fullName', 'participant']) ||
    'Unknown Participant';

  return {
    ...clean,
    _id: mongoId,
    id,
    studyId: clean.studyId || 'unknown-study',
    studyName: clean.studyName || `Study ${String(clean.studyId || 'unknown').slice(0, 8)}`,
    participantName,
    participantProfile,
    transcript,
    messages,
    history,
    synthesis: clean.synthesis || null,
    behaviorData: clean.behaviorData || {
      timePerTopic: {},
      messagesPerTopic: {},
      topicsExplored: [],
      contradictions: []
    },
    createdAt,
    completedAt,
    status: clean.status === 'in-progress'
      ? 'in_progress'
      : clean.status || (clean.completedAt ? 'completed' : 'in_progress')
  } as StoredInterview;
}

function toStoredStudy(document: any): StoredStudy {
  const clean = stripMongoFields(document);
  return {
    ...clean,
    id: clean.id || clean._id?.toString()
  } as StoredStudy;
}

function getStudyIdentity(studyId: string, study?: StoredStudy | null) {
  return {
    ids: Array.from(new Set([
      studyId,
      study?.id,
      study?.config?.id
    ].filter((value): value is string => Boolean(value)))),
    name: study?.config?.name
  };
}

function getDemoInterviewsForStudy(studyId: string, study?: StoredStudy | null): StoredInterview[] {
  const identity = getStudyIdentity(studyId, study);
  const isDemoStudy =
    identity.ids.includes(DEMO_STUDY_CONFIG.id) ||
    identity.name === DEMO_STUDY_CONFIG.name;

  if (!isDemoStudy) return [];

  return DEMO_INTERVIEWS
    .map(interview => ({ ...interview }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function findMongoStudyInterviews(studyId: string, study?: StoredStudy | null): Promise<StoredInterview[]> {
  const identity = getStudyIdentity(studyId, study);
  const conditions: any[] = identity.ids.map(id => ({ studyId: id }));

  if (identity.name) {
    conditions.push({ studyName: identity.name });
  }

  const interviews = conditions.length
    ? await Interview.find({ $or: conditions }).lean()
    : [];

  const storedInterviews = interviews
    .map(toStoredInterview)
    .sort((a, b) => b.createdAt - a.createdAt);

  return storedInterviews.length ? storedInterviews : getDemoInterviewsForStudy(studyId, study);
}

function findLocalStudyInterviews(store: LocalStore, studyId: string, study?: StoredStudy | null): StoredInterview[] {
  const identity = getStudyIdentity(studyId, study);
  const indexedIds = identity.ids.flatMap(id => store.studyInterviews[id] || []);
  const indexedInterviews = indexedIds
    .map(id => store.interviews[id])
    .filter((interview): interview is StoredInterview => Boolean(interview));

  const allMatchingInterviews = Object.values(store.interviews).filter((interview) => {
    return identity.ids.includes(interview.studyId) ||
      Boolean(identity.name && interview.studyName === identity.name);
  });

  const deduped = new Map<string, StoredInterview>();
  [...indexedInterviews, ...allMatchingInterviews].forEach((interview) => {
    deduped.set(interview.id || interview._id || `${interview.studyId}-${interview.createdAt}`, interview);
  });

  const interviews = Array.from(deduped.values())
    .sort((a, b) => b.createdAt - a.createdAt);

  return interviews.length ? interviews : getDemoInterviewsForStudy(studyId, study);
}

async function shouldUseMongo(): Promise<boolean> {
  if (!isMongoConfigured()) return false;
  if (mongoAvailableCache !== null) return mongoAvailableCache;

  try {
    await connectDB();
    mongoAvailableCache = true;
    lastMongoError = null;
    return true;
  } catch (error) {
    mongoAvailableCache = false;
    lastMongoError = error;

    if (isLocalFileStorageEnabled() && !warnedAboutLocalFallback && shouldLogStorageFallback()) {
      console.warn(
        `MongoDB is unavailable; using local file storage at ${LOCAL_STORE_PATH}. ` +
        'Set LOCAL_FILE_STORAGE=false to disable this development fallback.'
      );
      warnedAboutLocalFallback = true;
    } else if (!isLocalFileStorageEnabled()) {
      console.error('MongoDB is unavailable:', error);
    }

    return false;
  }
}

async function readLocalStore(): Promise<LocalStore> {
  if (!isLocalFileStorageEnabled()) {
    throw new Error('Local file storage fallback is disabled');
  }

  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      ...createEmptyStore(),
      ...parsed,
      interviews: parsed.interviews || {},
      studies: parsed.studies || {},
      studyInterviews: parsed.studyInterviews || {},
      participantTokens: parsed.participantTokens || {},
      usedLaunchPasses: parsed.usedLaunchPasses || {}
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return createEmptyStore();
    }

    throw error;
  }
}

// The file is written whole: to a temporary file first, then swapped in, so a crash mid-write can't leave half a file
// (owner's 3A, 2026-10-27). On Windows the swap can fail for a moment while another request is reading the file.
async function writeLocalStore(store: LocalStore) {
  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  const temp = `${LOCAL_STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temp, JSON.stringify(store, null, 2), 'utf8');
    for (let attempt = 1; ; attempt++) {
      try {
        await fs.rename(temp, LOCAL_STORE_PATH);
        return;
      } catch (error: any) {
        if (attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes(error?.code)) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 20));
      }
    }
  } finally {
    await fs.rm(temp, { force: true });
  }
}

// Saves wait their turn: each reads the file, changes it and writes it back while no other save runs, so two at the
// same moment can't both read the old file (a launch pass used twice, one of two saves lost). A failed save doesn't
// hold up the ones after it.
let localStoreQueue: Promise<unknown> = Promise.resolve();

function updateLocalStore<T>(updater: (store: LocalStore) => T | Promise<T>): Promise<T> {
  const turn = localStoreQueue.then(async () => {
    const store = await readLocalStore();
    const result = await updater(store);
    await writeLocalStore(store);
    return result;
  });
  localStoreQueue = turn.catch(() => undefined);
  return turn;
}

// Get interview by ID
export async function getInterview(id: string): Promise<StoredInterview | null> {
  try {
    if (await shouldUseMongo()) {
      const interview = await Interview.findOne(interviewLookupQuery(id)).lean();
      return interview ? toStoredInterview(interview) : null;
    }

    const store = await readLocalStore();
    return store.interviews[id] || null;
  } catch (error) {
    console.error('Error getting interview:', error);
    return null;
  }
}

// Save interview (create or update)
export async function saveInterview(interview: StoredInterview): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      const interviewToSave = stripMongoWriteFields(interview as any);
      await Interview.findOneAndUpdate(
        { id: interview.id },
        { $set: interviewToSave },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return true;
    }

    await updateLocalStore((store) => {
      store.interviews[interview.id] = interview;
      const studyInterviews = store.studyInterviews[interview.studyId] || [];
      if (!studyInterviews.includes(interview.id)) {
        studyInterviews.push(interview.id);
      }
      store.studyInterviews[interview.studyId] = studyInterviews;
    });
    return true;
  } catch (error) {
    console.error('Error saving interview:', error);
    return false;
  }
}

// Paginated result interface
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

// Get paginated interviews for reduced database load
export async function getPaginatedInterviews(options?: {
  studyId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<StoredInterview>> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, options?.limit || 10);
  const skip = (page - 1) * limit;

  try {
    if (await shouldUseMongo()) {
      let query: any = {};
      if (options?.studyId) {
        const studyDoc = await Study.findOne({ id: options.studyId }).lean();
        const identity = getStudyIdentity(options.studyId, studyDoc ? toStoredStudy(studyDoc) : null);
        const conditions: any[] = identity.ids.map(id => ({ studyId: id }));
        if (identity.name) {
          conditions.push({ studyName: identity.name });
        }
        if (conditions.length > 0) {
          query = { $or: conditions };
        }
      }

      const totalCount = await Interview.countDocuments(query);

      // If MongoDB is empty and studyId is demo, fallback to demo interviews
      if (totalCount === 0 && options?.studyId) {
        const studyDoc = await Study.findOne({ id: options.studyId }).lean();
        const demoInterviews = getDemoInterviewsForStudy(options.studyId, studyDoc ? toStoredStudy(studyDoc) : null);
        if (demoInterviews.length > 0) {
          const paginatedDemo = demoInterviews.slice(skip, skip + limit);
          return {
            items: paginatedDemo,
            totalCount: demoInterviews.length,
            totalPages: Math.ceil(demoInterviews.length / limit) || 1,
            currentPage: page,
            limit
          };
        }
      }

      const docs = await Interview.find(query)
        .sort({ createdAt: -1, completedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const items = docs.map(toStoredInterview);

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        currentPage: page,
        limit
      };
    }

    // Local storage fallback
    const store = await readLocalStore();
    let allInterviews: StoredInterview[] = [];
    if (options?.studyId) {
      allInterviews = findLocalStudyInterviews(store, options.studyId, store.studies[options.studyId] || null);
    } else {
      allInterviews = Object.values(store.interviews).sort((a, b) => (toTimestamp(b.createdAt) || 0) - (toTimestamp(a.createdAt) || 0));
    }

    const totalCount = allInterviews.length;
    const items = allInterviews.slice(skip, skip + limit);

    return {
      items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      limit
    };
  } catch (error) {
    console.error('Error getting paginated interviews:', error);
    return {
      items: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: page,
      limit
    };
  }
}

// Get all interviews
export async function getAllInterviews(): Promise<StoredInterview[]> {
  try {
    if (await shouldUseMongo()) {
      const interviews = await Interview.find().lean();
      return interviews
        .map(toStoredInterview)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    const store = await readLocalStore();
    return Object.values(store.interviews)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting all interviews:', error);
    return [];
  }
}

// Get interviews for a specific study
export async function getStudyInterviews(studyId: string): Promise<StoredInterview[]> {
  try {
    if (await shouldUseMongo()) {
      const study = await Study.findOne({ id: studyId }).lean();
      return await findMongoStudyInterviews(studyId, study ? toStoredStudy(study) : null);
    }

    const store = await readLocalStore();
    return findLocalStudyInterviews(store, studyId, store.studies[studyId] || null);
  } catch (error) {
    console.error('Error getting study interviews:', error);
    return [];
  }
}

// Delete interview
export async function deleteInterview(id: string, studyId: string): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      await Interview.deleteOne(interviewLookupQuery(id));
      await incrementStudyInterviewCount(studyId);
      return true;
    }

    await updateLocalStore((store) => {
      delete store.interviews[id];
      store.studyInterviews[studyId] = (store.studyInterviews[studyId] || [])
        .filter(interviewId => interviewId !== id);
    });
    return true;
  } catch (error) {
    console.error('Error deleting interview:', error);
    return false;
  }
}

// Historical name retained for existing route imports.
export async function isKVAvailable(): Promise<boolean> {
  return (await shouldUseMongo()) || isLocalFileStorageEnabled();
}

export async function isMongoStorageAvailable(): Promise<boolean> {
  return await shouldUseMongo();
}

export async function getStorageWarning(): Promise<string | null> {
  if (await shouldUseMongo()) return null;

  if (!isMongoConfigured()) {
    return 'Storage not configured. Set MONGODB_URI to enable persistence.';
  }

  const message = lastMongoError instanceof Error
    ? lastMongoError.message
    : String(lastMongoError || '');

  if (/bad auth|authentication failed/i.test(message)) {
    return 'MongoDB authentication failed. Update the username/password in MONGODB_URI, and URL-encode special characters in the password.';
  }

  if (/ENOTFOUND|ECONNREFUSED|querySrv|server selection/i.test(message)) {
    return 'MongoDB network connection failed. Check Atlas Network Access and allow your current IP address.';
  }

  return 'MongoDB connection failed. Check MONGODB_URI and MongoDB Atlas settings.';
}

// ============================================
// Study Storage Functions
// ============================================

// Save study (create or update)
export async function saveStudy(study: StoredStudy): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      const studyToSave = stripMongoWriteFields(study as any);
      await Study.findOneAndUpdate(
        { id: study.id },
        { $set: studyToSave },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return true;
    }

    await updateLocalStore((store) => {
      store.studies[study.id] = study;
    });
    return true;
  } catch (error) {
    console.error('Error saving study:', error);
    return false;
  }
}

// Get study by ID
export async function getStudy(id: string): Promise<StoredStudy | null> {
  try {
    if (await shouldUseMongo()) {
      const study = await Study.findOne({ id }).lean();
      if (!study) return null;
      const storedStudy = toStoredStudy(study);
      const interviews = await findMongoStudyInterviews(storedStudy.id, storedStudy);
      return {
        ...storedStudy,
        interviewCount: interviews.length
      };
    }

    const store = await readLocalStore();
    const study = store.studies[id] || null;
    if (!study) return null;
    return {
      ...study,
      interviewCount: findLocalStudyInterviews(store, id, study).length
    };
  } catch (error) {
    console.error('Error getting study:', error);
    return null;
  }
}

// Get all studies
export async function getAllStudies(): Promise<StoredStudy[]> {
  try {
    if (await shouldUseMongo()) {
      const studies = await Study.find().sort({ createdAt: -1 }).lean();
      return await Promise.all(
        studies.map(async (study) => {
          const storedStudy = toStoredStudy(study);
          const interviewCount = (await findMongoStudyInterviews(storedStudy.id, storedStudy)).length;
          return {
            ...storedStudy,
            interviewCount
          };
        })
      );
    }

    const store = await readLocalStore();
    return Object.values(store.studies)
      .map(study => ({
        ...study,
        interviewCount: findLocalStudyInterviews(store, study.id, study).length
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting all studies:', error);
    return [];
  }
}

// Delete study (only if no interviews exist)
export async function deleteStudy(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const study = await getStudy(id);
    if (!study) {
      return { success: false, error: 'Study not found' };
    }
    if (study.isLocked) {
      return { success: false, error: 'Study is locked. Unlock it first to delete it.' };
    }

    if (await shouldUseMongo()) {
      // Deleting a study also deletes its interviews and its candidate links, so nothing is left
      // orphaned in the database and no link keeps running interviews for it.
      await ParticipantToken.deleteMany({ studyId: id });
      await Interview.deleteMany({ studyId: id });
      await Study.deleteOne({ id });
      return { success: true };
    }

    return await updateLocalStore((store) => {
      const interviewIds = store.studyInterviews[id] || [];
      // Clean up any interviews tied to this study too.
      for (const interviewId of interviewIds) {
        delete store.interviews[interviewId];
      }
      for (const [token, link] of Object.entries(store.participantTokens)) {
        if (link.studyId === id) delete store.participantTokens[token];
      }

      delete store.studies[id];
      delete store.studyInterviews[id];
      return { success: true };
    });
  } catch (error) {
    console.error('Error deleting study:', error);
    return { success: false, error: 'Failed to delete study' };
  }
}

// Refresh interview count for a study
export async function incrementStudyInterviewCount(studyId: string): Promise<boolean> {
  try {
    const study = await getStudy(studyId);
    if (!study) return false;

    const interviewCount = (await shouldUseMongo())
      ? (await findMongoStudyInterviews(studyId, study)).length
      : findLocalStudyInterviews(await readLocalStore(), studyId, study).length;

    study.interviewCount = interviewCount;
    study.updatedAt = Date.now();
    return await saveStudy(study);
  } catch (error) {
    console.error('Error refreshing study interview count:', error);
    return false;
  }
}

// Lock study (prevent further edits/deletion)
export async function lockStudy(studyId: string): Promise<boolean> {
  try {
    const study = await getStudy(studyId);
    if (!study) return false;
    if (study.isLocked) return true;

    study.isLocked = true;
    study.updatedAt = Date.now();
    return await saveStudy(study);
  } catch (error) {
    console.error('Error locking study:', error);
    return false;
  }
}

// Unlock study (allow edits/deletion again)
export async function unlockStudy(studyId: string): Promise<boolean> {
  try {
    const study = await getStudy(studyId);
    if (!study) return false;
    if (!study.isLocked) return true;

    study.isLocked = false;
    study.updatedAt = Date.now();
    return await saveStudy(study);
  } catch (error) {
    console.error('Error unlocking study:', error);
    return false;
  }
}

export async function saveParticipantToken(
  token: string,
  data: { studyId: string; studyConfig: StoredStudy['config'] },
  ttlSeconds: number
): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      await ParticipantToken.findOneAndUpdate(
        { token },
        {
          $set: {
            ...data,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000)
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return true;
    }

    await updateLocalStore((store) => {
      store.participantTokens[token] = {
        ...data,
        expiresAt: Date.now() + ttlSeconds * 1000
      };
    });
    return true;
  } catch (error) {
    console.error('Error saving participant token:', error);
    return false;
  }
}

export async function getParticipantToken(token: string): Promise<{
  studyId: string;
  studyConfig: StoredStudy['config'];
  terminationReason?: string;
  terminatedAt?: number;
  completedAt?: number;
  exchanges: ParticipantExchange[];
} | null> {
  try {
    if (await shouldUseMongo()) {
      const tokenData = await ParticipantToken.findOne({
        token,
        expiresAt: { $gt: new Date() }
      }).lean();

      if (!tokenData) return null;

      return {
        studyId: tokenData.studyId,
        studyConfig: tokenData.studyConfig,
        terminationReason: tokenData.terminationReason,
        terminatedAt: tokenData.terminatedAt ? toTimestamp(tokenData.terminatedAt) : undefined,
        completedAt: tokenData.completedAt ? toTimestamp(tokenData.completedAt) : undefined,
        exchanges: (tokenData.exchanges || []).map((e: any) => ({ answer: e.answer || '', question: e.question || '', at: toTimestamp(e.at) }))
      };
    }

    const store = await readLocalStore();
    const tokenData = store.participantTokens[token];
    if (!tokenData) return null;
    if (tokenData.expiresAt < Date.now()) {
      await updateLocalStore((currentStore) => {
        delete currentStore.participantTokens[token];
      });
      return null;
    }

    return {
      studyId: tokenData.studyId,
      studyConfig: tokenData.studyConfig,
      terminationReason: tokenData.terminationReason,
      terminatedAt: tokenData.terminatedAt,
      completedAt: tokenData.completedAt,
      exchanges: tokenData.exchanges || []
    };
  } catch (error) {
    console.error('Error getting participant token:', error);
    return null;
  }
}

// Counts one interview turn against a link; false once it has used `max` (or the link is gone). One conditional
// update, so two turns at once can't both slip under the limit.
export async function claimParticipantTurn(token: string, max: number): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      const result = await ParticipantToken.updateOne(
        { token, $or: [{ turns: { $exists: false } }, { turns: { $lt: max } }] },
        { $inc: { turns: 1 } }
      );
      return result.modifiedCount === 1;
    }

    return await updateLocalStore((store) => {
      const link = store.participantTokens[token];
      if (!link || (link.turns || 0) >= max) return false;
      link.turns = (link.turns || 0) + 1;
      return true;
    });
  } catch (error) {
    console.error('Error counting interview turn:', error);
    return false;
  }
}

// Keeps one interview turn (the candidate's answer and the interviewer's reply) on the link.
export async function recordParticipantExchange(token: string, answer: string, question: string): Promise<boolean> {
  try {
    const exchange = { answer, question, at: Date.now() };
    if (await shouldUseMongo()) {
      const result = await ParticipantToken.updateOne({ token }, { $push: { exchanges: { ...exchange, at: new Date(exchange.at) } } });
      return result.modifiedCount === 1;
    }

    return await updateLocalStore((store) => {
      const link = store.participantTokens[token];
      if (!link) return false;
      link.exchanges = [...(link.exchanges || []), exchange];
      return true;
    });
  } catch (error) {
    console.error('Error keeping an interview turn:', error);
    return false;
  }
}

// Marks a link finished. True only for the call that finished it, so two finishes at once save one interview.
export async function finishParticipantToken(token: string): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      const result = await ParticipantToken.updateOne(
        { token, completedAt: { $exists: false }, terminatedAt: { $exists: false } },
        { $set: { completedAt: new Date() } }
      );
      return result.modifiedCount === 1;
    }

    return await updateLocalStore((store) => {
      const link = store.participantTokens[token];
      if (!link || link.completedAt || link.terminatedAt) return false;
      link.completedAt = Date.now();
      return true;
    });
  } catch (error) {
    console.error('Error finishing participant token:', error);
    return false;
  }
}

// Undoes finishParticipantToken when the interview couldn't be saved, so the candidate can try again.
export async function reopenParticipantToken(token: string): Promise<void> {
  try {
    if (await shouldUseMongo()) {
      await ParticipantToken.updateOne({ token }, { $unset: { completedAt: 1 } });
      return;
    }

    await updateLocalStore((store) => {
      if (store.participantTokens[token]) delete store.participantTokens[token].completedAt;
    });
  } catch (error) {
    console.error('Error reopening participant token:', error);
  }
}

// The interview record a candidate link wrote, if any (see Interview.linkHash).
export async function getInterviewByLink(linkHash: string): Promise<StoredInterview | null> {
  try {
    if (await shouldUseMongo()) {
      const interview = await Interview.findOne({ linkHash }).lean();
      return interview ? toStoredInterview(interview) : null;
    }

    const store = await readLocalStore();
    return Object.values(store.interviews).find((interview) => (interview as StoredInterview & { linkHash?: string }).linkHash === linkHash) || null;
  } catch (error) {
    console.error('Error finding interview by link:', error);
    return null;
  }
}

// Records a portal launch pass as used. True only for its first use; false when it was used before or can't be
// recorded, so a pass never opens more than one session.
export async function claimLaunchPass(passId: string, expiresAt: Date): Promise<boolean> {
  try {
    if (await shouldUseMongo()) {
      await UsedLaunchPass.init();
      await UsedLaunchPass.create({ passId, expiresAt });
      return true;
    }

    return await updateLocalStore((store) => {
      const now = Date.now();
      for (const [id, until] of Object.entries(store.usedLaunchPasses)) {
        if (until < now) delete store.usedLaunchPasses[id];
      }
      if (store.usedLaunchPasses[passId]) return false;

      store.usedLaunchPasses[passId] = expiresAt.getTime();
      return true;
    });
  } catch (error: any) {
    if (error?.code !== 11000) {
      console.error('Error recording launch pass:', error);
    }
    return false;
  }
}

export async function terminateParticipantToken(token: string, reason: string): Promise<boolean> {
  try {
    const cleanReason = reason.trim().slice(0, 500);

    if (await shouldUseMongo()) {
      const result = await ParticipantToken.updateOne(
        {
          token,
          expiresAt: { $gt: new Date() },
          terminatedAt: { $exists: false },
          completedAt: { $exists: false }
        },
        {
          $set: {
            terminationReason: cleanReason,
            terminatedAt: new Date()
          }
        }
      );

      // true only for the call that ended it, so a repeat saves nothing again
      return result.modifiedCount === 1;
    }

    return await updateLocalStore((store) => {
      const tokenData = store.participantTokens[token];
      if (!tokenData || tokenData.expiresAt < Date.now() || tokenData.terminatedAt || tokenData.completedAt) return false;

      tokenData.terminationReason = cleanReason;
      tokenData.terminatedAt = Date.now();
      return true;
    });
  } catch (error) {
    console.error('Error terminating participant token:', error);
    return false;
  }
}
