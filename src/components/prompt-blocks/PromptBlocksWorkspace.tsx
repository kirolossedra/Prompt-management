import { useMemo, useState } from "react";
import { Archive, Braces, ChevronDown, CirclePlay, CopyPlus, Database, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";
import { copyTextToClipboard } from "../../lib/clipboard";
import { activeRecords, cleanText } from "../../lib/utils";
import { blockPort, createPromptBlock } from "../../prompt-blocks/catalog";
import { nextConstraintPriority, topologicalOrder, validateConnection, validatePipelineGraph } from "../../prompt-blocks/graph";
import { runPromptBlockPipeline } from "../../prompt-blocks/runtime";
import type {
  Prompt,
  PromptBlockConnection,
  PromptBlockKind,
  PromptBlockNodeDefinition,
  PromptBlockPipeline,
  PromptBlockRunNodeState,
  PromptBlockRunState,
} from "../../types/domain";
import { Button } from "../ui/Button";
import { BlockInspector } from "./BlockInspector";
import { BlockLibrary } from "./BlockLibrary";
import { BlockNode } from "./BlockNode";
import { OutputModal } from "./OutputModal";
import { RunInspector } from "./RunInspector";
import { TransformPromptsModal } from "./TransformPromptsModal";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 142;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function quickState() {
  return {
    title: "Untitled Prompt Blocks pipeline",
    description: "",
    blocks: {} as Record<string, PromptBlockNodeDefinition>,
    connections: {} as Record<string, PromptBlockConnection>,
  };
}

export function PromptBlocksWorkspace() {
  const { user } = useAuth();
  const {
    data,
    createRecord,
    updateRecord,
    createPromptBlockPipeline,
    updatePromptBlockPipeline,
    archivePromptBlockPipeline,
    deletePromptBlockPipeline,
    updatePromptBlockTransformPrompt,
    recordPromptBlockRun,
    recordPromptBlockOutputSaved,
  } = useVault();
  const initial = quickState();
  const [pipelineId, setPipelineId] = useState<string | undefined>();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [connections, setConnections] = useState(initial.connections);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<{ blockId: string; portId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<PromptBlockRunState | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [outputBlockId, setOutputBlockId] = useState<string | null>(null);
  const [outputSaving, setOutputSaving] = useState(false);

  const savedPipelines = useMemo(() => activeRecords(data.promptBlockPipelines), [data.promptBlockPipelines]);
  const selectedBlock = selectedBlockId ? blocks[selectedBlockId] || null : null;
  const graphOrder = useMemo(() => topologicalOrder(blocks, connections), [blocks, connections]);
  const outputState = outputBlockId ? run?.nodeStates[outputBlockId] : undefined;
  const outputText = outputState?.output?.text || outputState?.output?.constraint?.content || "";
  const outputTitle = outputBlockId && blocks[outputBlockId] ? `${blocks[outputBlockId].variableLabel} · ${blocks[outputBlockId].label}` : "Prompt Blocks output";
  const canvasSize = useMemo(() => {
    const values = Object.values(blocks);
    return {
      width: Math.max(1120, ...values.map((block) => block.position.x + NODE_WIDTH + 160)),
      height: Math.max(680, ...values.map((block) => block.position.y + NODE_HEIGHT + 160)),
    };
  }, [blocks]);

  function newQuickPipeline() {
    const next = quickState();
    setPipelineId(undefined); setTitle(next.title); setDescription(next.description); setBlocks(next.blocks); setConnections(next.connections);
    setSelectedBlockId(null); setPendingSource(null); setRun(null); setValidationErrors([]);
  }

  function loadPipeline(id: string) {
    if (!id) { newQuickPipeline(); return; }
    const pipeline = data.promptBlockPipelines[id];
    if (!pipeline) return;
    setPipelineId(id); setTitle(pipeline.title); setDescription(pipeline.description || ""); setBlocks(clone(pipeline.blocks || {})); setConnections(clone(pipeline.connections || {}));
    setSelectedBlockId(null); setPendingSource(null); setRun(null); setValidationErrors([]);
  }

  function addBlock(kind: PromptBlockKind) {
    const block = createPromptBlock(kind, Object.keys(blocks).length);
    setBlocks((current) => ({ ...current, [block.id]: block }));
    setSelectedBlockId(block.id);
  }

  function updateSelected(patch: Partial<PromptBlockNodeDefinition>) {
    if (!selectedBlockId) return;
    setBlocks((current) => ({ ...current, [selectedBlockId]: { ...current[selectedBlockId], ...patch } }));
  }

  function updatePosition(blockId: string, x: number, y: number) {
    setBlocks((current) => ({ ...current, [blockId]: { ...current[blockId], position: { x, y } } }));
  }

  function deleteSelectedBlock() {
    if (!selectedBlockId) return;
    setBlocks((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== selectedBlockId)));
    setConnections((current) => Object.fromEntries(Object.entries(current).filter(([, connection]) => connection.sourceBlockId !== selectedBlockId && connection.targetBlockId !== selectedBlockId)));
    setSelectedBlockId(null); setPendingSource(null); setRun(null);
  }

  function portClicked(blockId: string, portId: string, direction: "input" | "output") {
    if (direction === "output") {
      setPendingSource((current) => current?.blockId === blockId && current.portId === portId ? null : { blockId, portId });
      return;
    }
    if (!pendingSource) {
      toast.message("Choose an output port first, then this input port.");
      return;
    }
    const error = validateConnection(blocks, connections, pendingSource.blockId, pendingSource.portId, blockId, portId);
    if (error) { toast.error(error); return; }
    const source = blocks[pendingSource.blockId];
    const sourcePort = source ? blockPort(source.kind, pendingSource.portId) : undefined;
    const id = `wire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const connection: PromptBlockConnection = {
      id,
      sourceBlockId: pendingSource.blockId,
      sourcePortId: pendingSource.portId,
      targetBlockId: blockId,
      targetPortId: portId,
      flowType: sourcePort?.flowType || "content",
      ...(sourcePort?.flowType === "constraint" ? { priority: nextConstraintPriority(connections, blockId) } : {}),
    };
    setConnections((current) => ({ ...current, [id]: connection }));
    setPendingSource(null); setRun(null);
  }

  function removeConnection(id: string) {
    setConnections((current) => Object.fromEntries(Object.entries(current).filter(([connectionId]) => connectionId !== id)));
    setRun(null);
  }

  function setPriority(id: string, priority: number) {
    setConnections((current) => ({ ...current, [id]: { ...current[id], priority } }));
    setRun(null);
  }

  async function savePipeline() {
    setSaving(true);
    try {
      if (pipelineId) {
        await updatePromptBlockPipeline(pipelineId, { title, description, blocks, connections });
        toast.success("Prompt Blocks pipeline updated.");
      } else {
        const id = await createPromptBlockPipeline({ title, description, blocks, connections });
        setPipelineId(id);
        toast.success("Prompt Blocks pipeline saved.");
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "The pipeline could not be saved."); }
    finally { setSaving(false); }
  }

  async function archiveCurrent() {
    if (!pipelineId) return;
    try { await archivePromptBlockPipeline(pipelineId); toast.success("Pipeline archived."); newQuickPipeline(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The pipeline could not be archived."); }
  }

  async function deleteCurrent() {
    if (!pipelineId || !window.confirm("Permanently delete this saved Prompt Blocks pipeline? Generated Prompt records are not deleted.")) return;
    try { await deletePromptBlockPipeline(pipelineId); toast.success("Pipeline permanently deleted."); newQuickPipeline(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The pipeline could not be deleted."); }
  }

  async function runPipeline() {
    if (!user) return;
    const validation = validatePipelineGraph(blocks, connections);
    setValidationErrors(validation.errors);
    if (!validation.valid) { toast.error("Resolve the pipeline validation issues before running."); return; }
    setRunning(true);
    const startedAt = Date.now();
    setRun({ startedAt, pipelineId, nodeStates: Object.fromEntries(Object.keys(blocks).map((id) => [id, { status: "waiting" as const }])) });
    try {
      const idToken = await user.getIdToken();
      const result = await runPromptBlockPipeline({
        blocks,
        connections,
        vault: data,
        uid: user.uid,
        idToken,
        pipelineId,
        onNodeState: (blockId: string, state: PromptBlockRunNodeState) => setRun((current) => current ? { ...current, nodeStates: { ...current.nodeStates, [blockId]: state } } : current),
      });
      setRun(result);
      await recordPromptBlockRun(pipelineId, title);
      const failures = Object.values(result.nodeStates).filter((state) => state.status === "failed").length;
      if (failures) toast.error(`Pipeline completed with ${failures} failed block${failures === 1 ? "" : "s"}. Earlier outputs remain inspectable.`);
      else toast.success("Prompt Blocks pipeline completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message.split("\n")[0] : "The pipeline could not start.");
    } finally { setRunning(false); }
  }

  async function saveTransformPrompt(operation: Parameters<typeof updatePromptBlockTransformPrompt>[0], content: string) {
    setPromptSaving(true);
    try { await updatePromptBlockTransformPrompt(operation, content); toast.success("Transformation prompt updated in Firebase."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Transformation prompt could not be updated."); }
    finally { setPromptSaving(false); }
  }

  async function copyOutput(blockId: string) {
    const state = run?.nodeStates[blockId];
    const text = state?.output?.text || state?.output?.constraint?.content || "";
    if (!text) return;
    try { await copyTextToClipboard(text); toast.success("Runtime output copied."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not copy output."); }
  }

  async function saveOutputAsNew(input: Pick<Prompt, "title" | "description" | "purpose" | "content" | "taskId">) {
    if (!outputBlockId) return;
    if (!cleanText(input.title, 160) || !input.taskId) { toast.error("Choose a title and destination Task."); return; }
    if (!data.tasks[input.taskId] || data.tasks[input.taskId].archivedAt) { toast.error("Choose an active destination Task."); return; }
    setOutputSaving(true);
    try {
      const promptId = await createRecord<Prompt>("prompts", {
        ...input,
        manualAgenticSummary: "",
        manualSuggestedImprovement: "",
        manualAiEvaluation: "",
        manualGeneratedContext: "",
      });
      await recordPromptBlockOutputSaved(pipelineId, promptId, `${title} · ${outputTitle}`);
      toast.success("Runtime output saved as a new Prompt with Version 1.");
      setOutputBlockId(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Output could not be saved."); }
    finally { setOutputSaving(false); }
  }

  async function saveOutputAsVersion(promptId: string, content: string) {
    if (!outputBlockId || !promptId) { toast.error("Choose a target Prompt."); return; }
    const prompt = data.prompts[promptId];
    if (!prompt || prompt.archivedAt) { toast.error("Choose an active target Prompt."); return; }
    if (prompt.content === content) { toast.error("The selected output is identical to the target Prompt's current content."); return; }
    setOutputSaving(true);
    try {
      await updateRecord("prompts", promptId, { content });
      await recordPromptBlockOutputSaved(pipelineId, promptId, `${title} · ${outputTitle}`);
      toast.success("Runtime output saved through the normal Prompt versioning path.");
      setOutputBlockId(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Output could not be saved as a Prompt version."); }
    finally { setOutputSaving(false); }
  }

  const edges = Object.values(connections).flatMap((connection) => {
    const source = blocks[connection.sourceBlockId]; const target = blocks[connection.targetBlockId];
    if (!source || !target) return [];
    const sx = source.position.x + NODE_WIDTH; const sy = source.position.y + NODE_HEIGHT / 2;
    const tx = target.position.x; const ty = target.position.y + NODE_HEIGHT / 2;
    const dx = Math.max(70, Math.abs(tx - sx) * 0.45);
    return [{ connection, d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}` }];
  });

  return <div className="pb-workspace">
    <header className="pb-toolbar">
      <div className="pb-toolbar__identity"><span className="eyebrow">AI · Prompt-processing methodology</span><div><Braces size={23} /><input aria-label="Pipeline title" value={title} onChange={(event) => setTitle(event.target.value)} /><span>{pipelineId ? "Saved pipeline" : "Quick pipeline"}</span></div><textarea rows={2} aria-label="Pipeline description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional methodology description…" /></div>
      <div className="pb-toolbar__saved"><label>Saved pipelines<div><select value={pipelineId || ""} onChange={(event) => loadPipeline(event.target.value)}><option value="">Quick / unsaved</option>{savedPipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.title}</option>)}</select><ChevronDown size={14} /></div></label></div>
      <div className="pb-toolbar__actions"><Button variant="ghost" icon={<CopyPlus size={15} />} onClick={newQuickPipeline}>New quick</Button><Button variant="ghost" icon={<Database size={15} />} onClick={() => setPromptEditorOpen(true)}>Transformation prompts</Button>{pipelineId ? <Button variant="ghost" icon={<Archive size={15} />} onClick={() => void archiveCurrent()}>Archive</Button> : null}{pipelineId ? <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => void deleteCurrent()}>Delete</Button> : null}<Button icon={<Save size={15} />} loading={saving} onClick={() => void savePipeline()}>{pipelineId ? "Save changes" : "Save pipeline"}</Button><Button variant="primary" icon={<CirclePlay size={16} />} loading={running} onClick={() => void runPipeline()}>Run Pipeline</Button></div>
    </header>

    {pendingSource ? <div className="pb-connect-banner"><span>Connection mode: choose a compatible input port.</span><button type="button" onClick={() => setPendingSource(null)}><X size={14} />Cancel</button></div> : null}
    {validationErrors.length ? <div className="pb-validation"><strong>Pipeline validation</strong><ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}

    <div className="pb-workbench">
      <BlockLibrary onAdd={addBlock} />
      <section className="pb-stage" aria-label="Prompt Blocks visual workspace">
        {!Object.keys(blocks).length ? <div className="pb-stage__empty"><Braces size={34} /><h2>Build a Prompt-processing graph</h2><p>Add Input, Transformation, Constraint, and Output blocks from the toolbox. A Quick Pipeline can run without being saved.</p></div> : null}
        <div className="pb-canvas-scroll"><div className="pb-canvas" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <svg className="pb-wires" width={canvasSize.width} height={canvasSize.height} aria-hidden><defs><marker id="pb-arrow-content" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker><marker id="pb-arrow-constraint" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>{edges.map(({ connection, d }) => <path key={connection.id} className={`pb-wire pb-wire--${connection.flowType}`} d={d} markerEnd={`url(#pb-arrow-${connection.flowType})`} />)}</svg>
          {Object.values(blocks).map((block) => <BlockNode key={block.id} block={block} selected={block.id === selectedBlockId} runState={run?.nodeStates[block.id]} pendingSource={pendingSource} onSelect={() => setSelectedBlockId(block.id)} onPort={portClicked} onPosition={(x, y) => updatePosition(block.id, x, y)} />)}
        </div></div>
        <div className="pb-mobile-flow">{(graphOrder.length === Object.keys(blocks).length ? graphOrder : Object.keys(blocks)).map((id) => blocks[id] ? <BlockNode compact key={id} block={blocks[id]} selected={id === selectedBlockId} runState={run?.nodeStates[id]} pendingSource={pendingSource} onSelect={() => setSelectedBlockId(id)} onPort={portClicked} onPosition={() => {}} /> : null)}</div>
      </section>
      <div className="pb-right-rail"><BlockInspector block={selectedBlock} data={data} blocks={blocks} connections={connections} onChange={updateSelected} onDelete={deleteSelectedBlock} onRemoveConnection={removeConnection} onPriority={setPriority} /><RunInspector run={run} blocks={blocks} onView={setOutputBlockId} onCopy={(id) => void copyOutput(id)} onSave={setOutputBlockId} /></div>
    </div>

    <TransformPromptsModal open={promptEditorOpen} prompts={data.promptBlockTransformPrompts} saving={promptSaving} onClose={() => setPromptEditorOpen(false)} onSave={saveTransformPrompt} />
    <OutputModal open={Boolean(outputBlockId && outputText)} title={outputTitle} content={outputText} data={data} saving={outputSaving} onClose={() => setOutputBlockId(null)} onCopy={() => outputBlockId && void copyOutput(outputBlockId)} onSaveNew={saveOutputAsNew} onSaveVersion={saveOutputAsVersion} />
  </div>;
}
