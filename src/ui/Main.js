import { createRoot } from 'react-dom/client';
import App from './App';

function render() {
  // ReactDOM.render(<App />, document.body);
  // ReactDOM.render(<div>hello world</div>, document.body);
  const root = createRoot(document.getElementById('root'));
  root.render(<App/>);
}

render();
