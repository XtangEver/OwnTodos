export const SHOW_SUBTASKS_INLINE_KEY = "quadrantTodo.showSubtasksInline";

export function getShowSubtasksInlinePreference(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(SHOW_SUBTASKS_INLINE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setShowSubtasksInlinePreference(value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SHOW_SUBTASKS_INLINE_KEY, value ? "true" : "false");
  } catch {
    // A storage failure should not block the in-memory UI preference.
  }
}
