import { ExternalLink, Globe } from 'lucide-react';
import { Empty, Tag } from '../../ui/ui';
import type { CardProps } from '../../workbench/cards/protocol';

/* 网页：很多网站禁止被嵌入，所以一直给「在新窗口打开」 */
export function Embed({ inst }: CardProps) {
  const url = inst.props.url;
  if (!url) return <Empty icon={<Globe size={18} />} title="还没填网址" hint="在卡片「属性」里填一个网址或本机小工具地址" />;
  return (
    <div className="embed-wrap">
      <iframe className="embed" src={url} title="网页" sandbox="allow-scripts allow-same-origin allow-forms" />
      <div className="card-foot-note" data-nodrag><Tag tone="faint">提示</Tag>空白说明对方不允许嵌入<a className="link" href={url} target="_blank" rel="noreferrer"><ExternalLink size={11} />新窗口打开</a></div>
    </div>
  );
}
