import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Badge } from "../../components/admin/ui/Badge";
import { Button } from "../../components/admin/ui/Button";
import { Checkbox } from "../../components/admin/ui/Checkbox";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Label } from "../../components/admin/ui/Label";
import { Modal } from "../../components/admin/ui/Modal";
import { Select } from "../../components/admin/ui/Select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/admin/ui/Table";
import { TextArea } from "../../components/admin/ui/TextArea";
import { PlusIcon } from "../../components/admin/icons";
import { useModal } from "../../hooks/useModal";
import { apiFetch } from "../../lib/apiClient";
import type { TemplateField } from "../../types/order";

type Template = {
  id: string;
  kind: "text" | "payment_request" | "form_request";
  title: string;
  body: string | null;
  fields: TemplateField[];
};

const FIELD_TYPES: TemplateField["type"][] = ["text", "textarea", "phone", "pincode", "select"];

const KIND_LABEL: Record<Template["kind"], string> = {
  text: "Text",
  payment_request: "Payment request",
  form_request: "Form request",
};

function emptyField(): TemplateField {
  return { key: "", label: "", type: "text", required: false };
}

export function DashboardTemplatesPage() {
  const queryClient = useQueryClient();
  const formModal = useModal();

  const templatesQuery = useQuery({
    queryKey: ["seller-templates-manage"],
    queryFn: () => apiFetch<Template[]>("/api/seller/templates"),
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["seller-templates-manage"] });
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<Template["kind"]>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);

  function resetForm() {
    setEditingId(null);
    setKind("text");
    setTitle("");
    setBody("");
    setFields([]);
  }

  function startEditing(template: Template) {
    setEditingId(template.id);
    setKind(template.kind);
    setTitle(template.title);
    setBody(template.body ?? "");
    setFields(template.fields ?? []);
    formModal.openModal();
  }

  function startCreating() {
    resetForm();
    formModal.openModal();
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = kind === "form_request" ? { kind, title, fields } : { kind, title, body };
      return editingId
        ? apiFetch(`/api/seller/templates/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : apiFetch("/api/seller/templates", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      resetForm();
      formModal.closeModal();
      refetch();
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/seller/templates/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      if (id === editingId) resetForm();
      refetch();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  function updateField(index: number, patch: Partial<TemplateField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <Breadcrumb
        title="Templates"
        description="Reusable messages, payment requests, and forms for order chats."
        action={
          <Button onClick={startCreating} startIcon={<PlusIcon />}>
            New Template
          </Button>
        }
      />

      <ComponentCard bodyClassName="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Title
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Kind
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {templatesQuery.isLoading && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">Loading templates...</TableCell>
                </TableRow>
              )}
              {templatesQuery.data?.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-5 text-sm text-gray-500">No templates yet.</TableCell>
                </TableRow>
              )}
              {templatesQuery.data?.map((template) => (
                <TableRow key={template.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-3.5 text-start">
                    <button type="button" onClick={() => startEditing(template)} className="text-left">
                      <span className="text-theme-sm font-medium text-gray-800">{template.title}</span>
                    </button>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-start">
                    <Badge size="sm" color="light">
                      {KIND_LABEL[template.kind]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-start">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(template)}
                        className="text-theme-xs font-medium text-gray-600 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate.mutate(template.id)}
                        className="text-theme-xs font-medium text-error-600 hover:text-error-700"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      <Modal
        isOpen={formModal.isOpen}
        onClose={() => {
          formModal.closeModal();
          resetForm();
        }}
        className="max-w-lg p-6"
      >
        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
          <h3 className="text-lg font-medium text-gray-800">{editingId ? "Edit template" : "New template"}</h3>

          <div>
            <Label htmlFor="template-kind">Kind</Label>
            <Select
              id="template-kind"
              options={[
                { value: "text", label: "Text" },
                { value: "payment_request", label: "Payment request" },
                { value: "form_request", label: "Form request" },
              ]}
              value={kind}
              onChange={(e) => setKind(e.target.value as Template["kind"])}
            />
          </div>

          <div>
            <Label htmlFor="template-title">Title</Label>
            <Input id="template-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {kind !== "form_request" && (
            <div>
              <Label htmlFor="template-body">Message body</Label>
              <TextArea id="template-body" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          )}

          {kind === "form_request" && (
            <div className="space-y-2">
              <Label>Fields</Label>
              {fields.map((field, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="key"
                      value={field.key}
                      onChange={(e) => updateField(i, { key: e.target.value })}
                      className="h-9 w-1/2 py-1.5 text-xs"
                      required
                    />
                    <Input
                      type="text"
                      placeholder="Label"
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      className="h-9 w-1/2 py-1.5 text-xs"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      options={FIELD_TYPES.map((t) => ({ value: t, label: t }))}
                      value={field.type}
                      onChange={(e) => updateField(i, { type: e.target.value as TemplateField["type"] })}
                      className="h-9 w-auto py-1.5 text-xs"
                    />
                    <Checkbox
                      label="Required"
                      checked={field.required ?? false}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                    />
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="ml-auto text-xs font-medium text-error-600 hover:text-error-700"
                    >
                      Remove
                    </button>
                  </div>
                  {field.type === "select" && (
                    <Input
                      type="text"
                      placeholder="Options, comma separated"
                      value={(field.options ?? []).join(", ")}
                      onChange={(e) =>
                        updateField(i, {
                          options: e.target.value
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      className="h-9 py-1.5 text-xs"
                    />
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFields((prev) => [...prev, emptyField()])}
              >
                + Add field
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending} fullWidth>
              {save.isPending ? "Saving..." : editingId ? "Update template" : "Save template"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
