/*
  The site's one link style. Hover or keyboard focus draws a sky underline in
  from the left (it leaves to the right). An arrow says where the link goes
  and nudges that way on hover: ↗ leaves the site (added automatically for
  new-tab links), ↓ / ↑ move down or up the page.

  tone: "sky" for calls to action, "muted" for quiet links that brighten on
  hover. inline: for links inside running text, which keep a faint resting
  underline so they still read as links before hover.
*/
type Arrow = "↗" | "↓" | "↑";

export function TextLink({
  href,
  children,
  tone = "muted",
  arrow,
  inline = false,
  newTab,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "sky" | "muted";
  arrow?: Arrow;
  inline?: boolean;
  newTab?: boolean;
  className?: string;
}) {
  const external = newTab ?? /^https?:|\.pdf$/.test(href);
  const mark = arrow ?? (external ? "↗" : undefined);
  return (
    <a
      href={href}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      data-tone={tone}
      data-inline={inline || undefined}
      className={`link ${className}`}
    >
      <span className="link-label">{children}</span>
      {mark && (
        <span aria-hidden className="link-arrow" data-dir={mark}>
          {mark}
        </span>
      )}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
