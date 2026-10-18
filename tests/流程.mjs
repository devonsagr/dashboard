// v5 主流程：备注 → AI 初处理 → 我选（A 入库按规则 / B 自己处理）；设置改规则即生效；4 点日切；拼贴锁定置顶；日报定稿；主体队列；项目回读
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
const S = () => page.evaluate(() => JSON.parse(localStorage.getItem('pkd.v5.sample.v5') || '{}'));
await page.goto(U + '/'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);

// 1 没写备注不能交给 AI
await page.goto(U + '/c/inbox/m/m19'); await page.waitForTimeout(700);
const send = page.locator("button:has-text('交给 AI 按备注过一遍')");
ok('没写备注时「交给 AI」不可点', await send.isDisabled());

// 2 写备注 → 交给 AI → 出结果
await page.fill("textarea[aria-label='备注']", '想弄清 MCP 和 A2A 的分工，后面接 Obsidian 用');
await send.click(); await page.waitForSelector('.ai-box', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300);
const m19 = (await S()).materials.find(x => x.id === 'm19');
ok('备注保存且 AI 按备注出结果', m19.note?.text?.includes('MCP') && m19.ai?.state === 'result' && m19.ai?.intent?.includes('MCP'), m19.ai?.state);

// 3 A 直接入库：预览路径来自规则
await page.click("button:has-text('A 直接入库')"); await page.waitForTimeout(300);
const prev1 = await page.locator('.panel b.mono').first().textContent();
ok('入库落点按规则算出', /知识库\//.test(prev1) && !prev1.includes('{'), prev1);

// 4 设置里改命中规则 → 预览跟着变
const hit = await page.locator('.panel', { hasText: '命中规则' }).first().textContent();
await page.goto(U + '/settings#routes'); await page.waitForTimeout(700);
const inputs = page.locator("#routes input[aria-label='路径'], .rule-table input[aria-label='路径']");
const n = await inputs.count(); let changed = '';
for (let i = 0; i < n; i++) { const v = await inputs.nth(i).inputValue(); if (prev1.startsWith(v.split('{')[0]) && v.includes('AI')) { await inputs.nth(i).fill('知识库/AI-改过/{标题}.md'); changed = v; break; } }
if (!changed) for (let i = 0; i < n; i++) { const v = await inputs.nth(i).inputValue(); if (prev1.startsWith(v.split('{')[0])) { await inputs.nth(i).fill('知识库/AI-改过/{标题}.md'); changed = v; break; } }
await page.locator('.rule-table').first().locator('xpath=ancestor::*[.//button[text()="保存"]][1]').locator("button:text-is('保存')").first().click(); await page.waitForTimeout(900);
await page.goto(U + '/c/inbox/m/m19'); await page.waitForTimeout(700);
await page.click("button:has-text('A 直接入库')"); await page.waitForTimeout(300);
const prev2 = await page.locator('.panel b.mono').first().textContent();
ok('改规则后预览跟着变', prev2.startsWith('知识库/AI-改过/'), `${changed} → ${prev2} | ${hit?.slice(0, 60)}`);
await page.screenshot({ path: './output/playwright/40-材料-入库预览.png' });

// 5 确认入库 → route 入库 + 路径
await page.click("button:has-text('确认入库')"); await page.waitForTimeout(1200);
const m19b = (await S()).materials.find(x => x.id === 'm19');
ok('确认入库写下去向和路径', m19b.route?.kind === '入库' && m19b.route.path.startsWith('知识库/AI-改过/'), m19b.route?.path);

// 6 B 我自己处理：要点没划完不能点处理完了
await page.goto(U + '/c/inbox/m/m23'); await page.waitForTimeout(700);
const done = page.locator("button:has-text('处理完了')");
const disBefore = await done.isDisabled();
const boxes = page.locator('.cross-list input[type=checkbox]');
for (let i = 0; i < await boxes.count(); i++) if (!(await boxes.nth(i).isChecked())) { await boxes.nth(i).click(); await page.waitForTimeout(900); }
const disAfter = await done.isDisabled();
ok('自己处理：划完要点才能「处理完了」', disBefore && !disAfter, `${disBefore}/${disAfter}`);
await page.screenshot({ path: './output/playwright/41-材料-自己处理.png' });

// 7 以后读
await page.goto(U + '/c/inbox/m/m20'); await page.waitForTimeout(600);
await page.click("button:text-is('以后读')"); await page.waitForTimeout(900);
ok('以后读打上时间', !!(await S()).materials.find(x => x.id === 'm20').later);

// 8 4 点日切：凌晨 00:30 的消息算昨天
await page.goto(U + '/c/qq'); await page.waitForTimeout(800);
ok('群消息标出「昨天的内容 · 今天取得」', (await page.textContent('.page')).includes('昨天的内容 · 今天取得'));

// 9 日报定稿 + 撤回
await page.goto(U + '/c/daily'); await page.waitForTimeout(800);
await page.click("button:text-is('定稿')"); await page.waitForTimeout(900);
const fin = (await page.textContent('.page')).includes('已定稿');
await page.click("button:has-text('撤回定稿')"); await page.waitForTimeout(900);
ok('日报定稿 → 撤回', fin && (await page.locator("button:text-is('定稿')").count()) === 1);

// 10 主体上下文：接受一条候选
await page.goto(U + '/c/context'); await page.waitForTimeout(800);
const nPend0 = await page.locator("button:has-text('不接受')").count();
await page.locator("button:text-is('接受')").first().click(); await page.waitForTimeout(900);
const nPend1 = await page.locator("button:has-text('不接受')").count();
ok('主体更新：接受后待确认少一条', nPend1 === nPend0 - 1, `${nPend0}→${nPend1}`);

// 11 项目：重新读取不改「资料截至」
await page.goto(U + '/c/projects/p06'); await page.waitForTimeout(800);
const asOf0 = (await S()).projects.find(p => p.id === 'p06').asOf;
await page.click("button:has-text('重新读取')"); await page.waitForTimeout(1200);
const p06 = (await S()).projects.find(p => p.id === 'p06');
ok('重新读取：资料截至不变，最后读取更新', p06.asOf === asOf0 && !!p06.lastReadAt, `${asOf0} / ${p06.lastReadAt}`);

// 12 拼贴：后固定的在先固定的上面；未固定的置顶仍在固定之下
await page.goto(U + '/b/collage'); await page.waitForTimeout(900);
await page.click("button:has-text('整理')"); await page.waitForTimeout(300);
const cells = page.locator('.collage-cell:not(.locked)');
const t1 = await cells.nth(0).locator('.card-title').first().textContent();
const t2 = await cells.nth(1).locator('.card-title').first().textContent();
const t3 = await cells.nth(2).locator('.card-title').first().textContent();
const cell = (t) => page.locator('.collage-cell', { has: page.locator(`.card-title:text-is('${t}')`) }).first();
await cell(t1).locator("button[title^='固定']").click(); await page.waitForTimeout(200);
await cell(t2).locator("button[title^='固定']").click(); await page.waitForTimeout(200);
await page.click("button:has-text('完成整理')"); await page.waitForTimeout(300);
await cell(t3).locator('.card-head').click({ position: { x: 60, y: 14 } }); await page.waitForTimeout(300);
const z = async (t) => +(await cell(t).getAttribute('data-z'));
const [z1, z2, z3] = [await z(t1), await z(t2), await z(t3)];
ok('拼贴锁定：后固定 > 先固定 > 刚置顶的未固定', z2 > z1 && z1 > z3, `${t1}:${z1} ${t2}:${z2} ${t3}:${z3}`);
await page.reload(); await page.waitForTimeout(800);
ok('锁定层级刷新后保持', (await z(t2)) > (await z(t1)) && (await z(t1)) > (await z(t3)));

ok('无异常', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
await b.close(); process.exit(failures ? 1 : 0);
