/**
 * kyoto-spots.csv を spots.js から生成する。
 *
 *   node build-csv.mjs
 *
 * spots.js は唯一の情報源なので、CSV は必ずここから作る（手で直さない）。
 * 行程を組み替えたら再実行すれば、番号も並びも追従する。
 *
 * 列構成（沖縄版と同じ6列 + 末尾に検索語）:
 *   名前,日程,種別,緯度,経度,メモ,検索語
 *
 * 検索語は7列目に足した。座標がまだ全件 null で、緯度・経度が空の CSV は
 * マイマップがピンを置けないため。座標が埋まれば無視してよい列。
 *
 * 出力は UTF-8 BOM 付き・CRLF（Excel で開いたときの文字化けと行崩れ回避）。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'spots.js');
const OUT = path.join(HERE, 'kyoto-spots.csv');

/**
 * spots.js は拡張子 .js で export を使っているため、package.json が無いと
 * Node が CommonJS と見なして落ちる。テキストとして読み、data: URL の
 * ES モジュールとして import する（spots.js は他を import していないので成立する）。
 */
const src = await readFile(SRC, 'utf8');
const mod = await import('data:text/javascript;charset=utf-8;base64,' + Buffer.from(src, 'utf8').toString('base64'));
const { TRIP, KINDS, byDay } = mod;

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const SURVEY_RE = /★座標未確定[：:]?\s*/;

/** RFC4180。カンマ・引用符・改行を含む値だけ囲む */
const cell = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/** 1スポットを1セルのメモにまとめる。CSV には works / hours / price の列が無いので寄せる */
const memo = (s) => [
  s.time,
  (s.works || []).join('・'),
  s.scene,
  (s.note || '').replace(SURVEY_RE, ''),
  s.hours && s.hours.raw ? '🕘' + s.hours.raw : '',
  s.closed && s.closed.length ? '休' + s.closed.map((d) => DOW[d]).join('・') : '',
  s.price ? '¥' + s.price.toLocaleString('en-US') : '',
  s.warn ? '⚠' + s.warn : '',
  // 実測が必要な8件だけ印を残す。coords が null でも Places で引ける45件は付けない
  SURVEY_RE.test(s.note || '') ? '★座標未確定（実測）' : '',
].filter(Boolean).join('｜');

const rows = [['名前', '日程', '種別', '緯度', '経度', 'メモ', '検索語']];
let noCoords = 0;

for (const d of TRIP.days) {
  byDay(d.day).forEach((s, i) => {
    // 名前の頭に「日-訪問順」を付ける。index.html のカード番号と揃える。
    // Day2 と Day3 はどちらも東山を通るので、日を付けずに 01 だけだと
    // 地図上で番号が重なって読めなくなる。
    const no = `${d.day}-${String(i + 1).padStart(2, '0')}`;
    if (!s.coords) noCoords++;
    rows.push([
      `${no} ${s.name}`,
      `Day${d.day}`,
      (KINDS[s.kind] || {}).label || s.kind,
      s.coords ? s.coords[0] : '',
      s.coords ? s.coords[1] : '',
      memo(s),
      s.coords ? '' : s.q || s.name,
    ]);
  });
}

const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
await writeFile(OUT, csv, 'utf8');

console.log(`kyoto-spots.csv : ${rows.length - 1} 行`);
TRIP.days.forEach((d) => console.log(`  Day${d.day} : ${byDay(d.day).length} 件`));
console.log(`座標あり ${rows.length - 1 - noCoords} 件 / 未確定 ${noCoords} 件（検索語でジオコーディングさせる）`);
