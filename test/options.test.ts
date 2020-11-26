import { Text } from "../src/index";

describe.each`
  description         | word             | hasQamQat | hasQamets | qamQatOpt
  ${"simple nominal"} | ${"חָפְנִי֙"}    | ${false}  | ${true}   | ${false}
  ${"simple nominal"} | ${"חָפְנִי֙"}    | ${true}   | ${false}  | ${true}
  ${"kol with mqqef"} | ${"כָּל־דְּבַר"} | ${true}   | ${false}  | ${true}
  ${"kol with mqqef"} | ${"כָּל־דְּבַר"} | ${false}  | ${true}   | ${false}
`("qametsQatan:", ({ description, word, hasQamQat, hasQamets, qamQatOpt }) => {
  const text = new Text(word, { qametsQatan: qamQatOpt });
  const sanitized = text.text;
  const qQRegx = /\u{05C7}/u;
  const qamRegx = /\u{05B8}/u;
  describe(`pattern: ${description}, qametsQatan: ${qamQatOpt}`, () => {
    test(`Has Qamets Qatan should equal ${hasQamQat}`, () => {
      expect(qQRegx.test(sanitized)).toEqual(hasQamQat);
    });

    test(`Has Qamets should equal ${hasQamets}`, () => {
      expect(qamRegx.test(sanitized)).toEqual(hasQamets);
    });
  });
});

describe.each`
  description               | word            | syllables                     | sqnmlvyOpt
  ${"wayyiqtol, no metheg"} | ${"וַיְצַחֵק֙"} | ${["וַיְ", "צַ", "חֵק֙"]}     | ${false}
  ${"wayyiqtol, no metheg"} | ${"וַיְצַחֵק֙"} | ${["וַ", "יְ", "צַ", "חֵק֙"]} | ${true}
  ${"wayyiqtol,  metheg"}   | ${"וַֽיְהִי֙"}  | ${["וַֽ", "יְ", "הִי֙"]}      | ${false}
  ${"wayyiqtol,  metheg"}   | ${"וַֽיְהִי֙"}  | ${["וַֽ", "יְ", "הִי֙"]}      | ${true}
`("sqnmlvy:", ({ description, word, syllables, sqnmlvyOpt }) => {
  const text = new Text(word, { sqnmlvy: sqnmlvyOpt });
  const sylText = text.syllables.map((syl) => syl.text);
  describe(description, () => {
    test(`sqnlvy is ${sqnmlvyOpt}`, () => {
      expect(sylText).toEqual(syllables);
    });
  });
});
