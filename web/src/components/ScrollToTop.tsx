import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // React Router preserves document scroll across SPA navigations unless the app resets it centrally.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
