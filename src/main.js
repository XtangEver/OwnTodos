import "./styles.css";
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

const quadrantMeta = {
  do: {
    title: "今天完成",
    hint: "需要尽快处理",
    urgent: true,
    important: true
  },
  schedule: {
    title: "计划推进",
    hint: "按节奏安排",
    urgent: false,
    important: true
  },
  delegate: {
    title: "等待跟进",
    hint: "等待回复或协助",
    urgent: true,
    important: false
  },
  later: {
    title: "稍后再看",
    hint: "暂时不占用注意力",
    urgent: false,
    important: false
  }
};

const quadrants = Object.keys(quadrantMeta);
const appRoot = document.querySelector("#app");
let tasks = [];
let draggedTaskId = "";
let statusTimer = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTaskApi() {
  if (window.quadrantTodo) {
    return window.quadrantTodo;
  }

  return {
    async loadTasks() {
      return JSON.parse(localStorage.getItem("quadrantTodo.tasks") ?? "[]");
    },
    async saveTasks(nextTasks) {
      localStorage.setItem("quadrantTodo.tasks", JSON.stringify(nextTasks));
      return { ok: true };
    }
  };
}

function setStatus(message, tone = "neutral") {
  const status = document.querySelector("[data-status]");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.tone = tone;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "本地自动保存";
    status.dataset.tone = "neutral";
  }, 2200);
}

async function persist() {
  try {
    await getTaskApi().saveTasks(tasks);
    setStatus("已保存", "success");
  } catch {
    setStatus("保存失败，当前修改仍保留在窗口中", "error");
  }
}

function setTasks(nextTasks, shouldPersist = true) {
  tasks = nextTasks;
  render();
  if (shouldPersist) {
    persist();
  }
}

function countPending(items) {
  return items.filter((task) => !task.completed).length;
}

function getSummary() {
  const pending = countPending(tasks);
  const completed = tasks.length - pending;
  return { pending, completed };
}

function renderTask(task) {
  return `
    <article class="task-card ${task.completed ? "is-completed" : ""}" draggable="true" data-task-id="${escapeHtml(task.id)}">
      <label class="task-check">
        <input type="checkbox" aria-label="切换完成状态" data-action="toggle" data-task-id="${escapeHtml(task.id)}" ${task.completed ? "checked" : ""} />
        <span></span>
      </label>
      <button class="task-body" type="button" data-action="edit" data-task-id="${escapeHtml(task.id)}">
        <strong>${escapeHtml(task.title)}</strong>
        ${task.note ? `<small>${escapeHtml(task.note)}</small>` : ""}
      </button>
      <button class="icon-button danger" type="button" title="删除" aria-label="删除任务" data-action="delete" data-task-id="${escapeHtml(task.id)}">删</button>
    </article>
  `;
}

function renderQuadrant(quadrant) {
  const meta = quadrantMeta[quadrant];
  const items = tasks.filter((task) => task.quadrant === quadrant);

  return `
    <section class="quadrant" data-quadrant="${quadrant}">
      <header class="quadrant-header">
        <div>
          <h2>${meta.title}</h2>
          <p>${meta.hint}</p>
        </div>
        <span>${countPending(items)}/${items.length}</span>
      </header>
      <div class="task-list" data-drop-zone="${quadrant}">
        ${items.length ? items.map(renderTask).join("") : `<div class="empty-state">暂无任务</div>`}
      </div>
    </section>
  `;
}

