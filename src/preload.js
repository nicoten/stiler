// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from '.ui/App';

function render() {
  // ReactDOM.render(<App />, document.body);
  ReactDOM.render(<div>hello world</div>, document.body);
}

render();