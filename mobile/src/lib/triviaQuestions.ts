// Trivia questions for the appraisal loading screen (subset from web app)

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: 'book-1',
    question: 'A first edition Harry Potter book sold at auction for approximately:',
    options: ['$47,000', '$471,000', '$4,700', '$1.2 million'],
    correctIndex: 1,
    explanation: 'A first edition Harry Potter and the Philosopher\'s Stone sold for $471,000! Only 500 copies were printed in the first run.',
  },
  {
    id: 'toy-1',
    question: 'An original 1959 Barbie doll in good condition is worth approximately:',
    options: ['$500-$1,000', '$8,000-$27,000', '$100-$300', '$50,000+'],
    correctIndex: 1,
    explanation: 'The original 1959 Barbie, especially the #1 Ponytail Barbie, sells for $8,000-$27,000 depending on condition!',
  },
  {
    id: 'tech-1',
    question: 'An original Apple-1 computer typically sells for:',
    options: ['$50,000-$100,000', '$400,000-$900,000', '$1-5 million', '$10,000-$50,000'],
    correctIndex: 1,
    explanation: 'Apple-1 computers, with only ~200 ever made, regularly sell for $400,000-$900,000 at auction!',
  },
  {
    id: 'art-1',
    question: 'A painting bought at a thrift store for $4 turned out to be worth:',
    options: ['$400', '$4,000', '$400,000', '$1 million+'],
    correctIndex: 3,
    explanation: 'Multiple thrift store paintings have been discovered to be worth millions - including lost works by famous artists!',
  },
  {
    id: 'coin-1',
    question: 'The most expensive coin ever sold went for approximately:',
    options: ['$1 million', '$5 million', '$10 million', '$19 million'],
    correctIndex: 3,
    explanation: 'A 1933 Double Eagle gold coin sold for $18.9 million in 2021 - the most expensive coin ever!',
  },
  {
    id: 'fashion-2',
    question: 'Original Air Jordan 1 sneakers from 1985 can be worth:',
    options: ['$500-$1,000', '$1,000-$10,000', '$10,000-$50,000', '$100-$500'],
    correctIndex: 2,
    explanation: 'Original 1985 Air Jordan 1s in good condition regularly sell for $10,000-$50,000 to sneaker collectors!',
  },
  {
    id: 'watch-2',
    question: 'The most expensive watch ever sold at auction went for:',
    options: ['$10 million', '$20 million', '$31 million', '$50 million'],
    correctIndex: 2,
    explanation: 'The Patek Philippe Grandmaster Chime sold for $31 million in 2019 - the most expensive watch!',
  },
  {
    id: 'toy-3',
    question: 'Vintage Star Wars figures from the 1970s-80s can be worth up to:',
    options: ['$100-$500', '$1,000-$5,000', '$10,000-$300,000', '$1 million+'],
    correctIndex: 2,
    explanation: 'Rare Star Wars figures, like the vinyl-cape Jawa or rocket-firing Boba Fett prototype, can fetch $10,000-$300,000!',
  },
  {
    id: 'general-1',
    question: 'What percentage of people have at least one $500+ item they don\'t know about?',
    options: ['10%', '30%', '50%', '90%'],
    correctIndex: 3,
    explanation: 'Studies suggest 90% of households have at least one valuable item they don\'t realize is worth $500+!',
  },
  {
    id: 'general-3',
    question: 'Items in original packaging are typically worth how much more?',
    options: ['10-20% more', '50-100% more', '2-5x more', '10x more'],
    correctIndex: 2,
    explanation: 'Items in original, unopened packaging often sell for 2-5x more than the same item without packaging!',
  },
  {
    id: 'music-3',
    question: 'A Stradivarius violin is worth approximately:',
    options: ['$500,000-$1 million', '$2 million-$5 million', '$5 million-$16 million', '$20 million+'],
    correctIndex: 2,
    explanation: 'Stradivarius violins sell for $5-16 million. Only about 650 survive today!',
  },
  {
    id: 'sports-1',
    question: 'A game-worn Michael Jordan jersey sold for:',
    options: ['$500,000', '$1.5 million', '$5 million', '$10.1 million'],
    correctIndex: 3,
    explanation: 'Jordan\'s 1998 "Last Dance" Finals jersey sold for $10.1 million - the most expensive sports memorabilia!',
  },
];

export function getRandomQuestion(excludeIds: string[] = []): TriviaQuestion | null {
  const available = triviaQuestions.filter(q => !excludeIds.includes(q.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}
