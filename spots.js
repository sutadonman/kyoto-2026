/**
 * 京都・宇治 聖地巡礼 2026.08.28–30 ｜ スポットデータ（唯一の情報源）
 *
 * このファイルだけを直せば、旅程表カード / 巡礼チェックリスト / マイマップ用CSV /
 * 営業時間の警告が、すべて追従する。index.html は描画のみを担当する。
 *
 * --- フィールド定義 -------------------------------------------------------
 * id      : localStorage とチェック同期シートのキー。**一度決めたら変えない**。
 *           並び替えは order を直すこと。id を振り直すとチェック履歴が切れる。
 * day     : 1 | 2 | 3
 * order   : 日内の訪問順（10刻み。間に挿入する余地を持たせてある）
 * name    : 表示名
 * time    : 時刻または時間帯（"9:00" / "昼食" / "夕方" / "夜" / "泊" / ""）
 * kind    : "seichi"（聖地） | "sight"（観光） | "food"（飲食） | "stay"（宿）
 *           地図の形・チップの絞り込みに使う
 * works   : 登場作品・話数の配列。例 ["2期7話"] / ["劇場版 誓いのフィナーレ"]
 *           kind==="seichi" 以外は空配列
 * scene   : 劇中でどの場面か（1行）
 * coords  : [lat, lng] または null。null なら q で Places 検索する
 * q       : Places / マップ検索用の文字列。coords が入っていれば使わない
 * hours   : 営業・拝観時間。{ open:"12:00", close:"13:30", raw:"12:00-13:30" }
 *           複数営業帯は slots:[{open,close},...] を持たせる。無しは null
 * closed  : 定休日。0=日 … 6=土 の配列。無休・該当なしは []
 * price   : 円（一人・整数）。不明・別途は 0
 * note    : 補足メモ
 * warn    : 強調したい注意（営業時間が極端に狭い等）。無ければ ""
 * ------------------------------------------------------------------------
 *
 * 座標の状況：coords:null は現地で確認してここに直接書き込む対象。
 * 施設として存在するスポットは q の検索語で地図が引けるので、そのままでよい。
 */

export const TRIP = {
  title: '響け！ユーフォニアム 聖地巡礼',
  subtitle: '京都・宇治をめぐる三楽章',
  start: '2026-08-28',
  end: '2026-08-30',
  members: ['Yoshi', 'Oka'],
  days: [
    { day: 1, date: '2026-08-28', dow: 5, label: '第一楽章 ― 宇治を歩く一日',
      theme: '京都駅から宇治へ。聖地を歩きながら、通圓の茶そば・平等院・宇治茶スイーツも。',
      note: '京都駅 8:24 着' },
    { day: 2, date: '2026-08-29', dow: 6, label: '第二楽章 ― アクトパル・北区中華・東山',
      theme: '宇治からアクトパル→北大路の町中華→岡崎・東山。横移動の多い一日。',
      note: '' },
    { day: 3, date: '2026-08-30', dow: 0, label: '第三楽章 ― 哲学の道を北上',
      theme: '祇園から八坂・知恩院、哲学の道沿いの寺々を抜けて銀閣寺。最後は京都駅。',
      note: '京都駅 19:00 発' },
  ],
};

export const KINDS = {
  seichi: { label: '聖地', shape: 'circle' },
  sight:  { label: '観光', shape: 'circle' },
  food:   { label: '飯',   shape: 'square' },
  move:   { label: '移動', shape: 'circle' },
  stay:   { label: '宿',   shape: 'star'   },
};

