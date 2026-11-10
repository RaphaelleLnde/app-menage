// Commentaire d'évaluation du voyageur, proposé à partir de l'état des lieux du ménage de départ.
// L'hôte peut le modifier avant de le copier dans Airbnb (ou Booking).

const TEXTS = {
  fr: {
    propre: "Ce fut un plaisir d'accueillir ces voyageurs au Central. Le logement a été laissé propre et bien rangé, et le règlement intérieur a été parfaitement respecté. Je les recommande vivement !",
    ras: "Séjour sans souci au Central. Le logement a été rendu en bon état et le règlement intérieur a été respecté. Je recommande ces voyageurs.",
    sale: "Merci pour ce séjour au Central. Le logement a malheureusement été rendu moins propre que ce que l'on peut attendre, ce qui a demandé un ménage plus long que d'habitude. Pour le reste, le séjour s'est bien passé.",
    tres_sale: "Le logement a été rendu dans un état de saleté important, qui a nécessité un nettoyage approfondi. Je ne peux malheureusement pas recommander ces voyageurs.",
    closing: 'Au plaisir de vous accueillir à nouveau !',
    private: (n) => `Merci pour votre séjour au Central. Pour information, voici ce que nous avons constaté après votre départ : ${n}`,
  },
  en: {
    propre: 'It was a pleasure to host these guests at Le Central. They left the apartment clean and tidy and fully respected the house rules. Highly recommended!',
    ras: 'A smooth stay at Le Central. The apartment was left in good condition and the house rules were respected. I recommend these guests.',
    sale: 'Thank you for staying at Le Central. Unfortunately the apartment was left less clean than expected, which required a longer cleaning than usual. Otherwise the stay went well.',
    tres_sale: 'The apartment was left very dirty and required a deep cleaning. Unfortunately, I cannot recommend these guests.',
    closing: 'We look forward to welcoming you again!',
    private: (n) => `Thank you for staying at Le Central. For your information, this is what we noticed after your departure: ${n}`,
  },
};

// Notes conseillées (Airbnb : propreté, communication, respect du règlement)
const STARS = { propre: 5, ras: 5, sale: 3, tres_sale: 1 };

export function buildReview(stay, lang = 'fr') {
  const t = TEXTS[lang] || TEXTS.fr;
  const state = stay.arrival_state;
  if (!state || !t[state]) return null;
  const note = (stay.arrival_note || '').trim();
  const good = state === 'propre' || state === 'ras';
  return {
    text: good ? `${t[state]} ${t.closing}` : t[state],  // « Au plaisir… » seulement si le logement a été rendu correct ou mieux
    privateNote: note ? t.private(note) : '',
    cleanliness: STARS[state],
    recommend: good,  // recommandation seulement si le séjour s'est bien passé
    allFive: good,    // séjour qui s'est bien passé : 5 étoiles partout
  };
}
