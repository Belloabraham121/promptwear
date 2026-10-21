import Image from "next/image";
import {
  featuredCreator,
  looks,
  marqueeItems,
  otherCreators,
  processSteps,
  v2Image,
} from "@/components/landing-v2/data";
import {
  CampaignImage,
  InkButton,
  Kicker,
  SplitHeading,
  TextLink,
  padX,
} from "@/components/landing-v2/primitives";
import { cn } from "@/lib/utils";

export function Marquee() {
  const row = [...marqueeItems, ...marqueeItems];
  return (
    <div className="overflow-hidden bg-[#070807] py-4 text-[#f3f0e8]">
      <p className="sr-only">{marqueeItems.join(". ")}.</p>
      <div className="pw-marquee-track flex w-max" aria-hidden>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {row.map((item, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center gap-8 pr-8 font-heading text-[clamp(1rem,1.6vw,1.35rem)] font-bold tracking-[-0.02em] whitespace-nowrap"
              >
                {item}
                <span className="text-[#d6ff3c]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-bleed campaign photo carrying one line of the brand manifesto. */
export function CampaignBreak({
  name,
  alt,
  kicker,
  lines,
  tone,
}: {
  name: "street" | "night" | "studio";
  alt: string;
  kicker: string;
  lines: string[];
  /** "ink" for light photos with empty backdrop, "bone" for darker photos. */
  tone: "ink" | "bone";
}) {
  return (
    <section
      className={cn(
        "relative flex min-h-[92svh] overflow-hidden md:min-h-[100svh]",
        tone === "ink" ? "bg-[#e9e4d8] text-[#070807]" : "bg-[#070807] text-[#f3f0e8]",
      )}
    >
      <CampaignImage name={name} alt={alt} />
      {tone === "bone" ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,8,7,0.82),rgba(7,8,7,0.1)_55%),linear-gradient(to_right,rgba(7,8,7,0.55),transparent_60%)]"
        />
      ) : null}
      <div
        className={cn(
          "relative mt-auto flex w-full flex-col gap-5 pb-[clamp(2.5rem,8vh,5rem)] md:mt-0 md:justify-center md:pb-0",
          tone === "ink" && "max-md:mt-[clamp(6rem,14vh,9rem)] max-md:justify-start",
          padX,
        )}
      >
        <Kicker className={tone === "ink" ? "text-[#5a6b14]" : "text-[#d6ff3c]"}>{kicker}</Kicker>
        <SplitHeading
          lines={lines}
          className="max-w-[11ch] text-[clamp(3.2rem,8.5vw,8.5rem)] leading-[0.86] font-extrabold tracking-[-0.06em]"
        />
      </div>
    </section>
  );
}

export function TheEdit() {
  const details = ["edit-detail-01.jpg", "edit-detail-02.jpg", "edit-detail-03.jpg"];
  return (
    <section id="edit" className={cn("scroll-mt-20 bg-[#f3f0e8] pb-[clamp(5rem,14vh,9rem)] text-[#070807]", padX)}>
      <div className="grid gap-10 border-t border-[#070807] pt-8 md:grid-cols-12 md:gap-x-[clamp(1rem,2.5vw,2.5rem)]">
        <figure className="m-0 md:col-span-6 lg:col-span-5">
          <div data-parallax className="relative aspect-[4/5] overflow-hidden bg-[#ece8de]">
            <div data-parallax-media className="absolute inset-[-8%_0]">
              <Image
                src={v2Image("edit-lead.jpg")}
                alt="Student in a bone line-art tee leaning on a weathered pastel wall"
                fill
                sizes="(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
          <figcaption className="mt-3 flex justify-between text-[0.72rem] tracking-[0.12em] text-[#5a574f] uppercase">
            <span>Pictured: Two Faces, boxy tee</span>
            <span>Ph. Driplab Studio</span>
          </figcaption>
        </figure>

        <div className="flex flex-col md:col-span-6 lg:col-span-6 lg:col-start-7">
          <Kicker index="02" className="text-[#5a6b14]">The Driplab Edit</Kicker>
          <p
            aria-hidden
            className="mt-6 mb-0 font-heading text-[clamp(4.5rem,9.5vw,9.5rem)] leading-[0.8] font-extrabold tracking-[-0.07em] text-transparent [-webkit-text-stroke:1.5px_#070807]"
          >
            No.01
          </p>
          <SplitHeading
            lines={["Campus uniforms,", "reimagined."]}
            className="mt-6 text-[clamp(2rem,4.2vw,3.6rem)] leading-[0.95] font-extrabold tracking-[-0.05em]"
          />
          <p className="mt-6 mb-0 max-w-[44ch] text-[1rem] leading-[1.6] text-[#5a574f]">
            Line art, tonal embroidery and heavyweight cotton. This week the team picked the designs
            that make a lecture hall look like a lookbook — each one ready to wear or remix for your
            whole department.
          </p>

          <ul className="m-0 mt-10 grid list-none grid-cols-3 gap-3 p-0 md:mt-auto md:pt-10">
            {details.map((file, i) => (
              <li
                key={file}
                data-reveal
                className={cn("relative aspect-square overflow-hidden bg-[#ece8de]", i === 1 && "translate-y-6")}
              >
                <Image
                  src={v2Image(file)}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 16vw, 31vw"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <TextLink href="/dashboard">Shop the edit</TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CreatorSpotlight() {
  return (
    <section
      id="creators"
      className={cn("scroll-mt-20 bg-[#070807] py-[clamp(5rem,14vh,9rem)] text-[#f3f0e8]", padX)}
    >
      <Kicker index="04" className="text-[#d6ff3c]">Creator spotlight</Kicker>

      <div className="mt-10 grid gap-10 md:grid-cols-12 md:gap-x-[clamp(1rem,2.5vw,2.5rem)]">
        <div data-parallax className="relative aspect-[4/5] overflow-hidden md:col-span-5">
          <div data-parallax-media className="absolute inset-[-8%_0]">
            <Image
              src={v2Image(featuredCreator.image)}
              alt={`${featuredCreator.name} in her studio holding a sketchbook`}
              fill
              sizes="(min-width: 768px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col md:col-span-7">
          <SplitHeading
            as="h2"
            lines={featuredCreator.name.split(" ")}
            className="text-[clamp(3.4rem,10vw,9.5rem)] leading-[0.84] font-extrabold tracking-[-0.065em]"
          />
          <p className="mt-4 mb-0 text-[0.8rem] font-semibold tracking-[0.2em] text-[#d6ff3c] uppercase">
            {featuredCreator.handle} · Featured creator
          </p>
          <blockquote className="m-0 mt-8 max-w-[28ch] font-heading text-[clamp(1.3rem,2.3vw,1.9rem)] leading-[1.2] font-semibold tracking-[-0.03em]">
            “{featuredCreator.quote}”
          </blockquote>

          <div className="mt-10 md:mt-auto md:pt-10">
            <p className="m-0 mb-3 text-[0.68rem] tracking-[0.22em] text-[#c8c4b8] uppercase">In this drop</p>
            <ul className="m-0 grid max-w-[30rem] list-none grid-cols-3 gap-3 p-0">
              {featuredCreator.designs.map((design) => (
                <li key={design.file} data-reveal className="relative aspect-[3/4] overflow-hidden bg-[#ece8de]">
                  <Image src={v2Image(design.file)} alt={design.alt} fill sizes="(min-width: 768px) 10rem, 30vw" className="object-cover" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-[clamp(4rem,10vh,7rem)] grid gap-10 border-t border-[#f3f0e8]/15 pt-10 md:grid-cols-12 md:gap-x-[clamp(1rem,2.5vw,2.5rem)]">
        <div className="md:col-span-5">
          <SplitHeading
            lines={["Create it.", "We make it.", "You earn."]}
            className="text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[0.92] font-extrabold tracking-[-0.05em]"
          />
          <p className="mt-5 mb-7 max-w-[38ch] text-[0.95rem] leading-[1.6] text-[#c8c4b8]">
            Publish a design and Driplab handles printing, quality checks and delivery. Every
            qualifying sale credits you — no stock, no manufacturer, no stress.
          </p>
          <InkButton href="/login?mode=signup" tone="lime">
            Become a creator
          </InkButton>
        </div>

        <ul className="m-0 grid list-none grid-cols-2 gap-[clamp(0.75rem,1.6vw,1.5rem)] p-0 md:col-span-6 md:col-start-7">
          {otherCreators.map((creator) => (
            <li key={creator.handle} data-reveal>
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={v2Image(creator.image)}
                  alt={creator.name}
                  fill
                  sizes="(min-width: 768px) 24vw, 46vw"
                  className="object-cover grayscale transition-[filter] duration-700 hover:grayscale-0"
                />
              </div>
              <p className="mt-3 mb-0 font-heading text-[1.1rem] font-bold tracking-[-0.03em]">{creator.name}</p>
              <p className="mt-1 mb-0 text-[0.78rem] text-[#c8c4b8]">
                {creator.handle} · {creator.focus}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CreateThis() {
  return (
    <section
      id="how"
      className={cn(
        "relative scroll-mt-20 overflow-hidden bg-[#f3f0e8] py-[clamp(5rem,14vh,9rem)] text-[#070807]",
        padX,
      )}
    >
      <Image
        src={v2Image("texture-bone.jpg")}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-50 mix-blend-multiply"
      />
      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker index="05" className="text-[#5a6b14]">How Driplab works</Kicker>
            <SplitHeading
              lines={["Imagine.", "Make. Wear."]}
              className="mt-5 text-[clamp(2.6rem,7vw,6.4rem)] leading-[0.88] font-extrabold tracking-[-0.06em]"
            />
          </div>
          <p className="m-0 max-w-[34ch] text-[0.98rem] leading-[1.6] text-[#5a574f]">
            One piece minimum. No design skills needed. Every order is routed to the print house best
            suited to make it.
          </p>
        </div>

        <ol className="m-0 mt-14 grid list-none gap-y-12 p-0 md:grid-cols-3 md:pb-20 md:gap-x-[clamp(1rem,2.5vw,2.5rem)]">
          {processSteps.map((step, i) => (
            <li key={step.n} data-reveal className={cn(i === 1 && "md:translate-y-20", i === 2 && "md:translate-y-8")}>
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={v2Image(step.image)}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 31vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-5 flex items-baseline gap-4 border-t border-[#070807] pt-4">
                <span className="font-heading text-[2.4rem] leading-none font-extrabold tracking-[-0.06em] text-[#5a6b14]">
                  {step.n}
                </span>
                <div>
                  <h3 className="m-0 font-heading text-[1.4rem] font-bold tracking-[-0.04em]">{step.title}</h3>
                  <p className="mt-1 mb-0 text-[0.92rem] text-[#5a574f]">{step.line}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-[clamp(4rem,12vh,8rem)] flex justify-center">
          <InkButton href="/dashboard">Start designing</InkButton>
        </div>
      </div>
    </section>
  );
}

export function Lookbook() {
  return (
    <section id="community" className={cn("scroll-mt-20 bg-[#f3f0e8] py-[clamp(5rem,14vh,9rem)] text-[#070807]", padX)}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Kicker index="06" className="text-[#5a6b14]">Worn by the community</Kicker>
          <SplitHeading
            lines={["Seen on", "the streets."]}
            className="mt-5 text-[clamp(2.4rem,6.4vw,5.6rem)] leading-[0.9] font-extrabold tracking-[-0.055em]"
          />
        </div>
        <p className="m-0 text-[0.72rem] font-semibold tracking-[0.2em] uppercase">Tag #madeondriplab</p>
      </div>

      <ul className="m-0 mt-12 list-none columns-2 gap-[clamp(0.75rem,1.4vw,1.25rem)] p-0 md:columns-3 lg:columns-4">
        {looks.map((look) => (
          <li
            key={look.file}
            data-reveal
            className={cn(
              "group relative mb-[clamp(0.75rem,1.4vw,1.25rem)] break-inside-avoid overflow-hidden",
              look.aspect,
            )}
          >
            <Image
              src={v2Image(look.file)}
              alt={look.alt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute bottom-2.5 left-2.5 bg-[#f3f0e8] px-2 py-1 text-[0.62rem] font-semibold tracking-[0.14em] uppercase">
              {look.tag}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FinalCta({ authed }: { authed: boolean }) {
  return (
    <section className="relative flex min-h-[92svh] items-end overflow-hidden bg-[#070807] text-[#f3f0e8]">
      <CampaignImage name="night" alt="Friends dancing at a rooftop party in Driplab event tees" imgClassName="opacity-55" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,#070807_8%,rgba(7,8,7,0.35)_60%,rgba(7,8,7,0.6))]" />
      <div className={cn("relative w-full pb-[clamp(3rem,9vh,6rem)]", padX)}>
        <Kicker className="text-[#d6ff3c]">Wear what the community creates</Kicker>
        <SplitHeading
          lines={["Create", "yours."]}
          className="mt-6 text-[clamp(4.5rem,17vw,17rem)] leading-[0.8] font-extrabold tracking-[-0.07em] text-[#d6ff3c]"
        />
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
          <InkButton href="/dashboard" tone="lime">
            {authed ? "Open the studio" : "Start designing"}
          </InkButton>
          {!authed ? (
            <TextLink href="/login?mode=signup" className="text-[#f3f0e8]">
              Join as a creator
            </TextLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
