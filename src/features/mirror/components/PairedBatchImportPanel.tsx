import React, { useMemo, useRef } from "react";
import { FolderOpen } from "lucide-react";
import type { PairedImportEntry } from "../imports/types";

function getEntryStatusLabel(entry: PairedImportEntry) {
  if (entry.status === "paired") {
    return { questionnaire: "已匹配", voiceprint: "已匹配" };
  }
  if (entry.status === "missing-questionnaire") {
    return { questionnaire: "缺问卷", voiceprint: "已匹配" };
  }
  return { questionnaire: "已匹配", voiceprint: "缺声纹" };
}

export function PairedBatchImportPanel(props: {
  entries: PairedImportEntry[];
  selectedEntryKey: string | null;
  onImportQuestionnaires: (files: FileList | null) => void;
  onImportVoiceprints: (files: FileList | null) => void;
  onSelectEntry: (key: string) => void;
}) {
  const questionnaireInputRef = useRef<HTMLInputElement | null>(null);
  const voiceprintInputRef = useRef<HTMLInputElement | null>(null);

  const selectedEntry = useMemo(() => {
    if (!props.selectedEntryKey) {
      return null;
    }
    return props.entries.find((entry) => entry.key === props.selectedEntryKey) ?? null;
  }, [props.entries, props.selectedEntryKey]);

  return (
    <section className="mt-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => questionnaireInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-black px-3 py-2.5 text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <FolderOpen className="h-4 w-4" />
          导入问卷 JSON（多选）
        </button>
        <button
          type="button"
          onClick={() => voiceprintInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-black px-3 py-2.5 text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <FolderOpen className="h-4 w-4" />
          导入声纹 JSON（多选）
        </button>
      </div>

      <input
        ref={questionnaireInputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={(event) => props.onImportQuestionnaires(event.target.files)}
      />
      <input
        ref={voiceprintInputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={(event) => props.onImportVoiceprints(event.target.files)}
      />

      {props.entries.length > 0 ? (
        <div className="mt-3 space-y-2">
          {props.entries.map((entry) => {
            const selected = entry.key === props.selectedEntryKey;
            const labels = getEntryStatusLabel(entry);

            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => props.onSelectEntry(entry.key)}
                className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-black text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{entry.key}</span>
                  <span className={selected ? "text-black/70" : "text-white/35"}>
                    问卷 {labels.questionnaire} / 声纹 {labels.voiceprint}
                  </span>
                </div>
                <div className={`mt-1 ${selected ? "text-black/70" : "text-white/35"}`}>
                  {entry.questionnaireFileName ?? "未导入问卷"}
                </div>
                <div className={`mt-1 ${selected ? "text-black/70" : "text-white/35"}`}>
                  {entry.voiceprintFileName ?? "未导入声纹"}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded border border-dashed border-white/10 px-3 py-4 text-center text-white/35">
          还没有批量导入数据
        </div>
      )}

      {selectedEntry?.status === "missing-voiceprint" && (
        <div className="mt-2 rounded border border-white/10 bg-black/50 px-3 py-2 text-white/45">
          缺少声纹文件，无法切换画布
        </div>
      )}
    </section>
  );
}

