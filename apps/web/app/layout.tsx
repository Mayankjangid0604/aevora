import './globals.css';
import Sidebar from './components/Sidebar';
import VoiceButton from './components/VoiceButton';

export const metadata = {
  title: 'AEVORA — Chairman Control Center',
  description: 'AI Company Command Interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
        <VoiceButton />
      </body>
    </html>
  );
}
