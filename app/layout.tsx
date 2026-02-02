import './globals.css';

export const metadata = {
  title: 'Risentia Trial Matching',
  description: 'AI-powered clinical trial matching with LangGraph',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
