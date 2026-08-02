"use client";

type AudienceArtProps = {
  active: number;
  reducedMotion?: boolean;
  stacked?: boolean;
};

/** Classic flat tee: collar + sleeves + torso (not a trapezoid box). */
function HangingTee({
  x,
  y,
  fill,
  stroke,
  print,
  swayClass,
}: {
  x: number;
  y: number;
  fill: string;
  stroke?: string;
  print?: "mark" | "drop" | "plain";
  swayClass: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`art-hang ${swayClass}`}>
        {/* hanger hook */}
        <path
          d="M40 0c0-10 8-16 16-16s16 6 16 16"
          stroke="#c8c4b8"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="0"
          x2="80"
          y2="0"
          stroke="#c8c4b8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* tee body — collar, sleeves, curved hem */}
        <path
          d="M30 10
             C30 20 38 26 48 26
             C58 26 66 20 66 10
             L88 28
             L78 48
             L66 38
             V122
             Q48 132 30 122
             V38
             L18 48
             L8 28
             Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 2.5 : 0}
        />
        {print === "mark" ? (
          <rect x="38" y="52" width="20" height="22" rx="2" fill="#070807" />
        ) : null}
        {print === "drop" ? (
          <>
            <rect x="36" y="50" width="24" height="26" rx="2" fill="#070807" />
            <text
              x="48"
              y="67"
              textAnchor="middle"
              fill="#d6ff3c"
              fontSize="8"
              fontFamily="Syne, sans-serif"
              fontWeight="700"
            >
              01
            </text>
          </>
        ) : null}
      </g>
    </g>
  );
}

/** Full standing person in a tee — readable as human, still flat vector. */
function Person({
  x,
  y,
  scale = 1,
  skin = "#e8e2d6",
  tee = "#d6ff3c",
  pants = "#2a3028",
  hair = "#1a1e19",
  print,
  bobClass,
}: {
  x: number;
  y: number;
  scale?: number;
  skin?: string;
  tee?: string;
  pants?: string;
  hair?: string;
  print?: boolean;
  bobClass?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={bobClass}>
        {/* hair + face */}
        <ellipse cx="40" cy="18" rx="19" ry="16" fill={hair} />
        <circle cx="40" cy="26" r="15" fill={skin} />
        {/* neck */}
        <path d="M33 40 H47 V50 H33 Z" fill={skin} />
        {/* tee: clear sleeves + torso hem */}
        <path
          d="M20 52
             L2 70
             L14 84
             L24 72
             V118
             Q40 124 56 118
             V72
             L66 84
             L78 70
             L60 52
             Q40 64 20 52
             Z"
          fill={tee}
        />
        {print ? (
          <rect x="30" y="78" width="20" height="18" rx="2" fill="#070807" />
        ) : null}
        {/* thick arms */}
        <path
          d="M14 80 C8 94 6 108 8 122 L20 124 C20 108 22 94 26 82 Z"
          fill={skin}
        />
        <path
          d="M66 80 C72 94 74 108 72 122 L60 124 C60 108 58 94 54 82 Z"
          fill={skin}
        />
        {/* thick pant legs */}
        <rect x="24" y="118" width="14" height="42" rx="4" fill={pants} />
        <rect x="42" y="118" width="14" height="42" rx="4" fill={pants} />
        {/* shoes */}
        <ellipse cx="31" cy="162" rx="13" ry="6" fill="#121411" />
        <ellipse cx="49" cy="162" rx="13" ry="6" fill="#121411" />
      </g>
    </g>
  );
}

function CampusArt() {
  return (
    <svg
      className="audience-svg"
      viewBox="0 0 480 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        className="art-ground"
        x="48"
        y="348"
        width="384"
        height="10"
        rx="2"
        fill="#f3f0e8"
        opacity="0.16"
      />
      {/* campus block */}
      <g className="art-build">
        <rect x="300" y="140" width="110" height="208" fill="#1a1e19" />
        <rect x="300" y="140" width="110" height="16" fill="#d6ff3c" />
        <rect x="318" y="176" width="24" height="20" fill="#f3f0e8" opacity="0.35" />
        <rect x="368" y="176" width="24" height="20" fill="#f3f0e8" opacity="0.35" />
        <rect x="318" y="220" width="24" height="20" fill="#f3f0e8" opacity="0.22" />
        <rect x="368" y="220" width="24" height="20" fill="#f3f0e8" opacity="0.22" />
        <rect x="318" y="264" width="24" height="20" fill="#f3f0e8" opacity="0.22" />
        <rect x="368" y="264" width="24" height="20" fill="#f3f0e8" opacity="0.22" />
        <rect x="340" y="308" width="30" height="40" fill="#0c0e0c" />
      </g>
      <Person
        x={64}
        y={160}
        scale={1.05}
        tee="#d6ff3c"
        pants="#6b7268"
        print
        bobClass="art-f1"
      />
      <Person
        x={168}
        y={170}
        scale={0.98}
        tee="#f3f0e8"
        pants="#4a5148"
        print
        bobClass="art-f2"
      />
      {/* backpack */}
      <g transform="translate(52 248)">
        <g className="art-float art-bag">
          <rect width="28" height="36" rx="4" fill="#2a3028" />
          <rect x="6" y="10" width="16" height="12" rx="2" fill="#d6ff3c" />
          <path
            d="M4 0 C4 -10 24 -10 24 0"
            stroke="#c8c4b8"
            strokeWidth="2"
            fill="none"
          />
        </g>
      </g>
      {/* book */}
      <g transform="translate(248 280)">
        <g className="art-float art-book">
          <rect width="36" height="28" rx="2" fill="#d6ff3c" />
          <rect x="4" y="6" width="28" height="3" fill="#070807" opacity="0.35" />
          <rect x="4" y="14" width="20" height="3" fill="#070807" opacity="0.25" />
        </g>
      </g>
    </svg>
  );
}

