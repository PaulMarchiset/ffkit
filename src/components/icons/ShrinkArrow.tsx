/** Diagonal arrow pointing into the bottom-right corner — denotes the
 *  reduced/output size in the estimate line. Sized via className (w-/h-). */
export function ShrinkArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 7L17 17M7 17H17V7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
