import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { AlertCircle, Check, Clock3, GripHorizontal, LoaderCircle, XCircle } from "lucide-react";
import { PROMPT_BLOCK_CATALOG, blockPorts } from "../../prompt-blocks/catalog";
import { cx } from "../../lib/utils";
import type { PromptBlockNodeDefinition, PromptBlockRunNodeState } from "../../types/domain";

function StatusIcon({ state }: { state?: PromptBlockRunNodeState }) {
  if (!state || state.status === "idle" || state.status === "waiting") return <Clock3 size={13} />;
  if (state.status === "running") return <LoaderCircle className="spin" size={13} />;
  if (state.status === "completed") return <Check size={13} />;
  if (state.status === "blocked") return <AlertCircle size={13} />;
  return <XCircle size={13} />;
}

export function BlockNode({
  block,
  selected,
  runState,
  pendingSource,
  compact = false,
  onSelect,
  onPort,
  onPosition,
}: {
  block: PromptBlockNodeDefinition;
  selected: boolean;
  runState?: PromptBlockRunNodeState;
  pendingSource?: { blockId: string; portId: string } | null;
  compact?: boolean;
  onSelect: () => void;
  onPort: (blockId: string, portId: string, direction: "input" | "output") => void;
  onPosition: (x: number, y: number) => void;
}) {
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; blockX: number; blockY: number } | null>(null);
  const entry = PROMPT_BLOCK_CATALOG[block.kind];
  const inputs = blockPorts(block.kind, "input");
  const outputs = blockPorts(block.kind, "output");

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (compact || event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, blockX: block.position.x, blockY: block.position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    onPosition(Math.max(12, drag.blockX + event.clientX - drag.startX), Math.max(12, drag.blockY + event.clientY - drag.startY));
  }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <article
      className={cx("pb-node", compact && "pb-node--compact", selected && "selected", runState && `pb-node--${runState.status}`)}
      data-family={block.family}
      style={compact ? undefined : { left: block.position.x, top: block.position.y }}
      role="group"
      tabIndex={0}
      aria-label={`${block.variableLabel} ${block.label} ${block.family} block`}
      onClick={onSelect}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}
    >
      <div className="pb-node__drag" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
        <GripHorizontal size={14} aria-hidden />
        <span>{block.family}</span>
        {runState ? <i title={runState.status}><StatusIcon state={runState} /></i> : null}
      </div>
      <div className="pb-node__body">
        <div className="pb-node__identity"><strong>{block.variableLabel}</strong><span><b>{block.label}</b><small>{entry.description}</small></span></div>
        {inputs.length ? <div className="pb-node__ports pb-node__ports--inputs">
          {inputs.map((port) => <button
            key={port.id}
            type="button"
            className={cx("pb-port", `pb-port--${port.flowType}`)}
            title={`${port.label} · ${port.flowType} input`}
            aria-label={`${block.variableLabel} ${port.label} input`}
            onClick={(event) => { event.stopPropagation(); onPort(block.id, port.id, "input"); }}
          ><i /><span>{port.label}</span></button>)}
        </div> : null}
        {outputs.length ? <div className="pb-node__ports pb-node__ports--outputs">
          {outputs.map((port) => <button
            key={port.id}
            type="button"
            className={cx("pb-port", `pb-port--${port.flowType}`, pendingSource?.blockId === block.id && pendingSource.portId === port.id && "pending")}
            title={`${port.label} · ${port.flowType} output`}
            aria-label={`${block.variableLabel} ${port.label} output`}
            onClick={(event) => { event.stopPropagation(); onPort(block.id, port.id, "output"); }}
          ><span>{port.label}</span><i /></button>)}
        </div> : null}
      </div>
    </article>
  );
}
