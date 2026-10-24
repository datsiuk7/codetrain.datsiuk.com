import { levels5a } from './s5a.mjs';
import { levels5b } from './s5b.mjs';

const ORDER5 = [
  'do-samoyi-stinky', 'idu-do-likhtarya', 'znaydy-vilnyy-shlyakh', 'likhtar-za-povorotom',
  'aleya-likhtariv', 'pidyom-na-pahorb', 'diydy-do-zghasloho', 'budynok-naprykintsi',
  'kvadratnyy-obkhid', 'pahorby-do-krayu', 'remkomplekt-po-dorozi', 'yashchyk-skhodynka',
  'dovha-vulytsya-z-iskramy', 'ravlyk', 'zmiyka-bez-kintsya', 'obkhid-ozera',
  'dva-yashchyky-skhody', 'hrebinka', 'nichnyy-obkhid-kvartalu', 'velykyy-marshrut'
];
const pool = [...levels5a, ...levels5b];
if (pool.length !== ORDER5.length) throw new Error('section 5 count mismatch: ' + pool.length);
export const levels5 = ORDER5.map((id) => {
  const d = pool.find((x) => x.id === id);
  if (!d) throw new Error('missing ' + id);
  return d;
});
