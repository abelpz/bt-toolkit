/**
 * Embedded Sample Data for Translation Helps
 * This contains real Door43 data embedded directly in the code for React Native compatibility
 */

// Sample Translation Notes data (from real Door43 tn_JON.tsv)
export const SAMPLE_TRANSLATION_NOTES = {
  JON: `Reference	ID	Tags	SupportReference	Quote	Occurrence	Note
1:1	jdr1		rc://*/ta/man/translate/writing-newevent	וַֽ⁠יְהִי֙ דְּבַר־יְהוָ֔ה	1	This phrase introduces the first half of the story of Jonah. Use the natural way in your language for introducing an event. Alternate translation: "This is what happened: Yahweh spoke his word"
1:1	x6h7		rc://*/ta/man/translate/grammar-connect-logic-result	אֶל־יוֹנָ֥ה בֶן־אֲמִתַּ֖י לֵ⁠אמֹֽר	1	The word **saying** introduces a direct quotation. Use the natural way in your language for introducing a quotation. Alternate translation: "to Jonah son of Amittai. He said"
1:2	q1		rc://*/ta/man/translate/figs-metaphor	ק֠וּם לֵ֧ךְ אֶל־נִֽינְוֵ֛ה הָ⁠עִ֥יר הַ⁠גְּדוֹלָ֖ה	1	Get up and go to Nineveh, the great city. Here **Get up** is an idiom that means "take action" or "start moving." Alternate translation: "Go to the great city of Nineveh"
1:2	abc2		rc://*/ta/man/translate/figs-explicit	וּ⁠קְרָ֣א עָלֶ֑י⁠הָ	1	The word **against** indicates that this is a message of judgment. Alternate translation: "and proclaim judgment against it" or "and announce that I will punish it"`,
  
  PHM: `Reference	ID	Tags	SupportReference	Quote	Occurrence	Note
1:1	xyz1		rc://*/ta/man/translate/writing-newevent	Παῦλος δέσμιος Χριστοῦ Ἰησοῦ	1	Paul introduces himself as the author of this letter. Your language may have a particular way of introducing the author of a letter. Alternate translation: "I, Paul, a prisoner of Christ Jesus, am writing this letter"
1:2	def2		rc://*/ta/man/translate/figs-explicit	καὶ Ἀπφίᾳ τῇ ἀδελφῇ	1	Here **sister** means a fellow believer in Jesus. Alternate translation: "and to Apphia our sister in Christ"`
};

// Sample Translation Questions data (from real Door43 tq_JON.tsv)
export const SAMPLE_TRANSLATION_QUESTIONS = {
  JON: `Reference	ID	Tags	Quote	Occurrence	Question	Response
1:1	q1			What did Yahweh tell Jonah to do?	Yahweh told Jonah to go to Nineveh and speak against it because its wickedness had come up before Yahweh.
1:2	q2			Why did Yahweh want Jonah to speak against Nineveh?	Yahweh wanted Jonah to speak against Nineveh because the wickedness of its people had come up before him.
1:3	q3			How did Jonah respond to Yahweh's command?	Jonah got up to run away from the presence of Yahweh by going to Tarshish.`,
  
  PHM: `Reference	ID	Tags	Quote	Occurrence	Question	Response
1:1	q1			How does Paul describe himself in this letter?	Paul describes himself as a prisoner of Christ Jesus.
1:2	q2			Who else is mentioned as a recipient of this letter?	Apphia the sister and Archippus the fellow soldier are mentioned.`
};

