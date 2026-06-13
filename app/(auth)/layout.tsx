export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}
