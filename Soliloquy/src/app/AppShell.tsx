import { NavLink } from 'react-router-dom';

import { AppRoutes } from './routes';
import { AnalyzerRepositoryProvider } from './providers/AnalyzerRepositoryProvider';
import { getAppShellViewportClassName } from '../shared/ui/layout';

export default function AppShell() {
  return (
    <AnalyzerRepositoryProvider>
      <div className="flex h-[100dvh] min-h-[100dvh] flex-col bg-black text-white">
        <nav className="sticky top-0 z-40 border-b border-white/10 bg-black px-4 py-3 md:px-6">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <div style={{ fontFamily: 'var(--font-brand)', fontSize: 'var(--text-title)', lineHeight: 1 }}>
                Soliloquy
              </div>
              <div className="text-white/90" style={{ fontSize: 'var(--text-ui)', lineHeight: 1.1 }}>
                独白
              </div>
              <div className="text-white/60" style={{ fontSize: 'var(--text-ui)', lineHeight: 1.2 }}>
                A Key Visual Generator for Self-Dialogue
              </div>
              <div className="text-white/60" style={{ fontSize: 'var(--text-ui)', lineHeight: 1.2 }}>
                为唯理书院 2026 而作
              </div>
            </div>

            <div className="flex items-center gap-1 rounded border border-white/10 px-1 py-1">
              <NavLink
                to="/analyzer"
                className={({ isActive }) =>
                  `inline-flex items-center rounded px-3 py-2 transition ${
                    isActive ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                  }`
                }
                style={{ fontSize: 'var(--text-ui)' }}
              >
                分析
              </NavLink>
              <NavLink
                to="/mirror"
                className={({ isActive }) =>
                  `inline-flex items-center rounded px-3 py-2 transition ${
                    isActive ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                  }`
                }
                style={{ fontSize: 'var(--text-ui)' }}
              >
                镜像
              </NavLink>
            </div>
          </div>
        </nav>

        <div className={getAppShellViewportClassName()}>
          <AppRoutes />
        </div>
      </div>
    </AnalyzerRepositoryProvider>
  );
}
