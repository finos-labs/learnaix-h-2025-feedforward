import './styles/dashboard.css';
import './styles/chatbot.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
