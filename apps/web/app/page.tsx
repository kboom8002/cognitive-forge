import Link from "next/link";
import React from "react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] overflow-x-hidden relative font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6c63ff] rounded-full blur-[140px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#34d399] rounded-full blur-[140px] opacity-10 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#4facfe] shadow-[0_0_15px_rgba(108,99,255,0.4)]" />
          <span className="text-xl font-bold tracking-tight text-white hidden sm:block">Cognitive Forge OS</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/demo" className="text-sm font-medium text-[#9090a8] hover:text-white transition-colors">Demo Gallery</Link>
          <a href="https://github.com/kboom8002/cognitive-forge" target="_blank" rel="noreferrer" className="text-sm font-medium text-[#9090a8] hover:text-white transition-colors">GitHub</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-24 pb-20 px-4 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(108,99,255,0.3)] bg-[rgba(108,99,255,0.1)] text-[#a39eff] text-sm font-semibold mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#6c63ff] animate-pulse" />
          SOTA Commercial Release v0.1.0
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-[#9090a8] mb-8 leading-tight">
          Turn Domain Knowledge <br className="hidden md:block" /> Into AI Applications
        </h1>
        
        <p className="text-lg md:text-xl text-[#9090a8] max-w-2xl mx-auto mb-12 leading-relaxed">
          The composable OS for building, validating, and scaling Enterprise AI pipelines. No black boxes. Just 100% human-readable trace and validated contracts.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/demo" 
            className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 hover:scale-[1.02] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          >
            Launch Demo Gallery
          </Link>
          <Link 
            href="/demo/apps/corporate-pr-suite" 
            className="px-8 py-4 rounded-full bg-[#1e1e30] text-white border border-[#2a2a42] font-semibold text-lg hover:border-[#6c63ff] hover:bg-[#252538] transition-all duration-300"
          >
            Try PR Suite
          </Link>
        </div>
      </section>

      {/* Features/Suites Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <Link href="/demo/apps/corporate-pr-suite" className="group block relative p-8 rounded-2xl bg-[#13131f] border border-[#2a2a42] hover:border-[#6c63ff] transition-all duration-300 hover:-translate-y-2 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div className="w-12 h-12 rounded-full bg-[rgba(108,99,255,0.1)] flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Corporate PR Suite</h3>
            <p className="text-[#9090a8] text-sm leading-relaxed">A 7-node pipeline that takes raw company facts and produces validated press releases, web brochures, and answer cards.</p>
          </Link>

          {/* Card 2 */}
          <Link href="/demo/apps/book-to-agent" className="group block relative p-8 rounded-2xl bg-[#13131f] border border-[#2a2a42] hover:border-[#34d399] transition-all duration-300 hover:-translate-y-2 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div className="w-12 h-12 rounded-full bg-[rgba(52,211,153,0.1)] flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Book-to-Agent</h3>
            <p className="text-[#9090a8] text-sm leading-relaxed">Transforms dense books into actionable AI agents. Extracts core knowledge, writes action plans, and builds a reflection coach.</p>
          </Link>

          {/* Card 3 */}
          <Link href="/demo/apps/ai-training-practice-suite" className="group block relative p-8 rounded-2xl bg-[#13131f] border border-[#2a2a42] hover:border-[#f472b6] transition-all duration-300 hover:-translate-y-2 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            </div>
            <div className="w-12 h-12 rounded-full bg-[rgba(244,114,182,0.1)] flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">AI Training Practice</h3>
            <p className="text-[#9090a8] text-sm leading-relaxed">An interactive educational suite that teaches AI prompting through immediate feedback, rubric scoring, and optimized suggestions.</p>
          </Link>

        </div>
      </section>
    </main>
  );
}
