'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlan, deletePlan, getPricing, updateDefaults, updatePlan } from '@/lib/api/pricing';

const emptyPlan = { name: '', minutes: '', price: '' };

export default function PricingPage() {
  const qc = useQueryClient();
  const { data: pricing } = useQuery({ queryKey: ['pricing'], queryFn: getPricing });
  const refresh = () => qc.invalidateQueries({ queryKey: ['pricing'] });

  const [hourly, setHourly] = useState('');
  const [half, setHalf] = useState('');
  const [editing, setEditing] = useState<string | null>(null); // 'new' | plan id
  const [plan, setPlan] = useState(emptyPlan);

  useEffect(() => {
    if (pricing) {
      setHourly(String(pricing.defaultHourly));
      setHalf(String(pricing.defaultHalfHour));
    }
  }, [pricing]);

  const saveDefaults = useMutation({
    mutationFn: () => updateDefaults(Number(hourly), Number(half)),
    onSuccess: refresh,
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      const payload = { name: plan.name.trim(), minutes: Number(plan.minutes), price: Number(plan.price) };
      if (editing === 'new') await createPlan(payload);
      else await updatePlan(editing!, payload);
    },
    onSuccess: () => { refresh(); setEditing(null); },
  });

  const remove = useMutation({ mutationFn: deletePlan, onSuccess: refresh });

  const defaultsValid = Number(hourly) > 0 && Number(half) > 0;
  const planValid = plan.name.trim() && Number(plan.minutes) > 0 && Number(plan.price) > 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pricing</h1>

      <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="font-medium">Default Rates</h2>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Hourly rate</label>
            <input type="number" min={0} value={hourly} onChange={(e) => setHourly(e.target.value)}
              className="w-40 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Half-hour rate</label>
            <input type="number" min={0} value={half} onChange={(e) => setHalf(e.target.value)}
              className="w-40 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <button disabled={!defaultsValid || saveDefaults.isPending} onClick={() => saveDefaults.mutate()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40">
            Save
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Rate order: station override, then room override, then these defaults. Set overrides on the Stations and Rooms pages.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Fixed-Duration Plans</h2>
        <button
          onClick={() => { setPlan(emptyPlan); setEditing('new'); }}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add Plan
        </button>
      </div>

      {editing && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Name</label>
              <input value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
                placeholder="2 Hours"
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Minutes</label>
              <input type="number" min={1} value={plan.minutes}
                onChange={(e) => setPlan((p) => ({ ...p, minutes: e.target.value }))}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Price</label>
              <input type="number" min={0} value={plan.price}
                onChange={(e) => setPlan((p) => ({ ...p, price: e.target.value }))}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={!planValid || savePlan.isPending} onClick={() => savePlan.mutate()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40">
              Save
            </button>
            <button onClick={() => setEditing(null)}
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pricing?.plans.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-neutral-400">{p.minutes} min</td>
                <td className="px-4 py-3">{p.price}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setPlan({ name: p.name, minutes: String(p.minutes), price: String(p.price) });
                        setEditing(p.id);
                      }}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      Edit
                    </button>
                    <button onClick={() => remove.mutate(p.id)} className="text-red-400 hover:text-red-300">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}