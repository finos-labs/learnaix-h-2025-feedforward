"use client";

export default function KpiCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white p-3 rounded-lg shadow text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
