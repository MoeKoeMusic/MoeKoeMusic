# MoeKoe Music 插件目录

这个目录用于存放 MoeKoe Music 扩展插件，应用启动时会自动加载此目录下的所有有效插件。

## 插件结构

每个插件应该是一个独立的文件夹，包含以下文件：

```
plugin-name/
├── manifest.json    # 插件清单文件（必需）
├── background.js    # 后台脚本（可选）
├── content.js       # 内容脚本（可选）
├── popup.html       # 弹窗页面（可选）
├── popup.js         # 弹窗脚本（可选）
└── icons/           # 图标文件夹（可选）
```

## 示例插件

前往 [https://github.com/MoeKoeMusic](https://github.com/MoeKoeMusic) 查看其他用户编写的插件示例，获取更多灵感和参考。
开发文档正在规划中...

## 插件开发指南

1. **manifest.json**: 必须包含 `manifest_version`、`name`、`version` 字段
2. **权限**: 根据需要在 `permissions` 中声明所需权限
3. **脚本**: 可以包含背景脚本、内容脚本等
4. **图标**: 建议提供 16x16、48x48、128x128 尺寸的png或jpg图标

## 插件管理

- 插件会在应用启动时自动加载
- 可以通过应用内的插件管理界面进行管理
- 支持热重载和手动安装/卸载

## 注意事项

- 插件需要符合 Chrome Extension Manifest V3 规范
- 确保插件的安全性，避免恶意代码
- 插件可能会影响应用性能，请谨慎使用