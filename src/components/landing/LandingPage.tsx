"use client";

import dynamic from "next/dynamic";
import {
  ArrowDown,
  ArrowUpRight,
  Menu,
  PenTool,
  Plus,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AudienceArt } from "./AudienceArt";
import { IntroLoader } from "./IntroLoader";

const ShirtScene = dynamic(
  () => import("./ShirtScene").then((mod) => mod.ShirtScene),
  { ssr: false },
);

const steps = [
  {
    number: "01",
    eyebrow: "Describe",
    title: "Start with a thought.",
    body: "Type the idea exactly as it lives in your head. Promptwear turns language into artwork worth wearing.",
    caption: "Blank canvas. Infinite prompt.",
    icon: Sparkles,
  },
  {
    number: "02",
    eyebrow: "Draw / enhance",
    title: "Make your mark.",
    body: "Sketch freely or let AI polish the rough edges. Your hand stays in the work—technology just pushes it further.",
    caption: "Sketch resolves into print.",
    icon: PenTool,
  },
  {
    number: "03",
    eyebrow: "Customize & order",
    title: "Fit it. Wear it.",
    body: "Lock the cut, colour and finish. We print, quality-check and deliver your piece across Nigeria in seven days.",
    caption: "Your tee. Ready for the street.",
    icon: Shirt,
  },
];

const methods = [
  {
    id: "01",
    eyebrow: "Prompt it",
    title: "Words become wearable art.",
    demo: "“A chrome heart melting into blue flame, Y2K editorial.”",
    className: "method-ai",
  },
  {
    id: "02",
    eyebrow: "Draw it",
    title: "Your hand. Your signature.",
    demo: null,
    className: "method-draw",
  },
  {
    id: "03",
    eyebrow: "Mix both",
    title: "Human instinct. AI momentum.",
    demo: "ROUGH → READY",
    className: "method-hybrid",
  },
];

