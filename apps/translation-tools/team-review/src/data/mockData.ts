import {
  BookResources,
  VerseText,
  TranslationNote,
  TranslationWord,
  TranslationWordLink,
  ReviewComment,
  AlignedWord,
} from '../types';

// Mock Spanish Romans 1:1 with alignment data
const createRomans1_1_ULT = (): VerseText => {
  const words: AlignedWord[] = [
    {
      text: 'Pablo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G3972',
        lemma: 'Παῦλος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Παῦλος',
      },
    },
    {
      text: ',',
      occurrence: 1,
      occurrences: 3,
    },
    {
      text: 'un',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G1401',
        lemma: 'δοῦλος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'δοῦλος',
      },
    },
    {
      text: 'siervo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G1401',
        lemma: 'δοῦλος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'δοῦλος',
      },
    },
    {
      text: 'de',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G5547',
        lemma: 'Χριστός',
        morph: 'Gr,N,,,,,GMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Χριστοῦ',
      },
    },
    {
      text: 'Cristo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G5547',
        lemma: 'Χριστός',
        morph: 'Gr,N,,,,,GMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Χριστοῦ',
      },
    },
    {
      text: 'Jesús',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G2424',
        lemma: 'Ἰησοῦς',
        morph: 'Gr,N,,,,,GMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Ἰησοῦ',
      },
    },
    {
      text: ',',
      occurrence: 2,
      occurrences: 3,
    },
    {
      text: 'llamado',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G2822',
        lemma: 'κλητός',
        morph: 'Gr,NS,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'κλητὸς',
      },
    },
    {
      text: 'apóstol',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G652',
        lemma: 'ἀπόστολος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'ἀπόστολος',
      },
    },
  ];

  return {
    reference: '1:1',
    words,
    rawText: 'Pablo, un siervo de Cristo Jesús, llamado apóstol',
  };
};

const createRomans1_1_UST = (): VerseText => {
  const words: AlignedWord[] = [
    {
      text: 'Yo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G3972',
        lemma: 'Παῦλος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Παῦλος',
      },
    },
    {
      text: 'soy',
      occurrence: 1,
      occurrences: 1,
    },
    {
      text: 'Pablo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G3972',
        lemma: 'Παῦλος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Παῦλος',
      },
    },
    {
      text: '.',
      occurrence: 1,
      occurrences: 2,
    },
    {
      text: 'Sirvo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G1401',
        lemma: 'δοῦλος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'δοῦλος',
      },
    },
    {
      text: 'a',
      occurrence: 1,
      occurrences: 1,
    },
    {
      text: 'Cristo',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G5547',
        lemma: 'Χριστός',
        morph: 'Gr,N,,,,,GMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Χριστοῦ',
      },
    },
    {
      text: 'Jesús',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G2424',
        lemma: 'Ἰησοῦς',
        morph: 'Gr,N,,,,,GMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'Ἰησοῦ',
      },
    },
    {
      text: '.',
      occurrence: 2,
      occurrences: 2,
    },
    {
      text: 'Dios',
      occurrence: 1,
      occurrences: 1,
    },
    {
      text: 'me',
      occurrence: 1,
      occurrences: 1,
    },
    {
      text: 'escogió',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G2822',
        lemma: 'κλητός',
        morph: 'Gr,NS,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'κλητὸς',
      },
    },
    {
      text: 'para',
      occurrence: 1,
      occurrences: 1,
    },
    {
      text: 'ser',
      occurrence: 1,
      occurrences: 1,
    },
    {
      text: 'apóstol',
      occurrence: 1,
      occurrences: 1,
      alignment: {
        strong: 'G652',
        lemma: 'ἀπόστολος',
        morph: 'Gr,N,,,,,NMS,',
        occurrence: 1,
        occurrences: 1,
        content: 'ἀπόστολος',
      },
    },
  ];

  return {
    reference: '1:1',
    words,
    rawText:
      'Yo soy Pablo. Sirvo a Cristo Jesús. Dios me escogió para ser apóstol',
  };
};

// Mock Translation Notes
const mockTranslationNotes: TranslationNote[] = [
  {
    id: 'tn001',
    reference: '1:1',
    quote: 'δοῦλος',
    occurrence: 1,
    note: "Pablo se llama a sí mismo **siervo** de Jesucristo. La palabra griega δοῦλος significa 'esclavo' o 'siervo'. Pablo usa esta palabra para mostrar que pertenece completamente a Cristo y que debe obedecerle en todo. En el contexto del primer siglo, un δοῦλος era alguien que había vendido su libertad para servir a un amo. Pablo usa esta metáfora para expresar su total dedicación a Cristo.",
    supportReference: 'rc://es-419/ta/man/translate/figs-metaphor',
  },
  {
    id: 'tn002',
    reference: '1:1',
    quote: 'κλητὸς ἀπόστολος',
    occurrence: 1,
    note: '**llamado apóstol** - Dios escogió a Pablo para ser apóstol. No fue una decisión humana, sino un llamado divino. La palabra κλητὸς indica que fue llamado por Dios mismo, no por los otros apóstoles o por la iglesia. Este llamado divino le da autoridad para escribir esta carta y enseñar a los creyentes.',
    supportReference: 'rc://es-419/ta/man/translate/figs-activepassive',
  },
  {
    id: 'tn003',
    reference: '1:1',
    quote: 'Παῦλος',
    occurrence: 1,
    note: "**Pablo** - Este es el nombre romano de Saulo de Tarso. Después de su conversión, comenzó a usar su nombre romano cuando ministraba a los gentiles. El nombre Pablo significa 'pequeño' en latín, lo cual puede reflejar su humildad ante Dios.",
    supportReference: 'rc://es-419/ta/man/translate/translate-names',
  },
  {
    id: 'tn004',
    reference: '1:1',
    quote: 'Χριστοῦ Ἰησοῦ',
    occurrence: 1,
    note: "**Cristo Jesús** - Pablo usa el orden 'Cristo Jesús' en lugar de 'Jesucristo' para enfatizar el título mesiánico. Cristo significa 'ungido' y se refiere al Mesías prometido. Al poner 'Cristo' primero, Pablo enfatiza la autoridad divina de Jesús.",
    supportReference: 'rc://es-419/ta/man/translate/figs-explicit',
  },
];

