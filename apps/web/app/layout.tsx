import './globals.css';
import Sidebar from './components/Sidebar';
import VoiceButton from './components/VoiceButton';
import AuthGate from './components/AuthGate';
import RealtimeToasts from './components/RealtimeToasts';
import CeoQuestionDialog from './components/CeoQuestionDialog';

const THEME_SCRIPT = `try{var t=localStorage.getItem('aevora_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint (no dark→light flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AuthGate>
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">{children}</main>
          </div>
          <VoiceButton />
          <RealtimeToasts />
          <CeoQuestionDialog />
        </AuthGate>
      </body>
    </html>
  );
}