const audiences = [
  {
    number: "01",
    label: "Campus",
    title: "Crews that want the same fit.",
    body: "Department drops, hostel runs, friend groups matching without the group-chat design drama.",
  },
  {
    number: "02",
    label: "Events",
    title: "Merch that shows up with the night.",
    body: "Concert kits, launch nights, tour drops—print for the room without waiting on an agency.",
  },
  {
    number: "03",
    label: "Brands",
    title: "First collection energy.",
    body: "Starting a tee brand or testing a drop? Ship sample-to-batch without the design invoice.",
  },
];

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const howSection = useRef<HTMLElement>(null);
  const howPin = useRef<HTMLDivElement>(null);
  const audienceSection = useRef<HTMLElement>(null);
  const sceneProgress = useRef(0);
  const [activeStep, setActiveStep] = useState(0);
  const [activeAudience, setActiveAudience] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [audienceStacked, setAudienceStacked] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroDone(true);
  }, []);

  // Scroll + reveal once the page is interactive; hero entrance waits for intro
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");
    setReducedMotion(media.matches);
    setAudienceStacked(media.matches || narrow.matches);

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (howSection.current && !media.matches) {
        ScrollTrigger.create({
          trigger: howSection.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.45,
          onUpdate: (self) => {
            sceneProgress.current = self.progress;
            const next = Math.min(2, Math.floor(self.progress * 3));
            setActiveStep((current) => (current === next ? current : next));
          },
        });

        // Tuck the 3D under the next page as How It Works finishes
        gsap.to("[data-scene-layer]", {
          opacity: 0,
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: howSection.current,
            start: "bottom 90%",
            end: "bottom top",
            scrub: 0.4,
          },
        });
      }

      if (audienceSection.current && !media.matches && !narrow.matches) {
        ScrollTrigger.create({
          trigger: audienceSection.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          onUpdate: (self) => {
            const next = Math.min(2, Math.floor(self.progress * 3));
            setActiveAudience((current) =>
              current === next ? current : next,
            );
          },
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: media.matches ? 0 : 56,
          opacity: 0,
          duration: 0.95,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
          },
        });
      });
    }, root);

    const onMotion = () => setReducedMotion(media.matches);
    const onNarrow = () =>
      setAudienceStacked(media.matches || narrow.matches);
    media.addEventListener("change", onMotion);
    narrow.addEventListener("change", onNarrow);
    return () => {
      media.removeEventListener("change", onMotion);
      narrow.removeEventListener("change", onNarrow);
      ctx.revert();
    };
  }, []);

  useLayoutEffect(() => {
    if (!introDone) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ctx = gsap.context(() => {
      if (media.matches) {
        gsap.set("[data-hero-line], [data-hero-fade], [data-nav-enter]", {
          opacity: 1,
          clearProps: "transform",
        });
        return;
      }

      gsap.from("[data-nav-enter]", {
        y: -16,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from("[data-hero-line]", {
        yPercent: 110,
        duration: 1.15,
        stagger: 0.08,
        ease: "power4.out",
      });
      gsap.from("[data-hero-fade]", {
        y: 24,
        opacity: 0,
        duration: 0.85,
        stagger: 0.08,
        delay: 0.2,
        ease: "power3.out",
      });
    }, root);

    return () => ctx.revert();
  }, [introDone]);

  const step = steps[activeStep] ?? steps[0];
  const audience = audiences[activeAudience] ?? audiences[0];

  return (
    <div
      ref={root}
      className={`site-shell ${introDone ? "is-intro-done" : "is-intro-active"}`}
    >
      {!introDone ? (
        <IntroLoader
          ready={sceneReady}
          reducedMotion={reducedMotion}
          onComplete={handleIntroComplete}
        />
      ) : null}

      <header className="site-nav" data-nav-enter>
        <a href="#" className="wordmark" aria-label="Promptwear home">
          promptwear
        </a>
        <nav className="desktop-nav" aria-label="Main">
          <a href="#how">How it works</a>
          <a href="#create">Create</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-actions">
          <a href="/login" className="nav-login">
            Log in
          </a>
          <a href="/dashboard" className="nav-cta">
            Start designing
            <ArrowUpRight size={15} strokeWidth={2.25} />
          </a>
        </div>
        <button
          type="button"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen ? (
        <nav className="mobile-menu" aria-label="Mobile">
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#create" onClick={() => setMenuOpen(false)}>
            Create
          </a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>
            Pricing
          </a>
          <a href="/dashboard" onClick={() => setMenuOpen(false)}>
            Start designing
          </a>
        </nav>
      ) : null}

      <main>
        <div className="story-world">
          <div className="scene-layer" data-scene-layer aria-hidden="true">
            <div className="scene-glow" />
            <ShirtScene
              progress={sceneProgress}
              onReady={handleSceneReady}
            />
            <div className="scene-caption">
              <span>{String(activeStep + 1).padStart(2, "0")} / 03</span>
              <span>{step.caption}</span>
            </div>
          </div>

          <section className="hero-section">
            <div className="hero-copy">
              <h1 className="hero-brand" aria-label="Promptwear">
                <span className="line-mask">
                  <span data-hero-line>promptwear</span>
                </span>
              </h1>
              <div className="hero-text">
                <p className="hero-headline" data-hero-fade>
                  If you can imagine it, you can wear it.
                </p>
                <p className="hero-support" data-hero-fade>
                  Describe it. Draw it. Or combine both. Custom tees from idea
                  to door in seven days.
                </p>
                <div className="hero-actions" data-hero-fade>
                  <a href="/dashboard" className="button-primary">
                    Start designing
                    <ArrowUpRight size={17} strokeWidth={2.25} />
                  </a>
                  <a href="#how" className="button-ghost">
                    See how it works
                    <ArrowDown size={15} strokeWidth={2.25} />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section ref={howSection} id="how" className="how-section">
            <div ref={howPin} className="how-pin">
              <div className="how-heading">
                <p>How it works</p>
                <span>Three moves. One original.</span>
              </div>

              {reducedMotion ? (
                <div className="steps-static">
                  {steps.map((item) => {
                    const Icon = item.icon;
                    return (
                      <article
                        key={item.number}
                        className="step-copy is-active"
                      >
                        <div className="step-meta">
                          <span>{item.number}</span>
                          <Icon size={16} />
                          <span>{item.eyebrow}</span>
                        </div>
                        <h2>{item.title}</h2>
                        <p>{item.body}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="steps-column">
                  {steps.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <article
                        key={item.number}
                        className={`step-copy ${activeStep === index ? "is-active" : ""}`}
                        aria-hidden={activeStep !== index}
                      >
                        <div className="step-meta">
                          <span>{item.number}</span>
                          <Icon size={16} />
                          <span>{item.eyebrow}</span>
                        </div>
                        <h2>{item.title}</h2>
                        <p>{item.body}</p>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="step-progress" aria-hidden="true">
                {steps.map((item, index) => (
                  <span
                    key={item.number}
                    className={activeStep >= index ? "is-filled" : ""}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Solid stack that slides up and covers the sticky 3D as How It Works ends */}
        <div className="site-cover">
        <div className="marquee-wrap" aria-hidden="true">
          <div className="marquee-track">
            {[
              "YOUR IDEA",
              "YOUR CANVAS",
              "YOUR FIT",
              "MADE IN NIGERIA",
              "DELIVERED IN 7 DAYS",
              "YOUR IDEA",
              "YOUR CANVAS",
              "YOUR FIT",
              "MADE IN NIGERIA",
              "DELIVERED IN 7 DAYS",
            ].map((item, index) => (
              <span key={`${item}-${index}`}>
                {item}
                <i>/</i>
              </span>
            ))}
          </div>
        </div>

        <section id="create" className="create-section">
          <div className="section-label" data-reveal>
            <span>02</span>
            <span>Create your way</span>
          </div>
          <div className="create-intro" data-reveal>
            <h2>
              There is no wrong way
              <br />
              to start something.
            </h2>
            <p>
              A sentence, a scribble, a reference—or all three. AI augments your
              creativity. It never replaces it.
            </p>
          </div>

          <div className="method-grid">
            {methods.map((method) => (
              <article
                key={method.id}
                className={`method-card ${method.className}`}
                data-reveal
              >
                <div className="method-top">
                  <span>{method.id}</span>
                </div>
                {method.className === "method-ai" && method.demo ? (
                  <div className="prompt-demo">
                    <p>{method.demo}</p>
                    <span>Generating your vision</span>
                  </div>
                ) : null}
                {method.className === "method-draw" ? (
                  <div className="sketch-demo" aria-hidden="true">
                    <svg viewBox="0 0 400 220" fill="none">
                      <path
                        d="M48 168C96 62 168 38 214 118C248 176 312 158 352 48"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M64 188C118 108 172 96 214 152C248 196 300 172 328 108"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.45"
                      />
                    </svg>
                  </div>
                ) : null}
                {method.className === "method-hybrid" && method.demo ? (
                  <div className="hybrid-demo">
                    <span>ROUGH</span>
                    <span className="hybrid-arrow">→</span>
                    <span>READY</span>
                  </div>
                ) : null}
                <div>
                  <p className="method-eyebrow">{method.eyebrow}</p>
                  <h3>{method.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          ref={audienceSection}
          className={`audience-section ${audienceStacked ? "is-stacked" : ""}`}
          aria-label="Who it's for"
        >
          <div className="audience-pin">
            <div className="audience-copy">
              <p className="audience-kicker">Who it&apos;s for</p>
              <div className="audience-labels">
                {audiences.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    className={activeAudience === index ? "is-active" : ""}
                    aria-pressed={activeAudience === index}
                    onClick={() => {
                      setActiveAudience(index);
                      const section = audienceSection.current;
                      if (!section || audienceStacked) return;
                      const top =
                        section.getBoundingClientRect().top + window.scrollY;
                      const span = Math.max(1, section.offsetHeight - window.innerHeight);
                      // Land mid-beat so ScrollTrigger stays on this audience
                      const progress = (index + 0.5) / audiences.length;
                      window.scrollTo({ top: top + span * progress });
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {audienceStacked ? (
                <div className="audience-static">
                  {audiences.map((item) => (
                    <article key={item.number} className="audience-beat is-active">
                      <span className="audience-number">{item.number}</span>
                      <h2>{item.title}</h2>
                      <p className="audience-body">{item.body}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="audience-beats">
                  {audiences.map((item, index) => (
                    <article
                      key={item.number}
                      className={`audience-beat ${activeAudience === index ? "is-active" : ""}`}
                      aria-hidden={activeAudience !== index}
                    >
                      <span className="audience-number">{item.number}</span>
                      <h2>{item.title}</h2>
                      <p className="audience-body">{item.body}</p>
                    </article>
                  ))}
                </div>
              )}

              {!audienceStacked ? (
                <div className="audience-progress" aria-hidden="true">
                  {audiences.map((item, index) => (
                    <span
                      key={item.number}
                      className={activeAudience >= index ? "is-filled" : ""}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="audience-visual" aria-live="polite">
              <AudienceArt
                active={activeAudience}
                reducedMotion={reducedMotion}
                stacked={audienceStacked}
              />
              {!audienceStacked ? (
                <p className="audience-caption">{audience.label}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section id="pricing" className="proof-section">
          <div className="proof-header" data-reveal>
            <div className="section-label">
              <span>03</span>
              <span>Pricing &amp; proof</span>
            </div>
            <h2>
              Transparent price.
              <br />
              Street-ready print.
            </h2>
            <p>
              Smart pricing weighs garment, print method and delivery so you see
              one clear total—before you pay. DTF and screen printing available
              now.
            </p>
          </div>
          <div className="proof-grid">
            <article data-reveal>
              <span className="proof-number">₦</span>
              <h3>Instant pricing</h3>
              <p>Totals update as you change quality, print and quantity.</p>
            </article>
            <article data-reveal>
              <span className="proof-number">07</span>
              <h3>Days to your door</h3>
              <p>Printed, checked and delivered across Nigeria.</p>
            </article>
            <article data-reveal>
              <span className="proof-number">1</span>
              <h3>Piece minimum</h3>
              <p>No bulk required. One idea is enough to begin.</p>
            </article>
          </div>
        </section>

        <section className="trust-section" data-reveal>
          <p>
            Made with vetted production partners. Quality-checked before it
            ships. Built for creatives across Nigeria.
          </p>
        </section>

        <section className="final-cta">
          <div className="final-cta-copy" data-reveal>
            <p>Your blank canvas is waiting.</p>
            <h2>
              What will
              <br />
              you wear next?
            </h2>
          </div>
          <div className="final-cta-actions" data-reveal>
            <a href="/dashboard" className="button-primary button-large">
              Start designing
              <ArrowUpRight size={18} strokeWidth={2.25} />
            </a>
            <a href="/dashboard" className="button-ghost">
              Continue as guest
            </a>
          </div>
          <div className="cta-benefits">
            <span>
              <Plus size={14} strokeWidth={2.5} /> No design skills needed
            </span>
            <span>
              <Plus size={14} strokeWidth={2.5} /> Guest checkout
            </span>
            <span>
              <Plus size={14} strokeWidth={2.5} /> One piece minimum
            </span>
          </div>
        </section>
        </div>
      </main>

      <footer className="site-footer">
        <a href="#" className="wordmark">
          promptwear
        </a>
        <p>Ideas deserve a body.</p>
        <div className="footer-links">
          <a href="mailto:hello@promptwear.ng">hello@promptwear.ng</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <small>© 2026 Promptwear</small>
      </footer>
    </div>
  );
}
