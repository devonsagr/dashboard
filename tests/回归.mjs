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
await page.goto(U + '/'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);

// 1 决策：需修改 必须写原因；发送后刷新仍在
await page.goto(U + '/decisions/d01'); await page.waitForTimeout(600);
await page.click("button.btn:text-is('需修改')"); await page.waitForTimeout(200);
const dis = await page.locator("button:has-text('确认「需修改」')").isDisabled();
await page.fill('.resp-box textarea, textarea.input', '样例 2 的字幕时间轴错位，需要重跑');
await page.click("button:has-text('确认「需修改」')"); await page.waitForTimeout(900);
await page.reload(); await page.waitForTimeout(800);
const body1 = await page.textContent('.page');
ok('决策回应需原因 + 刷新后保留', dis && body1.includes('字幕时间轴错位'), `disabledBeforeText=${dis}`);

// 2 待采纳：采纳两次不重复创建行动
await page.goto(U + '/today/approvals'); await page.waitForTimeout(600);
const nActs0 = await page.evaluate(() => JSON.parse(localStorage.getItem('pkd.v5.sample.v5') || '{"actions":[]}').actions?.length ?? -1);
const t0 = (await page.locator('.appr-row .appr-title').first().textContent()).slice(0, 12);
const row = () => page.locator('.appr-row', { hasText: t0 }).first();
await row().locator("button:has-text('采纳')").click(); await page.waitForTimeout(900);
const adoptedTxt = await row().textContent();
await row().locator("button.link:has-text('撤回')").click(); await page.waitForTimeout(900);
await row().locator("button:has-text('采纳')").click(); await page.waitForTimeout(900);
const nActs1 = await page.evaluate(() => JSON.parse(localStorage.getItem('pkd.v5.sample.v5') || '{"actions":[]}').actions?.length ?? -1);
ok('采纳 → 撤回 → 再采纳：只多 1 条行动', nActs1 - nActs0 === 1, `${nActs0}→${nActs1} ${adoptedTxt?.slice(0, 40)}`);

// 3 随手记写入失败：输入保留
await page.evaluate(() => localStorage.setItem('pkd.v5.sim.v1', JSON.stringify({ write: 'failed', offline: false })));
await page.goto(U + '/'); await page.reload(); await page.waitForTimeout(800);
await page.keyboard.press('Control+j'); await page.waitForTimeout(400);
await page.fill('.capture textarea', '失败时这段文字不能丢'); await page.keyboard.press('Control+Enter'); await page.waitForTimeout(1200);
const kept = await page.inputValue('.capture textarea').catch(() => '');
ok('随手记失败保留输入', kept === '失败时这段文字不能丢', JSON.stringify(kept));
await page.screenshot({ path: './output/playwright/30-随手记写入失败.png' });
await page.keyboard.press('Escape');
await page.evaluate(() => localStorage.setItem('pkd.v5.sim.v1', JSON.stringify({ write: 'ok', offline: false })));

