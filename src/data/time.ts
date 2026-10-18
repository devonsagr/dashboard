/**
 * 时间工具：统一按 Asia/Hong_Kong（用户设置的时区）计算「今天」。
 * 样例数据的日期全部相对真实今天生成，避免出现固定的 10-15 冒充当前。
 */
export const TZ = 'Asia/Hong_Kong';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function parts(d: Date) {
  const o: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) o[p.type] = p.value;
  return { date: `${o.year}-${o.month}-${o.day}`, hm: `${o.hour === '24' ? '00' : o.hour}:${o.minute}` };
}
export const nowIso = () => { const p = parts(new Date()); return `${p.date}T${p.hm}:${String(new Date().getSeconds()).padStart(2, '0')}+08:00`; };
export const today = () => parts(new Date()).date;
export const nowHm = () => parts(new Date()).hm;
/** 日期加减（YYYY-MM-DD） */
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00+08:00'); d.setUTCDate(d.getUTCDate() + n);
  return parts(d).date;
}
/** 相对今天第 n 天的某个时刻（ISO，+08:00） */
export const at = (n: number, hm = '09:00') => `${addDays(today(), n)}T${hm}:00+08:00`;
export const dateOf = (iso?: string) => iso?.slice(0, 10) ?? '';
export const hm = (iso?: string) => iso?.slice(11, 16) ?? '';
export const md = (s?: string) => (s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '');
const WD = ['日', '一', '二', '三', '四', '五', '六'];
export const weekday = (date: string) => '周' + WD[new Date(date + 'T12:00:00+08:00').getUTCDay()];
export const dayDiff = (a: string, b: string) => Math.round((new Date(a + 'T12:00:00+08:00').getTime() - new Date(b + 'T12:00:00+08:00').getTime()) / 86400000);
export function relDay(date?: string) {
  if (!date) return '未排期';
  const d = dayDiff(date, today());
  return d === 0 ? '今天' : d === 1 ? '明天' : d === -1 ? '昨天' : d === 2 ? '后天' : d < 0 ? `${-d} 天前` : `${md(date)} ${weekday(date)}`;
}
export function relTime(iso?: string) {
  if (!iso) return '时间未知';
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < -1) return `${md(dateOf(iso))} ${hm(iso)}`;
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${Math.round(diff)} 分钟前`;
  if (diff < 1440) return `${Math.round(diff / 60)} 小时前`;
  if (diff < 1440 * 30) return `${Math.round(diff / 1440)} 天前`;
  return dateOf(iso);
}
/** 完整时间：10/16 周五 09:30 */
export const full = (iso?: string) => (iso ? `${md(dateOf(iso))} ${weekday(dateOf(iso))} ${hm(iso)}` : '时间未知');
/** 半月目录：上半月 1–15，下半月 16–月底 */
export const halfMonth = (date: string) => (+date.slice(8, 10) <= 15 ? '上半月' : '下半月');
export const diaryDir = (date: string) => `示例数据/日记/${date.slice(0, 7)}/${halfMonth(date)}/${date}`;

/* ───────── 日切换（默认 04:00）─────────
 * 凌晨 4 点前的内容算前一天：00:30 的消息属于「昨天」。日报、今日关注、日记都按这个口径。
 * 时刻在「设置 › 时间口径」里改（data/settings.ts 启动时调用 setCutoff）。 */
let cutoff = '04:00';
export const getCutoff = () => cutoff;
export function setCutoff(hmStr: string) { if (/^\d{2}:\d{2}$/.test(hmStr)) cutoff = hmStr; }
/** 某个时刻属于哪一天（按日切换） */
export function dayKey(iso?: string) {
  if (!iso) return '';
  const p = parts(new Date(iso));
  return p.hm < cutoff ? addDays(p.date, -1) : p.date;
}
/** 「今天」按日切换算：现在 02:00 时，今天仍是前一天 */
export const workday = () => dayKey(new Date().toISOString());
/**
 * 材料为什么出现在今天：内容时间、取得时间分开说，不把「今天取得」当成「今天发生」。
 * 例：昨天的消息今天才取得 → 「昨天的消息 · 今天取得」。
 */
export function whyToday(contentAt?: string, receivedAt?: string) {
  const W = workday(); const c = dayKey(contentAt), r = dayKey(receivedAt);
  const rel = (d: string) => (d === W ? '今天' : d === addDays(W, -1) ? '昨天' : d ? `${md(d)}` : '时间未知');
  if (!contentAt) return `内容时间未知 · ${rel(r)}取得`;
  if (c === r) return `${rel(c)}的内容`;
  return `${rel(c)}的内容 · ${rel(r)}取得`;
}
