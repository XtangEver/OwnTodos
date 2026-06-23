import { describe, expect, it } from "vitest";
import {
  SHOW_SUBTASKS_INLINE_KEY,
  getShowSubtasksInlinePreference,
  setShowSubtasksInlinePreference
} from "./preferences.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    getValue(key) {
      return values.get(key);
    }
  };
}

describe("inline subtask display preference", () => {
  it("defaults to showing inline subtasks when no preference is saved", () => {
    expect(getShowSubtasksInlinePreference(createStorage())).toBe(true);
  });

  it("returns false only when the saved preference is the false string", () => {
    expect(
      getShowSubtasksInlinePreference(
        createStorage({
          [SHOW_SUBTASKS_INLINE_KEY]: "false"
        })
      )
    ).toBe(false);
  });

  it("falls back to showing inline subtasks for true or invalid stored values", () => {
    expect(
      getShowSubtasksInlinePreference(
        createStorage({
          [SHOW_SUBTASKS_INLINE_KEY]: "true"
        })
      )
    ).toBe(true);
    expect(
      getShowSubtasksInlinePreference(
        createStorage({
          [SHOW_SUBTASKS_INLINE_KEY]: "unexpected"
        })
      )
    ).toBe(true);
  });

  it("falls back to showing inline subtasks when storage cannot be read", () => {
    const storage = {
      getItem() {
        throw new Error("storage unavailable");
      }
    };

    expect(getShowSubtasksInlinePreference(storage)).toBe(true);
  });

  it("writes the preference as a string value", () => {
    const storage = createStorage();

    setShowSubtasksInlinePreference(false, storage);
    expect(storage.getValue(SHOW_SUBTASKS_INLINE_KEY)).toBe("false");

    setShowSubtasksInlinePreference(true, storage);
    expect(storage.getValue(SHOW_SUBTASKS_INLINE_KEY)).toBe("true");
  });
});
