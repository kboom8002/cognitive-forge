/**
 * tests/unit/ui-forge/ui-forge.test.tsx
 *
 * Unit tests for UI Forge components.
 * Environment: jsdom (configured via environmentMatchGlobs in vitest.config.ts)
 *
 * Covers:
 * - FieldRenderer: widget dispatch for all relevant field types
 * - DynamicForm: required-field validation, submit flow, trust badge
 * - OutputCard: publicMode filtering, empty state, status rendering
 * - OutputFieldRenderer: array/object/string rendering
 * - validateRequired: pure logic tests (no DOM)
 * - getFieldsInOrder: ordering with field_overrides
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { FieldRenderer }      from "@cognitive-forge/ui-forge";
import { DynamicForm, validateRequired, getFieldsInOrder } from "@cognitive-forge/ui-forge";
import { OutputCard }         from "@cognitive-forge/ui-forge";
import { OutputFieldRenderer } from "@cognitive-forge/ui-forge";

import type { FieldDef }       from "@cognitive-forge/core";
import type { InputContract }  from "@cognitive-forge/core";
import type { OutputContract } from "@cognitive-forge/core";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const stringField: FieldDef = {
  key: "company_name",
  type: "string",
  label: "Company Name",
  placeholder: "Acme Corp",
};

const textField: FieldDef = {
  key: "description",
  type: "text",
  label: "Description",
};

const selectField: FieldDef = {
  key: "industry",
  type: "select",
  label: "Industry",
  options: ["SaaS", "Fintech", "Healthcare"],
};

const multiselectField: FieldDef = {
  key: "tags",
  type: "multiselect",
  label: "Tags",
  options: ["AI", "B2B", "Cloud"],
};

const booleanField: FieldDef = {
  key: "is_public",
  type: "boolean",
  label: "Make public",
};

const numberField: FieldDef = {
  key: "employee_count",
  type: "number",
  label: "Employee Count",
};

const simpleInputContract: InputContract = {
  fields: [stringField, textField],
  required_fields: ["company_name"],
};

const fullInputContract: InputContract = {
  fields: [stringField, textField, selectField],
  required_fields: ["company_name", "industry"],
};

const simpleOutputContract: OutputContract = {
  fields: [
    { key: "summary",  type: "text",   label: "Summary"  },
    { key: "internal", type: "string", label: "Internal" },
  ],
  required_fields: ["summary"],
  public_fields:   ["summary"],
};

// ── FieldRenderer ─────────────────────────────────────────────────────────────

describe("FieldRenderer", () => {
  it("renders <input type=text> for type=string", () => {
    render(
      <FieldRenderer
        field={stringField}
        value=""
        onChange={() => undefined}
      />
    );
    const input = screen.getByTestId("field-company_name") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("text");
  });

  it("renders <textarea> for type=text", () => {
    render(
      <FieldRenderer
        field={textField}
        value=""
        onChange={() => undefined}
      />
    );
    const textarea = screen.getByTestId("field-description");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders <select> with options for type=select", () => {
    render(
      <FieldRenderer
        field={selectField}
        value=""
        onChange={() => undefined}
      />
    );
    const select = screen.getByTestId("field-industry") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    // Default placeholder + 3 options
    expect(select.options).toHaveLength(4);
    expect(select.options[1]?.value).toBe("SaaS");
  });

  it("renders checkboxes for type=multiselect", () => {
    render(
      <FieldRenderer
        field={multiselectField}
        value={[]}
        onChange={() => undefined}
      />
    );
    const wrapper = screen.getByTestId("field-tags");
    const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(3);
  });

  it("renders <input type=checkbox> for type=boolean", () => {
    render(
      <FieldRenderer
        field={booleanField}
        value={false}
        onChange={() => undefined}
      />
    );
    const checkbox = screen.getByTestId("field-is_public") as HTMLInputElement;
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.checked).toBe(false);
  });

  it("renders <input type=number> for type=number", () => {
    render(
      <FieldRenderer
        field={numberField}
        value="42"
        onChange={() => undefined}
      />
    );
    const input = screen.getByTestId("field-employee_count") as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.value).toBe("42");
  });

  it("calls onChange with new value when string input changes", () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        field={stringField}
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByTestId("field-company_name");
    fireEvent.change(input, { target: { value: "Acme" } });
    expect(onChange).toHaveBeenCalledWith("company_name", "Acme");
  });

  it("shows error message when error prop provided", () => {
    render(
      <FieldRenderer
        field={stringField}
        value=""
        onChange={() => undefined}
        error="This field is required"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("This field is required");
  });

  it("hides field when override.hidden=true", () => {
    const { container } = render(
      <FieldRenderer
        field={stringField}
        value=""
        onChange={() => undefined}
        override={{ hidden: true }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("applies override label", () => {
    render(
      <FieldRenderer
        field={stringField}
        value=""
        onChange={() => undefined}
        override={{ label: "Organisation Name" }}
      />
    );
    expect(screen.getByText("Organisation Name")).toBeTruthy();
  });

  it("is disabled when disabled=true", () => {
    render(
      <FieldRenderer
        field={stringField}
        value=""
        onChange={() => undefined}
        disabled={true}
      />
    );
    const input = screen.getByTestId("field-company_name") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

// ── DynamicForm — pure logic ──────────────────────────────────────────────────

describe("validateRequired", () => {
  it("returns empty object when all required fields are filled", () => {
    const errors = validateRequired(simpleInputContract, {
      company_name: "Acme",
      description: "A company",
    });
    expect(errors).toEqual({});
  });

  it("returns error for missing required field", () => {
    const errors = validateRequired(simpleInputContract, { company_name: "" });
    expect(errors).toHaveProperty("company_name");
  });

  it("returns error for undefined required field", () => {
    const errors = validateRequired(simpleInputContract, {});
    expect(errors).toHaveProperty("company_name");
  });

  it("returns multiple errors when multiple required fields are empty", () => {
    const errors = validateRequired(fullInputContract, {});
    expect(Object.keys(errors)).toHaveLength(2);
    expect(errors).toHaveProperty("company_name");
    expect(errors).toHaveProperty("industry");
  });

  it("does not return error for optional empty field", () => {
    const errors = validateRequired(simpleInputContract, {
      company_name: "Acme",
      description: "", // optional
    });
    expect(errors).toEqual({});
  });

  it("returns error for empty array multiselect required field", () => {
    const contract: InputContract = {
      fields: [multiselectField],
      required_fields: ["tags"],
    };
    const errors = validateRequired(contract, { tags: [] });
    expect(errors).toHaveProperty("tags");
  });
});

describe("getFieldsInOrder", () => {
  it("preserves original field order without overrides", () => {
    const ordered = getFieldsInOrder(fullInputContract);
    expect(ordered.map((f) => f.key)).toEqual(["company_name", "description", "industry"]);
  });

  it("reorders fields when field_overrides.order is set", () => {
    const ordered = getFieldsInOrder(fullInputContract, {
      app_mode: "micro_app",
      public_mode: false,
      trust_badge: true,
      field_overrides: {
        industry:     { order: 0 },
        company_name: { order: 1 },
        description:  { order: 2 },
      },
    });
    expect(ordered.map((f) => f.key)).toEqual(["industry", "company_name", "description"]);
  });
});

// ── DynamicForm — DOM ─────────────────────────────────────────────────────────

describe("DynamicForm", () => {
  it("renders all fields from input_contract", () => {
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        formState={{}}
        onFieldChange={() => undefined}
        onSubmit={() => undefined}
      />
    );
    expect(screen.getByTestId("field-company_name")).toBeTruthy();
    expect(screen.getByTestId("field-description")).toBeTruthy();
  });

  it("renders submit button with default label 'Run'", () => {
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        formState={{}}
        onFieldChange={() => undefined}
        onSubmit={() => undefined}
      />
    );
    expect(screen.getByTestId("submit-btn")).toHaveTextContent("Run");
  });

  it("uses custom submit_label from uiSchema", () => {
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        uiSchema={{ app_mode: "micro_app", public_mode: false, trust_badge: false, submit_label: "Improve My Prompt" }}
        formState={{}}
        onFieldChange={() => undefined}
        onSubmit={() => undefined}
      />
    );
    expect(screen.getByTestId("submit-btn")).toHaveTextContent("Improve My Prompt");
  });

  it("shows trust badge by default", () => {
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        formState={{}}
        onFieldChange={() => undefined}
        onSubmit={() => undefined}
      />
    );
    expect(screen.getByLabelText("AI-generated content")).toBeTruthy();
  });

  it("hides trust badge when uiSchema.trust_badge=false", () => {
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        uiSchema={{ app_mode: "micro_app", public_mode: false, trust_badge: false }}
        formState={{}}
        onFieldChange={() => undefined}
        onSubmit={() => undefined}
      />
    );
    expect(screen.queryByLabelText("AI-generated content")).toBeNull();
  });

  it("blocks submit and shows error when required field is empty", () => {
    const onSubmit = vi.fn();
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        formState={{ company_name: "" }}
        onFieldChange={() => undefined}
        onSubmit={onSubmit}
      />
    );
    fireEvent.submit(screen.getByTestId("dynamic-form"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("required");
  });

  it("calls onSubmit with form values when required fields are filled", () => {
    const onSubmit = vi.fn();
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        formState={{ company_name: "Acme", description: "A company" }}
        onFieldChange={() => undefined}
        onSubmit={onSubmit}
      />
    );
    fireEvent.submit(screen.getByTestId("dynamic-form"));
    expect(onSubmit).toHaveBeenCalledWith({
      company_name: "Acme",
      description: "A company",
    });
  });

  it("disables submit button while submitting=true", () => {
    render(
      <DynamicForm
        inputContract={simpleInputContract}
        formState={{ company_name: "Acme" }}
        onFieldChange={() => undefined}
        onSubmit={() => undefined}
        submitting={true}
      />
    );
    const btn = screen.getByTestId("submit-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ── OutputCard ────────────────────────────────────────────────────────────────

describe("OutputCard", () => {
  it("shows empty state when values are empty and status=idle", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{}}
        status="idle"
      />
    );
    expect(screen.getByText(/Result will appear here/i)).toBeTruthy();
  });

  it("shows running state placeholder when status=running and values empty", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{}}
        status="running"
      />
    );
    expect(screen.getByText(/Generating your result/i)).toBeTruthy();
  });

  it("renders output fields when values present and status=complete", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{ summary: "This is the summary", internal: "secret" }}
        status="complete"
      />
    );
    expect(screen.getByTestId("output-field-summary")).toBeTruthy();
  });

  it("publicMode=true hides non-public_fields", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{ summary: "Visible", internal: "Hidden" }}
        status="complete"
        publicMode={true}
      />
    );
    expect(screen.getByTestId("output-field-summary")).toBeTruthy();
    expect(screen.queryByTestId("output-field-internal")).toBeNull();
  });

  it("publicMode=false shows all fields", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{ summary: "Visible", internal: "Also visible" }}
        status="complete"
        publicMode={false}
      />
    );
    expect(screen.getByTestId("output-field-summary")).toBeTruthy();
    expect(screen.getByTestId("output-field-internal")).toBeTruthy();
  });

  it("shows error message when status=error", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{}}
        status="error"
        errorMessage="AI provider unavailable"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("AI provider unavailable");
  });

  it("renders nodeLabel as heading when provided", () => {
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{ summary: "x" }}
        status="complete"
        nodeLabel="Press Release"
      />
    );
    expect(screen.getByText("Press Release")).toBeTruthy();
  });

  it("renders Copy and Download buttons when status=complete and props are provided", () => {
    const onCopy = vi.fn();
    const onDownload = vi.fn();
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{ summary: "Test" }}
        status="complete"
        onCopy={onCopy}
        onDownload={onDownload}
      />
    );
    
    const copyBtn = screen.getByRole("button", { name: /Copy Section/i });
    const downloadBtn = screen.getByRole("button", { name: /Download Markdown/i });
    
    expect(copyBtn).toBeDefined();
    expect(downloadBtn).toBeDefined();
  });

  it("does not render export buttons when status is not complete", () => {
    const onCopy = vi.fn();
    const onDownload = vi.fn();
    render(
      <OutputCard
        outputContract={simpleOutputContract}
        values={{}}
        status="running"
        onCopy={onCopy}
        onDownload={onDownload}
      />
    );
    expect(screen.queryByTestId("header-copy-btn")).toBeNull();
    expect(screen.queryByTestId("header-download-btn")).toBeNull();
  });
});

// ── OutputFieldRenderer ───────────────────────────────────────────────────────

describe("OutputFieldRenderer", () => {
  const textFieldDef: FieldDef = { key: "body", type: "text", label: "Body" };
  const stringFieldDef: FieldDef = { key: "title", type: "string", label: "Title" };

  it("renders multiline string value as <pre>", () => {
    const { container } = render(
      <OutputFieldRenderer
        field={textFieldDef}
        value={"Line 1\nLine 2\nLine 3"}
      />
    );
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain("Line 1");
  });

  it("renders short string value as inline div (not pre)", () => {
    const { container } = render(
      <OutputFieldRenderer
        field={stringFieldDef}
        value="Short value"
      />
    );
    const pre = container.querySelector("pre");
    expect(pre).toBeNull();
    expect(container.textContent).toContain("Short value");
  });

  it("renders array values as bullet items", () => {
    render(
      <OutputFieldRenderer
        field={{ key: "items", type: "string", label: "Items" }}
        value={["Alpha", "Beta", "Gamma"]}
      />
    );
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Gamma")).toBeTruthy();
  });

  it("renders object values as key-value pairs", () => {
    render(
      <OutputFieldRenderer
        field={{ key: "meta", type: "string", label: "Meta" }}
        value={{ score: "28/30", grade: "A" }}
      />
    );
    expect(screen.getByText("score:")).toBeTruthy();
    expect(screen.getByText("28/30")).toBeTruthy();
  });

  it("renders empty dash for null/undefined value", () => {
    render(
      <OutputFieldRenderer
        field={stringFieldDef}
        value={null}
      />
    );
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders field label", () => {
    render(
      <OutputFieldRenderer
        field={textFieldDef}
        value="some content"
      />
    );
    expect(screen.getByText("Body")).toBeTruthy();
  });
});
