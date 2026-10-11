import qrcode from "qrcode-generator";

/*
  A QR code as plain SVG, encoded when the page is prerendered. This is a
  server component: the encoder never reaches the browser, only the
  finished <svg> does. Dark modules on white with the standard 4-module
  quiet zone, so phone cameras read it in either site theme.
*/
export function LinkQr({ url, label, className = "" }: { url: string; label: string; className?: string }) {
  // Level L: this URL then fits a 29×29 grid, so modules print larger and
  // scan more easily off a screen (a screen has no smudges to correct).
  const qr = qrcode(0, "L");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  const size = n + quiet * 2;
  // One path: a 1×1 square per dark module.
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={d} fill="#0b1220" />
    </svg>
  );
}