export const SPOTS = [
  // ===== Day 1 : 宇治 =====
  {
    id: 'd1-005', day: 1, order: 5, name: '新幹線 新横浜 → 京都', time: '6:33', kind: 'move',
    works: [], scene: '',
    coords: null, q: '新横浜駅',
    hours: null, closed: [], price: 0,
    note: '6:33 新横浜発 → 8:24 京都着', warn: '',
  },
  {
    id: 'd1-010', day: 1, order: 10, name: '京都駅', time: '8:24', kind: 'seichi',
    works: ['2期7話'], scene: '駅ビル大階段「えきびるコンサート」の演奏舞台・客席',
    coords: null, q: '京都駅ビル 大階段',
    hours: null, closed: [], price: 0,
    note: '京アニグッズストア京都駅店も同じ駅構内。ここから奈良線に乗る。※奈良線は六地蔵まで乗り間違い注意',
    warn: '',
  },
  {
    id: 'd1-012', day: 1, order: 12, name: 'JR奈良線 六地蔵駅', time: '', kind: 'move',
    works: [], scene: '',
    coords: null, q: 'JR六地蔵駅',
    hours: null, closed: [], price: 0,
    note: '京アニ本社はスキップ', warn: '',
  },
  {
    id: 'd1-014', day: 1, order: 14, name: '京阪宇治線 六地蔵駅', time: '', kind: 'move',
    works: [], scene: '',
    coords: null, q: '京阪六地蔵駅',
    hours: null, closed: [], price: 0,
    note: 'JRから徒歩で乗り換え。ここから京阪宇治線', warn: '',
  },
  {
    id: 'd1-020', day: 1, order: 20, name: '六地蔵', time: '', kind: 'seichi',
    works: ['1期'], scene: '通学で使う六地蔵駅のベンチ',
    coords: null, q: '六地蔵駅',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-025', day: 1, order: 25, name: '京阪宇治線 黄檗駅', time: '', kind: 'move',
    works: [], scene: '',
    coords: null, q: '京阪黄檗駅',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-030', day: 1, order: 30, name: '黄檗', time: '', kind: 'seichi',
    works: ['3期'], scene: '3期の新規聖地が集まるエリア（許波多神社＝サリーの実家ほか）',
    coords: null, q: '黄檗駅',
    hours: null, closed: [], price: 0, note: '萬福寺も黄檗駅すぐ', warn: '',
  },
  {
    id: 'd1-040', day: 1, order: 40, name: '中路ベーカリー', time: '', kind: 'seichi',
    works: [], scene: '修一のパン',
    coords: null, q: '中路ベーカリー 宇治',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-050', day: 1, order: 50, name: 'セブン-イレブン 宇治黄檗公園前', time: '', kind: 'seichi',
    works: ['2期1話'], scene: '久美子たちが下校途中に寄るコンビニ。緑輝がチューバくんのガチャを回す',
    coords: null, q: 'セブンイレブン 宇治黄檗公園前',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-060', day: 1, order: 60, name: '通学路', time: '', kind: 'seichi',
    works: [], scene: '黄檗〜莵道高校の通学路',
    coords: null, q: '莵道高校 宇治',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：道の途中なので代表点を1つ決める', warn: '',
  },
  {
    id: 'd1-070', day: 1, order: 70, name: '莵道高校', time: '', kind: 'seichi',
    works: [], scene: '北宇治高校のモデル校',
    coords: null, q: '京都府立莵道高等学校',
    hours: null, closed: [], price: 0,
    note: '外観のみ。授業・部活の妨げにならないよう配慮', warn: '',
  },
  {
    id: 'd1-080', day: 1, order: 80, name: '幸栄堂 本店', time: '', kind: 'food',
    works: [], scene: '久美子があすか先輩宅へ持参した栗まんじゅう（香織先輩のおすすめ）',
    coords: null, q: '幸栄堂 宇治',
    hours: { open: '', close: '17:00', raw: '〜17:00' }, closed: [], price: 0,
    note: '栗まんじゅうは三室戸店で買う',
    warn: '休業中。買うなら三室戸店へ回ること',
  },
  {
    id: 'd1-085', day: 1, order: 85, name: '幸栄堂 三室戸店', time: '', kind: 'food',
    works: [], scene: '',
    coords: null, q: '幸栄堂 三室戸店 宇治市莵道田中',
    hours: { open: '07:00', close: '18:30', raw: '7:00-18:30' }, closed: [2], price: 0,
    note: '本店が休業中のためこちら。栗まんじゅう。京阪三室戸駅から131m（宇治市莵道田中6-26）', warn: '',
  },
  {
    id: 'd1-088', day: 1, order: 88, name: '京阪宇治線 三室戸駅', time: '', kind: 'move',
    works: [], scene: '',
    coords: null, q: '京阪三室戸駅',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-090', day: 1, order: 90, name: '宇治駅', time: '', kind: 'seichi',
    works: [], scene: '',
    coords: null, q: '京阪宇治駅',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-100', day: 1, order: 100, name: '志を繋ぐ碑（京アニ追悼碑）', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: 'お茶と宇治のまち歴史公園',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：園内の碑の位置を実測する。京都アニメーション放火事件(2019)の犠牲者36名の志を記憶に留める碑。慰霊碑ではないため献花・お供えはご遠慮を（宇治市案内）',
    warn: '',
  },
  {
    id: 'd1-110', day: 1, order: 110, name: '宇治橋', time: '', kind: 'seichi',
    works: [], scene: '久美子たちが渡る橋',
    coords: null, q: '宇治橋 宇治市',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-120', day: 1, order: 120, name: '宇治橋東詰交差点', time: '', kind: 'seichi',
    works: [], scene: 'いつも麗奈と久美子が別れる交差点',
    coords: null, q: '宇治橋東詰 宇治',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：交差点の一点を実測する', warn: '',
  },
  {
    id: 'd1-130', day: 1, order: 130, name: '通圓 本店', time: '昼食', kind: 'food',
    works: [], scene: '',
    coords: null, q: '通圓 宇治',
    hours: null, closed: [], price: 0, note: '茶そば。宇治橋東詰の老舗茶屋', warn: '',
  },
  {
    id: 'd1-140', day: 1, order: 140, name: '宇治観光センター', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '宇治市観光センター',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-150', day: 1, order: 150, name: '宇治神社', time: '', kind: 'seichi',
    works: [], scene: '',
    coords: null, q: '宇治神社',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-160', day: 1, order: 160, name: '水門前', time: '', kind: 'seichi',
    works: [], scene: '修一の練習場所',
    coords: null, q: '観流橋 宇治',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：観流橋の水門前を実測する', warn: '',
  },
  {
    id: 'd1-170', day: 1, order: 170, name: '久美子ベンチ', time: '', kind: 'seichi',
    works: ['1期'], scene: '久美子が座るベンチ',
    coords: null, q: '朝霧橋 宇治',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：施設として存在しないので実測必須（朝霧橋付近）', warn: '',
  },
  {
    id: 'd1-180', day: 1, order: 180, name: '自販機前', time: '', kind: 'seichi',
    works: ['劇場版 誓いのフィナーレ'],
    scene: 'あがた祭の日、秀一と久美子がキスしそうになった場所',
    coords: null, q: '喜撰橋 宇治',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：喜撰橋の手前。自販機の位置を実測する', warn: '',
  },
  {
    id: 'd1-190', day: 1, order: 190, name: '縣神社', time: '', kind: 'seichi',
    works: [], scene: 'あがた祭の神社',
    coords: null, q: '縣神社 宇治',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-200', day: 1, order: 200, name: '朝霧橋', time: '', kind: 'seichi',
    works: [], scene: '部長失格橋',
    coords: null, q: '朝霧橋 宇治',
    hours: null, closed: [], price: 0, note: '隣に宇治十帖モニュメント', warn: '',
  },
  {
    id: 'd1-210', day: 1, order: 210, name: '平等院鳳凰堂', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '平等院',
    hours: { open: '08:30', close: '17:30', raw: '8:30-17:30' }, closed: [], price: 600,
    note: '鳳凰堂内部拝観は別途¥300', warn: '',
  },
  {
    id: 'd1-220', day: 1, order: 220, name: '中村藤吉 平等院店', time: '', kind: 'food',
    works: [], scene: '',
    coords: null, q: '中村藤吉 平等院店',
    hours: null, closed: [], price: 0, note: '抹茶スイーツ', warn: '',
  },
  {
    id: 'd1-230', day: 1, order: 230, name: '宇治川水管橋', time: '夕方', kind: 'seichi',
    works: ['2期9話', '2期OP'],
    scene: 'あすか先輩が『響け！ユーフォニアム』を演奏し、久美子が来て話す河川敷。水管橋の真下に腰掛ける',
    coords: null, q: '宇治川水管橋',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：橋の真下の河川敷を実測する。京阪三室戸駅から徒歩圏', warn: '',
  },
  {
    id: 'd1-240', day: 1, order: 240, name: '大吉山（展望台）', time: '夜', kind: 'seichi',
    works: ['1期8話'], scene: '久美子と麗奈が登った夜景の展望台',
    coords: null, q: '大吉山展望台 宇治',
    hours: null, closed: [], price: 0,
    note: '★座標未確定：展望台の位置を実測する。夜は足元注意・ライト推奨', warn: '',
  },
  {
    id: 'd1-250', day: 1, order: 250, name: '美味処 司', time: '夕食', kind: 'food',
    works: [], scene: '',
    coords: null, q: '美味処 司 宇治',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd1-260', day: 1, order: 260, name: 'あがた祭関連の散歩', time: '夜', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '縣神社 宇治',
    hours: null, closed: [], price: 0, note: '縣神社など、あがた祭ゆかりの場所を夜散歩', warn: '',
  },
  {
    id: 'd1-900', day: 1, order: 900, name: 'ホテルトレンド JR宇治駅前', time: '泊', kind: 'stay',
    works: [], scene: '',
    coords: null, q: 'ホテルトレンド JR宇治駅前',
    hours: null, closed: [], price: 9225, note: '朝夕食なし', warn: '',
  },

  // ===== Day 2 : アクトパル・北区・東山 =====
  {
    id: 'd2-010', day: 2, order: 10, name: 'モグモグベーカリー', time: '朝食', kind: 'food',
    works: [], scene: '',
    coords: null, q: 'モグモグベーカリー 宇治',
    hours: null, closed: [], price: 0, note: 'ベーカリータマキ。パンを買い食い', warn: '',
  },
  {
    id: 'd2-020', day: 2, order: 20, name: 'アクトパル宇治', time: '9:00', kind: 'seichi',
    works: ['2期'], scene: '吹奏楽部の合宿地',
    coords: null, q: 'アクトパル宇治',
    hours: { open: '09:00', close: '17:00', raw: '9:00-17:00' }, closed: [1], price: 8000,
    note: '滞在約1h。公共交通がないので宇治からタクシー（片道約20分・約¥4,000／往復目安¥8,000）。夏期は無料送迎バスが出る日があるので直前に公式サイト確認',
    warn: '聖地見学は事前に管理棟事務所へ問い合わせが必要',
  },
  {
    id: 'd2-030', day: 2, order: 30, name: '廣東餐館 鳳飛', time: '昼食', kind: 'food',
    works: [], scene: '',
    coords: null, q: '廣東餐館 鳳飛',
    hours: { raw: '12:00-13:30 / 17:00-20:00',
             slots: [{ open: '12:00', close: '13:30' }, { open: '17:00', close: '20:00' }] },
    closed: [3], price: 1400,
    note: 'からし鶏・餃子。鳳舞系の京都中華。北大路',
    warn: '昼は12:00–13:30の1時間半のみ。開店直後に入ること',
  },
  {
    id: 'd2-040', day: 2, order: 40, name: '中華のサカイ 本店', time: '', kind: 'food',
    works: [], scene: '',
    coords: null, q: '中華のサカイ 本店 紫野',
    hours: { raw: '土日 11:00-15:30 / 17:00-20:30',
             slots: [{ open: '11:00', close: '15:30' }, { open: '17:00', close: '20:30' }] },
    closed: [1], price: 1380,
    note: '名物の冷麺（通年）。鳳飛と徒歩圏', warn: '',
  },
  {
    id: 'd2-050', day: 2, order: 50, name: '大徳寺', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '大徳寺',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd2-060', day: 2, order: 60, name: 'あぶり餅 本家 根元 かざりや', time: '', kind: 'food',
    works: [], scene: '',
    coords: null, q: 'かざりや 今宮神社',
    hours: null, closed: [3], price: 0, note: '今宮神社門前', warn: '',
  },
  {
    id: 'd2-070', day: 2, order: 70, name: 'ロームシアター京都', time: '', kind: 'seichi',
    works: [], scene: '関西大会の会場',
    coords: null, q: 'ロームシアター京都',
    hours: null, closed: [], price: 0, note: '岡崎', warn: '',
  },
  {
    id: 'd2-080', day: 2, order: 80, name: '平安神宮', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '平安神宮',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd2-090', day: 2, order: 90, name: 'あるぺんローズ', time: '', kind: 'seichi',
    works: [], scene: '久美子が食べていたキャラメルフロートの喫茶店',
    coords: null, q: 'あるぺんローズ 京都市東山区三条通',
    hours: { open: '', close: '18:00', raw: '〜18:00' }, closed: [], price: 0,
    note: '三条通白川橋東入', warn: '18:00閉店。東山へ向かう前に寄る',
  },
  {
    id: 'd2-100', day: 2, order: 100, name: '清水寺', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '清水寺',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd2-110', day: 2, order: 110, name: 'いづう', time: '夜', kind: 'food',
    works: [], scene: '',
    coords: null, q: 'いづう 祇園本店',
    hours: { raw: '月・水〜土 11:00-22:00 / 日祝 11:00-21:00',
             slots: [{ open: '11:00', close: '22:00' }] },
    closed: [2], price: 3240,
    note: '八坂神社石段下の鯖寿司の老舗。鯖姿寿司 1人前6貫¥3,240／1本(2人前)¥6,480', warn: '',
  },
  {
    id: 'd2-120', day: 2, order: 120, name: '山口大亭 東店', time: '夕食', kind: 'food',
    works: [], scene: '',
    coords: null, q: '山口大亭 祇園',
    hours: { open: '17:00', close: '22:00', raw: '17:00-22:00' }, closed: [0], price: 0,
    note: '昭和40年(1965)創業の大衆居酒屋。祇園町北側286', warn: '',
  },
  {
    id: 'd2-130', day: 2, order: 130, name: '先斗町・産寧坂 夜散歩', time: '夜', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '先斗町 京都',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd2-900', day: 2, order: 900, name: 'アパホテル〈京都祇園〉EXCELLENT', time: '泊', kind: 'stay',
    works: [], scene: '',
    coords: null, q: 'アパホテル 京都祇園 EXCELLENT',
    hours: null, closed: [], price: 7500, note: '2026/3/23リニューアル・朝夕食なし', warn: '',
  },

  // ===== Day 3 : 哲学の道 =====
  {
    id: 'd3-010', day: 3, order: 10, name: '朝食（祇園付近・検討）', time: '朝食', kind: 'food',
    works: [], scene: '',
    coords: null, q: '祇園 京都',
    hours: null, closed: [], price: 0, note: '未定', warn: '',
  },
  {
    id: 'd3-020', day: 3, order: 20, name: '八坂神社', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '八坂神社',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd3-030', day: 3, order: 30, name: '知恩院', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '知恩院',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd3-040', day: 3, order: 40, name: '南禅寺', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '南禅寺',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd3-050', day: 3, order: 50, name: '南禅寺下河原町', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '南禅寺下河原町 京都',
    hours: null, closed: [], price: 0, note: '面白そうなエリア', warn: '',
  },
  {
    id: 'd3-060', day: 3, order: 60, name: '永観堂 禅林寺', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '永観堂 禅林寺',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd3-070', day: 3, order: 70, name: '法然院', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '法然院',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd3-080', day: 3, order: 80, name: '昼食（銀閣寺付近・検討）', time: '昼食', kind: 'food',
    works: [], scene: '',
    coords: null, q: '銀閣寺 飲食',
    hours: null, closed: [], price: 0, note: '未定', warn: '',
  },
  {
    id: 'd3-090', day: 3, order: 90, name: '銀閣寺（慈照寺）', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '銀閣寺',
    hours: { open: '08:30', close: '17:00', raw: '8:30-17:00' }, closed: [], price: 1000,
    note: '哲学の道の北端。拝観料¥1,000（2026/4/1改定）', warn: '',
  },
  {
    id: 'd3-100', day: 3, order: 100, name: '京都駅', time: '18:00', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '京都駅',
    hours: null, closed: [], price: 0, note: '', warn: '',
  },
  {
    id: 'd3-110', day: 3, order: 110, name: '京アニショップ 京都駅店', time: '', kind: 'sight',
    works: [], scene: '',
    coords: null, q: '京都アニメーショングッズストア 京都駅',
    hours: null, closed: [], price: 0, note: 'お土産', warn: '',
  },
  {
    id: 'd3-120', day: 3, order: 120, name: '京都 発（新幹線）', time: '19:00', kind: 'move',
    works: [], scene: '',
    coords: null, q: '京都駅',
    hours: null, closed: [], price: 0,
    note: '★新幹線の便は未定', warn: '',
  },
];

