import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/shared/Navbar';
import { HomePage } from './pages/HomePage';
import { SolverPage } from './pages/SolverPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

function AppLayout({ children, showNav = true }: { children: React.ReactNode; showNav?: boolean }) {
  return (
    <>
      {showNav && <Navbar />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/solve" element={<SolverPage />} />
          <Route path="/how-it-works" element={<AppLayout><HowItWorksPage /></AppLayout>} />
          <Route path="/playground" element={<AppLayout><PlaygroundPage /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
