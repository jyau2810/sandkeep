import { createApp } from './app';
import demoUrl from './assets/cat.png';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing application root.');
const app = createApp(root, { demoUrl });
void app.start();
if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