/** 座標未確定のスポットを返す（index.html の作業リスト用） */
export const needsCoords = () => SPOTS.filter((s) => !s.coords);

/** 日ごとに order 昇順で取り出す */
export const byDay = (day) =>
  SPOTS.filter((s) => s.day === day).sort((a, b) => a.order - b.order);

/**
 * 訪問日に営業しているかを判定する。
 * @returns {{ok:boolean, reason:string}} ok=false なら定休日に当たっている
 */
export function checkOpen(spot) {
  const d = TRIP.days.find((x) => x.day === spot.day);
  if (!d || !spot.closed || !spot.closed.length) return { ok: true, reason: '' };
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  if (spot.closed.includes(d.dow)) {
    return { ok: false, reason: `${DOW[d.dow]}曜定休` };
  }
  return { ok: true, reason: '' };
}

/** 営業時間の枠が狭いスポット（分単位のしきい値以下）を洗い出す */
export function tightWindow(spot, minutes = 120) {
  if (!spot.hours) return null;
  const slots = spot.hours.slots ||
    (spot.hours.open && spot.hours.close ? [{ open: spot.hours.open, close: spot.hours.close }] : []);
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  for (const s of slots) {
    if (!s.open || !s.close) continue;
    const w = toMin(s.close) - toMin(s.open);
    if (w > 0 && w <= minutes) return { window: w, raw: `${s.open}-${s.close}` };
  }
  return null;
}