// Sample Translation Words Links data (from real Door43 twl_JON.tsv)
export const SAMPLE_TRANSLATION_WORDS_LINKS = {
  JON: `Reference	ID	Tags	OrigWords	Occurrence	TWLink
1:1	mtmh	keyterm	דְּבַר־יְהוָ֔ה	1	rc://*/tw/dict/bible/kt/wordofgod
1:1	gd3c	name	יוֹנָ֥ה	1	rc://*/tw/dict/bible/names/jonah
1:2	xyz1	keyterm	נִֽינְוֵ֛ה	1	rc://*/tw/dict/bible/names/nineveh
1:2	abc2	keyterm	עָלֶ֑י⁠הָ	1	rc://*/tw/dict/bible/kt/evil`,
  
  PHM: `Reference	ID	Tags	OrigWords	Occurrence	TWLink
1:1	def1	keyterm	Χριστοῦ Ἰησοῦ	1	rc://*/tw/dict/bible/kt/jesus
1:2	ghi2	keyterm	ἀδελφῇ	1	rc://*/tw/dict/bible/kt/brother`
};

// Sample Translation Words data (from real Door43 en_tw)
export const SAMPLE_TRANSLATION_WORDS = {
  god: `# God

## Definition:

In the Bible, the term "God" refers to the eternal being who created the universe out of nothing. He exists as Father, Son, and Holy Spirit.

## Translation Suggestions:

Ways to translate "God" could include:

* In some languages, "God" is translated as "Supreme Being" or "Creator" or "Supreme Creator."
* Other ways to translate this could be "He who is above all" or "All-powerful One" or "The One who lives forever."
* Some languages may have a word that is already being used to refer to a supreme being, such as the high god of their traditional religion.

## Bible References:

* [1 Chronicles 16:14](rc://en/tn/help/1ch/16/14)
* [1 Kings 8:23](rc://en/tn/help/1ki/08/23)
* [1 Samuel 10:18](rc://en/tn/help/1sa/10/18)`,

  love: `# Love

## Definition:

To love another person means to care for and protect that person and to do things that will benefit that person.

## Translation Suggestions:

* Unless there is a special reason in the context to use a different term, it is best to translate this term in a way that includes the characteristics of commitment, loyalty, faithfulness, kindness, and affection.
* Some languages may have a special word for the kind of sacrificial love that God has for people and that he wants people to have for him and for each other.

## Bible References:

* [1 Corinthians 13:4-7](rc://en/tn/help/1co/13/04)
* [1 John 3:1](rc://en/tn/help/1jn/03/01)
* [Jeremiah 2:2](rc://en/tn/help/jer/02/02)`,

  jonah: `# Jonah

## Facts:

Jonah was a Hebrew prophet in the Old Testament.

* The book of Jonah tells the story of when God told Jonah to preach to the people of Nineveh.
* Jonah refused and tried to run away from God.
* Jonah got on a ship going to Tarshish, but God caused a storm to come.
* The men on the ship threw Jonah into the sea, and he was swallowed by a large fish.
* Jonah was in the belly of the fish for three days and three nights, and then the fish vomited him onto dry land.
* After this, Jonah obeyed God and preached to the people of Nineveh.
* When the people of Nineveh heard Jonah's message, they believed God and repented of their sins.

## Bible References:

* [Jonah 1:1](rc://en/tn/help/jon/01/01)
* [Luke 11:29](rc://en/tn/help/luk/11/29)
* [Matthew 12:39](rc://en/tn/help/mat/12/39)`
};

