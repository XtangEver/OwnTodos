# OwnTodos

OwnTodos 是一个离线本地的 Windows 任务工具。安装后可从桌面或开始菜单启动；点击窗口右上角关闭按钮时，程序会继续在右下角后台运行，可通过托盘图标再次打开。

## 安装方式

### 方式一：从 Releases 下载安装包

1. 打开仓库的 Releases 页面。
2. 下载 `OwnTodos-Setup-0.1.2.exe`。
3. 双击运行安装包。
4. 按安装向导完成安装。
5. 安装完成后，从桌面快捷方式或开始菜单打开 `OwnTodos`。

> 说明：本仓库只提交源码，不直接提交 `.exe` 或安装包压缩包。安装包应作为 GitHub Release 附件发布。Release 附件使用英文文件名，避免浏览器下载时出现中文文件名编码问题。

### 方式二：从源码生成安装包

需要先安装 Node.js。

```powershell
npm install
npm run dist
```

生成位置：

```text
release\OwnTodos 安装程序 0.1.2.exe
```

### 方式三：下载源码压缩包

每个 Git 标签都会由 GitHub 自动生成源码压缩包。进入 Releases 或 Tags 页面后，可以下载：

```text
Source code (zip)
Source code (tar.gz)
```

源码压缩包不包含已经构建好的安装程序。如果需要安装包，请下载 Release 附件，或按“从源码生成安装包”自行构建。

## 发布安装包

维护者发布新版本时：

1. 本地运行 `npm run dist`。
2. 在 GitHub 仓库页面进入 `Releases`。
3. 选择对应标签，例如 `v0.1.2`。
4. 上传本地生成的安装包：

```text
D:\work_dir\quadrant-todo\release\OwnTodos 安装程序 0.1.2.exe
```

5. 发布 Release。

## 本地运行

需要先安装 Node.js。

```powershell
npm install
npm run build
npm run electron
```

## 使用说明

- 在顶部输入框写下任务，点击“添加”或按回车创建任务。
- 使用“优先”和“尽快”两个开关决定任务进入哪个区域。
- 点击任务正文可编辑任务。
- 勾选任务左侧复选框可标记完成。
- 点击“删”可删除任务。
- 可以拖动任务到其它区域。
- 所有数据保存在本机，不需要登录，不会上传到网络。

## 后台运行

- 点击窗口右上角关闭按钮时，OwnTodos 不会退出，而是隐藏到右下角托盘。
- 点击托盘图标，或右键托盘图标选择“打开”，可以重新显示窗口。
- 右键托盘图标选择“退出”，才会彻底关闭程序。

## 开发命令

```powershell
npm install
npm test -- --run
npm run build
npm run dist
```

## 项目结构

```text
electron\main.cjs      桌面窗口、托盘、中文菜单和本地数据保存
electron\preload.cjs   渲染层与桌面层之间的安全接口
src\main.js            页面渲染和交互逻辑
src\taskStore.js       任务数据操作
src\styles.css         页面样式
src\taskStore.test.js  单元测试
```
