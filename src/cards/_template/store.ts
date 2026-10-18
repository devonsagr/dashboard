import { cardStore } from '../../data/cardStore';
/** 只属于这张卡的数据。接入后端时只换这个文件 */
export const S = cardStore('_template', () => ({ clicks: 0 }));
export const click = () => S.write('template-click', '点了一下', () => { S.d.clicks++; });