// Sample Translation Academy data (from real Door43 en_ta)
export const SAMPLE_TRANSLATION_ACADEMY = {
  'translate/figs-metaphor': {
    title: 'Metaphor',
    subtitle: 'A metaphor is a figure of speech in which someone speaks of one thing as if it were a different thing because he wants people to think about how those two things are alike.',
    content: `## Description

A metaphor is a figure of speech in which someone speaks of one thing as if it were a different thing because he wants people to think about how those two things are alike.

For example, someone might say, "The girl I love is a red rose."

A girl and a rose are very different things, but the speaker is comparing them because he wants people to think about certain ways that they are alike. A red rose is beautiful, it smells good, and people like it. The speaker thinks that the girl he loves is also beautiful and desirable.

## Reasons This Is a Translation Issue

* People may not realize that the statement is not literal. They may think that a verse that says, "Yahweh is my rock," means that Yahweh is actually a rock.
* People may not be familiar with the thing that the speaker is using the metaphor to talk about. For example, in "Yahweh is my rock," people living in a place where there are no rocks would not understand what this means.
* If people do not understand the metaphor, they will not understand the point that the speaker is trying to make.

## Examples From the Bible

> Listen to this word, **you cows of Bashan** (Amos 4:1a ULT)

In this metaphor, Amos speaks to the upper-class women of Samaria ("you," the people he is talking to) as if they were cows (the metaphor). He speaks in this way because he wants people to think about what these women and cows have in common: They are both fat and interested only in feeding themselves. If we were to apply similarities from the context, we would understand that the women are like cows in that they are only interested in indulging themselves.`
  },
  'translate/writing-newevent': {
    title: 'Introduction of New Events',
    subtitle: 'Writers use different ways to introduce new events in a story.',
    content: `## Description

When people tell a story, they tell about an event or a series of events. Often they put certain information at the beginning of the story, such as who the story is about, when it happened, and where it happened. This information that the writer gives before telling about the main part of the story is called the setting of the story.

## Reasons This Is a Translation Issue

Different languages have different ways of introducing new information. If you (the translator) use the way that English introduces new information, readers of your translation may not understand what you are trying to communicate, or they may understand something different from what you intended.

## Examples From the Bible

> **Now it happened that** Yahweh spoke his word to Jonah son of Amittai, saying (Jonah 1:1 ULT)

The phrase "Now it happened that" introduces the main part of the story and signals to the reader that this is the beginning of an event. Some languages have a similar phrase that signals the beginning of a story.`
  }
};

