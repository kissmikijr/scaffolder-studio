import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import app from './App';
import '@backstage/ui/css/styles.css';

// In the new frontend system, app.createRoot() returns a React element,
// not a component, so we render it directly
ReactDOM.createRoot(document.getElementById('root')!).render(app);
