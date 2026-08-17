import type { Assumption } from "@compos/core";

const SOURCE_LABEL: Record<Assumption["source"], string> = {
  user: "用户填写",
  category_default: "类目默认",
  measured: "实测",
};

const SOURCE_CLASS: Record<Assumption["source"], string> = {
  user: "tag-brand",
  category_default: "tag-brand-soft",
  measured: "tag-neutral",
};

export function AssumptionList({ assumptions }: { assumptions: Assumption[] }) {
  if (assumptions.length === 0) {
    return <p className="text-xs text-ink-soft">没有关联假设——这是一个精确值。</p>;
  }
  return (
    <ul className="space-y-1.5">
      {assumptions.map((a) => (
        <li key={a.key} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-ink-soft">{a.label}</span>
          <span className={`tag ${SOURCE_CLASS[a.source]}`}>{SOURCE_LABEL[a.source]}</span>
        </li>
      ))}
    </ul>
  );
}

export function MetricBlock({
  label,
  valueLabel,
  assumptions,
}: {
  label: string;
  valueLabel: string;
  assumptions: Assumption[];
}) {
  return (
    <details className="group rounded-lg border border-line p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="text-xs text-ink-soft">{label}</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {valueLabel}
          <span className="text-ink-soft transition group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-1.5 text-xs font-medium text-ink-soft">假设（点开可在下方修改）</div>
        <AssumptionList assumptions={assumptions} />
      </div>
    </details>
  );
}