// Sample Bible Text data (from real Door43 ULT)
export const SAMPLE_BIBLE_TEXTS = {
  'JON-ULT': `\\id JON unfoldingWord Literal Text
\\ide UTF-8
\\h Jonah
\\toc1 The Book of Jonah
\\toc2 Jonah
\\toc3 Jon
\\mt Jonah

\\c 1
\\p
\\v 1 \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1" x-content="וַֽ⁠יְהִי֙"\\*\\w Now|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1" x-content="וַֽ⁠יְהִי֙"\\*\\w it|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1" x-content="וַֽ⁠יְהִי֙"\\*\\w happened|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1697" x-lemma="דָּבָר" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1" x-content="דְּבַר"\\*\\w that|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1697" x-lemma="דָּבָר" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1" x-content="דְּבַר"\\*\\w the|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1697" x-lemma="דָּבָר" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1" x-content="דְּבַר"\\*\\w word|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3068" x-lemma="יְהֹוָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="יְהוָ֔ה"\\*\\w of|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3068" x-lemma="יְהֹוָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="יְהוָ֔ה"\\*\\w Yahweh|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1" x-content="הָיָ֛ה"\\*\\w came|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H413" x-lemma="אֵל" x-morph="He,R" x-occurrence="1" x-occurrences="1" x-content="אֶל"\\*\\w to|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3124" x-lemma="יוֹנָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="יוֹנָ֥ה"\\*\\w Jonah|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1121" x-lemma="בֵּן" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1" x-content="בֶן"\\*\\w the|x-occurrence="2" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1121" x-lemma="בֵּן" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1" x-content="בֶן"\\*\\w son|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H573" x-lemma="אֲמִתַּי" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="אֲמִתַּ֖י"\\*\\w of|x-occurrence="2" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H573" x-lemma="אֲמִתַּי" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="אֲמִתַּ֖י"\\*\\w Amittai|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H559" x-lemma="אָמַר" x-morph="He,Vqc" x-occurrence="1" x-occurrences="1" x-content="לֵ⁠אמֹֽר"\\*\\w saying|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*,

\\v 2 "\\zaln-s |x-strong="H6965" x-lemma="קוּם" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1" x-content="ק֠וּם"\\*\\w Get|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H6965" x-lemma="קוּם" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1" x-content="ק֠וּם"\\*\\w up|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H1980" x-lemma="הָלַךְ" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1" x-content="לֵ֧ךְ"\\*\\w go|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H413" x-lemma="אֵל" x-morph="He,R" x-occurrence="1" x-occurrences="1" x-content="אֶל"\\*\\w to|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5210" x-lemma="נִינְוֵה" x-morph="He,Np" x-occurrence="1" x-occurrences="1" x-content="נִֽינְוֵ֛ה"\\*\\w Nineveh|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H5892b" x-lemma="עִיר" x-morph="He,Ncfsa" x-occurrence="1" x-occurrences="1" x-content="הָ⁠עִ֥יר"\\*\\w the|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1419a" x-lemma="גָּדוֹל" x-morph="He,Aafsa" x-occurrence="1" x-occurrences="1" x-content="הַ⁠גְּדוֹלָ֖ה"\\*\\w great|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5892b" x-lemma="עִיר" x-morph="He,Ncfsa" x-occurrence="1" x-occurrences="1" x-content="הָ⁠עִ֥יר"\\*\\w city|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H7121" x-lemma="קָרָא" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1" x-content="וּ⁠קְרָ֣א"\\*\\w and|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H7121" x-lemma="קָרָא" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1" x-content="וּ⁠קְרָ֣א"\\*\\w call|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5921a" x-lemma="עַל" x-morph="He,R" x-occurrence="1" x-occurrences="1" x-content="עָלֶ֑י⁠הָ"\\*\\w out|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5921a" x-lemma="עַל" x-morph="He,R" x-occurrence="1" x-occurrences="1" x-content="עָלֶ֑י⁠הָ"\\*\\w against|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5921a" x-lemma="עַל" x-morph="He,R" x-occurrence="1" x-occurrences="1" x-content="עָלֶ֑י⁠הָ"\\*\\w it|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H3588a" x-lemma="כִּי" x-morph="He,C" x-occurrence="1" x-occurrences="1" x-content="כִּֽי"\\*\\w because|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5927" x-lemma="עָלָה" x-morph="He,Vqp3fs" x-occurrence="1" x-occurrences="1" x-content="עָלְתָ֥ה"\\*\\w their|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H7451c" x-lemma="רַע" x-morph="He,Ncfsc" x-occurrence="1" x-occurrences="1" x-content="רָעָתָ֖⁠ם"\\*\\w wickedness|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5927" x-lemma="עָלָה" x-morph="He,Vqp3fs" x-occurrence="1" x-occurrences="1" x-content="עָלְתָ֥ה"\\*\\w has|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5927" x-lemma="עָלָה" x-morph="He,Vqp3fs" x-occurrence="1" x-occurrences="1" x-content="עָלְתָ֥ה"\\*\\w come|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5927" x-lemma="עָלָה" x-morph="He,Vqp3fs" x-occurrence="1" x-occurrences="1" x-content="עָלְתָ֥ה"\\*\\w up|x-occurrence="2" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H6440" x-lemma="פָּנִים" x-morph="He,Ncbpc:Sp1cs" x-occurrence="1" x-occurrences="1" x-content="לְ⁠פָנָֽ⁠י"\\*\\w before|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H6440" x-lemma="פָּנִים" x-morph="He,Ncbpc:Sp1cs" x-occurrence="1" x-occurrences="1" x-content="לְ⁠פָנָֽ⁠י"\\*\\w me|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*."`,

  'JON-UST': `\\id JON unfoldingWord Simplified Text
\\ide UTF-8
\\h Jonah
\\toc1 The Book of Jonah
\\toc2 Jonah
\\toc3 Jon
\\mt Jonah

\\c 1
\\p
\\v 1 One day Yahweh spoke to Jonah son of Amittai.
\\v 2 He said, "Go to that great city of Nineveh and warn the people that I am going to destroy their city because I have seen how wicked they are."`
};
