import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '점령전 트래커',
  description: '서머너즈워 길드 점령전 방어덱·공격 기록 분석 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
