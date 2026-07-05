"use client";

import { useState } from "react";
import type { AgentProfile, AgentTerritory } from "@/lib/agents/types";
import { Button } from "@/components/ui/button";

const emptyTerritory = (): AgentTerritory => ({
  id: `terr_${crypto.randomUUID()}`,
  name: "",
  province: "",
  city: "",
  suburbs: [],
  postalCodes: [],
  agentIds: [],
  active: true,
});

type TerritoryEditorProps = {
  territories: AgentTerritory[];
  profiles: Array<AgentProfile & { userName?: string }>;
  onSave: (territory: AgentTerritory) => Promise<void>;
  onDelete: (territoryId: string) => Promise<void>;
};

export function TerritoryEditor({ territories, profiles, onSave, onDelete }: TerritoryEditorProps) {
  const [editing, setEditing] = useState<AgentTerritory | null>(null);
  const [suburbsText, setSuburbsText] = useState("");

  function startNew() {
    const t = emptyTerritory();
    setEditing(t);
    setSuburbsText("");
  }

  function startEdit(territory: AgentTerritory) {
    setEditing({ ...territory });
    setSuburbsText(territory.suburbs.join(", "));
  }

  async function save() {
    if (!editing) return;
    await onSave({
      ...editing,
      suburbs: suburbsText.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Assign provinces, cities, and suburbs to agents for territory-based lead routing.</p>
        <Button onClick={startNew}>Add territory</Button>
      </div>

      <div className="grid gap-4">
        {territories.map((territory) => (
          <article key={territory.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{territory.name}</p>
                <p className="text-sm text-slate-400">
                  {territory.province} - {territory.city} - {territory.active ? "Active" : "Inactive"}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Suburbs: {territory.suburbs.join(", ") || "-"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Agents:{" "}
                  {territory.agentIds
                    .map((id) => profiles.find((p) => p.userId === id)?.userName ?? id)
                    .join(", ") || "None assigned"}
                </p>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Button variant="secondary" onClick={() => startEdit(territory)}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => void onDelete(territory.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5">
          <h3 className="font-semibold text-white">{editing.name ? `Edit ${editing.name}` : "New territory"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-300">
              Name
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-300">
              Province
              <input
                value={editing.province}
                onChange={(e) => setEditing({ ...editing, province: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-300">
              City
              <input
                value={editing.city}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:mt-6">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Active territory
            </label>
            <label className="text-sm text-slate-300 sm:col-span-2">
              Suburbs (comma separated)
              <input
                value={suburbsText}
                onChange={(e) => setSuburbsText(e.target.value)}
                placeholder="Avondale, Borrowdale, Mount Pleasant"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-300 sm:col-span-2">
              Assigned agents
              <select
                multiple
                value={editing.agentIds}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    agentIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                  })
                }
                className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                {profiles.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.userName ?? p.agentIdCode} ({p.level})
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">Hold Ctrl/Cmd to select multiple agents.</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void save()}>Save territory</Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
