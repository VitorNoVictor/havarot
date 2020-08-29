import { sequence } from "./sequence";

const nominalSnippets = [
  "אָבְדַן",
  "אָבְנ",
  "אָזְנ",
  "אָכְל",
  "אָנִיּ",
  "אָפְנ",
  "אָרְח",
  "אָרְכּ",
  "אָשְׁר",
  "בָאְשׁ",
  "בָשְׁתּ",
  "בָּשְׁתּ",
  "גָבְה",
  "גָּבְה",
  "גָדְל",
  "גָּדְל",
  "גָרְנ",
  "גָּרְנ",
  "דָּרְבָֽן",
  "חָדְשׁ",
  "חָכְמ",
  "חָלְיֽוֹ",
  "חָלְיֹו",
  "חָפְנ",
  "חָפְשִׁי",
  "חָפְשִׁית",
  "חָק־",
  "חָרְב",
  "חָרְנֶפֶר",
  "חָרְפּ",
  "חָשְׁכּ",
  "$יָמִים^",
  "יָפְי",
  "יָשְׁר",
  "כָל־",
  "כָּל־",
  "מָר־",
  "מָרְדְּכַי",
  "מָתְנ",
  "סָלְתּ",
  "עָזּ",
  "עָמְרִי",
  "עָנְי",
  "עָפְנִי",
  "עָפְר",
  "עָרְל",
  "עָרְפּ",
  "עָשְׁר",
  "צָרְכּ",
  "קָדְק",
  "קָדְשׁ",
  "קָרְבּ",
  "קָרְח",
  "רָב־",
  "רָגְז",
  "רָחְבּ",
  "שָׁרְשׁ",
  "שָׁרָשׁ",
  "תָּכְנִית",
  "תָם־",
  "תָּם־"
];

const verbalSnippets = [
  "חָנֵּנִי",
  "וַיָּמָת",
  "וַיָּנָס",
  "וַיָּקָם",
  "וַיָּרָם",
  "וַיָּשָׁב",
  "וַתָּמָת",
  "וַתָּקָם",
  "וַתָּשָׁב"
];

const sequenceSnippets = (arr: string[]) => {
  return arr.map((snippet) => {
    const text = snippet.normalize("NFKD");
    const sequencedChar = sequence(text).reduce((a, c) => a.concat(c), []);
    return sequencedChar.reduce((a, c) => a + c.text, "");
  });
};

const nominalRegx = sequenceSnippets(nominalSnippets);
const verbalRegx = sequenceSnippets(verbalSnippets);

export const convertsQametsQatan = (word: string) => {
  const qametsReg = /\u{05B8}/u;
  const hatefQamRef = /\u{05B3}/u;

  // if no qamets, return
  if (!qametsReg.test(word)) {
    return word;
  }

  // check for hatef qamets followed by qamets pattern
  if (hatefQamRef.test(word)) {
    let hatefPos = word.indexOf("\u{05B3}");
    let qamPos = word.indexOf("\u{05B8}");
    if (qamPos != -1 && qamPos < hatefPos) {
      return word.substring(0, qamPos) + "\u{05C7}" + word.substring(qamPos + 1);
    }
  }

  // https://stackoverflow.com/questions/4590298/how-to-ignore-whitespace-in-a-regular-expression-subject-string
  const taamei = /[\u{0591}-\u{05AF}\u{05BF}\u{05C0}\u{05C3}-\u{05C6}\u{05F3}\u{05F4}]/gu;
  let noTaamei = "";
  let charPos = [];

  // builds a string with no taamei, while keeping track of the index
  for (const [index, element] of [...word].entries()) {
    if (!taamei.test(element)) {
      noTaamei += element;
      charPos.push(index);
    }
  }

  // check if in verbal list (more frequent)
  for (let index = 0; index < verbalRegx.length; index++) {
    const regEx = new RegExp(verbalRegx[index]);
    let match = noTaamei.match(regEx);

    if (!match) {
      continue;
    } else {
      const lastQam = word.lastIndexOf("\u{05B8}");
      return word.substring(0, lastQam) + "\u{05C7}" + word.substring(lastQam + 1);
    }
  }
  // check if in nominal list
  for (let index = 0; index < nominalRegx.length; index++) {
    const regEx = new RegExp(nominalRegx[index]);
    let match = noTaamei.match(regEx);

    if (!match) {
      continue;
    } else {
      const start = charPos[match.index!];
      const end = charPos[match[0].length] + start;
      const matched = word.substring(start, end);
      const withQQatan = matched.split(qametsReg).join("\u{05C7}");
      word = word.split(matched).join(withQQatan);
      return word;
    }
  }

  return word;
};
