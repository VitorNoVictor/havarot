import { Cluster } from "../cluster";
import { Syllable } from "../syllable";

/**
 * @description determines the Cluster[] that will become the final Syllable
 */
const groupFinal = (arr: Cluster[]): (Syllable | Cluster)[] => {
  // grouping the final first helps to avoid issues with final kafs/tavs
  const len = arr.length;
  let i = len - 1;
  let syl: Cluster[] = [];
  let result: (Syllable | Cluster)[] = [];
  let vowelPresent = false;
  let isClosed = false;

  // get final cluster and push to syl
  const finalCluster = arr[i];
  syl.unshift(finalCluster);

  if (finalCluster.hasVowel) {
    // check if finalCluster is syllable
    vowelPresent = true;
    i--;
  } else if (finalCluster.isShureq) {
    // check if final cluster isShureq and get preceding Cluster
    i--;
    syl.unshift(arr[i]);
    vowelPresent = true;
    i--;
  } else {
    isClosed = !finalCluster.isMater;
    i--;
  }

  while (!vowelPresent) {
    let curr = arr[i];
    syl.unshift(curr);
    vowelPresent = "hasVowel" in curr ? curr.hasVowel : true;
    i--;
    if (i < 0) {
      break;
    }
  }

  const finalSyllable = new Syllable(syl, { isClosed: isClosed });
  const remainder = arr.slice(0, i + 1);
  result = remainder;
  result.push(finalSyllable);

  return result;
};

/**
 * @description groups shewas either by themselves or with preceding short vowel
 */
const groupShewas = (arr: (Syllable | Cluster)[]): (Syllable | Cluster)[] => {
  const reversed = arr.reverse();
  let shewaPresent = false;
  let syl: Cluster[] = [];
  let result: (Syllable | Cluster)[] = [];
  const len = arr.length;

  for (let index = 0; index < len; index++) {
    const cluster = reversed[index];

    // skip if already a syllable
    if (cluster instanceof Syllable) {
      result.unshift(cluster);
      continue;
    }

    if (cluster.hasShewa && !shewaPresent) {
      shewaPresent = true;
      syl.push(cluster);
      continue;
    }

    if (cluster.hasShewa && shewaPresent) {
      let syllable = new Syllable(syl);
      result.unshift(syllable);
      syl = [];
      syl.push(cluster);
      continue;
    }

    if (cluster.hasShortVowel && shewaPresent) {
      const dageshRegx = /\u{05BC}/u;
      const prev = syl[0].text;
      // check if there is a doubling dagesh
      if (dageshRegx.test(prev)) {
        let syllable = new Syllable(syl);
        result.unshift(syllable);
        syl = [];
      }
      syl.unshift(cluster);
      let syllable = new Syllable(syl, { isClosed: true });
      result.unshift(syllable);
      syl = [];
      shewaPresent = false;
      continue;
    }

    if (cluster.hasLongVowel && shewaPresent) {
      let syllable = new Syllable(syl);
      result.unshift(syllable);
      result.unshift(cluster);
      syl = [];
      shewaPresent = false;
      continue;
    }

    if (cluster.isMater && shewaPresent) {
      let syllable = new Syllable(syl);
      result.unshift(syllable);
      result.unshift(cluster);
      syl = [];
      shewaPresent = false;
      continue;
    }

    result.unshift(cluster);
  }

  if (syl.length) {
    let syllable = new Syllable(syl);
    result.unshift(syllable);
  }

  return result;
};

/**
 * @description groups no-final maters with preceding cluster
 */
const groupMaters = (arr: (Syllable | Cluster)[]): (Syllable | Cluster)[] => {
  const reversed = arr.reverse();
  const len = arr.length;
  let syl: Cluster[] = [];
  let result: (Syllable | Cluster)[] = [];

  for (let index = 0; index < len; index++) {
    const cluster = reversed[index];

    if (cluster instanceof Syllable) {
      result.unshift(cluster);
      continue;
    }

    if (cluster.isMater) {
      syl.push(cluster);
      const nxt = reversed[index + 1];

      if (nxt instanceof Syllable) {
        throw new Error("A Syllable shouldn't preceded a Cluster with a Mater");
      }

      syl.unshift(nxt);
      let syllable = new Syllable(syl);
      result.unshift(syllable);
      syl = [];
      index++;
    } else {
      result.unshift(cluster);
    }
  }

  return result;
};

/**
 * @description groups non-final shureqs with preceding cluster
 */
const groupShureqs = (arr: (Syllable | Cluster)[]): (Syllable | Cluster)[] => {
  const reversed = arr.reverse();
  const len = arr.length;
  let syl: Cluster[] = [];
  let result: (Syllable | Cluster)[] = [];

  for (let index = 0; index < len; index++) {
    const cluster = reversed[index];

    if (cluster instanceof Syllable) {
      result.unshift(cluster);
      continue;
    }

    if (cluster.isShureq) {
      syl.push(cluster);
      const nxt = reversed[index + 1];

      if (nxt instanceof Syllable) {
        throw new Error("A Syllable shouldn't preceded a Cluster with a Shureq");
      }

      if (nxt !== undefined) {
        syl.push(nxt);
      }

      let syllable = new Syllable(syl);
      result.unshift(syllable);
      syl = [];
      index++;
    } else {
      result.unshift(cluster);
    }
  }
  return result;
};

/**
 * @description a preprocessing step that groups clusters into intermediate syllables by vowels or shewas
 */
const groupClusters = (arr: Cluster[]): (Syllable | Cluster)[] => {
  const finalGrouped = groupFinal(arr);
  const shewasGrouped = groupShewas(finalGrouped);
  const matersGroups = groupMaters(shewasGrouped);
  const shureqGroups = groupShureqs(matersGroups);
  return shureqGroups;
};

export const makeClusters = (word: string): Cluster[] => {
  const consonantSplit = /(?=[\u{05D0}-\u{05F2}])/u;
  const groups = word.split(consonantSplit);
  const clusters = groups.map((group) => new Cluster(group));
  return clusters;
};

export const syllabify = (clusters: Cluster[]): Syllable[] => {
  const groupedClusters = groupClusters(clusters);
  const syllables = groupedClusters.map((group) => (group instanceof Syllable ? group : new Syllable([group])));
  // sets isClosed
  syllables.forEach((syllable, index, arr) => {
    if (index === arr.length - 1) {
      return syllable;
    }
    if (!syllable.isClosed) {
      const dageshRegx = /\u{05BC}/u;
      let hasShortVowel = syllable.clusters.filter((cluster) => cluster.hasShortVowel).length ? true : false;
      let prev = arr[index + 1];
      let prevDagesh = dageshRegx.test(prev.text);
      syllable.isClosed = hasShortVowel && prevDagesh;
    }
  });
  // sets accents
  syllables.forEach((syllable) => {
    let isAccented = syllable.clusters.filter((cluster) => cluster.hasTaamei).length ? true : false;
    syllable.isAccented = isAccented;
  });
  // sets final
  syllables[syllables.length - 1].isFinal = true;
  return syllables;
};
