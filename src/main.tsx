import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import { applyPrefs, usePrefs } from './workbench/app/prefs';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import './styles/board.css';
import './styles/pages.css';
import './styles/v3.css';

applyPrefs();
function Root() {
  const { motion } = usePrefs();
  return <MotionConfig reducedMotion={motion === 'off' ? 'always' : 'user'}><App /></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
