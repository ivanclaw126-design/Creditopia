# Creditopia

一个用于追踪信用卡额度、剩余额度和当前欠款的小型静态网页工具。

## 功能

- 录入多张信用卡的银行、尾号、总额度和当前剩余额度
- 自动回算每张卡的当前欠款
- 汇总全部信用卡总欠款
- 手动填写记账软件总欠款，并实时计算差额
- 支持本地导出 / 导入 JSON 数据
- 适合部署到 GitHub Pages 直接使用

## 本地运行

这是一个纯前端项目，不依赖打包工具。

直接启动本地静态服务器即可，例如：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/
```

仓库中也提供了辅助脚本：

- `serve_local.py`
- `start_creditopia.command`

## 数据存储

页面数据默认保存在当前浏览器的 `localStorage` 中，当前使用的 key 为：

- `creditopia-credit-cards`
- `creditopia-ledger-total-debt`

说明：

- 发布新版本不会主动清空这些数据
- 不同浏览器、不同设备、不同域名之间的本地存储彼此独立
- GitHub Pages 与本地 `127.0.0.1` 不是同一个存储空间
- 如果需要迁移数据，请使用页面上的“导出数据 / 导入数据”

## 项目结构

- `/Users/spicyclaw/MyProjects/Creditopia/index.html`：页面结构
- `/Users/spicyclaw/MyProjects/Creditopia/styles.css`：样式与响应式布局
- `/Users/spicyclaw/MyProjects/Creditopia/script.js`：交互逻辑、存储、导入导出
- `/Users/spicyclaw/MyProjects/Creditopia/logic.js`：可复用的业务逻辑
- `/Users/spicyclaw/MyProjects/Creditopia/tests/script.test.js`：基础测试

## 校验

可用以下命令做快速检查：

```bash
node --check script.js
node --test tests/script.test.js
```

## 部署

当前仓库可以直接推送到 `main` 分支，再由 GitHub Pages 发布静态页面。

如果样式更新后线上没有立刻刷新，通常是浏览器缓存导致；当前项目已通过样式版本号降低这个问题。