function EventsArt() {
  return (
    <svg
      className="audience-svg"
      viewBox="0 0 480 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        className="art-ground"
        x="40"
        y="368"
        width="400"
        height="10"
        rx="2"
        fill="#f3f0e8"
        opacity="0.16"
      />
      {/* stage lights */}
      <circle className="art-pulse" cx="120" cy="88" r="18" fill="#d6ff3c" />
      <circle
        className="art-pulse art-pulse-delay"
        cx="360"
        cy="88"
        r="18"
        fill="#f3f0e8"
        opacity="0.65"
      />
      {/* merch booth */}
      <g className="art-stage">
        <rect x="148" y="168" width="184" height="12" fill="#2a3028" />
        <rect x="158" y="180" width="164" height="78" fill="#1a1e19" />
        <rect x="178" y="204" width="88" height="18" rx="3" fill="#d6ff3c" />
        <text
          x="222"
          y="217"
          textAnchor="middle"
          fill="#070807"
          fontSize="11"
          fontFamily="Syne, sans-serif"
          fontWeight="800"
        >
          MERCH
        </text>
        {/* tees on booth wall */}
        <path
          d="M178 188 L170 196 L174 202 L178 198 V214 H190 V198 L194 202 L198 196 L190 188 Z"
          fill="#d6ff3c"
        />
        <path
          d="M252 188 L244 196 L248 202 L252 198 V214 H264 V198 L268 202 L272 196 L264 188 Z"
          fill="#f3f0e8"
        />
      </g>
      {/* vendor behind booth (torso only — counter covers legs) */}
      <g transform="translate(196 108)">
        <ellipse cx="40" cy="16" rx="16" ry="13" fill="#1a1e19" />
        <circle cx="40" cy="22" r="13" fill="#e8e2d6" />
        <path
          d="M18 42 L6 54 L14 64 L22 56 V88 H58 V56 L66 64 L74 54 L62 42
             Q40 52 18 42 Z"
          fill="#f3f0e8"
        />
      </g>
      {/* standing crowd at the show */}
      <Person
        x={36}
        y={176}
        scale={1}
        tee="#d6ff3c"
        pants="#6b7268"
        print
        bobClass="art-f1"
      />
      <Person
        x={300}
        y={184}
        scale={0.95}
        tee="#f3f0e8"
        pants="#4a5148"
        print
        bobClass="art-f2"
      />
      <Person
        x={378}
        y={200}
        scale={0.85}
        tee="#d6ff3c"
        pants="#6b7268"
        bobClass="art-f1"
      />
      <g transform="translate(368 128)">
        <g className="art-float art-ticket">
          <rect width="72" height="40" rx="4" fill="#f3f0e8" />
          <rect x="8" y="10" width="38" height="4" fill="#070807" opacity="0.35" />
          <rect x="8" y="20" width="26" height="4" fill="#070807" opacity="0.2" />
          <circle cx="58" cy="20" r="8" fill="#d6ff3c" />
        </g>
      </g>
    </svg>
  );
}

function BrandsArt() {
  return (
    <svg
      className="audience-svg"
      viewBox="0 0 480 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        className="art-ground"
        x="48"
        y="348"
        width="384"
        height="10"
        rx="2"
        fill="#f3f0e8"
        opacity="0.16"
      />
      {/* clothing rack */}
      <g className="art-rack">
        <rect x="88" y="88" width="8" height="260" rx="2" fill="#2a3028" />
        <rect x="384" y="88" width="8" height="260" rx="2" fill="#2a3028" />
        <rect x="88" y="88" width="304" height="8" rx="2" fill="#c8c4b8" opacity="0.7" />
      </g>
      <HangingTee x={110} y={112} fill="#d6ff3c" print="mark" swayClass="art-h1" />
      <HangingTee x={210} y={112} fill="#f3f0e8" print="drop" swayClass="art-h2" />
      <HangingTee
        x={310}
        y={112}
        fill="#1a1e19"
        stroke="#d6ff3c"
        print="plain"
        swayClass="art-h3"
      />
      {/* collection tag */}
      <g transform="translate(196 278)">
        <g className="art-float art-tag">
          <rect width="96" height="52" rx="4" fill="#d6ff3c" />
          <text
            x="48"
            y="22"
            textAnchor="middle"
            fill="#070807"
            fontSize="12"
            fontFamily="Syne, sans-serif"
            fontWeight="800"
          >
            DROP 01
          </text>
          <text
            x="48"
            y="40"
            textAnchor="middle"
            fill="#070807"
            fontSize="9"
            fontFamily="Instrument Sans, sans-serif"
            opacity="0.7"
          >
            YOUR BRAND
          </text>
        </g>
      </g>
    </svg>
  );
}

const arts = [CampusArt, EventsArt, BrandsArt];

export function AudienceArt({
  active,
  reducedMotion = false,
  stacked = false,
}: AudienceArtProps) {
  return (
    <div
      className={`audience-art-stage ${reducedMotion ? "is-static" : ""} ${stacked ? "is-stacked" : ""}`}
      data-active={active}
    >
      {arts.map((Art, index) => (
        <div
          key={index}
          className={`audience-art-panel ${stacked || active === index ? "is-active" : ""}`}
          aria-hidden={!stacked && active !== index}
        >
          <Art />
        </div>
      ))}
    </div>
  );
}
