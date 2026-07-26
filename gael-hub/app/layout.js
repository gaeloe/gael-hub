import "./globals.css";

export const metadata = {
  title: "Gaël's Work Hub",
  description: "Tasks and ideas, all in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3a6b5c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="My Hub" />
      </head>
      <body>{children}</body>
    </html>
  );
}
