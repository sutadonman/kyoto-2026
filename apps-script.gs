/**
 * 沖縄2026 スポット希望リスト — wishlist.html の提出フォームの受け口
 *
 * Google スプレッドシート「沖縄2026 スポット希望リスト」に紐づけて、
 * ウェブアプリとしてデプロイして使う。手順は README.md を参照。
 *
 *   doGet  … シートの中身を JSONP で返す（ダッシュボードの集計用）
 *   doPost … action に応じて 追加 / 優先度などの修正 / 取り下げ を行う
 *
 * 修正と取り下げは、行のIDと提出者名の両方が一致したときだけ通す。
 * ログインを求めない代わりの簡易な持ち主チェックなので、
 * 「他人のふりをすれば消せる」点は許容している（身内3人での運用のため）。
 *
 * 同じスプレッドシートの2枚目のシートを seisan.html（立替・精算）が使う。
 * 1枚目（スポット希望リスト）とは読み書きの経路を完全に分けてあり、
 * 立替まわりの action（exp_*）は1枚目に一切触れない。
 *   doGet?what=expense … 立替シートの中身を返す
 *   doPost exp_add / exp_update / exp_remove … 立替の追加・修正・削除
 *
 * ── 京都2026（kyoto-2026）との共用について ────────────────────
 * このスクリプトは沖縄と京都の2旅行で共用する。スプレッドシートを共用すると
 * コンテナバインドのスクリプトも必然的に共用になるため。
 * 旅行ごとの違いは TRIPS に集め、リクエストの trip で選ぶ。
 *
 *   trip 省略      … 沖縄。既存ページは trip を送らないので必ずここに落ちる
 *   trip='kyoto'   … 京都。メンバーは Yoshi / Oka、立替は別シート
 *
 * 京都のために足したもの（沖縄側の action は引数も応答も変えていない）:
 *   doGet?what=checks&trip=kyoto … 巡礼チェックの全行を返す
 *   doPost check_set … 巡礼チェックの記録・解除（index.html）
 *
 * MEMBERS は書き換えないこと。沖縄旅行は 2026.10.08–11 で京都より後、
 * まだ本番稼働中のため、書き換えると沖縄の希望リストと精算が全部弾かれる。
 */

// ── 設定 ─────────────────────────────────────────────
// シートのURL /d/ と /edit の間にある文字列
var SHEET_ID = '12VYd7jl6_IPttbCkA974p-PhVPWRuAK9A6laz8hJABI';

// wishlist.html 側の TOKEN と同じ文字列にすること。
// いたずら投稿を止めるだけの合言葉で、秘密の情報は入れない。
var TOKEN = 'okinawa2026-3nin-2f9a41c7';

// シートの列の並び。7列目のIDと8列目の種別は、後から足したもの
var HEADERS = ['提出者', 'GoogleマップURL', '優先度', 'スポット名', 'ひとこと', '採否', 'ID', '種別'];
var COL_WHO = 1, COL_URL = 2, COL_PRI = 3, COL_SPOT = 4, COL_MEMO = 5,
    COL_STATUS = 6, COL_ID = 7, COL_KIND = 8;

// 提出者はこの3人だけ。wishlist.html の選択肢と揃えること
var MEMBERS = ['Otsu', 'Sugi', 'Runto'];

// 採否の取りうる値。不採用はシートに残したまま、地図と集計から外す
var STATUSES = ['採用', '未定', '不採用'];

// 種別。地図では 観光=丸 / ご飯=四角 で描き分ける。既存行は 観光 で埋める
var KINDS = ['観光', 'ご飯'];
var KIND_DEFAULT = '観光';

// 一度に受け付ける最大件数（取りこぼしより暴走を止めることを優先）
var MAX_ITEMS = 20;

// ── 立替・精算（2枚目のシート） ───────────────────────
// 同じスプレッドシート内に名前で作る。無ければ末尾に足すので、
// 1枚目のスポット希望リストは動かない。
var EXPENSE_SHEET = '立替・精算';
var EXP_HEADERS = ['タイトル', '金額', '立替者', '割り方', '対象メンバー', '個別内訳', '投稿者', 'ID', '登録日時'];
var EXP_TITLE = 1, EXP_AMOUNT = 2, EXP_PAYER = 3, EXP_MODE = 4, EXP_TARGETS = 5,
    EXP_CUSTOM = 6, EXP_POSTER = 7, EXP_ID = 8, EXP_AT = 9;

// 割り方。均等＝対象メンバーで等分、個別＝メンバーごとに金額を直接指定
var EXP_MODES = ['均等', '個別'];

