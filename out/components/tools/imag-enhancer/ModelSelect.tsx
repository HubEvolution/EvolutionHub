import type { ChangeEvent } from 'react';

export interface ModelOption {
  slug: string;
  label: string;
}

interface ModelSelectProps {
  id?: string;
  label: string;
  value: string;
  options: ReadonlyArray<ModelOption>;
  onChange: (value: string) => void;
}

export function ModelSelect({ id = 'model', label, value, options, onChange }: ModelSelectProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        className="w-full sm:w-auto sm:min-w-[200px] rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.slug} value={opt.slug}>
            {opt.label}
          </option>
        ))}
      </select>
    </>
  );
}
