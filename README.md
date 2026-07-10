# mronetwoone.github.io

一个可直接部署到 GitHub Pages 的原生静态个人网站框架。网站不需要构建步骤、Node.js、npm、数据库或后端。

## 本地预览

浏览器直接打开 HTML 时，`fetch` 可能受到 `file://` 安全策略限制。请在仓库根目录启动任意静态文件服务器，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 添加项目

1. 新建 `content/projects/<项目目录>/`。
2. 在目录中创建 `index.md`，相关图片放在同目录或其 `images/` 子目录。
3. 在 `data/projects.json` 的 `items` 数组中增加一条记录。
4. 首页会根据 JSON 自动生成卡片，卡片链接统一指向 `page.html?file=...`。

```json
{
  "id": "unique-project-id",
  "title": "项目标题",
  "summary": "卡片摘要",
  "date": "2026-07-10",
  "tags": ["标签一", "标签二"],
  "status": "进行中",
  "cover": "content/projects/example/images/cover.svg",
  "file": "content/projects/example/index.md",
  "featured": true
}
```

## 添加文章或笔记

1. 新建 `content/notes/<文章目录>/`。
2. 添加 `index.md` 和相关图片。
3. 在 `data/notes.json` 的 `items` 数组中增加一条记录。

```json
{
  "id": "unique-note-id",
  "title": "文章标题",
  "summary": "卡片摘要",
  "date": "2026-07-10",
  "tags": ["标签"],
  "readingTime": "5 分钟",
  "cover": "content/notes/example/images/cover.svg",
  "file": "content/notes/example/index.md"
}
```

## JSON 字段说明

### `data/site.json`

| 字段 | 用途 |
| --- | --- |
| `siteName` | 导航栏与页脚中的网站名称 |
| `pageTitle` | 浏览器标签页标题 |
| `description` | 页面 SEO 描述 |
| `language` | 页面语言标识 |
| `hero.eyebrow` | Hero 区域上方短标签 |
| `hero.title` | Hero 主标题 |
| `hero.description` | Hero 简介 |
| `hero.primaryAction` | 主按钮文字和链接 |
| `hero.secondaryAction` | 次按钮文字和链接 |
| `about.title` | 关于区域标题 |
| `about.description` | 关于区域占位说明 |
| `about.file` | 关于 Markdown 文件路径 |
| `footerText` | 页脚附加文字 |

### `data/projects.json` 与 `data/notes.json`

| 字段 | 用途 |
| --- | --- |
| `id` | 唯一、稳定的记录标识 |
| `title` | 卡片标题 |
| `summary` | 卡片摘要 |
| `date` | 日期，推荐使用 `YYYY-MM-DD` |
| `tags` | 标签字符串数组 |
| `cover` | 卡片封面图片的仓库相对路径，可留空 |
| `file` | Markdown 路径，必须位于 `content/` 且以 `.md` 结尾 |
| `status` | 项目状态文字，仅项目使用 |
| `featured` | 是否作为重点项目，预留给后续筛选或排序 |
| `readingTime` | 预计阅读时间，仅文章使用 |

## Markdown 与图片

- Markdown 入口统一命名为 `index.md`。
- 图片建议放在内容目录的 `images/` 子目录，并使用相对路径，例如 `![说明](images/cover.svg)`。
- 支持多级标题、段落、图片、列表、表格、引用、链接、行内代码和围栏代码块。
- `page.html` 只加载仓库 `content/` 目录内的 `.md` 文件。远程地址、绝对路径、反斜杠和 `..` 路径穿越都会被拒绝。

## 目录结构

```text
.
├── index.html
├── page.html
├── 404.html
├── .nojekyll
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── content/
│   ├── about/
│   ├── notes/
│   └── projects/
└── data/
```
