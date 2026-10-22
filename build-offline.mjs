#!/usr/bin/env node
/**
 * 把开发版 HTML 打包成「单个文件、断网可用」的离线版。
 *
 *   node build-offline.mjs
 *
 * 做的事：
 *   1. 把 lib/ 里的 pdf.js 和 pdf-lib 直接写进 <head>（替换掉 <script src="lib/...">）
 *   2. 把 pdf.worker.min.js 作为纯文本塞进页面，运行时用 Blob 生成 URL 交给 pdf.js
 *      （worker 不能当普通脚本内联，file:// 下也不允许加载本地 worker 路径，Blob 是唯一稳的办法）
 *   3. 把 lib/cmaps/*.bcmap 和 lib/standard_fonts/* 转成 base64 内嵌成 window.__OFFLINE_RES__，
 *      否则中文发票的文字会因为缺字符映射表而整段消失（只剩表格线和印章）
 *
 * 输入：发票打印排版处理工具-仙儿.html + lib/*.js + lib/cmaps + lib/standard_fonts
 * 输出：发票打印排版处理工具-仙儿-离线版.html
 */
import { readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, '发票打印排版处理工具-仙儿.html');
const OUT = join(ROOT, '发票打印排版处理工具-仙儿-离线版.html');
const LIBS = {
  pdfjs: join(ROOT, 'lib/pdf.min.js'),
  pdflib: join(ROOT, 'lib/pdf-lib.min.js'),
  worker: join(ROOT, 'lib/pdf.worker.min.js'),
};
const CMAP_DIR = join(ROOT, 'lib/cmaps');
const FONT_DIR = join(ROOT, 'lib/standard_fonts');

// 只收 Foxit 那套（Helvetica/Times/Courier/Symbol 的替身）和一款西文 TrueType，
// 其余 Liberation 的粗体/斜体体积大、缺了也能用系统字体顶上，不值得塞进单文件
const FONT_KEEP = /^(Foxit.*\.pfb|LiberationSans-Regular\.ttf)$/;

async function collect(dir, filter, stripExt) {
  const names = (await readdir(dir)).filter(filter).sort();
  const out = {};
  let total = 0;
  for (const name of names) {
    const buf = await readFile(join(dir, name));
    total += buf.length;
    out[stripExt ? basename(name, extname(name)) : name] = buf.toString('base64');
  }
  return { map: out, count: names.length, total };
}

const [html, pdfjs, pdflib, worker] = await Promise.all([
  readFile(SRC, 'utf8'),
  readFile(LIBS.pdfjs, 'utf8'),
  readFile(LIBS.pdflib, 'utf8'),
  readFile(LIBS.worker, 'utf8'),
]);
const cmaps = await collect(CMAP_DIR, n => n.endsWith('.bcmap'), true);
const fonts = await collect(FONT_DIR, n => FONT_KEEP.test(n), false);

// 内联脚本里出现 </script 会提前闭合标签，必须先拦下来
for (const [name, code] of Object.entries({ pdfjs, pdflib, worker })) {
  if (/<\/script/i.test(code)) throw new Error(`${name} 含有 </script 字样，不能直接内联`);
}
for (const [kind, box] of Object.entries({ cmaps, fonts })) {
  for (const [k, v] of Object.entries(box.map)) {
    if (/<\/script/i.test(v)) throw new Error(`${kind}/${k} 的 base64 含 </script`);
  }
}

const inline = (code, attrs = '') => `<script${attrs}>\n${code}\n</script>`;
const workerBlock = `<script type="text/plain" id="pdfworker">\n${worker}\n</script>`;
const resBlock = '<script>window.__OFFLINE_RES__=' +
  JSON.stringify({ cmaps: cmaps.map, fonts: fonts.map }) + ';</script>';

const TAGS = {
  head: ['<!--LIB-HEAD-START-->', '<!--LIB-HEAD-END-->'],
  worker: ['<!--LIB-WORKER-START-->', '<!--LIB-WORKER-END-->'],
  res: ['<!--LIB-RES-START-->', '<!--LIB-RES-END-->'],
};
for (const [k, [open, close]] of Object.entries(TAGS)) {
  if (!html.includes(open) || !html.includes(close)) throw new Error(`源文件缺少标记 ${k}: ${open}`);
}

const replaceBetween = (text, open, close, payload) => {
  const a = text.indexOf(open);
  const b = text.indexOf(close);
  if (a < 0 || b < 0 || b < a) throw new Error(`标记顺序不正确：${open}`);
  return text.slice(0, a + open.length) + '\n' + payload + '\n' + text.slice(b);
};

let out = replaceBetween(html, ...TAGS.head, inline(pdfjs) + '\n' + inline(pdflib));
out = replaceBetween(out, ...TAGS.worker, workerBlock);
out = replaceBetween(out, ...TAGS.res, resBlock);

// 版本号后缀标成「离线版」，以后看到就知道是打包产物
out = out.replace(/(<span class="ver">)([^<]*?)(<\/span>)/, (m, a, ver, b) =>
  a + (ver.includes('离线版') ? ver : ver + ' 离线版') + b);

// 离线版不该再有任何外链（页脚的项目仓库链接除外：点它本来就要联网，不影响离线使用）
const REPO_URL = 'https://github.com/xianer235/invoice-print-tool';
const leftover = out.match(/(?:src|href)="(?!#|data:)([^"]+)"/g) || [];
const external = leftover.filter(m => {
  const u = m.replace(/^(?:src|href)="/, '').replace(/"$/, '');
  return u !== REPO_URL && /^https?:|lib\//i.test(u);
});
if (external.length) console.warn('⚠ 仍存在外部引用：', external);
if (!/window\.__OFFLINE_RES__=\{/.test(out)) throw new Error('资源块没有写进去');

await writeFile(OUT, out, 'utf8');
const kb = n => (n / 1024).toFixed(0) + ' KB';
const [s1, s2] = await Promise.all([stat(SRC), stat(OUT)]);
console.log('源文件  ', kb(s1.size));
console.log('CMap    ', cmaps.count, '个', kb(cmaps.total));
console.log('标准字体', fonts.count, '个', kb(fonts.total));
console.log('离线版  ', kb(s2.size), '→', OUT);
console.log('外链残留', external.length, '处');
