import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Router, Page } from './components/Router';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [pageParams, setPageParams] = useState<{ productId?: string }>({});

  const handleNavigate = (page: Page, params?: { productId?: string }) => {
    setCurrentPage(page);
    setPageParams(params || {});
  };

  return (
    <AuthProvider>
      <Router page={currentPage} params={pageParams} onNavigate={handleNavigate} />
    </AuthProvider>
  );
}

export default App;
