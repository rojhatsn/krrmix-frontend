import "./globals.css";

export const metadata = {
  title: "KRRMix Admixture",
  description: "Advanced Local Genetic Admixture Modeler",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
