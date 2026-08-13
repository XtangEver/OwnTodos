const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("quadrantTodo", {
  loadTasks: () => ipcRenderer.invoke("tasks:load"),
  saveTasks: (tasks) => ipcRenderer.invoke("tasks:save", tasks),
  loadNotes: () => ipcRenderer.invoke("notes:load"),
  saveNotes: (content) => ipcRenderer.invoke("notes:save", content)
});
