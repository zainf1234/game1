// app/layout.tsx
import './global.css';

export const metadata = {
  title: 'Circle Platformer',
  description: 'Simple platformer game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
