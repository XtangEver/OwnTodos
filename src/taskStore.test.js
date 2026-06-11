import { describe, expect, it } from "vitest";
import {
  addTask,
  deleteTask,
  getQuadrantFromFlags,
  moveTask,
  normalizeTasks,
  reorderTask,
  toggleTask,
  updateTask
} from "./taskStore.js";

describe("getQuadrantFromFlags", () => {
  it("routes tasks from urgent and important flags", () => {
    expect(getQuadrantFromFlags({ urgent: true, important: true })).toBe("do");
    expect(getQuadrantFromFlags({ urgent: false, important: true })).toBe("schedule");
    expect(getQuadrantFromFlags({ urgent: true, important: false })).toBe("delegate");
    expect(getQuadrantFromFlags({ urgent: false, important: false })).toBe("later");
  });
});

describe("task operations", () => {
  it("adds a trimmed task with stable defaults", () => {
    const tasks = addTask([], {
      title: "  Write plan  ",
      urgent: false,
      important: true,
      now: "2026-06-11T08:00:00.000Z",
      createId: () => "task-1"
    });

    expect(tasks).toEqual([
      {
        id: "task-1",
        title: "Write plan",
        note: "",
        quadrant: "schedule",
        completed: false,
        createdAt: "2026-06-11T08:00:00.000Z",
        updatedAt: "2026-06-11T08:00:00.000Z"
      }
    ]);
  });

  it("ignores blank task titles", () => {
    expect(addTask([{ id: "existing" }], { title: "   " })).toEqual([{ id: "existing" }]);
  });

  it("updates editable fields and timestamp", () => {
    const tasks = [
      {
        id: "task-1",
        title: "Old",
        note: "",
        quadrant: "do",
        completed: false,
        createdAt: "2026-06-11T08:00:00.000Z",
        updatedAt: "2026-06-11T08:00:00.000Z"
      }
    ];

    expect(
      updateTask(tasks, "task-1", {
        title: " New ",
        note: " Details ",
        now: "2026-06-11T09:00:00.000Z"
      })[0]
    ).toMatchObject({
      title: "New",
      note: "Details",
      updatedAt: "2026-06-11T09:00:00.000Z"
    });
  });

  it("does not replace a title with blank text during edit", () => {
    const tasks = [{ id: "task-1", title: "Keep", note: "", quadrant: "do", completed: false }];
    expect(updateTask(tasks, "task-1", { title: "   " })[0].title).toBe("Keep");
  });

  it("toggles completion", () => {
    const tasks = [{ id: "task-1", title: "Task", quadrant: "do", completed: false }];
    expect(toggleTask(tasks, "task-1", "2026-06-11T09:00:00.000Z")[0]).toMatchObject({
      completed: true,
      updatedAt: "2026-06-11T09:00:00.000Z"
    });
  });

  it("deletes a task", () => {
    const tasks = [{ id: "task-1" }, { id: "task-2" }];
    expect(deleteTask(tasks, "task-1")).toEqual([{ id: "task-2" }]);
  });

  it("moves a task to another quadrant", () => {
    const tasks = [{ id: "task-1", title: "Task", quadrant: "do" }];
    expect(moveTask(tasks, "task-1", "delegate", "2026-06-11T10:00:00.000Z")[0]).toMatchObject({
      quadrant: "delegate",
      updatedAt: "2026-06-11T10:00:00.000Z"
    });
  });

  it("reorders a task inside the full ordered task list", () => {
    const tasks = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorderTask(tasks, "c", 0)).toEqual([{ id: "c" }, { id: "a" }, { id: "b" }]);
  });
});

describe("normalizeTasks", () => {
  it("keeps only valid task-like objects and repairs missing optional fields", () => {
    expect(
      normalizeTasks([
        null,
        { id: "1", title: " Keep ", quadrant: "bad", completed: true },
        { id: "", title: "No id" },
        { id: "2", title: "   " }
      ])
    ).toEqual([
      {
        id: "1",
        title: "Keep",
        note: "",
        quadrant: "do",
        completed: true,
        createdAt: "",
        updatedAt: ""
      }
    ]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(normalizeTasks({ id: "1" })).toEqual([]);
  });
});