// 1件あたりの上限。桁の打ち間違いを弾くためだけの値
var MAX_AMOUNT = 9999999;

// ── 京都2026（3〜5枚目のシート） ───────────────────────
// 巡礼チェック。1行1チェックで持つ。「Yoshiは行ったがOkaは未」を表現でき、
// 別行動にも耐える。解除は行を消す（履歴は残さない）。
var CHECK_SHEET = '巡礼チェック';
var CHECK_HEADERS = ['spotId', 'member', 'checkedAt'];
var CHK_SPOT = 1, CHK_MEMBER = 2, CHK_AT = 3;

// 圏外から戻ったときに溜まった未送信キューを一度に流せる数。
// 51スポット×2名＝102件が上限なので、それを超える分は暴走とみなす
var MAX_CHECKS = 120;

/**
 * 旅行ごとのスコープ。既存の定数はそのまま残し、参照する形にしてある。
 * ここに無い trip 名（と trip 無し）は沖縄に落ちる。
 */
var TRIPS = {
  okinawa: { members: MEMBERS,           expenseSheet: EXPENSE_SHEET },
  kyoto:   { members: ['Yoshi', 'Oka'],  expenseSheet: '立替・精算_京都' },
};

function tripOf_(body) {
  return TRIPS[body && body.trip] || TRIPS.okinawa;
}
// ─────────────────────────────────────────────────────


function sheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
}

/**
 * 承認を取り直すための関数。エディタから手で1回実行する。
 * 短縮URLの展開には外部URLへのアクセス権が要るが、ウェブアプリを
 * 再デプロイしただけでは承認画面が出ないことがあるため、ここで明示的に呼ぶ。
 * 例外を握りつぶさないので、権限が無ければそのまま実行ログに出る。
 */
