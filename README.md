# ChatGPT Info 数据管理平台

一个基于 Cloudflare Pages + Pages Functions 的账号/套餐数据管理平台，包含登录、筛选、搜索、新增、编辑、删除和统计视图。

## 本地运行

```bash
npm install
npm run dev
```

默认开发登录信息：

- 用户名：`admin`
- 密码：`admin123`

生产环境请在 Cloudflare Pages 里设置环境变量：

- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

并绑定 KV 命名空间：

- `DATA_STORE`

## 数据字段

- 用户名称
- 用户微信号
- 来源：抖音、快手、小红书、QQ、微信
- 账号
- 密码
- 套餐：ChatGpt月卡、ChatGpt年卡、Cursor pro月卡、Cursor pro月卡年卡、ClaudeCode pro
- 类型：代充、成品号
- 价格
- 备注
