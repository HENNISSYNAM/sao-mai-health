import React from 'react';

interface LayoutProps {
  area?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ area = 'app', children }) => {
  return (
    <main data-area={area} className="min-h-screen">
      {children}
    </main>
  );
};

export default Layout;