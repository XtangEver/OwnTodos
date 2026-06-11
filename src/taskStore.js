export const QUADRANTS = ["do", "schedule", "delegate", "later"];

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

  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => globalThis.crypto?.randomUUID?.() ?? String(Date.now()));

  return [
    ...tasks,
    {
      id: createId(),
      title,
      note: String(options.note ?? "").trim(),
      quadrant: options.quadrant ?? getQuadrantFromFlags(options),
      completed: false,
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function updateTask(tasks, id, updates = {}) {
  const now = updates.now ?? new Date().toISOString();
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
          completed: !task.completed,
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

export function normalizeTasks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((task) => task && typeof task === "object")
    .map((task) => ({
      id: String(task.id ?? ""),
      title: String(task.title ?? "").trim(),
      note: String(task.note ?? "").trim(),
      quadrant: QUADRANTS.includes(task.quadrant) ? task.quadrant : "do",
      completed: Boolean(task.completed),
      createdAt: String(task.createdAt ?? ""),
      updatedAt: String(task.updatedAt ?? "")
    }))
    .filter((task) => task.id && task.title);
}
