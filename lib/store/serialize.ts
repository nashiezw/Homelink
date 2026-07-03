import type { Agency, RoommateProfile, StoreUser, UserSubscription } from "@/lib/store/types";

/** Serializable snapshot of the in-memory marketplace store. */
export type SerializedStoreSnapshot = {
  version: number;
  savedAt: string;
  state: Record<string, unknown>;
};

type PersistableStore = {
  users: Map<string, StoreUser>;
  agencies: Map<string, Agency>;
  sessions: Map<string, { id: string; userId: string; createdAt: string }>;
  favourites: Map<string, Set<string>>;
  roommateProfiles: Map<string, RoommateProfile>;
  userCredits?: Map<string, number>;
  userSubscriptions?: Map<string, UserSubscription>;
  [key: string]: unknown;
};

function mapToArray<K, V>(map: Map<K, V>) {
  return [...map.entries()];
}

export function serializeStoreState(state: PersistableStore, version: number): SerializedStoreSnapshot {
  const { users, agencies, sessions, favourites, roommateProfiles, userCredits, userSubscriptions, ...rest } = state;

  return {
    version,
    savedAt: new Date().toISOString(),
    state: {
      ...rest,
      users: mapToArray(users),
      agencies: mapToArray(agencies),
      sessions: mapToArray(sessions),
      favourites: [...favourites.entries()].map(([k, v]) => [k, [...v]]),
      roommateProfiles: mapToArray(roommateProfiles),
      userCredits: userCredits ? mapToArray(userCredits) : [],
      userSubscriptions: userSubscriptions ? mapToArray(userSubscriptions) : [],
    },
  };
}

export function deserializeStoreState(snapshot: SerializedStoreSnapshot): PersistableStore {
  const s = snapshot.state;
  return {
    ...s,
    users: new Map((s.users as Array<[string, StoreUser]>) ?? []),
    agencies: new Map((s.agencies as Array<[string, Agency]>) ?? []),
    sessions: new Map((s.sessions as Array<[string, { id: string; userId: string; createdAt: string }]>) ?? []),
    favourites: new Map(
      ((s.favourites as Array<[string, string[]]>) ?? []).map(([k, v]) => [k, new Set(v)]),
    ),
    roommateProfiles: new Map((s.roommateProfiles as Array<[string, RoommateProfile]>) ?? []),
    userCredits: new Map((s.userCredits as Array<[string, number]>) ?? []),
    userSubscriptions: new Map((s.userSubscriptions as Array<[string, UserSubscription]>) ?? []),
  };
}
