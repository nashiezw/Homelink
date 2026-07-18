/** Local roommate imagery. Keep listing paths unique so cards do not repeat visuals. */
export const roommateMedia = {
  hero: "/images/roommates/room-share-hero-photo.jpg",
  heroAccent: "/images/roommates-hero.webp",
  problem: "/images/roommates/cover-testimonial-rudo.jpg",
  solution: "/images/roommates/room-share-solution-photo.jpg",
  trust: "/images/roommates/room-share-trust-photo.jpg",
  communityBg: "/images/roommates/cover-testimonial-blessing.jpg",
  cta: "/images/roommates/room-share-cta-photo.jpg",
  cottage: "/images/roommates/photo-cottage-avondale.jpg",
  room: "/images/roommates/photo-bedroom-senga.jpg",
  flat: "/images/kwekwe-flat.webp",
  room2: "/images/roommates/photo-lounge-belvedere.jpg",
  flat2: "/images/roommates/photo-flat-borrowdale.jpg",
  room3: "/images/roommates/photo-room-mount-pleasant.jpg",
  room4: "/images/roommates/photo-room-avondale.jpg",
  cottage2: "/images/roommates/photo-cottage-kumalo.jpg",
  shared: "/images/roommates/photo-kitchen-ridgemont.jpg",
  room5: "/images/roommates/photo-house-bulawayo.jpg",
  room6: "/images/roommates/photo-kitchen-msasa.jpg",
  room7: "/images/gweru-room-courtyard.webp",
  flat3: "/images/roommates/photo-flat-avondale-west.jpg",
  land: "/images/roommates/photo-land-mutare.jpg",
  office: "/images/roommates/photo-office-harare.jpg",
  lodge: "/images/roommates/photo-lodge-vicfalls.jpg",
} as const;

export const roommatePortraits = {
  member1: "/images/roommates/portrait-rudo.jpg",
  member2: "/images/roommates/portrait-taku.jpg",
  member3: "/images/roommates/portrait-noma.jpg",
  member4: "/images/roommates/portrait-chipo.jpg",
  member5: "/images/roommates/portrait-farai.jpg",
  rudo: "/images/roommates/portrait-rudo.jpg",
  taku: "/images/roommates/portrait-taku.jpg",
  noma: "/images/roommates/portrait-noma.jpg",
  chipo: "/images/roommates/portrait-chipo.jpg",
  farai: "/images/roommates/portrait-farai.jpg",
  grace: "/images/roommates/portrait-grace.jpg",
  tendai: "/images/roommates/portrait-tendai.jpg",
  blessing: "/images/roommates/portrait-blessing.jpg",
  member: "/images/roommates/portrait-member.jpg",
} as const;

export const seekerCoverPhotos = {
  professional: "/images/roommates/cover-professional.jpg",
  student: "/images/roommates/cover-student.jpg",
  hybrid: "/images/roommates/cover-hybrid.jpg",
  nurse: "/images/roommates/cover-nurse.jpg",
  intern: "/images/roommates/cover-intern.jpg",
  accountant: "/images/roommates/cover-accountant.jpg",
} as const;

export const testimonialPhotos = [
  "/images/roommates/cover-testimonial-tendai.jpg",
  "/images/roommates/cover-testimonial-rudo.jpg",
  "/images/roommates/cover-testimonial-blessing.jpg",
] as const;

export const heroMemberStack = [
  roommatePortraits.member1,
  roommatePortraits.member2,
  roommatePortraits.member3,
  roommatePortraits.member4,
  roommatePortraits.member5,
] as const;

export const heroCollage = [
  "/images/roommates/photo-cottage-avondale.jpg",
  "/images/roommates/photo-bedroom-senga.jpg",
  "/images/roommates/photo-flat-borrowdale.jpg",
] as const;

export const audienceImages = [
  "/images/roommates/photo-cottage-avondale.jpg",
  "/images/roommates/photo-room-avondale.jpg",
  "/images/roommates/cover-testimonial-blessing.jpg",
] as const;

export const marqueePhotos = [
  { name: "Avondale", photo: "/images/roommates/cover-testimonial-rudo.jpg" },
  { name: "Senga", photo: "/images/gweru-room-courtyard.webp" },
  { name: "Hillside", photo: "/images/bulawayo-family-house.webp" },
  { name: "Newtown", photo: "/images/kwekwe-flat.webp" },
] as const;

export const stepPhotos = [
  "/images/roommates/cover-testimonial-tendai.jpg",
  "/images/roommates/photo-kitchen-kwekwe.jpg",
  "/images/roommates/photo-office-harare.jpg",
  "/images/roommates/photo-land-mutare.jpg",
  "/images/roommates/photo-victoria-falls.jpg",
] as const;
