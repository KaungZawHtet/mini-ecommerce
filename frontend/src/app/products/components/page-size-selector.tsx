"use client";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

export function PageSizeSelector({
  pageSize,
  onChange,
}: {
  pageSize: number;
  onChange: (pageSize: number) => void;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      Page size
      <select
        className="ml-2 h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-900"
        value={pageSize}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
