import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { loadBrands } from './api/brandsApi.js';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource-variable/fraunces/index.css';
import './index.css';

// The templates come in the brands of the server's brand pack, so ask for them
// before the first screen. With no pack, or no server, the built-in brand is used.
loadBrands().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
