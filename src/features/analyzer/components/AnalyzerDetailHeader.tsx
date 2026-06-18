import { ArrowRight, Download, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AnalyzerJob } from '../../../app/providers/AnalyzerRepositoryProvider';
import { getContentStackClassName, getPanelClassName } from '../../../shared/ui/layout';

interface AnalyzerDetailHeaderProps {
  job: AnalyzerJob | null;
  readyCount: number;
  onExportCurrent: () => void;
  onExportAll: () => void;
}

export default function AnalyzerDetailHeader({
  job,
  readyCount,
  onExportCurrent,
  onExportAll,
}: AnalyzerDetailHeaderProps) {
  return (
    <div className={getPanelClassName()} style={{ fontSize: 'var(--text-ui)' }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className={getContentStackClassName()}>
          <div className="flex items-center gap-2 text-white">
            <Layers3 className="h-4 w-4" />
            导出 JSON
          </div>
          <div className="text-white/40">将结果导出为 JSON，或在镜像中继续使用。</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCurrent}
            disabled={!job?.voiceprint}
            className="inline-flex items-center gap-2 rounded border border-white/20 px-3 py-2 text-white transition hover:border-white hover:bg-white hover:text-black disabled:border-white/5 disabled:text-white/20"
          >
            <Download className="h-3.5 w-3.5" />
            导出 JSON
          </button>
          <button
            type="button"
            onClick={onExportAll}
            disabled={readyCount === 0}
            className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-white/80 transition hover:border-white/30 hover:text-white disabled:border-white/5 disabled:text-white/20"
          >
            <Download className="h-3.5 w-3.5" />
            批量导出 JSON（
            <span style={{ fontFamily: 'var(--font-mono)' }}>{readyCount}</span> 项）
          </button>
          <Link
            to={job?.voiceprint ? `/mirror/${job.id}` : '/mirror'}
            className={`inline-flex items-center gap-2 rounded border px-3 py-2 transition ${
              job?.voiceprint
                ? 'border-white text-white hover:bg-white hover:text-black'
                : 'pointer-events-none border-white/5 text-white/20'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            在镜像中打开
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="rounded border border-white/5 bg-black px-3 py-2 text-white/50">
        {job ? (
          <>
            当前任务：<span className="text-white">{job.sourceName}</span>
          </>
        ) : (
          '当前没有选中任务。'
        )}
      </div>
    </div>
  );
}
