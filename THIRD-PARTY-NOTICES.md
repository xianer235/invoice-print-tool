# 第三方组件许可证说明

本仓库 `lib/` 目录下的文件来自各上游项目的官方发行版，未做修改，保留其原有许可证。
本项目自有代码（HTML 源码、build-offline.mjs、各类文档）以 MIT 许可发布，见根目录 [LICENSE](LICENSE)。

## pdf.js

- 文件：`lib/pdf.min.js`、`lib/pdf.worker.min.js`
- 许可证：Apache License 2.0
- 版权：Copyright 2023 Mozilla Foundation
- 项目：https://github.com/mozilla/pdf.js
- 说明：许可证声明保留在 `lib/pdf.min.js` 文件头部。
- CMap 字符映射表与标准字体随 pdf.js 发行版一同分发，许可证见下。

## CMap 字符映射表

- 文件：`lib/cmaps/*.bcmap`（168 个）
- 许可证：BSD 3-Clause
- 版权：Adobe Systems Incorporated
- 说明：由 pdf.js 打包分发。中文电子发票普遍使用 UniGB-UCS2-H / GBK-EUC-H 等预定义编码，
  缺少这些映射表时发票文字会整段加载失败，因此它们是本工具能正常显示中文的关键资源。

## Foxit 标准字体

- 文件：`lib/standard_fonts/Foxit*.pfb`（10 个）
- 许可证：BSD 3 条款风格
- 版权：Copyright 2014 PDFium Authors；Original code copyright 2014 Foxit Software Inc.
- 说明：从 PDFium（Chromium 的 PDF 引擎）提取，随 pdf.js 发行版分发。

## Liberation 字体

- 文件：`lib/standard_fonts/LiberationSans-*.ttf`
- 许可证：GNU GPL v2 或更高版本，含字体嵌入例外（Liberation Exception）
- 版权：Copyright (c) 2007–2011 Red Hat, Inc.，原始设计 Ascender Corp.
- 说明：随 pdf.js 发行版（Liberation 1.07.4）分发。字体嵌入例外允许在生成的 PDF 文档中
  嵌入该字体，而不使文档本身受 GPL 约束；分发字体文件本身仍需遵守 GPL。
  如对 GPL 许可有顾虑，可将 `build-offline.mjs` 中的 `FONT_KEEP` 正则改为仅保留
  `Foxit.*\.pfb`，构建时不打入 Liberation 字体（部分依赖 Helvetica 替身的 PDF 文字
  渲染可能回退到系统字体）。

## pdf-lib

- 文件：`lib/pdf-lib.min.js`
- 许可证：MIT
- 版权：Copyright (c) 2019 Andrew Dillon
- 项目：https://github.com/Hopding/pdf-lib
- 说明：所用发行版为压缩构建，文件内未保留许可证头。其包含的 TypeScript 辅助代码
  （tslib）为 0BSD 许可，版权 Microsoft Corporation。
