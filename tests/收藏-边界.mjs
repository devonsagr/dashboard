import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('output/playwright', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await b.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const U = (process.env.URL || 'http://127.0.0.1:4185') + '/#';
let failures = 0;
const ok = (name, cond, extra = '') => { if (!cond) failures++; console.log(cond ? 'PASS' : 'FAIL', name, extra); };
await page.goto(U + '/'); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.reload(); await page.waitForTimeout(800);
// AC-29 顶栏任务窗跨画板
await page.goto(U + '/c/favorites'); await page.waitForTimeout(700);
await page.click("button[aria-label='收藏任务']"); await page.waitForTimeout(300);
await page.goto(U + '/b/body'); await page.waitForTimeout(600);
const still = await page.locator(".fav-taskwin").count();
if (!still) { await page.click("button[aria-label='收藏任务']"); await page.waitForTimeout(300); }
ok('其他画板上顶栏仍可打开收藏任务', await page.locator('.fav-taskwin').count() > 0, `窗口保留=${still}`);
await page.click("button[aria-label='收起（任务继续）']"); await page.waitForTimeout(300);
await page.click("button[aria-label='收藏任务']"); await page.waitForTimeout(300);
const tw0 = await page.locator('.fav-taskwin').textContent();
ok('收起任务窗不取消任务', tw0.includes('运行中'), tw0.slice(0, 50));
await page.click("button[aria-label='收起（任务继续）']"); await page.waitForTimeout(200);
// AC-06 B站未选夹不能开始
await page.goto(U + '/c/favorites/import/bili'); await page.waitForTimeout(700);
ok('B站未选收藏夹不能开始', await page.locator("button:text-is('开始')").isDisabled());
// AC-19 只有标题无假摘要
await page.goto(U + '/c/favorites/i/f05'); await page.waitForTimeout(700);
const aiBtn = page.locator(".fav-pane button:has-text('AI 优化')");
ok('无正文时 AI 优化不可用（无假摘要）', (await aiBtn.count()) === 0 || await aiBtn.first().isDisabled());
// AC-24 同源两份记录：回收一份，另一份仍在
await page.goto(U + '/c/favorites/r/r01'); await page.waitForTimeout(700);
await page.click("button:has-text('回收这一份')"); await page.waitForTimeout(1200);
const st = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pkd.v5.card.favorites.v1')); return d.recs.filter(r => ['r01','r02'].includes(r.id)).map(r => r.id + ':' + (r.trashed ? '回收' : '在')).join(','); });
ok('回收一份记录，同源另一份不受影响', st.includes('r01:回收') && st.includes('r02:在'), st);
// AC-22 预览后修改 → 旧预览失效
await page.goto(U + '/c/favorites/i/f04'); await page.waitForTimeout(700);
await page.locator(".fav-pane button:has-text('我自己处理')").first().click();
await page.locator('.fav-pane textarea.fav-ta').first().fill('周末对照笔记看');
await page.locator(".fav-pane button:has-text('预览')").first().click(); await page.waitForTimeout(200);
await page.locator('.fav-pane textarea.fav-ta').first().fill('周末对照笔记看，再补一句');
await page.waitForTimeout(200);
ok('改了批注 → 旧预览不能确认', await page.locator(".fav-pane button:has-text('确认保存')").first().isDisabled().catch(() => true));
// AC-34 草稿按对象隔离
await page.goto(U + '/c/favorites/i/f06'); await page.waitForTimeout(700);
await page.goto(U + '/c/favorites/i/f04'); await page.waitForTimeout(700);
if (!(await page.locator('.fav-pane textarea.fav-ta').count())) await page.locator(".fav-pane button:has-text('我自己处理')").first().click();
const kept = await page.locator('.fav-pane textarea.fav-ta').first().inputValue().catch(() => '');
ok('切到别的材料再回来，草稿还在且不串', kept.includes('再补一句'), kept);
// AC-31 断线
await page.goto(U + '/c/favorites/settings'); await page.waitForTimeout(600);
await page.click("button:has-text('断线（保留截至）')"); await page.waitForTimeout(300);
await page.click("button[aria-label='收藏任务']"); await page.waitForTimeout(300);
const tw = await page.locator('.fav-taskwin').textContent();
ok('断线时任务窗显示截至时间而不是清零', /截至|断线|离线/.test(tw), tw.slice(0, 60));
await page.screenshot({ path: './output/playwright/17-收藏-任务窗断线.png' });
ok('无异常', errs.length === 0, errs.join('|'));
await b.close(); process.exit(failures ? 1 : 0);
