import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: true,
          retry: 1,
          staleTime: 5 * 60 * 1000,
          cacheTime: 10 * 60 * 1000,
        },
      },
    })}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
