import { describe, expect, it } from "vitest";
import { ACTIONS, COMPONENTS } from "./core/catalog";
import { collectLoads, compile, dataKey, evaluate, formatDiagnostics, initialState, type LoadedData } from "./core";
import {
  AGENT_INSTRUCTIONS,
  AGENT_INSTRUCTIONS_MINIMAL,
  AGENT_INSTRUCTIONS_MINIMAL_WEB_OFF,
  AGENT_INSTRUCTIONS_VISUAL_ONLY,
  AGENT_INSTRUCTIONS_VISUAL_ONLY_WEB_OFF,
  AGENT_INSTRUCTIONS_WEB_OFF,
  agentInstructions,
  CODE_WORK_INSTRUCTIONS,
  CODE_WORK_INSTRUCTIONS_MINIMAL,
  CODE_WORK_INSTRUCTIONS_VISUAL_ONLY,
  codeWorkInstructions,
  INSTRUCTION_SETTINGS,
  parseInteractionStyle,
  UI_REFERENCE,
  UI_REFERENCE_MORE,
  WEB_LOOKUPS_OFF,
} from "./instructions";
import {
  UPSTREAM_AGENT_INSTRUCTIONS,
  UPSTREAM_AGENT_INSTRUCTIONS_WEB_OFF,
  UPSTREAM_CODE_WORK_INSTRUCTIONS,
} from "./instructions.upstream.fixture";

describe("agent instructions", () => {
  // BB refuses a tool whose instructions pass 4096 characters (the plugin then
  // fails to load) and truncates the configure and contributed sections there.
  it("fit BB's 4096-character cap per section", () => {
    expect(AGENT_INSTRUCTIONS.length).toBeLessThanOrEqual(4096);
    expect(AGENT_INSTRUCTIONS_WEB_OFF.length).toBeLessThanOrEqual(4096);
    expect(CODE_WORK_INSTRUCTIONS.length).toBeLessThanOrEqual(4096);
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY.length).toBeLessThanOrEqual(4096);
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY_WEB_OFF.length).toBeLessThanOrEqual(4096);
    expect(CODE_WORK_INSTRUCTIONS_VISUAL_ONLY.length).toBeLessThanOrEqual(4096);
    expect(AGENT_INSTRUCTIONS_MINIMAL_WEB_OFF.length).toBeLessThanOrEqual(4096);
    expect(CODE_WORK_INSTRUCTIONS_MINIMAL.length).toBeLessThanOrEqual(4096);
    expect(UI_REFERENCE.length).toBeLessThanOrEqual(4096);
    expect(UI_REFERENCE_MORE.length).toBeLessThanOrEqual(4096);
  });

  // A replace that silently matches nothing would keep teaching Map while lookups are off.
  it("swap the Map example for the off note while web lookups are off", () => {
    expect(AGENT_INSTRUCTIONS_WEB_OFF).toContain(WEB_LOOKUPS_OFF);
    expect(AGENT_INSTRUCTIONS_WEB_OFF).not.toContain("Map(");
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY_WEB_OFF).toContain(WEB_LOOKUPS_OFF);
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY_WEB_OFF).not.toContain("Map(");
  });

  // The Evidence group's signatures ride on the code-work section, which every session that gets the references also gets.
  it("list every component and action the parser accepts", () => {
    const reference = `${UI_REFERENCE}\n${UI_REFERENCE_MORE}\n${CODE_WORK_INSTRUCTIONS}`;
    for (const name of [...Object.keys(COMPONENTS), ...Object.keys(ACTIONS)]) {
      expect(reference, name).toContain(`${name}(`);
    }
  });

  it("carry examples that compile and render without errors", () => {
    const examples = [...`${AGENT_INSTRUCTIONS}\n${CODE_WORK_INSTRUCTIONS}\n${AGENT_INSTRUCTIONS_VISUAL_ONLY}\n${CODE_WORK_INSTRUCTIONS_VISUAL_ONLY}\n${AGENT_INSTRUCTIONS_MINIMAL}`.matchAll(/```ui\n([\s\S]*?)\n```/g)].map((match) => match[1]);
    expect(examples.length).toBeGreaterThan(3);
    for (const example of examples) {
      const compiled = compile(example);
      expect(formatDiagnostics(compiled.diagnostics), example).toBe("");
      const program = compiled.program!;
      // Example paths are illustrative: each Load reads as an empty report.
      const data = new Map<string, LoadedData>(collectLoads(program).map((request) => [dataKey(request), { ok: true, value: [] }]));
      const { diagnostics } = evaluate(program, initialState(program, data), data);
      expect(diagnostics, example).toEqual([]);
    }
  });
});