function authorize() {
  var res = UrlFetchApp.fetch('https://maps.app.goo.gl/JwsBq7HeYfy36uPe8', {
    followRedirects: false,
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  var h = res.getAllHeaders();
  Logger.log('code=%s location=%s', res.getResponseCode(), h['Location'] || h['location'] || '(なし)');
  Logger.log('シート=%s', SpreadsheetApp.openById(SHEET_ID).getName());
  return 'OK';
}

/**
 * callback が来ていれば JSONP、無ければ素の JSON で返す。
 * ブラウザから別オリジンで読むため、GET は JSONP を使う。
 */
function out_(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function trim_(v, max) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function normPri_(v) {
  var s = String(v || '').trim().toLowerCase();
  return (s === 'high' || s === 'middle' || s === 'low') ? s : 'middle';
}

function newId_() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** ID列の見出しと、まだIDが無い既存行を埋める。何も無ければ書き込まない */
function ensureIds_(sh) {
  var last = sh.getLastRow();
  if (last < 1) return;

  if (trim_(sh.getRange(1, COL_ID).getValue(), 20) !== 'ID') {
    sh.getRange(1, COL_ID).setValue('ID');
  }
  if (last < 2) return;

  var ids = sh.getRange(2, COL_ID, last - 1, 1).getValues();
  var changed = false;
  for (var i = 0; i < ids.length; i++) {
    if (!trim_(ids[i][0], 40)) { ids[i][0] = newId_(); changed = true; }
  }
  if (changed) sh.getRange(2, COL_ID, ids.length, 1).setValues(ids);
}

/** 種別の見出しと、まだ空の既存行を 観光 で埋める */
function ensureKinds_(sh) {
  var last = sh.getLastRow();
  if (last < 1) return;

  if (trim_(sh.getRange(1, COL_KIND).getValue(), 20) !== '種別') {
    sh.getRange(1, COL_KIND).setValue('種別');
  }
  if (last < 2) return;

  var vals = sh.getRange(2, COL_KIND, last - 1, 1).getValues();
  var changed = false;
  for (var i = 0; i < vals.length; i++) {
    if (KINDS.indexOf(trim_(vals[i][0], 10)) < 0) { vals[i][0] = KIND_DEFAULT; changed = true; }
  }
  if (changed) sh.getRange(2, COL_KIND, vals.length, 1).setValues(vals);
}

/** IDから行番号を引く。見つからなければ -1 */
function rowOfId_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, COL_ID, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (trim_(ids[i][0], 40) === id) return i + 2;
  }
  return -1;
}

// 展開に失敗した理由を残す。doGet?debug=... で外から読めるようにして、
// 「黙って解決されない」状態を追えるようにする
var EXPAND_NOTE = '';

/**
 * 短縮URL（maps.app.goo.gl）を実URLに展開する。
 * ブラウザからは転送先を辿れないので、サーバー側であるここで解決してしまう。
 * 展開できなければ null。
 */
function expandUrl_(url) {
  if (!/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url)) return null;
  var cur = url;
  for (var i = 0; i < 6; i++) {
    var res;
    try {
      res = UrlFetchApp.fetch(cur, {
        followRedirects: false,
        muteHttpExceptions: true,
        // UA を伏せると転送ではなく案内ページを返されることがあるため、ブラウザを名乗る
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
    } catch (e) {
      EXPAND_NOTE = 'fetch例外: ' + e;
      return null;
    }

    var code = res.getResponseCode();

    if (code >= 300 && code < 400) {
      var h = res.getAllHeaders();
      var loc = h['Location'] || h['location'];
      if (loc instanceof Array) loc = loc[0];
      if (!loc) { EXPAND_NOTE = code + ' だが Location なし'; return null; }
      cur = String(loc);
      if (/\/maps\/place\/|!3d-?\d/.test(cur)) return cur;
      continue;
    }

    // 200 が返る場合、本文（HTML）の中に本当の遷移先が入っている
    var body = '';
    try { body = res.getContentText(); } catch (e) { body = ''; }
    var m = body.match(/https:\/\/www\.google\.com\/maps\/[^"'\\\s<>]+/);
    if (m) return m[0].replace(/&amp;/g, '&');

    EXPAND_NOTE = 'code=' + code + ' 本文冒頭=' + body.slice(0, 150);
    return null;
  }
  EXPAND_NOTE = '転送が多すぎます';
  return null;
}

/**
 * 展開後のURLから名称と座標を取り出す。
 * `@lat,lng` は地図の表示中心で実際の地点とズレることがあるため、
 * 施設の座標である `!3d/!4d` を優先する。
 */
function parsePlace_(url) {
  var out = { name: '', lat: null, lng: null };
  var m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
          url.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
          url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) { out.lat = parseFloat(m[1]); out.lng = parseFloat(m[2]); }
  var n = url.match(/\/maps\/place\/([^\/@?]+)/);
  if (n) {
    try { out.name = decodeURIComponent(n[1]).replace(/\+/g, ' ').trim(); } catch (e) {}
  }
  return out;
}

/**
 * スマホアプリの共有リンクは、地点名の前に郵便番号と住所が付く。
 *   「〒900-0036 沖縄県那覇市西１丁目７−３ ジャッキーステーキハウス」
 * 住所らしいトークンを前から捨てて、店名だけ残す。
 */
function cleanPlaceName_(raw) {
  var s = trim_(raw, 200).replace(/^〒\s*\d{3}[-−]?\d{4}\s*/, '');
  var parts = s.split(/[\s　]+/);
  var kept = [];
  for (var i = 0; i < parts.length; i++) { if (parts[i]) kept.push(parts[i]); }
  if (kept.length < 2) return s;

  var lastAddr = -1;
  for (var j = 0; j < kept.length; j++) {
    if (/[都道府県]$/.test(kept[j]) || /[市区町村]/.test(kept[j]) ||
        /丁目|番地/.test(kept[j]) || /[0-9０-９]+[−\-‐]/.test(kept[j])) {
      lastAddr = j;
    }
  }
  if (lastAddr >= 0 && lastAddr < kept.length - 1) return kept.slice(lastAddr + 1).join(' ');
  return s;
}

/**
 * 短縮URLを、地図が読める素直な形に置き換える。
 * 返り値は { url, spot }。解決できなければ null。
 */
function resolveShort_(url, spot) {
  var expanded = expandUrl_(url);
  if (!expanded) return null;
  var p = parsePlace_(expanded);
  var name = spot || cleanPlaceName_(p.name);

  if (p.lat != null) {
    return {
      url: 'https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng,
      spot: name
    };
  }

  // スマホアプリの共有リンクは座標を持たず、施設のIDしか入っていないことがある。
  // 名前が取れていればそれで検索するURLに置き換え、座標はページ側が Places から引く
  if (name) {
    return {
      url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name),
      spot: name
    };
  }
  return null;
}

/**
 * シートに残っている短縮URLを解決して書き戻す。
 * 1回のリクエストで触る件数を絞って、doGet が重くならないようにする。
 */
function backfillShortUrls_(sh, max) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var rng = sh.getRange(2, COL_URL, last - 1, 3);   // URL / 優先度 / スポット名
  var vals = rng.getValues();
  var done = 0;
  for (var i = 0; i < vals.length && done < max; i++) {
    var url = trim_(vals[i][0], 500);
    if (!/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url)) continue;
    var r = resolveShort_(url, trim_(vals[i][2], 80));
    if (!r) continue;
    vals[i][0] = r.url;
    vals[i][2] = r.spot;
    done++;
  }
  if (done) rng.setValues(vals);
  return done;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}


