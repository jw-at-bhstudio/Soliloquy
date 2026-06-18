export function getAppShellViewportClassName() {
  return 'flex-1 min-h-0 overflow-hidden';
}

export function getPageContainerClassName() {
  return 'mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 px-4 py-3 md:gap-4 md:px-5 md:py-4 lg:gap-5 lg:px-6 lg:py-4';
}

export function getContentStackClassName() {
  return 'flex flex-col gap-1';
}

export function getPageHeaderClassName() {
  return 'flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between';
}

export function getStatusStripClassName() {
  return 'inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 self-start rounded border border-white/10 bg-[#050505] px-2.5 py-1.5 text-white/60';
}

export function getPanelClassName() {
  return 'flex flex-col gap-4 rounded border border-white/10 bg-[#050505] p-4';
}

export function getWorkspaceViewportClassName() {
  return 'flex h-full min-h-0 flex-col overflow-hidden bg-black text-white';
}

export function getScrollableColumnClassName() {
  return 'flex min-h-0 flex-col gap-6 overflow-y-auto pr-1';
}
