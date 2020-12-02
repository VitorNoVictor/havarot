import { Cluster } from "../cluster";
import { Syllable } from "../syllable";
import { SylOpts } from "../text";

/**
 * @description determines the Cluster[] that will become the final Syllable
 */
const groupFinal = (arr: Cluster[]): (Syllable | Cluster)[] => {
  // grouping the final first helps to avoid issues with final kafs/tavs
  const len = arr.length;
  let i = 0;
  const syl: Cluster[] = [];
  let result: (Syllable | Cluster)[] = [];
  let vowelPresent = false;
  let isClosed = false;

  // get final cluster and push to syl
  const finalCluster = arr[i];
  syl.unshift(finalCluster);

  if (finalCluster.hasVowel) {
    // check if finalCluster is syllable
    vowelPresent = true;
    i++;
  } else if (finalCluster.isShureq) {
    // check if final cluster isShureq and get preceding Cluster
    i++;
    if (i <= len) {
      syl.unshift(arr[i]);
    }
    vowelPresent = true;
    i++;
  } else {
    isClosed = !finalCluster.isMater;
    i++;
  }

  while (!vowelPresent) {
    const nxt = arr[i];
    const curr = nxt ? nxt : false;
    if (!curr) {
      break;
    }
    syl.unshift(curr);
    if (curr.isShureq) {
      i++;
      syl.unshift(arr[i]);
      vowelPresent = true;
    } else {
      const clusterHasVowel = "hasVowel" in curr ? curr.hasVowel : true;
      vowelPresent = clusterHasVowel || curr.isShureq;
    }
    i++;
    if (i > len) {
      break;
    }
  }

  const finalSyllable = new Syllable(syl, { isClosed });
  const remainder = arr.slice(i);
  result = remainder.length ? remainder : [];
  result.unshift(finalSyllable);

  return result;
};

/**
 * @description groups shewas either by themselves or with preceding short vowel
 */
const groupShewas = (arr: (Syllable | Cluster)[], options: SylOpts): (Syllable | Cluster)[] => {
  let shewaPresent = false;
  let syl: Cluster[] = [];
  const result: (Syllable | Cluster)[] = [];
  const len = arr.length;

  for (let index = 0; index < len; index++) {
    const cluster = arr[index];

    // skip if already a syllable
    if (cluster instanceof Syllable) {
      result.push(cluster);
      continue;
    }

    const clusterHasShewa = cluster.hasShewa;
    if (!shewaPresent && clusterHasShewa) {
      shewaPresent = true;
      syl.unshift(cluster);
      continue;
    }

    if (shewaPresent && clusterHasShewa) {
      const syllable = new Syllable(syl);
      result.push(syllable);
      syl = [];
      syl.unshift(cluster);
      continue;
    }

    if (shewaPresent && cluster.hasShortVowel) {
      if (cluster.hasMetheg) {
        result.push(new Syllable(syl));
        syl = [];
        syl.unshift(cluster);
        continue;
      }
      const dageshRegx = /\u{05BC}/u;
      const prev = syl[0].text;
      const sqenemlevy = /[שסצקנמלוי]/;
      const wawConsecutive = /וַ/;
      // check if there is a doubling dagesh
      if (dageshRegx.test(prev)) {
        result.push(new Syllable(syl));
        syl = [];
      }
      // check for waw-consecutive w/ sqenemlevy letter
      else if (options.sqnmlvy && sqenemlevy.test(prev) && wawConsecutive.test(cluster.text)) {
        result.push(new Syllable(syl));
        result.push(new Syllable([cluster]));
        syl = [];
        shewaPresent = false;
        continue;
      }
      syl.unshift(cluster);
      const syllable = new Syllable(syl, { isClosed: true });
      result.push(syllable);
      syl = [];
      shewaPresent = false;
      continue;
    }

    if (shewaPresent && cluster.hasLongVowel) {
      if (options.longVowels) {
        const syllable = new Syllable(syl);
        result.push(syllable);
        result.push(cluster);
        syl = [];
        shewaPresent = false;
      } else {
        syl.unshift(cluster);
        const syllable = new Syllable(syl, { isClosed: true });
        result.push(syllable);
        syl = [];
        shewaPresent = false;
      }
      continue;
    }

    if (shewaPresent && cluster.isShureq) {
      if (!options.wawShureq && !cluster.hasMetheg && len - 1 === index) {
        syl.unshift(cluster);
        const syllable = new Syllable(syl, { isClosed: true });
        result.push(syllable);
        syl = [];
      } else {
        const syllable = new Syllable(syl);
        result.push(syllable);
        result.push(cluster);
        syl = [];
        shewaPresent = false;
      }
      continue;
    }

    if (shewaPresent && cluster.isMater) {
      const syllable = new Syllable(syl);
      result.push(syllable);
      result.push(cluster);
      syl = [];
      shewaPresent = false;
      continue;
    }

    result.push(cluster);
  }

  if (syl.length) {
    const syllable = new Syllable(syl);
    result.push(syllable);
  }

  return result;
};

