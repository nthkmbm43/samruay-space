export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <main className="max-w-md mx-auto bg-background min-h-screen shadow-sm relative pb-20">
        {children}
      </main>
    </div>
  );
}