function render() {
  const summary = getSummary();
  const dateLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());

  appRoot.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div>
          <h1>OwnTodos</h1>
          <p>${dateLabel}</p>
        </div>
        <div class="topbar-meta">
          <span>待处理 ${summary.pending}</span>
          <span>已完成 ${summary.completed}</span>
          <span class="save-status" data-status data-tone="neutral">已自动保存</span>
        </div>
      </header>

      <form class="quick-add" data-form="add">
        <input name="title" autocomplete="off" placeholder="写下一个任务" />
        <label class="switch">
          <input type="checkbox" name="important" checked />
          <span>优先</span>
        </label>
        <label class="switch">
          <input type="checkbox" name="urgent" checked />
          <span>尽快</span>
        </label>
        <button type="submit">添加</button>
      </form>

      <section class="matrix">
        ${quadrants.map(renderQuadrant).join("")}
      </section>

      <dialog class="edit-dialog" data-dialog>
        <form method="dialog" data-form="edit">
          <input type="hidden" name="id" />
          <label>
            <span>任务</span>
            <input name="title" autocomplete="off" />
          </label>
          <label>
            <span>备注</span>
            <textarea name="note" rows="4"></textarea>
          </label>
          <menu>
            <button type="button" data-action="cancel-edit">取消</button>
            <button type="submit">保存</button>
          </menu>
        </form>
      </dialog>
    </main>
  `;
}

function getGlobalIndexForDrop(quadrant, targetTaskId = "") {
  const withoutDragged = tasks.filter((task) => task.id !== draggedTaskId);

  if (targetTaskId) {
    return withoutDragged.findIndex((task) => task.id === targetTaskId);
  }

  const lastQuadrantIndex = withoutDragged
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.quadrant === quadrant)
    .at(-1)?.index;

  return lastQuadrantIndex === undefined ? withoutDragged.length : lastQuadrantIndex + 1;
}

function openEditDialog(task) {
  const dialog = document.querySelector("[data-dialog]");
  const form = document.querySelector('[data-form="edit"]');
  form.elements.id.value = task.id;
  form.elements.title.value = task.title;
  form.elements.note.value = task.note;
  dialog.showModal();
  form.elements.title.focus();
}

function bindEvents() {
  appRoot.addEventListener("submit", (event) => {
    const form = event.target;

    if (form.matches('[data-form="add"]')) {
      event.preventDefault();
      const title = form.elements.title.value;
      const important = form.elements.important.checked;
      const urgent = form.elements.urgent.checked;
      setTasks(addTask(tasks, { title, urgent, important }));
      form.reset();
      form.elements.important.checked = true;
      form.elements.urgent.checked = true;
      form.elements.title.focus();
    }

    if (form.matches('[data-form="edit"]')) {
      event.preventDefault();
      setTasks(
        updateTask(tasks, form.elements.id.value, {
          title: form.elements.title.value,
          note: form.elements.note.value
        })
      );
      document.querySelector("[data-dialog]").close();
    }
  });

  appRoot.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }

    const taskId = action.dataset.taskId;
    if (action.dataset.action === "toggle") {
      setTasks(toggleTask(tasks, taskId));
    }

    if (action.dataset.action === "edit") {
      const task = tasks.find((item) => item.id === taskId);
      if (task) {
        openEditDialog(task);
      }
    }

    if (action.dataset.action === "delete") {
      setTasks(deleteTask(tasks, taskId));
    }

    if (action.dataset.action === "cancel-edit") {
      document.querySelector("[data-dialog]").close();
    }
  });

  appRoot.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-task-id]");
    if (!card) {
      return;
    }

    draggedTaskId = card.dataset.taskId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedTaskId);
  });

  appRoot.addEventListener("dragover", (event) => {
    if (event.target.closest("[data-drop-zone]")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  });

  appRoot.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-drop-zone]");
    if (!zone || !draggedTaskId) {
      return;
    }

    event.preventDefault();
    const quadrant = zone.dataset.dropZone;
    const targetCard = event.target.closest(".task-card");
    const targetTaskId = targetCard?.dataset.taskId === draggedTaskId ? "" : targetCard?.dataset.taskId;
    const globalIndex = getGlobalIndexForDrop(quadrant, targetTaskId);
    const moved = moveTask(tasks, draggedTaskId, quadrant);
    setTasks(reorderTask(moved, draggedTaskId, globalIndex));
    draggedTaskId = "";
  });
}

async function boot() {
  render();
  bindEvents();

  try {
    const loadedTasks = await getTaskApi().loadTasks();
    setTasks(normalizeTasks(loadedTasks), false);
  } catch {
    setTasks([], false);
    setStatus("读取失败，已从空列表开始", "error");
  }
}

boot();
