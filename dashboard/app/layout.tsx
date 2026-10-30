import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Thitho Ecosystem | Offline Gĩkũyũ Machine Intelligence",
  description: "Complete offline-first technological platform for the Gĩkũyũ language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0d0a] text-zinc-100 antialiased flex flex-col selection:bg-emerald-600 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-zinc-800/60 bg-[#080b08] py-6 text-center text-xs text-zinc-500 font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span>THITHO ECOSYSTEM &copy; 2026. Built with Python, Rust, and Next.js.</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Rũrĩmĩ: Gĩkũyũ (kik_Latn)</span>
              <span>•</span>
              <span>Zero-Cloud Edge Node</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
