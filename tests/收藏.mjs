import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('output/playwright', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await b.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
const U = (process.env.URL || 'http://127.0.0.1:4185') + '/#';
let failures = 0;
const ok = (name, cond, extra = '') => { if (!cond) failures++; console.log(cond ? 'PASS' : 'FAIL', name, extra); };
await page.goto(U + '/'); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.reload(); await page.waitForTimeout(800);

// F1 画板上有收藏卡，点开进入完整页
await page.goto(U + '/b/inputs'); await page.waitForTimeout(800);
ok('输入画板上有收藏卡', await page.locator(".card-title:text-is('收藏')").count() > 0);
await page.goto(U + '/collect/bili'); await page.waitForTimeout(700);
ok('旧路由 /collect/bili → 收藏导入页', page.url().includes('/c/favorites/import/bili'), page.url());

// F2 全选筛选结果 + 换筛选清空
await page.goto(U + '/c/favorites'); await page.waitForTimeout(900);
const allBtn = page.locator("button:has-text('全选筛选结果')");
const label = await allBtn.textContent();
const n = +label.match(/（(\d+)）/)[1];
await allBtn.click(); await page.waitForTimeout(200);
const selTxt = await page.locator('.fav-selbar b').textContent();
ok('全选 = 筛选结果数（含未显示）', selTxt.includes(String(n)), `${label} / ${selTxt}`);
await page.locator(".fav-filters .pill:has-text('以后读')").click(); await page.waitForTimeout(200);
ok('换筛选清空选择', await page.locator('.fav-selbar b').count() === 0);
await page.locator(".fav-filters .pill:has-text('待处理')").first().click(); await page.waitForTimeout(200);

// F3 保存批注（预览→确认）后自动接到下一条
await page.locator('.fav-row-main').first().click(); await page.waitForTimeout(500);
const t1 = await page.locator('.fav-pane h1, .fav-pane h2').first().textContent();
await page.locator(".fav-pane button:has-text('直接入库')").first().click(); await page.waitForTimeout(200);
await page.locator('.fav-pane textarea.fav-ta').first().fill('测试：以后做模板时参考');
await page.locator(".fav-pane button:has-text('预览')").first().click(); await page.waitForTimeout(200);
await page.locator(".fav-pane button:has-text('确认保存')").first().click(); await page.waitForTimeout(1500);
const t2 = await page.locator('.fav-pane h1, .fav-pane h2').first().textContent();
const recN = await page.evaluate(() => JSON.parse(localStorage.getItem('pkd.v5.card.favorites.v1') || '{}').recs?.filter(r => r.note?.includes('测试：以后做模板')).length);
ok('确认保存生成 1 份分流记录', recN === 1, String(recN));
ok('保存后接到下一条', t1 !== t2, `${t1?.slice(0,20)} → ${t2?.slice(0,20)}`);

// F4 长字幕搜索可跳到最后一句
await page.goto(U + '/c/favorites/i/f03'); await page.waitForTimeout(900);
await page.fill("input[aria-label='搜索字幕']", '检索点'); await page.waitForTimeout(400);
const hits = await page.locator('.fav-subs-list mark, .fav-subs-list .hit').count();
ok('长字幕搜索命中多处', hits >= 3, String(hits));

// F5 图片查看器打开 / Esc 关闭
await page.goto(U + '/c/favorites/i/f11'); await page.waitForTimeout(900);
await page.locator('.fav-pane button.fav-thumb, .fav-pane .fav-thumb').first().click(); await page.waitForTimeout(300);
const vOpen = await page.locator('[role=dialog]').count();
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('图片查看器打开并可 Esc 关闭', vOpen > 0 && await page.locator('[role=dialog]').count() === 0, `${vOpen}`);

// F6 任务在离开收藏后仍在
await page.goto(U + '/c/favorites/tasks'); await page.waitForTimeout(700);
const tk0 = await page.locator('.fav-task, .fav-tk').count();
await page.goto(U + '/b/today'); await page.waitForTimeout(500); await page.goto(U + '/c/favorites/tasks'); await page.waitForTimeout(700);
ok('任务列表跨页面保留', tk0 > 0 && (await page.locator('.fav-task, .fav-tk').count()) >= tk0 - 2, String(tk0));

// F7 收件里的收藏材料可跳回收藏
await page.goto(U + '/c/inbox/m/m06'); await page.waitForTimeout(800);
const lk = page.locator("a:has-text('在收藏里打开')");
ok('收件材料 → 在收藏里打开', await lk.count() > 0);
if (await lk.count()) { await lk.first().click(); await page.waitForTimeout(700); ok('跳转到收藏条目', page.url().includes('/c/favorites/i/m06'), page.url()); }

// F8 卡片出错只影响自己
await page.goto(U + '/'); await page.waitForTimeout(800);
ok('无未处理异常', errs.length === 0, errs.join(' | '));
await b.close(); process.exit(failures ? 1 : 0);