/** ダッシュボードがシートを読むための入口 */
function doGet(e) {
  var cb = (e && e.parameter) ? e.parameter.callback : null;

  // 診断用：?debug=<短縮URL> で展開の結果と失敗理由をそのまま返す
  if (e && e.parameter && e.parameter.debug) {
    var target = e.parameter.debug;
    EXPAND_NOTE = '';
    var expanded = expandUrl_(target);
    return out_({
      ok: true, target: target, expanded: expanded,
      parsed: expanded ? parsePlace_(expanded) : null,
      note: EXPAND_NOTE
    }, cb);
  }

  // 立替・精算ページ（seisan.html）はこちら。立替シートだけを読む。
  // trip 省略なら沖縄の「立替・精算」、trip=kyoto なら「立替・精算_京都」
  if (e && e.parameter && e.parameter.what === 'expense') {
    try {
      var expTrip = tripOf_(e.parameter);
      var exp = withLock_(function () {
        var esh = expSheet_(expTrip);
        ensureExpHeaders_(esh);
        ensureExpIds_(esh);
        SpreadsheetApp.flush();
        return esh.getDataRange().getDisplayValues();
      });
      return out_({ ok: true, rows: exp, fetchedAt: new Date().toISOString() }, cb);
    } catch (err) {
      return out_({ ok: false, error: String(err) }, cb);
    }
  }

  // 巡礼チェック（京都・index.html）。3枚目のシートだけを読む
  if (e && e.parameter && e.parameter.what === 'checks') {
    try {
      var chk = withLock_(function () {
        var csh = checkSheet_();
        ensureCheckHeaders_(csh);
        SpreadsheetApp.flush();
        return csh.getDataRange().getDisplayValues();
      });
      return out_({ ok: true, rows: chk, fetchedAt: new Date().toISOString() }, cb);
    } catch (err) {
      return out_({ ok: false, error: String(err) }, cb);
    }
  }

  try {
    var values = withLock_(function () {
      var sh = sheet_();
      ensureIds_(sh);
      ensureKinds_(sh);
      // 短縮URLのまま残っている行をここで解決する。1回の読み込みにつき数件ずつ
      backfillShortUrls_(sh, 5);
      SpreadsheetApp.flush();
      return sh.getDataRange().getDisplayValues();
    });
    return out_({ ok: true, rows: values, fetchedAt: new Date().toISOString() }, cb);
  } catch (err) {
    return out_({ ok: false, error: String(err) }, cb);
  }
}


