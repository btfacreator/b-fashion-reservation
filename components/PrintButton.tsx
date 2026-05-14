'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-black text-white text-sm"
    >
      인쇄하기 (Ctrl+P)
    </button>
  );
}
