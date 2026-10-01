/**
 * Brand mark: three ascending bars built from flat geometric primitives —
 * a constructed, Bauhaus-style glyph that references the product's actual
 * verb (ranking) rather than an arbitrary shape. No gradient, no shadow,
 * sharp corners — flat color on flat color.
 */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <span
      className="flex-none bg-primary flex items-end justify-center gap-[2px] p-[5px]"
      style={{ width: size, height: size }}
    >
      <span className="w-[3px] bg-primary-foreground" style={{ height: "40%" }} />
      <span className="w-[3px] bg-primary-foreground" style={{ height: "70%" }} />
      <span className="w-[3px] bg-primary-foreground" style={{ height: "100%" }} />
    </span>
  );
}