/** 追加・修正・取り下げの入口 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return out_({ ok: false, error: 'no body' });
    }
    var body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return out_({ ok: false, error: 'token' });

    var action = body.action || 'add';
    if (action === 'add') return addItems_(body);
    if (action === 'update') return updateItem_(body);
    if (action === 'remove') return removeItem_(body);
    if (action === 'status') return setStatus_(body);
    if (action === 'kind') return setKind_(body);
    // 立替・精算（2枚目＝沖縄 / 4枚目＝京都。trip で切り替わる）
    if (action === 'exp_add') return addExpense_(body);
    if (action === 'exp_update') return updateExpense_(body);
    if (action === 'exp_remove') return removeExpense_(body);
    // 京都（3枚目＝巡礼チェック）
    if (action === 'check_set') return setChecks_(body);
    return out_({ ok: false, error: 'unknown action' });

  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}


function addItems_(body) {
  var items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return out_({ ok: false, error: 'empty' });
  if (items.length > MAX_ITEMS) return out_({ ok: false, error: 'too many' });

  var rows = [], ids = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var who = trim_(it.who, 40);
    var url = trim_(it.url, 500);
    var spot = trim_(it.spot, 80);
    // 提出者は決め打ちの3人のみ。URLかスポット名のどちらかがあれば受け付ける
    if (MEMBERS.indexOf(who) < 0 || (!url && !spot)) continue;
    if (url && !/^https?:\/\//i.test(url)) continue;
    // 短縮URLはこの場で座標つきに直す。名前が空なら地点名も貰う
    var res = url ? resolveShort_(url, spot) : null;
    if (res) { url = res.url; spot = res.spot; }
    var kind = trim_(it.kind, 10);
    if (KINDS.indexOf(kind) < 0) kind = KIND_DEFAULT;
    var id = newId_();
    ids.push(id);
    rows.push([who, url, normPri_(it.pri), spot, trim_(it.memo, 200), '未定', id, kind]);
  }
  if (!rows.length) return out_({ ok: false, error: 'invalid' });

  // 3人が同時に送ったときに同じ行へ重ね書きしないよう直列化する
  return withLock_(function () {
    var sh = sheet_();
    ensureIds_(sh);
    ensureKinds_(sh);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
    return out_({ ok: true, added: rows.length, ids: ids });
  });
}


function updateItem_(body) {
  var id = trim_(body.id, 40);
  var who = trim_(body.who, 40);
  if (!id || MEMBERS.indexOf(who) < 0) return out_({ ok: false, error: 'invalid' });

  return withLock_(function () {
    var sh = sheet_();
    ensureIds_(sh);
    ensureKinds_(sh);
    var row = rowOfId_(sh, id);
    if (row < 0) return out_({ ok: false, error: 'not found' });
    // 自分が出した行以外は触らせない
    if (trim_(sh.getRange(row, COL_WHO).getValue(), 40) !== who) {
      return out_({ ok: false, error: 'not yours' });
    }

    var changed = 0;
    if (body.pri != null) { sh.getRange(row, COL_PRI).setValue(normPri_(body.pri)); changed++; }
    if (body.spot != null) { sh.getRange(row, COL_SPOT).setValue(trim_(body.spot, 80)); changed++; }
    if (body.memo != null) { sh.getRange(row, COL_MEMO).setValue(trim_(body.memo, 200)); changed++; }
    if (!changed) return out_({ ok: false, error: 'nothing to change' });

    SpreadsheetApp.flush();
    return out_({ ok: true, updated: 1 });
  });
}


/**
 * 採否を切り替える。
 * 優先度と違って「みんなで決めるもの」なので、行の持ち主でなくても変更できる。
 * 同じスポットが複数人から出ていると行も複数あるため、IDをまとめて受け取る。
 */
function setStatus_(body) {
  var who = trim_(body.who, 40);
  var status = trim_(body.status, 10);
  var ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
  if (MEMBERS.indexOf(who) < 0) return out_({ ok: false, error: 'invalid' });
  if (STATUSES.indexOf(status) < 0) return out_({ ok: false, error: 'bad status' });
  if (!ids.length || ids.length > MAX_ITEMS) return out_({ ok: false, error: 'invalid' });

  return withLock_(function () {
    var sh = sheet_();
    ensureIds_(sh);
    ensureKinds_(sh);
    var last = sh.getLastRow();
    if (last < 2) return out_({ ok: false, error: 'not found' });

    var idCol = sh.getRange(2, COL_ID, last - 1, 1).getValues();
    var stCol = sh.getRange(2, COL_STATUS, last - 1, 1).getValues();
    var changed = 0;
    for (var i = 0; i < idCol.length; i++) {
      if (ids.indexOf(trim_(idCol[i][0], 40)) >= 0) { stCol[i][0] = status; changed++; }
    }
    if (!changed) return out_({ ok: false, error: 'not found' });

    sh.getRange(2, COL_STATUS, stCol.length, 1).setValues(stCol);
    SpreadsheetApp.flush();
    return out_({ ok: true, changed: changed });
  });
}


/**
 * 種別（観光 / ご飯）を切り替える。採否と同じく場所そのものの属性なので、
 * 行の持ち主でなくても変更できる。
 */
function setKind_(body) {
  var who = trim_(body.who, 40);
  var kind = trim_(body.kind, 10);
  var ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
  if (MEMBERS.indexOf(who) < 0) return out_({ ok: false, error: 'invalid' });
  if (KINDS.indexOf(kind) < 0) return out_({ ok: false, error: 'bad kind' });
  if (!ids.length || ids.length > MAX_ITEMS) return out_({ ok: false, error: 'invalid' });

  return withLock_(function () {
    var sh = sheet_();
    ensureIds_(sh);
    ensureKinds_(sh);
    var last = sh.getLastRow();
    if (last < 2) return out_({ ok: false, error: 'not found' });

    var idCol = sh.getRange(2, COL_ID, last - 1, 1).getValues();
    var kCol = sh.getRange(2, COL_KIND, last - 1, 1).getValues();
    var changed = 0;
    for (var i = 0; i < idCol.length; i++) {
      if (ids.indexOf(trim_(idCol[i][0], 40)) >= 0) { kCol[i][0] = kind; changed++; }
    }
    if (!changed) return out_({ ok: false, error: 'not found' });

    sh.getRange(2, COL_KIND, kCol.length, 1).setValues(kCol);
    SpreadsheetApp.flush();
    return out_({ ok: true, changed: changed });
  });
}


