// The guild's quests: the guild representative in the great hall hands them out, the game counts
// what they ask for (monsters slain near him on a floor, escapes through a portal, bouts won in
// the arena), and he pays the reward in gold when one is turned in. Every quest can be taken again
// once it is turned in. At most MAX_ACTIVE at a time. Kept in this browser (QUEST_KEY).

export type QuestEvent =
  | { type: "kill"; family: "skeleton" | "slime"; elite: boolean; boss: boolean }
  | { type: "escape"; party: boolean }
  | { type: "arenaWin" };

export interface QuestDef {
  id: string;
  title: string;
  /** What the representative says it is for. */
  text: string;
  goal: number;
  reward: number;
  /** How much one event counts toward it (0: not at all). */
  counts: (e: QuestEvent) => number;
}

export const QUESTS: QuestDef[] = [
  {
    id: "bones",
    title: "Bone Collector",
    text: "The dead walk the lower halls again. Put six skeletons back in the ground.",
    goal: 6,
    reward: 250,
    counts: (e) => (e.type === "kill" && e.family === "skeleton" ? 1 : 0),
  },
  {
    id: "slimes",
    title: "Slime Season",
    text: "Something is eating the cellar walls. Burst five slimes before they spread.",
    goal: 5,
    reward: 200,
    counts: (e) => (e.type === "kill" && e.family === "slime" ? 1 : 0),
  },
  {
    id: "elites",
    title: "Elite Hunter",
    text: "Some of them are stronger than the rest. Bring down two elites.",
    goal: 2,
    reward: 400,
    counts: (e) => (e.type === "kill" && e.elite ? 1 : 0),
  },
  {
    id: "boss",
    title: "Head of the Horde",
    text: "Every floor has its master. Slay one of the dungeon's bosses.",
    goal: 1,
    reward: 800,
    counts: (e) => (e.type === "kill" && e.boss ? 1 : 0),
  },
  {
    id: "escape",
    title: "Out Alive",
    text: "Gold is no use to the dead. Go down and come back up through a portal.",
    goal: 1,
    reward: 300,
    counts: (e) => (e.type === "escape" ? 1 : 0),
  },
  {
    id: "party",
    title: "Strength in Numbers",
    text: "Take a party down and get out together: escape a dive with others at your side.",
    goal: 1,
    reward: 450,
    counts: (e) => (e.type === "escape" && e.party ? 1 : 0),
  },
  {
    id: "arena",
    title: "Blood on the Sand",
    text: "The arena master wants a show. Win three bouts in the ring.",
    goal: 3,
    reward: 300,
    counts: (e) => (e.type === "arenaWin" ? 1 : 0),
  },
];

export const MAX_ACTIVE = 3;

export interface ActiveQuest {
  id: string;
  progress: number;
}

export interface QuestState {
  active: ActiveQuest[];
  /** Quests turned in so far (all time). */
  completed: number;
}

const QUEST_KEY = "simforge.explorer.quests.v1";

export const questDef = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);

export function loadQuests(): QuestState {
  try {
    const raw = window.localStorage.getItem(QUEST_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<QuestState>;
      const active = Array.isArray(s.active) ? s.active.filter((a) => a && questDef(a.id)).slice(0, MAX_ACTIVE) : [];
      return { active: active.map((a) => ({ id: a.id, progress: Math.max(0, Number(a.progress) || 0) })), completed: Math.max(0, Number(s.completed) || 0) };
    }
  } catch {
    // Blocked or broken storage: start fresh.
  }
  return { active: [], completed: 0 };
}

export function saveQuests(s: QuestState): void {
  try {
    window.localStorage.setItem(QUEST_KEY, JSON.stringify(s));
  } catch {
    // Kept for this visit only.
  }
}

export const isDone = (a: ActiveQuest): boolean => a.progress >= (questDef(a.id)?.goal ?? Infinity);

/** Take a quest on (if there is room and he has not got it already). */
export function accept(s: QuestState, id: string): QuestState {
  if (s.active.length >= MAX_ACTIVE || s.active.some((a) => a.id === id) || !questDef(id)) return s;
  return { ...s, active: [...s.active, { id, progress: 0 }] };
}

export function abandon(s: QuestState, id: string): QuestState {
  return { ...s, active: s.active.filter((a) => a.id !== id) };
}

/** Hand a finished quest in: it leaves the list, and the reward is what he is paid. */
export function turnIn(s: QuestState, id: string): { state: QuestState; reward: number } {
  const a = s.active.find((q) => q.id === id);
  const d = questDef(id);
  if (!a || !d || !isDone(a)) return { state: s, reward: 0 };
  return { state: { active: s.active.filter((q) => q.id !== id), completed: s.completed + 1 }, reward: d.reward };
}

/** Count an event toward every active quest it serves; `finished` names the ones it completed. */
export function record(s: QuestState, e: QuestEvent): { state: QuestState; finished: string[] } {
  const finished: string[] = [];
  let changed = false;
  const active = s.active.map((a) => {
    const d = questDef(a.id);
    if (!d || a.progress >= d.goal) return a;
    const n = d.counts(e);
    if (!n) return a;
    changed = true;
    const progress = Math.min(d.goal, a.progress + n);
    if (progress >= d.goal) finished.push(d.title);
    return { ...a, progress };
  });
  return { state: changed ? { ...s, active } : s, finished };
}
