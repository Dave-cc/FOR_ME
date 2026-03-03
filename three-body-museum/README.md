# 三体世界展馆（3D | Three.js）

基于 Three.js 的纯前端 3D 交互展馆，灵感来自刘慈欣《三体》。包含以下场景：
- 序厅：标题与环形装置
- 三日凌空：三恒星系统与行星，混沌热量变化
- 水滴：高反射金属球体（动态环境反射）
- 红岸基地：塔台与红色信标扫描光束
- 智子：干涉光纹理 + 粒子

## 运行方式

由于浏览器的 ES Module 安全策略，请不要直接双击 HTML 文件打开。推荐在本地启动一个静态服务器：

- Python（推荐，通常自带）：

```bash
cd three-body-museum
python3 -m http.server 5173
```

然后在浏览器打开：`http://localhost:5173`。

- 或者使用任意本地静态服务器工具（如 `npx serve`、VS Code Live Server 等）。

## 技术要点
- 使用 Import Map 从 CDN 加载 `three` 与 `three/addons`（无需打包工具）
- 单一渲染循环，`SceneManager` 负责场景切换
- 纯程序化内容，无需外部贴图与模型

## 结构
```
three-body-museum/
  index.html
  styles.css
  src/
    main.js
    sceneManager.js
    utils/createStars.js
    scenes/
      IntroScene.js
      TrisolarisScene.js
      DropletScene.js
      RedCoastScene.js
      SophonScene.js
```

## 交互
- 鼠标拖拽：旋转视角
- 滚轮：缩放
- 右键拖拽：平移
- 顶部菜单：切换场景

## 备注
- 如果需要离线运行，可改为本地安装 Three.js 并通过打包器（如 Vite）管理依赖。