// 4 拼贴：浏览时按下即置顶；锁定的不变；右侧不越界
await page.goto(U + '/b/collage'); await page.reload(); await page.waitForTimeout(900);
const cellBy = (t) => page.locator('.collage-cell', { has: page.locator(`.card-title:text-is('${t}')`) }).first();
const zOf = async (t) => +(await cellBy(t).getAttribute('data-z'));
const zMaxBefore = Math.max(...(await page.$$eval('.collage-cell:not(.locked)', (l) => l.map((e) => +e.dataset.z))));
await cellBy('今日行动').locator('.card-head').click({ position: { x: 60, y: 14 } }); await page.waitForTimeout(400);
const zT = await zOf('今日行动');
ok('浏览时点击即置顶（未锁定卡中最高）', zT >= zMaxBefore, `z=${zT} max=${zMaxBefore}`);
const lockedCell = page.locator('.collage-cell.locked').first();
const lz0 = await lockedCell.getAttribute('data-z'); const ls0 = await lockedCell.getAttribute('style');
await lockedCell.locator('.card-head').click({ position: { x: 60, y: 14 } }); await page.waitForTimeout(300);
ok('锁定卡点击不改层级/位置', lz0 === await lockedCell.getAttribute('data-z') && ls0 === await lockedCell.getAttribute('style'));
await page.click("button:has-text('整理')"); await page.waitForTimeout(300);
const c = cellBy('最近编辑'); const hb = await c.locator('.card-head').boundingBox();
await page.mouse.move(hb.x + 60, hb.y + 14); await page.mouse.down(); await page.mouse.move(hb.x + 1600, hb.y + 40, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(300);
const box = await c.boundingBox(); const cw = (await page.locator('div.collage').boundingBox());
ok('拖到右边不越界', box.x + box.width <= cw.x + cw.width + 1, `${Math.round(box.x + box.width)} <= ${Math.round(cw.x + cw.width)}`);
// 颜色
await c.hover(); await c.locator("[title='卡片颜色']").click(); await page.waitForTimeout(300);
await c.locator(".sw[title='青']").click(); await page.waitForTimeout(300);
const tinted = await c.locator('.card').getAttribute('class');
ok('卡片换颜色', tinted.includes('tinted'));
await page.screenshot({ path: './output/playwright/31-拼贴-整理与改色.png' });
await page.click("button:has-text('完成整理')"); await page.waitForTimeout(300);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pkd.v5.boards.v5')).find((x) => x.id === 'collage').cards.find((x) => x.kind === 'recent-docs').tint);
ok('颜色存进布局', saved === 'teal', saved);

// 5 顶栏画板标签 / 时间线 / 菜单模式
await page.click(".btab-main:has-text('项目')"); await page.waitForTimeout(500);
ok('画板标签切换', page.url().endsWith('/b/projects'));
await page.goto(U + '/today/timeline'); await page.waitForTimeout(600);
ok('今天 · 时间线', (await page.locator('.tl-row').count()) > 0);
await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('pkd.v5.prefs.v2') || '{}'); p.boardNav = 'menu'; localStorage.setItem('pkd.v5.prefs.v2', JSON.stringify(p)); });
await page.goto(U + '/'); await page.reload(); await page.waitForTimeout(700);
ok('画板导航：菜单模式', (await page.locator('.btabs').count()) === 0 && (await page.locator('.switcher-btn').count()) > 0);
await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('pkd.v5.prefs.v2') || '{}'); p.boardNav = 'tabs'; localStorage.setItem('pkd.v5.prefs.v2', JSON.stringify(p)); });

// 6 本机服务离线：专注计时命令失败，界面不假装成功
await page.evaluate(() => localStorage.setItem('pkd.v5.sim.v1', JSON.stringify({ write: 'ok', offline: true })));
await page.goto(U + '/runtime/ningshi'); await page.reload(); await page.waitForTimeout(700);
await page.fill("input[aria-label='专注目标']", '离线测试'); await page.click("button:has-text('开始')"); await page.waitForTimeout(1200);
const t6 = await page.textContent('.page');
ok('离线时开始命令失败并说明', t6.includes('没有保存') || t6.includes('离线'), '');
await page.screenshot({ path: './output/playwright/32-专注计时离线命令失败.png' });
await page.evaluate(() => localStorage.setItem('pkd.v5.sim.v1', JSON.stringify({ write: 'ok', offline: false })));
await page.reload(); await page.waitForTimeout(600);
await page.fill("input[aria-label='专注目标']", '示例练习第 2 章'); await page.click("button:has-text('开始')"); await page.waitForTimeout(1300);
ok('在线时开始场次', (await page.textContent('.page')).includes('示例练习第 2 章') && (await page.textContent('.page')).includes('进行中'));

// 7 节点：自动路由需确认
await page.goto(U + '/runtime/node'); await page.waitForTimeout(600);
page.once('dialog', (d) => d.accept());
await page.click("button[aria-label='自动路由']"); await page.waitForTimeout(1000);
ok('自动路由明确开启', (await page.getAttribute("button[aria-label='自动路由']", 'aria-checked')) === 'true');

// 8 回执列表
await page.goto(U + '/settings#receipts'); await page.waitForTimeout(700);
ok('写入回执可见', (await page.locator('.receipt-row').count()) >= 4, String(await page.locator('.receipt-row').count()));
console.log('errors', errs);
await b.close(); process.exit(failures ? 1 : 0);
