export const stateTransitions = Object.freeze({
  image: Object.freeze({
    imported: Object.freeze(["annotation-in-progress", "archived"]),
    "annotation-in-progress": Object.freeze(["annotation-completed", "archived"]),
    "annotation-completed": Object.freeze(["annotation-in-progress", "archived"]),
    archived: Object.freeze([])
  }),
  annotation: Object.freeze({
    draft: Object.freeze(["completed"]),
    completed: Object.freeze([])
  }),
  task: Object.freeze({
    queued: Object.freeze(["running", "cancellation-requested", "cancelled"]),
    running: Object.freeze(["cancellation-requested", "completed", "failed"]),
    "cancellation-requested": Object.freeze(["cancelled", "completed", "failed"]),
    completed: Object.freeze([]),
    failed: Object.freeze([]),
    cancelled: Object.freeze([])
  })
});

export function canTransition(machine, from, to) {
  return stateTransitions[machine]?.[from]?.includes(to) ?? false;
}
