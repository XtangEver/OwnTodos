const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("quadrantTodo", {
  loadTasks: () => ipcRenderer.invoke("tasks:load"),
  saveTasks: (tasks) => ipcRenderer.invoke("tasks:save", tasks)
});
