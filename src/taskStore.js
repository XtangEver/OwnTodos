export const QUADRANTS = ["do", "schedule", "delegate", "later"];
export const TASK_STATUSES = ["todo", "doing", "done"];
export const STATUS_FILTERS = ["all", ...TASK_STATUSES];

function getNow(value) {
  return value ?? new Date().toISOString();
}

function createDefaultId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function normalizeTaskStatus(task) {
  if (task?.completed) {
    return "done";
  }

  return TASK_STATUSES.includes(task?.status) ? task.status : "todo";
}

function getEffectiveTaskStatus(task) {
  if (task?.completed || task?.status === "done") {
    return "done";
  }

  return task?.status === "doing" ? "doing" : "todo";
}

function normalizeSubtasks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((subtask) => subtask && typeof subtask === "object")
    .map((subtask) => ({
      id: String(subtask.id ?? ""),
      title: String(subtask.title ?? "").trim(),
      completed: Boolean(subtask.completed),
      createdAt: String(subtask.createdAt ?? ""),
      updatedAt: String(subtask.updatedAt ?? "")
    }))
    .filter((subtask) => subtask.id && subtask.title);
}

export function getQuadrantFromFlags({ urgent = true, important = true } = {}) {
  if (urgent && important) {
    return "do";
  }
  if (!urgent && important) {
    return "schedule";
  }
  if (urgent && !important) {
    return "delegate";
  }
  return "later";
}

export function addTask(tasks, options) {
  const title = String(options?.title ?? "").trim();
  if (!title) {
    return tasks;
  }

  const now = getNow(options.now);
  const createId = options.createId ?? createDefaultId;
  const status = TASK_STATUSES.includes(options.status) ? options.status : "todo";

  return [
    ...tasks,
    {
      id: createId(),
      title,
      note: String(options.note ?? "").trim(),
      quadrant: options.quadrant ?? getQuadrantFromFlags(options),
      status,
      completed: status === "done",
      subtasks: [],
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function updateTask(tasks, id, updates = {}) {
  const now = getNow(updates.now);
  const nextTitle = typeof updates.title === "string" ? updates.title.trim() : undefined;
  const nextNote = typeof updates.note === "string" ? updates.note.trim() : undefined;

  return tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    return {
      ...task,
      title: nextTitle ? nextTitle : task.title,
      note: nextNote === undefined ? task.note : nextNote,
      updatedAt: now
    };
  });
}

export function toggleTask(tasks, id, now = new Date().toISOString()) {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          status: task.completed ? "todo" : "done",
          completed: !task.completed,
          updatedAt: now
        }
      : task
  );
}

export function updateTaskStatus(tasks, id, status, now = new Date().toISOString()) {
  const nextStatus = TASK_STATUSES.includes(status) ? status : "todo";
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          status: nextStatus,
          completed: nextStatus === "done",
          updatedAt: now
        }
      : task
  );
}

export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function moveTask(tasks, id, quadrant, now = new Date().toISOString()) {
  const nextQuadrant = QUADRANTS.includes(quadrant) ? quadrant : "do";
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          quadrant: nextQuadrant,
          updatedAt: now
        }
      : task
  );
}

export function reorderTask(tasks, id, toIndex) {
  const currentIndex = tasks.findIndex((task) => task.id === id);
  if (currentIndex === -1) {
    return tasks;
  }

  const nextTasks = [...tasks];
  const [task] = nextTasks.splice(currentIndex, 1);
  const boundedIndex = Math.max(0, Math.min(toIndex, nextTasks.length));
  nextTasks.splice(boundedIndex, 0, task);
  return nextTasks;
}

export function addSubtask(tasks, id, options = {}) {
  const title = String(options.title ?? "").trim();
  if (!title) {
    return tasks;
  }

  const now = getNow(options.now);
  const createId = options.createId ?? createDefaultId;

  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          subtasks: [
            ...(Array.isArray(task.subtasks) ? task.subtasks : []),
            {
              id: createId(),
              title,
              completed: false,
              createdAt: now,
              updatedAt: now
            }
          ],
          updatedAt: now
        }
      : task
  );
}

export function updateSubtask(tasks, id, subtaskId, updates = {}) {
  const nextTitle = typeof updates.title === "string" ? updates.title.trim() : undefined;
  if (!nextTitle) {
    return tasks;
  }

  const now = getNow(updates.now);
  return tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    return {
      ...task,
      subtasks: (Array.isArray(task.subtasks) ? task.subtasks : []).map((subtask) =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              title: nextTitle,
              updatedAt: now
            }
          : subtask
      ),
      updatedAt: now
    };
  });
}

export function toggleSubtask(tasks, id, subtaskId, now = new Date().toISOString()) {
  return tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    return {
      ...task,
      subtasks: (Array.isArray(task.subtasks) ? task.subtasks : []).map((subtask) =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              completed: !subtask.completed,
              updatedAt: now
            }
          : subtask
      ),
      updatedAt: now
    };
  });
}

export function deleteSubtask(tasks, id, subtaskId, now = new Date().toISOString()) {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          subtasks: (Array.isArray(task.subtasks) ? task.subtasks : []).filter((subtask) => subtask.id !== subtaskId),
          updatedAt: now
        }
      : task
  );
}

export function getTaskStatusSummary(tasks) {
  return tasks.reduce(
    (summary, task) => {
      const status = getEffectiveTaskStatus(task);
      summary.all += 1;
      summary[status] += 1;
      return summary;
    },
    {
      all: 0,
      todo: 0,
      doing: 0,
      done: 0
    }
  );
}

export function filterTasksByStatus(tasks, filter) {
  const nextFilter = STATUS_FILTERS.includes(filter) ? filter : "all";
  if (nextFilter === "all") {
    return tasks;
  }

  return tasks.filter((task) => getEffectiveTaskStatus(task) === nextFilter);
}

export function normalizeTasks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((task) => task && typeof task === "object")
    .map((task) => {
      const status = normalizeTaskStatus(task);
      return {
        id: String(task.id ?? ""),
        title: String(task.title ?? "").trim(),
        note: String(task.note ?? "").trim(),
        quadrant: QUADRANTS.includes(task.quadrant) ? task.quadrant : "do",
        status,
        completed: status === "done",
        subtasks: normalizeSubtasks(task.subtasks),
        createdAt: String(task.createdAt ?? ""),
        updatedAt: String(task.updatedAt ?? "")
      };
    })
    .filter((task) => task.id && task.title);
}
