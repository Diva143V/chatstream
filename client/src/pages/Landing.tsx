import { Link } from 'react-router-dom';
import { Zap, MessageSquare, Users, Shield, ArrowRight } from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'Real-time Chat', desc: 'Instant messaging with Socket.IO — no refresh needed.' },
  { icon: Users, title: 'Server Communities', desc: 'Create servers, organize channels, grow your community.' },
  { icon: Shield, title: 'Secure by Default', desc: 'JWT auth, bcrypt passwords, rate-limited endpoints.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ChatStream</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
            Sign In
          </Link>
          <Link to="/register" className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-brand/20">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand to-brand-light flex items-center justify-center mb-8 shadow-2xl shadow-brand/30">
          <Zap className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
          Chat, connect,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-light">
            collaborate
          </span>
        </h1>

        <p className="text-xl text-white/50 max-w-xl mb-10">
          A Discord-inspired real-time chat app built with React, Node.js, Socket.IO, and PostgreSQL.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-all active:scale-95 shadow-xl shadow-brand/25 text-lg"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all text-lg"
          >
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-6 mt-20 max-w-3xl w-full">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-raised border border-white/10 rounded-2xl p-6 text-left">
              <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-light" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/40">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-white/20 text-sm border-t border-white/5">
        ChatStream — Built with React + Node.js + Socket.IO
      </footer>
    </div>
  );
}
