import { connectHost } from './data/host';
connectHost().then(() => import('./render')).catch((error) => {
  const root = document.getElementById('root')!;
  const message = document.createElement('p'); message.textContent = `未能读取 Vault：${error.message}`;
  const retry = document.createElement('button'); retry.textContent = '重新连接'; retry.onclick = () => location.reload();
  root.replaceChildren(message, retry);
});
