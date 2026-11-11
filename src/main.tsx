import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import axios from 'axios';
import './index.css';
import App from './App.tsx';
import { getVisitorId } from './utils/visitorId';
import { addAccessToken, logOutIfSessionRejected } from './utils/supabase';

// Empty by default, so requests stay on the same origin (the Vite proxy in
// development, Express in production). Set it when the API has its own URL.
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
// Long enough for the free server to wake up, but a stuck request still ends in an error message
axios.defaults.timeout = 90000;
// How the API keeps each guest's cart and orders apart
axios.defaults.headers.common['X-Visitor-Id'] = getVisitorId();
axios.interceptors.request.use(addAccessToken);
axios.interceptors.response.use(undefined, logOutIfSessionRejected);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