function removeItem_(body) {
  var id = trim_(body.id, 40);
  var who = trim_(body.who, 40);
  if (!id || MEMBERS.indexOf(who) < 0) return out_({ ok: false, error: 'invalid' });

  return withLock_(function () {
    var sh = sheet_();
    ensureIds_(sh);
    ensureKinds_(sh);
    var row = rowOfId_(sh, id);
    if (row < 0) return out_({ ok: false, error: 'not found' });
    if (trim_(sh.getRange(row, COL_WHO).getValue(), 40) !== who) {
      return out_({ ok: false, error: 'not yours' });
    }
    sh.deleteRow(row);
    SpreadsheetApp.flush();
    return out_({ ok: true, removed: 1 });
  });
}


/* ══════════════════════════════════════════════════════════════════
   ここから下は seisan.html（立替・精算）用。2枚目のシートだけを扱う。
   ここの関数は sheet_() を呼ばないので、スポット希望リストには触れない。
   ══════════════════════════════════════════════════════════════════ */

/**
 * 立替シートを返す。無ければ末尾に足して見出しを書く（1枚目は動かさない）。
 * trip を渡さなければ沖縄の「立替・精算」。京都は「立替・精算_京都」。
 */
function expSheet_(trip) {
  var name = (trip && trip.expenseSheet) || EXPENSE_SHEET;
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, ss.getNumSheets());
    sh.getRange(1, 1, 1, EXP_HEADERS.length).setValues([EXP_HEADERS]);
  }
  return sh;
}

/** 見出しが欠けていたら埋める。手で消されても次のアクセスで直る */
function ensureExpHeaders_(sh) {
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, EXP_HEADERS.length).setValues([EXP_HEADERS]);
    return;
  }
  var cur = sh.getRange(1, 1, 1, EXP_HEADERS.length).getValues()[0];
  var changed = false;
  for (var i = 0; i < EXP_HEADERS.length; i++) {
    if (trim_(cur[i], 20) !== EXP_HEADERS[i]) { cur[i] = EXP_HEADERS[i]; changed = true; }
  }
  if (changed) sh.getRange(1, 1, 1, EXP_HEADERS.length).setValues([cur]);
}

/** IDの無い既存行を埋める。手で行を足されても持ち主判定が効くようにする */
function ensureExpIds_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, EXP_ID, last - 1, 1).getValues();
  var changed = false;
  for (var i = 0; i < ids.length; i++) {
    if (!trim_(ids[i][0], 40)) { ids[i][0] = newId_(); changed = true; }
  }
  if (changed) sh.getRange(2, EXP_ID, ids.length, 1).setValues(ids);
}

function expRowOfId_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, EXP_ID, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (trim_(ids[i][0], 40) === id) return i + 2;
  }
  return -1;
}

/**
 * 金額を整数（円）にする。全角数字・カンマ・「円」「¥」は落とす。
 * 数字として読めなければ null。小数は受け付けない（円未満は扱わない）。
 */
function normAmount_(v) {
  if (v == null) return null;
  var s = String(v).replace(/[０-９]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
  }).replace(/[,\s￥¥円]/g, '');
  if (!/^-?\d+$/.test(s)) return null;
  var n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/**
 * 対象メンバーを並び順に正規化する。配列でもカンマ区切りでも受ける。
 * members 省略時は沖縄の MEMBERS（既存の呼び出しと同じ挙動）。
 */
function normTargets_(v, members) {
  var ms = members || MEMBERS;
  var list = [];
  if (v instanceof Array) list = v;
  else if (typeof v === 'string') list = v.split(',');
  var picked = {};
  for (var i = 0; i < list.length; i++) picked[trim_(list[i], 40)] = true;
  var out = [];
  for (var m = 0; m < ms.length; m++) if (picked[ms[m]]) out.push(ms[m]);
  return out;
}

/** 個別内訳を {名前: 金額} にする。オブジェクトでも "Otsu:100,Sugi:200" でも受ける */
function parseCustom_(v) {
  var out = {};
  if (!v) return out;
  if (typeof v === 'string') {
    var parts = v.split(',');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split(':');
      if (kv.length === 2) out[trim_(kv[0], 40)] = normAmount_(kv[1]);
    }
    return out;
  }
  for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) out[trim_(k, 40)] = normAmount_(v[k]);
  return out;
}

