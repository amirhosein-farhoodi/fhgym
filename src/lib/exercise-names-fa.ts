/*
 * Persian names for exercises.
 *
 * Why this is a dictionary and not a translation API: Iranian gym vocabulary is trade jargon
 * that does not track the English words. `lat pulldown` is `زیربغل سیم‌کش` — literally
 * "underarm cable", nothing to do with "lat" or "pull". `leg extension` is `جلو پا`,
 * "front leg". A translator confident enough to produce 1500 names would produce 1500 names
 * a coach has to correct.
 *
 * So: match the movement against known patterns, prefix the equipment, and when nothing
 * matches confidently, return null and leave the English name alone. A missing Persian name
 * is honest; a wrong one is worse than useless because nobody checks it again.
 *
 * Coaches can edit name_fa in the UI. Their correction beats anything in this file.
 */

/** Equipment term, used as a qualifier after the movement. */
const EQUIPMENT_FA: Record<string, string> = {
  barbell: 'هالتر',
  'olympic barbell': 'هالتر المپیک',
  'ez barbell': 'هالتر لاری',
  'trap bar': 'هالتر تراپ‌بار',
  dumbbell: 'دمبل',
  cable: 'سیم‌کش',
  'leverage machine': 'دستگاه',
  'smith machine': 'دستگاه اسمیت',
  'sled machine': 'دستگاه سورتمه',
  'body weight': '',
  kettlebell: 'کتل‌بل',
  band: 'کش',
  'resistance band': 'کش',
  'stability ball': 'توپ سوئیسی',
  'medicine ball': 'توپ طبی',
  'bosu ball': 'توپ بوسو',
  rope: 'طناب',
  'wheel roller': 'چرخ شکم',
  roller: 'فوم رولر',
  assisted: 'کمکی',
  weighted: 'با وزنه',
  hammer: 'چکش',
  tire: 'لاستیک',
  'stationary bike': 'دوچرخه ثابت',
  'elliptical machine': 'الپتیکال',
  'stepmill machine': 'پله‌نورد',
  'skierg machine': 'اسکی‌ارگ',
  'upper body ergometer': 'ارگومتر بالاتنه',
}

/**
 * Movement patterns, matched in order — longest and most specific first, because
 * "incline bench press" must win over "bench press", which must win over "press".
 */
