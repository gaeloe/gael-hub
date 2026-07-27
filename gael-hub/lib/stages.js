// Single source of truth for the task pipeline.
//
// The UI renders exactly one column per stage below, and the API rejects any
// stage that isn't in this list. That rejection matters: a task saved with an
// unrecognised stage matches no column and therefore renders nowhere at all —
// it doesn't show up misplaced, it silently disappears from the hub. That is
// what happened to tasks left on the old stage names (to_start, in_progress,
// waiting, done) when the pipeline was renamed.
//
// Renaming a stage means migrating existing rows in Supabase too, not just
// editing this file.
export const STAGES = [
  { key: "idea", label: "Idea", cls: "stage1" },
  { key: "in_dev", label: "In Dev", cls: "stage2" },
  { key: "review", label: "Review", cls: "stage3" },
  { key: "live", label: "Live", cls: "stage4" },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);

export const DEFAULT_STAGE = "idea";

export function isValidStage(stage) {
  return STAGE_KEYS.includes(stage);
}