/**
 * 受け取った内容を検査して、シートに書ける形に整える。
 * 弾いたときは { err: 理由 } を返す。
 * 個別入力のときは、内訳の合計が金額と一致することをここでも確かめる
 * （ページ側でも見ているが、直接叩かれても壊れないようにするため）。
 */
function expFields_(body) {
  // 旅行ごとにメンバーが違う。trip 省略なら沖縄の3人
  var members = tripOf_(body).members;
  var title = trim_(body.title, 60);
  var amount = normAmount_(body.amount);
  var payer = trim_(body.payer, 40);
  var poster = trim_(body.who, 40);
  var mode = trim_(body.mode, 10);
  if (mode === 'equal') mode = '均等';
  if (mode === 'custom') mode = '個別';
  var targets = normTargets_(body.targets, members);
  var custom = parseCustom_(body.custom);

  if (!title) return { err: 'title' };
  if (amount == null || amount < 1 || amount > MAX_AMOUNT) return { err: 'amount' };
  if (members.indexOf(payer) < 0) return { err: 'payer' };
  if (members.indexOf(poster) < 0) return { err: 'who' };
  if (EXP_MODES.indexOf(mode) < 0) return { err: 'mode' };
  if (!targets.length) return { err: 'targets' };

  var customStr = '';
  if (mode === '個別') {
    var sum = 0, parts = [];
    for (var i = 0; i < targets.length; i++) {
      var a = custom[targets[i]];
      if (a == null || a < 0) return { err: 'custom' };
      sum += a;
      parts.push(targets[i] + ':' + a);
    }
    if (sum !== amount) return { err: 'custom sum' };
    customStr = parts.join(',');
  }

  return {
    title: title, amount: amount, payer: payer, mode: mode,
    targets: targets.join(','), custom: customStr, poster: poster
  };
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
}


function addExpense_(body) {
  var f = expFields_(body);
  if (f.err) return out_({ ok: false, error: f.err });

  var id = newId_();
  var row = [f.title, f.amount, f.payer, f.mode, f.targets, f.custom, f.poster, id, nowStamp_()];

  return withLock_(function () {
    var sh = expSheet_(tripOf_(body));
    ensureExpHeaders_(sh);
    ensureExpIds_(sh);
    sh.getRange(sh.getLastRow() + 1, 1, 1, EXP_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
    return out_({ ok: true, added: 1, id: id });
  });
}


/** 自分が投稿した行だけ、内容をまるごと差し替える。IDと登録日時は残す */
function updateExpense_(body) {
  var id = trim_(body.id, 40);
  if (!id) return out_({ ok: false, error: 'invalid' });
  var f = expFields_(body);
  if (f.err) return out_({ ok: false, error: f.err });

  return withLock_(function () {
    var sh = expSheet_(tripOf_(body));
    ensureExpHeaders_(sh);
    ensureExpIds_(sh);
    var row = expRowOfId_(sh, id);
    if (row < 0) return out_({ ok: false, error: 'not found' });
    if (trim_(sh.getRange(row, EXP_POSTER).getValue(), 40) !== f.poster) {
      return out_({ ok: false, error: 'not yours' });
    }
    sh.getRange(row, 1, 1, EXP_CUSTOM).setValues([[f.title, f.amount, f.payer, f.mode, f.targets, f.custom]]);
    SpreadsheetApp.flush();
    return out_({ ok: true, updated: 1 });
  });
}


function removeExpense_(body) {
  var trip = tripOf_(body);
  var id = trim_(body.id, 40);
  var who = trim_(body.who, 40);
  if (!id || trip.members.indexOf(who) < 0) return out_({ ok: false, error: 'invalid' });

  return withLock_(function () {
    var sh = expSheet_(trip);
    ensureExpHeaders_(sh);
    ensureExpIds_(sh);
    var row = expRowOfId_(sh, id);
    if (row < 0) return out_({ ok: false, error: 'not found' });
    if (trim_(sh.getRange(row, EXP_POSTER).getValue(), 40) !== who) {
      return out_({ ok: false, error: 'not yours' });
    }
    sh.deleteRow(row);
    SpreadsheetApp.flush();
    return out_({ ok: true, removed: 1 });
  });
}


/* ══════════════════════════════════════════════════════════════════
   ここから下は京都2026（kyoto-2026）用。3枚目（巡礼チェック）だけを
   扱い、沖縄の1〜2枚目には一切触れない。
   trip='kyoto' を必須にしてあるので、trip を持たない沖縄の既存ページ
   からは、そもそもこの経路に入れない。
   ══════════════════════════════════════════════════════════════════ */

/** 巡礼チェックのシートを返す。無ければ末尾に足す（既存シートは動かない） */
function checkSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(CHECK_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CHECK_SHEET, ss.getNumSheets());
    sh.getRange(1, 1, 1, CHECK_HEADERS.length).setValues([CHECK_HEADERS]);
  }
  return sh;
}

