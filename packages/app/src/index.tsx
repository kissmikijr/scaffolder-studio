import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';

// eslint-disable-next-line no-console
const originalError = console.error;
// eslint-disable-next-line no-console
console.error = (...args) => {
    if (
        typeof args[0] === 'string' &&
        args[0].includes('ResizeObserver')
    ) {
        return;
    }
    originalError.apply(console, args);
};

window.addEventListener('error', e => {
    if (e.message.includes('ResizeObserver')) {
        e.stopImmediatePropagation();
        e.stopPropagation();
    }
});

window.onerror = (msg) => {
    if (typeof msg === 'string' && msg.includes('ResizeObserver')) {
        return true;
    }
    return false;
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
