export const V2_ROOT = "/landing/v2/";

export const v2Image = (file: string) => `${V2_ROOT}${file}`;

/** Sample designs until the homepage reads live public designs from the API. */
export type Drop = {
  id: string;
  title: string;
  creator: string;
  garment: string;
  from: number;
  image: string;
  /** Worn shot shown on hover. Omitted when it doesn't match the product shot. */
  worn?: string;
};

export const drops: Drop[] = [
  { id: "01", title: "Lime Static", creator: "@tomi.draws", garment: "Oversized tee", from: 9000, image: "drop-01.jpg", worn: "drop-01-worn.jpg" },
  { id: "02", title: "Two Hands", creator: "@kayode.studio", garment: "Boxy tee", from: 9000, image: "drop-02.jpg", worn: "drop-02-worn.jpg" },
  // drop-03-worn shows a different star than the product shot, so no hover swap.
  { id: "03", title: "North Star", creator: "@ada.ink", garment: "Heavy hoodie", from: 18000, image: "drop-03.jpg" },
  { id: "04", title: "Night Drive", creator: "@kayode.studio", garment: "Classic tee", from: 7000, image: "drop-04.jpg", worn: "drop-04-worn.jpg" },
  { id: "05", title: "Adire Code", creator: "@ada.ink", garment: "Crewneck", from: 15000, image: "drop-05.jpg", worn: "drop-05-worn.jpg" },
  { id: "06", title: "Lone Star", creator: "@femi.makes", garment: "Washed tee", from: 9000, image: "drop-06.jpg", worn: "drop-06-worn.jpg" },
  { id: "07", title: "Lagoon Wave", creator: "@tomi.draws", garment: "Heavy hoodie", from: 18000, image: "drop-07.jpg" },
  { id: "08", title: "Skyline", creator: "@femi.makes", garment: "Boxy tee", from: 9000, image: "drop-08.jpg" },
  { id: "09", title: "Two Faces", creator: "@ada.ink", garment: "Classic tee", from: 7000, image: "drop-09.jpg" },
  { id: "10", title: "Palm Season", creator: "@kayode.studio", garment: "Oversized tee", from: 9000, image: "drop-10.jpg" },
  { id: "11", title: "Ink Rain", creator: "@tomi.draws", garment: "Oversized tee", from: 9000, image: "drop-11.jpg" },
  { id: "12", title: "Masquerade", creator: "@femi.makes", garment: "Crewneck", from: 15000, image: "drop-12.jpg" },
];

export const trending = drops.slice(0, 6);
export const newDrops = drops.slice(6);

export const heroCutouts = [
  { file: "hero-cutout-03.png", alt: "Stone grey hoodie with an embroidered emblem" },
  { file: "hero-cutout-02.png", alt: "Bone tee with a line-art profile" },
  { file: "hero-cutout-01.png", alt: "Black tee with an acid-lime brushstroke" },
  { file: "hero-cutout-05.png", alt: "Bone tee with an adire-inspired pattern" },
  { file: "hero-cutout-04.png", alt: "Black sweatshirt with a raised wavy print" },
  { file: "hero-cutout-06.png", alt: "Charcoal tee with a palm-tree graphic" },
];

/** Sample creators until real creator profiles exist. */
export const featuredCreator = {
  name: "Ada Okafor",
  handle: "@ada.ink",
  image: "creator-01.jpg",
  quote:
    "I sketch on the bus, publish at night, and wake up to someone in Ibadan wearing it.",
  designs: [
    { file: "drop-05.jpg", alt: "Adire Code: bone crewneck with a black adire-inspired pattern" },
    { file: "drop-09.jpg", alt: "Two Faces: stone tee with a black cubist portrait" },
    { file: "drop-03.jpg", alt: "North Star: stone grey hoodie with a black four-point star" },
  ],
};

export const otherCreators = [
  { name: "Kayode Bello", handle: "@kayode.studio", image: "creator-02.jpg", focus: "Line art & halftone" },
  { name: "Femi Adeyemi", handle: "@femi.makes", image: "creator-03.jpg", focus: "Graphic streetwear" },
];

export const processSteps = [
  { n: "01", title: "Imagine", line: "Prompt it, sketch it, or both.", image: "process-01-imagine.jpg" },
  { n: "02", title: "Make", line: "Matched to a verified Lagos print house.", image: "process-02-make.jpg" },
  { n: "03", title: "Wear", line: "At your door in about seven days.", image: "process-03-wear.jpg" },
];

export const looks = [
  { file: "look-01.jpg", aspect: "aspect-[4/5]", tag: "@zainab.fits", alt: "Mirror selfie in a bone graphic tee" },
  { file: "look-02.jpg", aspect: "aspect-square", tag: "Balogun Market", alt: "Two friends back to back at a street market in black graphic tees" },
  { file: "look-03.jpg", aspect: "aspect-[3/4]", tag: "@ballislife.lag", alt: "Basketball player resting on a court fence in a stone grey hoodie" },
  { file: "look-04.jpg", aspect: "aspect-square", tag: "Launch night", alt: "Coworkers laughing at a launch party in matching black event tees" },
  { file: "look-05.jpg", aspect: "aspect-[4/5]", tag: "Lekki, 5:40pm", alt: "Woman riding a scooter through traffic in a black tee with a lime graphic" },
  { file: "look-06.jpg", aspect: "aspect-[3/4]", tag: "Fresh cut", alt: "Barber and client in a barbershop, both in bone graphic tees" },
  { file: "look-07.jpg", aspect: "aspect-square", tag: "Elegushi", alt: "Friends on a beach at sunset in oversized black tees" },
  { file: "look-08.jpg", aspect: "aspect-[4/5]", tag: "Class of '26", alt: "Graduate in an open gown over a bone campus tee, family behind" },
];

export const marqueeItems = [
  "New drop every week",
  "Designed by the community",
  "Made in Lagos",
  "One piece minimum",
  "Creators earn on every sale",
  "Delivered in 7 days",
];

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