function ensureCheckHeaders_(sh) {
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, CHECK_HEADERS.length).setValues([CHECK_HEADERS]);
    return;
  }
  var cur = sh.getRange(1, 1, 1, CHECK_HEADERS.length).getValues()[0];
  var changed = false;
  for (var i = 0; i < CHECK_HEADERS.length; i++) {
    if (trim_(cur[i], 20) !== CHECK_HEADERS[i]) { cur[i] = CHECK_HEADERS[i]; changed = true; }
  }
  if (changed) sh.getRange(1, 1, 1, CHECK_HEADERS.length).setValues([cur]);
}

/**
 * 巡礼チェックの記録と解除。
 *
 *   { trip:'kyoto', action:'check_set', items:[{spotId, member, checkedAt}] }
 *
 * checkedAt が空なら解除（行を消す）。1行1チェックなので、
 * 「Yoshiは行ったがOkaは未」がそのまま表現される。
 *
 * 圏外から戻ったときにキューをまとめて流すため、items は配列で受ける。
 * 1件も書かないうちに全件を検査するので、途中で弾かれて半分だけ書かれることはない。
 * 同じ (spotId, member) が既にあれば上書きするので、二重送信でも行は増えない。
 */
function setChecks_(body) {
  var trip = tripOf_(body);
  if (trip !== TRIPS.kyoto) return out_({ ok: false, error: 'trip' });

  var items = (body.items instanceof Array) ? body.items
    : (body.spotId ? [{ spotId: body.spotId, member: body.member, checkedAt: body.checkedAt }] : []);
  if (!items.length) return out_({ ok: false, error: 'empty' });
  if (items.length > MAX_CHECKS) return out_({ ok: false, error: 'too many' });

  var ops = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var spotId = trim_(it.spotId, 40);
    var member = trim_(it.member, 40);
    // spots.js の id の形（d1-010 など）だけ通す
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(spotId)) return out_({ ok: false, error: 'spotId' });
    if (trip.members.indexOf(member) < 0) return out_({ ok: false, error: 'member' });
    ops.push({ spotId: spotId, member: member, at: it.checkedAt ? trim_(it.checkedAt, 40) : '' });
  }

  return withLock_(function () {
    var sh = checkSheet_();
    ensureCheckHeaders_(sh);
    var last = sh.getLastRow();
    var vals = last >= 2 ? sh.getRange(2, 1, last - 1, CHECK_HEADERS.length).getValues() : [];

    var pos = {};
    for (var r = 0; r < vals.length; r++) {
      pos[trim_(vals[r][CHK_SPOT - 1], 40) + '\t' + trim_(vals[r][CHK_MEMBER - 1], 40)] = r;
    }

    var added = 0, updated = 0, removed = 0, kill = {};
    for (var j = 0; j < ops.length; j++) {
      var o = ops[j], key = o.spotId + '\t' + o.member, idx = pos[key];
      if (o.at) {
        if (idx == null) {
          vals.push([o.spotId, o.member, o.at]);
          pos[key] = vals.length - 1;
          added++;
        } else {
          vals[idx][CHK_AT - 1] = o.at;
          delete kill[idx];
          updated++;
        }
      } else if (idx != null) {
        kill[idx] = true;
        removed++;
      }
    }

    if (removed) {
      var kept = [];
      for (var k = 0; k < vals.length; k++) if (!kill[k]) kept.push(vals[k]);
      vals = kept;
    }

    // 解除で行数が減るので、いったん消してから書き直す。
    // 最大 51スポット×2名＝102行なので、まるごと書き戻しても軽い。
    if (last >= 2) sh.getRange(2, 1, last - 1, CHECK_HEADERS.length).clearContent();
    if (vals.length) sh.getRange(2, 1, vals.length, CHECK_HEADERS.length).setValues(vals);
    SpreadsheetApp.flush();
    return out_({ ok: true, added: added, updated: updated, removed: removed, total: vals.length });
  });
}


/* 座標収集（coord_add / 座標収集シート）は作らないことにした。
   観光ポイントの提出は行わず、スポットの追加と座標は spots.js を直接
   更新する運用にしたため。埋め込み地図は q の検索語で足りている。 */
