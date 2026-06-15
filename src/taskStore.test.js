import { describe, expect, it } from "vitest";
import * as store from "./taskStore.js";
import {
  addTask,
  deleteTask,
  getQuadrantFromFlags,
  moveTask,
  normalizeTasks,
  reorderTask,
  filterTasksByStatus,
  getTaskStatusSummary,
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
        status: "todo",
        completed: false,
        subtasks: [],
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
    const tasks = [{ id: "task-1", title: "Task", quadrant: "do", status: "todo", completed: false }];
    expect(toggleTask(tasks, "task-1", "2026-06-11T09:00:00.000Z")[0]).toMatchObject({
      status: "done",
      completed: true,
      updatedAt: "2026-06-11T09:00:00.000Z"
    });
  });

  it("returns a completed task to todo when completion is cleared", () => {
    const tasks = [{ id: "task-1", title: "Task", quadrant: "do", status: "done", completed: true }];
    expect(toggleTask(tasks, "task-1", "2026-06-11T09:30:00.000Z")[0]).toMatchObject({
      status: "todo",
      completed: false,
      updatedAt: "2026-06-11T09:30:00.000Z"
    });
  });

  it("updates an active task status without marking it complete", () => {
    const tasks = [{ id: "task-1", title: "Task", quadrant: "do", status: "todo", completed: false }];
    expect(store.updateTaskStatus?.(tasks, "task-1", "doing", "2026-06-11T09:45:00.000Z")?.[0]).toMatchObject({
      status: "doing",
      completed: false,
      updatedAt: "2026-06-11T09:45:00.000Z"
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
        status: "done",
        completed: true,
        subtasks: [],
        createdAt: "",
        updatedAt: ""
      }
    ]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(normalizeTasks({ id: "1" })).toEqual([]);
  });

  it("normalizes existing subtasks and removes invalid entries", () => {
    expect(
      normalizeTasks([
        {
          id: "1",
          title: "Task",
          subtasks: [
            { id: "sub-1", title: " First ", completed: true, createdAt: "c", updatedAt: "u" },
            { id: "", title: "No id" },
            { id: "sub-2", title: "   " }
          ]
        }
      ])[0].subtasks
    ).toEqual([
      {
        id: "sub-1",
        title: "First",
        completed: true,
        createdAt: "c",
        updatedAt: "u"
      }
    ]);
  });
});

describe("subtask operations", () => {
  it("adds a trimmed subtask to the target task", () => {
    const tasks = [
      {
        id: "task-1",
        title: "Task",
        quadrant: "do",
        status: "todo",
        completed: false,
        subtasks: [],
        updatedAt: "2026-06-11T08:00:00.000Z"
      }
    ];

    expect(
      store.addSubtask?.(tasks, "task-1", {
        title: "  Draft outline  ",
        now: "2026-06-11T10:00:00.000Z",
        createId: () => "sub-1"
      })?.[0]
    ).toMatchObject({
      updatedAt: "2026-06-11T10:00:00.000Z",
      subtasks: [
        {
          id: "sub-1",
          title: "Draft outline",
          completed: false,
          createdAt: "2026-06-11T10:00:00.000Z",
          updatedAt: "2026-06-11T10:00:00.000Z"
        }
      ]
    });
  });

  it("ignores blank subtask titles", () => {
    const tasks = [{ id: "task-1", title: "Task", subtasks: [] }];
    expect(store.addSubtask?.(tasks, "task-1", { title: "   " })).toEqual(tasks);
  });

  it("updates, toggles, and deletes a subtask without changing parent completion", () => {
    const tasks = [
      {
        id: "task-1",
        title: "Task",
        quadrant: "do",
        status: "doing",
        completed: false,
        subtasks: [{ id: "sub-1", title: "Old", completed: false, createdAt: "c", updatedAt: "u" }]
      }
    ];

    const renamed = store.updateSubtask?.(tasks, "task-1", "sub-1", {
      title: " New ",
      now: "2026-06-11T11:00:00.000Z"
    });
    expect(renamed?.[0].subtasks[0]).toMatchObject({
      title: "New",
      updatedAt: "2026-06-11T11:00:00.000Z"
    });

    const toggled = store.toggleSubtask?.(renamed, "task-1", "sub-1", "2026-06-11T11:30:00.000Z");
    expect(toggled?.[0]).toMatchObject({
      status: "doing",
      completed: false,
      updatedAt: "2026-06-11T11:30:00.000Z"
    });
    expect(toggled?.[0].subtasks[0]).toMatchObject({
      completed: true,
      updatedAt: "2026-06-11T11:30:00.000Z"
    });

    expect(store.deleteSubtask?.(toggled, "task-1", "sub-1", "2026-06-11T12:00:00.000Z")?.[0]).toMatchObject({
      updatedAt: "2026-06-11T12:00:00.000Z",
      subtasks: []
    });
  });
});

describe("status filtering", () => {
  const tasks = [
    { id: "task-1", title: "Todo", status: "todo", completed: false },
    { id: "task-2", title: "Doing", status: "doing", completed: false },
    { id: "task-3", title: "Done", status: "done", completed: true },
    { id: "task-4", title: "Legacy complete", completed: true },
    { id: "task-5", title: "Legacy todo", completed: false }
  ];

  it("counts all tasks by lifecycle status", () => {
    expect(getTaskStatusSummary(tasks)).toEqual({
      all: 5,
      todo: 2,
      doing: 1,
      done: 2
    });
  });

  it("filters tasks by lifecycle status", () => {
    expect(filterTasksByStatus(tasks, "all").map((task) => task.id)).toEqual([
      "task-1",
      "task-2",
      "task-3",
      "task-4",
      "task-5"
    ]);
    expect(filterTasksByStatus(tasks, "todo").map((task) => task.id)).toEqual(["task-1", "task-5"]);
    expect(filterTasksByStatus(tasks, "doing").map((task) => task.id)).toEqual(["task-2"]);
    expect(filterTasksByStatus(tasks, "done").map((task) => task.id)).toEqual(["task-3", "task-4"]);
  });
});
