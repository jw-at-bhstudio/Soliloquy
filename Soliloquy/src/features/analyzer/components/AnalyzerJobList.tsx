import { AudioLines, Clock3, Mic, Upload, AlertCircle, LoaderCircle } from 'lucide-react';

import { AnalyzerJob } from '../../../app/providers/AnalyzerRepositoryProvider';
import { getContentStackClassName, getPanelClassName } from '../../../shared/ui/layout';

interface AnalyzerJobListProps {
  jobs: AnalyzerJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
}

const statusMap = {
  queued: { label: '排队中', tone: 'text-white/50' },
  processing: { label: '分析中', tone: 'text-white' },
  ready: { label: '已完成', tone: 'text-white' },
  error: { label: '失败', tone: 'text-red-400' },
} as const;

export default function AnalyzerJobList({
  jobs,
  selectedJobId,
  onSelectJob,
}: AnalyzerJobListProps) {
  return (
    <div className={`${getPanelClassName()} h-full`} style={{ fontSize: 'var(--text-ui)' }}>
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className={getContentStackClassName()}>
          <div className="text-white">任务列表</div>
          <div className="text-white/40">导入声音后，这里会形成可切换的任务列表。</div>
        </div>
        <div className="rounded border border-white/10 bg-black px-2 py-1 text-white/60">
          <span style={{ fontFamily: 'var(--font-mono)' }}>{jobs.length}</span> 项
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {jobs.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded border border-dashed border-white/5 text-center text-white/30">
            <AudioLines className="mb-2 h-4 w-4" />
            <div>导入声音后，这里会形成任务列表。</div>
          </div>
        ) : (
          jobs.map((job) => {
            const status = statusMap[job.status];
            const isSelected = job.id === selectedJobId;

            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onSelectJob(job.id)}
                className={`w-full rounded border p-3 text-left transition ${
                  isSelected
                    ? 'border-white bg-[#101010]'
                    : 'border-white/5 bg-[#020202] hover:border-white/20 hover:bg-[#080808]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-white">{job.sourceName}</div>
                    <div className="mt-1 flex items-center gap-2 text-white/40">
                      <span className="inline-flex items-center gap-1">
                        {job.sourceType === 'mic' ? (
                          <Mic className="h-3 w-3" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        {job.sourceType === 'mic' ? '录音' : '上传'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {new Date(job.createdAt).toLocaleTimeString('zh-CN', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className={`shrink-0 ${status.tone}`}>
                    {job.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1">
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                        {status.label}
                      </span>
                    ) : job.status === 'error' ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {status.label}
                      </span>
                    ) : (
                      status.label
                    )}
                  </div>
                </div>

                {job.error && (
                  <div className="mt-2 line-clamp-2 text-red-400/90">
                    {job.error}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
