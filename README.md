# 行知书院团委组织部招新邀请信

直接在浏览器打开 `index.html` 即可使用，页面不依赖服务器或网络。

## 需要补充的素材和格式

在 `content.js` 中填写：

| 字段 | 格式 | 示例 |
| --- | --- | --- |
| `recipientName` | 纯文本姓名 | `李明` |
| `groupName` | 群聊名称 | `2026行知书院团委组织部新成员群` |
| `letterDate` | 落款日期 | `2026年9月` |
| `qrImage` | 相对于 `index.html` 的图片路径 | `assets/qrcode.png` |
| `members` | 成员对象列表 | 见下方 |

成员格式：

```js
{ name: "王同学", role: "组织部部长", intro: "负责组织部日常工作的统筹与协调。", avatar: "assets/wang.jpg" }
```

头像建议使用正方形 JPG 或 PNG，至少 `400 x 400` 像素；二维码建议使用清晰的正方形 PNG，至少 `600 x 600` 像素。将文件放进 `assets` 后填入路径即可。

## 为不同同学生成邀请信

地址栏添加姓名参数即可覆盖 `recipientName`，例如：

```text
index.html?name=李明
```