const MOVEMENTS: Array<[RegExp, string]> = [
  // --- chest
  [/\bincline\b.*\b(bench press|chest press|press)\b/, 'پرس بالاسینه'],
  [/\bdecline\b.*\b(bench press|chest press|press)\b/, 'پرس زیرسینه'],
  [/\b(bench press|chest press)\b/, 'پرس سینه'],
  [/\bincline\b.*\bfly(e|es)?\b/, 'قفسه بالاسینه'],
  [/\bfly(e|es)?\b/, 'قفسه سینه'],
  [/\bpullover\b/, 'پول‌اور'],
  [/\b(push[- ]?up|pushup)\b/, 'شنا'],
  [/\bdip\b/, 'پارالل'],

  // --- back
  [/\b(lat pulldown|pulldown|pull down)\b/, 'زیربغل سیم‌کش'],
  [/\b(pull[- ]?up|pullup)\b/, 'بارفیکس'],
  [/\b(chin[- ]?up|chinup)\b/, 'بارفیکس دست‌جمع'],
  [/\bbent[- ]?over\b.*\brow\b/, 'زیربغل خم'],
  [/\bseated\b.*\brow\b/, 'زیربغل نشسته'],
  [/\bt[- ]?bar row\b/, 'زیربغل تی‌بار'],
  [/\bupright row\b/, 'کول سیم‌کش'],
  [/\brow\b/, 'زیربغل'],
  [/\bshrug\b/, 'کول'],
  [/\bgood morning\b/, 'گودمورنینگ'],
  [/\bface pull\b/, 'فیس پول'],
  [/\bhyperextension\b/, 'فیله کمر'],

  // --- shoulders
  [/\b(lateral raise|side raise)\b/, 'نشر جانب'],
  [/\bfront raise\b/, 'نشر از جلو'],
  [/\b(rear delt|reverse fly)\b/, 'نشر خم'],
  [/\b(shoulder press|military press|overhead press)\b/, 'پرس سرشانه'],
  [/\barnold press\b/, 'پرس آرنولد'],

  // --- arms
  [/\bhammer curl\b/, 'جلو بازو چکشی'],
  [/\b(preacher|scott)\b.*\bcurl\b/, 'جلو بازو لاری'],
  [/\bconcentration curl\b/, 'جلو بازو تمرکزی'],
  [/\bwrist curl\b/, 'مچ'],
  [/\bcurl\b/, 'جلو بازو'],
  [/\b(skull ?crusher|lying triceps extension)\b/, 'پشت بازو خوابیده'],
  [/\b(triceps? (pushdown|push down))\b/, 'پشت بازو سیم‌کش'],
  [/\btriceps? extension\b/, 'پشت بازو'],
  [/\bkickback\b/, 'پشت بازو کیک‌بک'],
  [/\bclose[- ]?grip bench\b/, 'پرس دست‌جمع'],

  // --- legs
  [/\bromanian deadlift\b/, 'ددلیفت رومانیایی'],
  [/\bstiff[- ]?leg(ged)? deadlift\b/, 'ددلیفت پا صاف'],
  [/\bsumo deadlift\b/, 'ددلیفت سومو'],
  [/\bdeadlift\b/, 'ددلیفت'],
  [/\bhack squat\b/, 'هاک اسکوات'],
  [/\bfront squat\b/, 'اسکوات از جلو'],
  [/\bbulgarian split squat\b/, 'اسکوات بلغاری'],
  [/\bsplit squat\b/, 'اسکوات تک‌پا'],
  [/\bsquat\b/, 'اسکوات'],
  [/\bleg press\b/, 'پرس پا'],
  [/\bleg extension\b/, 'جلو پا'],
  [/\bleg curl\b/, 'پشت پا'],
  [/\bcalf raise\b/, 'ساق پا'],
  [/\blunge\b/, 'لانج'],
  [/\bhip thrust\b/, 'هیپ تراست'],
  [/\bglute bridge\b/, 'پل باسن'],
  [/\bstep[- ]?up\b/, 'استپ‌آپ'],
  [/\b(hip abduction|abduction)\b/, 'بازکننده ران'],
  [/\b(hip adduction|adduction)\b/, 'نزدیک‌کننده ران'],

  // --- core
  [/\bplank\b/, 'پلانک'],
  [/\b(sit[- ]?up|situp)\b/, 'دراز و نشست'],
  [/\bcrunch\b/, 'کرانچ'],
  [/\bleg raise\b/, 'بالا آوردن پا'],
  [/\brussian twist\b/, 'چرخش روسی'],
  [/\bmountain climber\b/, 'کوهنورد'],

  // --- conditioning
  [/\bburpee\b/, 'برپی'],
  [/\bjump rope\b/, 'طناب زدن'],
  [/\brun(ning)?\b/, 'دویدن'],
  [/\bwalk(ing)?\b/, 'پیاده‌روی'],
  [/\bcycl(e|ing)\b/, 'دوچرخه'],
  [/\bstretch\b/, 'کشش'],
]

/** Position and grip qualifiers, appended after the movement. */
const MODIFIERS: Array<[RegExp, string]> = [
  [/\bseated\b/, 'نشسته'],
  [/\bstanding\b/, 'ایستاده'],
  [/\blying\b/, 'خوابیده'],
  [/\bkneeling\b/, 'زانو زده'],
  [/\b(one|single)[- ]arm\b/, 'تک‌دست'],
  [/\b(one|single)[- ]leg\b/, 'تک‌پا'],
  [/\bclose[- ]?grip\b/, 'دست‌جمع'],
  [/\bwide[- ]?grip\b/, 'دست‌باز'],
  [/\breverse[- ]?grip\b/, 'دست برعکس'],
  [/\balternat(e|ing)\b/, 'متناوب'],
  [/\bbehind (the )?neck\b/, 'از پشت'],
]

export interface TranslationResult {
  nameFa: string | null
  /** 'high' when a specific movement matched; null result when nothing did. */
  confidence: 'high' | 'none'
}

/**
 * Builds a Persian name as: movement + equipment + modifiers.
 * Returns null rather than guessing when no movement pattern matches.
 */
export function translateExerciseName(name: string, equipments: string[] = []): TranslationResult {
  const lower = name.toLowerCase()

  const movement = MOVEMENTS.find(([pattern]) => pattern.test(lower))
  if (!movement) return { nameFa: null, confidence: 'none' }

  const parts = [movement[1]]

  // "body weight" maps to an empty string on purpose — «شنا» needs no qualifier.
  for (const equipment of equipments) {
    const fa = EQUIPMENT_FA[equipment.toLowerCase()]
    if (fa) {
      parts.push(fa)
      break // one equipment qualifier is plenty; two reads like a parts list
    }
  }

  for (const [pattern, fa] of MODIFIERS) {
    if (pattern.test(lower)) parts.push(fa)
  }

  return { nameFa: parts.join(' '), confidence: 'high' }
}