/**
 * @description groups non-final maters with preceding cluster
 */
const groupMaters = (arr: (Syllable | Cluster)[]): (Syllable | Cluster)[] => {
  const len = arr.length;
  let syl: Cluster[] = [];
  const result: (Syllable | Cluster)[] = [];

  for (let index = 0; index < len; index++) {
    const cluster = arr[index];

    if (cluster instanceof Syllable) {
      result.push(cluster);
      continue;
    }

    if (cluster.isMater) {
      syl.unshift(cluster);
      const nxt = arr[index + 1];

      if (nxt instanceof Syllable) {
        throw new Error("Syllable should not precede a Cluster with a Mater");
      }

      syl.unshift(nxt);
      const syllable = new Syllable(syl);
      result.push(syllable);
      syl = [];
      index++;
    } else {
      result.push(cluster);
    }
  }

  return result;
};

/**
 * @description groups non-final shureqs with preceding cluster
 */
const groupShureqs = (arr: (Syllable | Cluster)[]): (Syllable | Cluster)[] => {
  const len = arr.length;
  let syl: Cluster[] = [];
  const result: (Syllable | Cluster)[] = [];

  for (let index = 0; index < len; index++) {
    const cluster = arr[index];

    if (cluster instanceof Syllable) {
      result.push(cluster);
      continue;
    }

    if (cluster.isShureq) {
      syl.unshift(cluster);
      const nxt = arr[index + 1];

      if (nxt instanceof Syllable) {
        throw new Error("Syllable should not precede a Cluster with a Mater");
      }

      if (nxt !== undefined) {
        syl.unshift(nxt);
      }

      const syllable = new Syllable(syl);
      result.push(syllable);
      syl = [];
      index++;
    } else {
      result.push(cluster);
    }
  }
  return result;
};

/**
 * @description a preprocessing step that groups clusters into intermediate syllables by vowels or shewas
 */
const groupClusters = (arr: Cluster[], options: SylOpts): (Syllable | Cluster)[] => {
  const rev = arr.reverse();
  const finalGrouped = groupFinal(rev);
  const shewasGrouped = groupShewas(finalGrouped, options);
  const matersGroups = groupMaters(shewasGrouped);
  const shureqGroups = groupShureqs(matersGroups);
  const result = shureqGroups.reverse();
  return result;
};

/**
 *
 * @param word the word to be split into Cluster
 * @description splits a word at each consonant or the punctuation character
 * Sof Pasuq and Nun Hafukha
 */
export const makeClusters = (word: string): Cluster[] => {
  const split = /(?=[\u{05C3}\u{05C6}\u{05D0}-\u{05F2}])/u;
  const groups = word.split(split);
  const clusters = groups.map((group) => new Cluster(group));
  return clusters;
};

const setIsClosed = (syllable: Syllable, index: number, arr: Syllable[]) => {
  if (index === arr.length - 1) {
    return syllable;
  }
  if (!syllable.isClosed) {
    const dageshRegx = /\u{05BC}/u;
    const hasShortVowel = syllable.clusters.filter((cluster) => cluster.hasShortVowel).length ? true : false;
    const prev = arr[index + 1];
    const prevDagesh = dageshRegx.test(prev.text);
    syllable.isClosed = hasShortVowel && prevDagesh;
  }
};

const setIsAccented = (syllable: Syllable) => {
  const isAccented = syllable.clusters.filter((cluster) => cluster.hasTaamim).length ? true : false;
  syllable.isAccented = isAccented;
};

export const syllabify = (clusters: Cluster[], options: SylOpts): Syllable[] => {
  const groupedClusters = groupClusters(clusters, options);
  const syllables = groupedClusters.map((group) => (group instanceof Syllable ? group : new Syllable([group])));
  syllables.forEach((syllable, index, arr) => setIsClosed(syllable, index, arr));
  syllables.forEach((syllable) => setIsAccented(syllable));
  syllables[syllables.length - 1].isFinal = true;
  return syllables;
};