describe("interactionStyle", () => {
  it("defaults to proactive, the upstream instructions unchanged", () => {
    expect(INSTRUCTION_SETTINGS.interactionStyle.default).toBe("proactive");
    expect(INSTRUCTION_SETTINGS.interactionStyle.options).toEqual(["proactive", "visual-only", "minimal"]);
    expect(parseInteractionStyle("proactive")).toBe("proactive");
    expect(parseInteractionStyle("anything else")).toBe("proactive");
    expect(agentInstructions("proactive", true)).toBe(UPSTREAM_AGENT_INSTRUCTIONS);
    expect(agentInstructions("proactive", false)).toBe(UPSTREAM_AGENT_INSTRUCTIONS_WEB_OFF);
    expect(codeWorkInstructions("proactive")).toBe(UPSTREAM_CODE_WORK_INSTRUCTIONS);
  });

  it("visual-only picks its own sections", () => {
    expect(parseInteractionStyle("visual-only")).toBe("visual-only");
    expect(agentInstructions("visual-only", true)).toBe(AGENT_INSTRUCTIONS_VISUAL_ONLY);
    expect(agentInstructions("visual-only", false)).toBe(AGENT_INSTRUCTIONS_VISUAL_ONLY_WEB_OFF);
    expect(codeWorkInstructions("visual-only")).toBe(CODE_WORK_INSTRUCTIONS_VISUAL_ONLY);
  });

  it("visual-only drops the default nudges toward questions and approvals", () => {
    const text = `${AGENT_INSTRUCTIONS_VISUAL_ONLY}\n${CODE_WORK_INSTRUCTIONS_VISUAL_ONLY}`;
    expect(text).not.toContain("end with FollowUps");
    expect(text).not.toContain("To let the user pick, give buttons");
    expect(text).not.toContain("picture options → OptionCards");
    expect(text).not.toContain("or you want approval) → Plan");
    expect(text).not.toContain("asked for a comparison");
    expect(text).not.toContain("the user asked for one");
    const examples = [...text.matchAll(/```ui\n([\s\S]*?)\n```/g)].map((match) => match[1]).join("\n");
    for (const name of ["FollowUps", "Button", "Form", "Choice", "Radio", "Checklist", "OptionCards", "Decision", "Plan"]) {
      expect(examples, name).not.toContain(`${name}(`);
    }
  });

  it("visual-only keeps the visualization guidance and asks only when blocked", () => {
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY).toContain("Write ```ui instead of a markdown table");
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY).toContain("Ask only when you can't continue without the user's answer or approval");
    expect(AGENT_INSTRUCTIONS_VISUAL_ONLY).toContain("Before you send a reply: any markdown table");
    expect(CODE_WORK_INSTRUCTIONS_VISUAL_ONLY).toContain("Plan(steps), only when you need the user's approval before starting");
    expect(CODE_WORK_INSTRUCTIONS_VISUAL_ONLY).toContain("Decision(options, criteria), only when the user must choose before you continue; a comparison they asked for is a Table or Chart");
    for (const name of ["Tests", "Logs", "Findings", "Coverage", "Changes", "Estimate", "Diagram", "Steps"]) {
      expect(`${AGENT_INSTRUCTIONS_VISUAL_ONLY}\n${CODE_WORK_INSTRUCTIONS_VISUAL_ONLY}`, name).toContain(name);
    }
  });
});

describe("interactionStyle minimal", () => {
  const text = `${AGENT_INSTRUCTIONS_MINIMAL}\n${CODE_WORK_INSTRUCTIONS_MINIMAL}`;
  // The owner's list, copied verbatim.
  const inputs = "Button, Form, Choice, Radio, Checklist, Select, Slider, Stepper, Toggle, Input, TextArea, DateInput, Rating, OptionCards, EditableTable, ListEditor, Plan, Decision, Estimate, FollowUps, Quiz, Flashcards".split(", ");

  it("picks its own sections", () => {
    expect(parseInteractionStyle("minimal")).toBe("minimal");
    expect(agentInstructions("minimal", true)).toBe(AGENT_INSTRUCTIONS_MINIMAL);
    expect(agentInstructions("minimal", false)).toBe(AGENT_INSTRUCTIONS_MINIMAL_WEB_OFF);
    expect(AGENT_INSTRUCTIONS_MINIMAL_WEB_OFF).toContain(WEB_LOOKUPS_OFF);
    expect(codeWorkInstructions("minimal")).toBe(CODE_WORK_INSTRUCTIONS_MINIMAL);
  });

  it("forbids every input component and never shows one in an example", () => {
    const never = AGENT_INSTRUCTIONS_MINIMAL.match(/Never use input or action components: ([^.]*)\./)![1];
    for (const name of inputs) expect(never.split(/, (?:or )?/), name).toContain(name);
    expect(never).toContain("Swatches bound to $state");
    const examples = [...text.matchAll(/```ui\n([\s\S]*?)\n```/g)].map((match) => match[1]).join("\n");
    for (const name of [...inputs, "Swatches", "Card"]) expect(examples, name).not.toContain(`${name}(`);
    // Outside the forbidden list, inputs appear only in "Never Plan, Decision or Estimate".
    const rest = text.replace(never, "").replace("Never Plan, Decision or Estimate", "");
    for (const name of inputs) expect(rest, name).not.toMatch(new RegExp(`\\b${name}\\b`));
  });

  it("asks in plain text, even over a skill", () => {
    expect(AGENT_INSTRUCTIONS_MINIMAL).toContain("ask one short plain-text question with the options inline");
    expect(AGENT_INSTRUCTIONS_MINIMAL).toContain("let the user type the reply");
    expect(AGENT_INSTRUCTIONS_MINIMAL).toContain("even when a skill or another instruction says to ask with a form");
  });

  it("keeps replies short and drops the nudges that force UI", () => {
    expect(AGENT_INSTRUCTIONS_MINIMAL).toContain("Reply in short plain text by default; a small markdown table is fine.");
    expect(AGENT_INSTRUCTIONS_MINIMAL).toContain("only when a visual explains better than words");
    for (const nudge of ["prefers them to markdown", "instead of a markdown table", "even when asked to be brief", "Wrap each UI in one Card", "sliders", "becomes ```ui"]) {
      expect(text, nudge).not.toContain(nudge);
    }
  });
});
