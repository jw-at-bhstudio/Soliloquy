import React, { useRef } from "react";
import { FolderOpen } from "lucide-react";

function renderFileName(value: string | null) {
  return value ? value : "未导入";
}

export function SingleFreeImportPanel(props: {
  voiceprintFileName: string | null;
  questionnaireFileName: string | null;
  onImportVoiceprint: (file: File | null) => void;
  onImportQuestionnaire: (file: File | null) => void;
  onClearVoiceprint: () => void;
  onClearQuestionnaire: () => void;
}) {
  const voiceprintInputRef = useRef<HTMLInputElement | null>(null);
  const questionnaireInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="mt-3 space-y-3">
      <div className="rounded border border-white/10 bg-black/30 p-3">
        <div className="mb-2 text-white/70">声纹</div>
        <button
          type="button"
          onClick={() => voiceprintInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-black px-3 py-2.5 text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <FolderOpen className="h-4 w-4" />
          导入声纹 JSON
        </button>
        <input
          ref={voiceprintInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(event) => props.onImportVoiceprint(event.target.files?.[0] ?? null)}
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-white/35">
          <span>当前声纹文件</span>
          <span className="truncate text-right text-white/60" style={{ fontFamily: "var(--font-mono)" }}>
            {renderFileName(props.voiceprintFileName)}
          </span>
        </div>
        <button
          type="button"
          onClick={props.onClearVoiceprint}
          className="mt-2 w-full rounded border border-white/10 bg-black px-3 py-2 text-white/55 transition-colors hover:border-white/30 hover:text-white"
        >
          清空声纹
        </button>
      </div>

      <div className="rounded border border-white/10 bg-black/30 p-3">
        <div className="mb-2 text-white/70">问卷</div>
        <button
          type="button"
          onClick={() => questionnaireInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-black px-3 py-2.5 text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <FolderOpen className="h-4 w-4" />
          导入问卷 JSON
        </button>
        <input
          ref={questionnaireInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(event) => props.onImportQuestionnaire(event.target.files?.[0] ?? null)}
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-white/35">
          <span>当前问卷文件</span>
          <span className="truncate text-right text-white/60" style={{ fontFamily: "var(--font-mono)" }}>
            {renderFileName(props.questionnaireFileName)}
          </span>
        </div>
        <button
          type="button"
          onClick={props.onClearQuestionnaire}
          className="mt-2 w-full rounded border border-white/10 bg-black px-3 py-2 text-white/55 transition-colors hover:border-white/30 hover:text-white"
        >
          清空问卷
        </button>
      </div>
    </section>
  );
}