// Mock Translation Words
const mockTranslationWords: TranslationWord[] = [
  {
    id: 'tw001',
    term: 'siervo',
    definition:
      'Un siervo es una persona que trabaja para otra persona, ya sea por su propia voluntad o porque fue forzado a hacerlo.',
    examples: [
      'Pablo se llamó a sí mismo siervo de Cristo Jesús',
      'Los siervos deben obedecer a sus amos',
    ],
  },
  {
    id: 'tw002',
    term: 'apóstol',
    definition:
      'Un apóstol es alguien que es enviado con un mensaje especial. Los doce apóstoles fueron escogidos por Jesús para predicar el evangelio.',
    examples: [
      'Pablo fue llamado a ser apóstol',
      'Los doce apóstoles siguieron a Jesús',
    ],
  },
];

// Mock Translation Word Links
const mockTranslationWordLinks: TranslationWordLink[] = [
  {
    id: 'twl001',
    reference: '1:1',
    originalWords: 'δοῦλος',
    occurrence: 1,
    twLink: 'rc://es-419/tw/dict/bible/other/servant',
  },
  {
    id: 'twl002',
    reference: '1:1',
    originalWords: 'ἀπόστολος',
    occurrence: 1,
    twLink: 'rc://es-419/tw/dict/bible/kt/apostle',
  },
];

// Mock Review Comments
const mockReviewComments: ReviewComment[] = [
  {
    id: 'comment001',
    resourceType: 'ult',
    reference: '1:1',
    textSelection: 'un siervo',
    comment:
      "¿Deberíamos usar 'esclavo' en lugar de 'siervo' para ser más literal al griego δοῦλος? Creo que 'esclavo' transmite mejor la idea de total sumisión que Pablo quiere expresar.",
    author: 'María González',
    timestamp: new Date('2024-01-15T10:30:00'),
    status: 'pending',
  },
  {
    id: 'comment002',
    resourceType: 'ust',
    reference: '1:1',
    textSelection: 'Dios me escogió',
    comment:
      "Esta explicación está muy clara. Me gusta cómo explica el concepto de 'llamado'. Es fácil de entender para lectores nuevos.",
    author: 'Carlos Ruiz',
    timestamp: new Date('2024-01-15T14:20:00'),
    status: 'resolved',
  },
  {
    id: 'comment003',
    resourceType: 'tn',
    reference: '1:1',
    textSelection: 'La palabra griega δοῦλος',
    comment:
      'Excelente explicación del contexto cultural. Esto ayudará mucho a los traductores a entender la profundidad del término.',
    author: 'Ana López',
    timestamp: new Date('2024-01-16T09:15:00'),
    status: 'resolved',
  },
  {
    id: 'comment004',
    resourceType: 'ult',
    reference: '1:1',
    textSelection: 'llamado apóstol',
    comment:
      "La traducción 'llamado apóstol' es buena, pero ¿deberíamos considerar 'apóstol por llamamiento' para ser más claro?",
    author: 'Roberto Martín',
    timestamp: new Date('2024-01-16T11:45:00'),
    status: 'pending',
  },
  {
    id: 'comment005',
    resourceType: 'ust',
    reference: '1:1',
    textSelection: 'para ser apóstol',
    comment:
      'Me parece que esta explicación simplifica bien el concepto sin perder el significado teológico importante.',
    author: 'Elena Vargas',
    timestamp: new Date('2024-01-16T15:20:00'),
    status: 'resolved',
  },
  {
    id: 'comment006',
    resourceType: 'tn',
    reference: '1:1',
    textSelection: 'Cristo Jesús',
    comment:
      "Sería útil explicar por qué Pablo usa 'Cristo Jesús' en lugar de 'Jesucristo' en esta carta. ¿Hay algún significado especial?",
    author: 'Miguel Santos',
    timestamp: new Date('2024-01-17T08:30:00'),
    status: 'pending',
  },
];

// Export mock data
export const mockBookResources: BookResources = {
  ult: [createRomans1_1_ULT()],
  ust: [createRomans1_1_UST()],
  tn: mockTranslationNotes,
  tw: mockTranslationWords,
  twl: mockTranslationWordLinks,
  comments: mockReviewComments,
};

// Helper function to get verse by reference
export const getVerseByReference = (
  verses: VerseText[],
  reference: string
): VerseText | undefined => {
  return verses.find((verse) => verse.reference === reference);
};

// Helper function to get notes for a verse
export const getNotesForVerse = (
  notes: TranslationNote[],
  reference: string
): TranslationNote[] => {
  return notes.filter((note) => note.reference === reference);
};

// Helper function to get comments for a verse
export const getCommentsForVerse = (
  comments: ReviewComment[],
  reference: string
): ReviewComment[] => {
  return comments.filter((comment) => comment.reference === reference);
};
