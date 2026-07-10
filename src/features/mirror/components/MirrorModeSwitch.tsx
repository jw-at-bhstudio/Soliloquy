import React from "react";
import type { MirrorImportMode } from "../imports/types";

export function MirrorModeSwitch(props: {
  mode: MirrorImportMode;
  onChange: (mode: MirrorImportMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded border border-white/10 bg-black/40 p-1">
      <button
        type="button"
        onClick={() => props.onChange("paired-batch")}
        className={`rounded py-2 transition-colors ${
          props.mode === "paired-batch"
            ? "bg-white text-black"
            : "text-white/60 hover:text-white"
        }`}
      >
        批量匹配
      </button>
      <button
        type="button"
        onClick={() => props.onChange("single-free")}
        className={`rounded py-2 transition-colors ${
          props.mode === "single-free"
            ? "bg-white text-black"
            : "text-white/60 hover:text-white"
        }`}
      >
        随意单测
      </button>
    </div>
  );
}

