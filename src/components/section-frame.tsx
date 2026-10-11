import { Heading } from "@/components/heading";
import { Divider } from "@/components/divider";

/*
  The frame every section after the hero sits in. From xl (1280px) the
  heading moves into a left column and stays pinned while its section
  scrolls past, and the content takes the wide right column: running text
  keeps its own measure inside it, while media (car, trace) use the full
  width. Below xl it stacks, as before.

  The id lives on the <section> rather than the heading: a sticky element
  reports its stuck position, which makes it a bad scroll target.
*/
export function SectionFrame({
  id,
  kicker,
  title,
  band = false,
  pad = "py-20",
  children,
}: {
  id: string;
  kicker: string;
  title: React.ReactNode;
  band?: boolean;
  pad?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative isolate ${band ? "bg-band" : ""}`}>
      <Divider />
      <div className={`frame ${pad} xl:grid xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-16`}>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <Heading kicker={kicker}>{title}</Heading>
        </div>
        <div className="mt-8 min-w-0 xl:mt-0">{children}</div>
      </div>
    </section>
  );
}
