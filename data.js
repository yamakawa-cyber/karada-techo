// 種目データ（たたき台。浩二さん監修待ち）。load=負荷がかかる部位（今日痛いとこで除外に使う）
// met: Compendium of Physical Activities (2011/2024) / 国立健康・栄養研究所「改訂版 身体活動のメッツ表」
const AREAS={lowback:'腰',neck:'首',shoulder:'肩',knee:'膝',hip:'股関節',wrist:'手首',ankle:'足首'};
const CATS={strength:'筋トレ',stretch:'ストレッチ',mobility:'体操・姿勢',care:'腰・肩ケア'};
const MET={strength:3.8,strength_hard:8.0,stretch:2.3,mobility:2.8,care:2.3};
const EX=[
{id:'squat',name:'スクワット',cat:'strength',target:'太もも・お尻',load:['knee','hip','lowback'],unit:'reps',base:10,step:2,levels:['椅子スクワット','スクワット','ゆっくりスクワット(3秒下げ)','ブルガリアンスクワット'],steps:['足を肩幅に開く','お尻を後ろへ引いて腰を下ろす','膝はつま先と同じ向き','かかとで押して立つ'],cautions:['膝が内に入らない','腰を丸めない'],stop:['膝に鋭い痛み']},
{id:'pushup',name:'腕立て伏せ',cat:'strength',target:'胸・腕・体幹',load:['shoulder','wrist'],unit:'reps',base:8,step:2,levels:['壁腕立て','膝つき腕立て','腕立て伏せ','足上げ腕立て'],steps:['手は肩幅より少し広く','頭からかかとまで一直線','胸を床に近づけて押し返す'],cautions:['腰を反らさない'],stop:['肩・手首の痛み']},
{id:'glutebridge',name:'ヒップリフト',cat:'strength',target:'お尻・もも裏',load:['lowback'],unit:'reps',base:12,step:2,levels:['両足ヒップリフト','3秒キープ','片足ヒップリフト'],steps:['仰向けで膝を立てる','お尻を持ち上げ肩〜膝を一直線','ゆっくり下ろす'],cautions:['腰を反りすぎない'],stop:['腰の痛み']},
{id:'plank',name:'プランク',cat:'strength',target:'体幹',load:['shoulder','lowback'],unit:'sec',base:20,step:5,levels:['膝つきプランク','プランク','片手上げプランク'],steps:['肘を肩の真下につく','頭からかかとまで一直線','呼吸は止めない'],cautions:['お尻を上げすぎ・下げすぎない'],stop:['腰の痛み']},
{id:'birddog',name:'バードドッグ',cat:'strength',target:'体幹・背中',load:['wrist'],unit:'reps',base:8,step:2,levels:['手だけ/足だけ','対角の手足','対角＋2秒キープ'],steps:['四つ這い','右手と左足をまっすぐ伸ばす','戻して反対側'],cautions:['腰を反らさない'],stop:['腰の痛み']},
{id:'lunge',name:'後ろランジ',cat:'strength',target:'太もも・お尻',load:['knee','hip'],unit:'reps',base:8,step:2,levels:['支えありランジ','後ろランジ','ゆっくり後ろランジ'],steps:['片足を後ろへ引く','後ろ膝を床に近づける','前足で押して戻る'],cautions:['前膝はつま先より出しすぎない'],stop:['膝の痛み']},
{id:'calfraise',name:'かかと上げ',cat:'strength',target:'ふくらはぎ',load:['ankle'],unit:'reps',base:15,step:3,levels:['両足','両足ゆっくり','片足'],steps:['壁に軽く手を添える','かかとを上げて1秒止める','ゆっくり下ろす'],cautions:[],stop:['アキレス腱の痛み']},
{id:'superman',name:'うつ伏せ背中上げ',cat:'strength',target:'背中',load:['lowback','neck'],unit:'reps',base:8,step:2,levels:['腕だけ上げ','手足を少し上げ','2秒キープ'],steps:['うつ伏せ','胸と手を少しだけ浮かす','ゆっくり下ろす'],cautions:['高く上げない・首は前を見ない'],stop:['腰の痛み']},
{id:'deadbug',name:'デッドバグ',cat:'strength',target:'お腹・体幹',load:[],unit:'reps',base:8,step:2,levels:['足だけ','対角の手足','ゆっくり対角'],steps:['仰向けで手足を上へ','腰を床につけたまま対角の手足を伸ばす','戻して反対側'],cautions:['腰を浮かさない'],stop:['腰の痛み']},
{id:'tuberow',name:'チューブローイング',cat:'strength',target:'背中・姿勢',load:['shoulder'],unit:'reps',base:12,step:2,equip:'tube',levels:['軽いチューブ','中チューブ','強チューブ'],steps:['チューブを足にかける','肩甲骨を寄せて引く','ゆっくり戻す'],cautions:['肩をすくめない'],stop:['肩の痛み']},
{id:'dbrdl',name:'ダンベル ルーマニアンデッドリフト',cat:'strength',target:'もも裏・お尻',load:['lowback','hip'],unit:'reps',base:10,step:2,equip:'dumbbell',levels:['軽め','中','重め'],steps:['膝を軽く曲げる','背中まっすぐでお尻を引く','もも裏の伸びを感じて戻る'],cautions:['背中を丸めない'],stop:['腰の痛み']},
{id:'catcow',name:'キャット＆カウ',cat:'mobility',target:'背骨・姿勢',load:['wrist'],unit:'reps',base:8,step:2,levels:['小さく','大きく'],steps:['四つ這い','息を吐いて背中を丸める','吸って胸を開く'],cautions:['痛くない範囲で'],stop:['腰の痛み']},
{id:'thoracicrot',name:'胸ひらき（胸椎回旋）',cat:'mobility',target:'胸・背中',load:[],unit:'reps',base:6,step:2,levels:['横向き寝','四つ這い'],steps:['横向きに寝て膝を曲げる','上の腕を後ろへ開く','目で手を追う'],cautions:['腰は動かさない'],stop:['肩の痛み']},
{id:'wallangel',name:'壁エンジェル',cat:'mobility',target:'肩・姿勢',load:['shoulder'],unit:'reps',base:8,step:2,levels:['小さく','大きく'],steps:['壁に背中・頭をつける','腕をWの形から上へ滑らせる','ゆっくり戻す'],cautions:['腰を反らさない'],stop:['肩の痛み']},
{id:'armcircle',name:'肩回し',cat:'mobility',target:'肩',load:[],unit:'reps',base:10,step:2,levels:['前後10回'],steps:['指先を肩に置く','肘で大きく円を描く','前後とも'],cautions:[],stop:['肩の痛み']},
{id:'radio',name:'その場足踏み体操',cat:'mobility',target:'全身',load:['knee','ankle'],unit:'sec',base:60,step:15,levels:['足踏み','もも上げ'],steps:['腕をふってその場で足踏み','慣れたらもも上げ'],cautions:['床が滑らないか確認'],stop:['膝の痛み','息苦しさ']},
{id:'hamstretch',name:'もも裏ストレッチ',cat:'stretch',target:'もも裏・腰',load:[],unit:'sec',base:30,step:5,levels:['座って'],steps:['座って片足を伸ばす','背中をのばしたまま前へ倒す'],cautions:['反動をつけない'],stop:['しびれ']},
{id:'hipflexor',name:'股関節前ストレッチ',cat:'stretch',target:'股関節前・腰',load:['knee'],unit:'sec',base:30,step:5,levels:['片膝立ち'],steps:['片膝立ち','骨盤を前へ押し出す','腰は反らさない'],cautions:['膝の下にタオル'],stop:['膝の痛み']},
{id:'figure4',name:'お尻ストレッチ',cat:'stretch',target:'お尻・腰',load:['hip'],unit:'sec',base:30,step:5,levels:['仰向け'],steps:['仰向けで足を4の字に組む','下の足を胸へ引き寄せる'],cautions:[],stop:['股関節の痛み']},
{id:'chest',name:'胸ストレッチ',cat:'stretch',target:'胸・肩',load:['shoulder'],unit:'sec',base:30,step:5,levels:['壁'],steps:['壁に前腕をつける','体を反対へひねる'],cautions:[],stop:['肩の痛み・しびれ']},
{id:'calfstretch',name:'ふくらはぎストレッチ',cat:'stretch',target:'ふくらはぎ',load:[],unit:'sec',base:30,step:5,levels:['壁押し'],steps:['壁を押して片足を後ろへ','かかとを床につける'],cautions:[],stop:['痛み']},
{id:'chintuck',name:'あご引き',cat:'care',target:'首・姿勢',load:[],unit:'reps',base:10,step:2,levels:['座って','寝て'],steps:['背筋をのばす','あごを真後ろへ引く','5秒止める'],cautions:['下を向かない'],stop:['首の痛み・しびれ']},
{id:'necksd',name:'首の横ストレッチ',cat:'care',target:'首・肩',load:[],unit:'sec',base:20,step:5,levels:['左右'],steps:['頭を横へ倒す','反対の肩を下げる'],cautions:['引っ張りすぎない'],stop:['しびれ']},
{id:'scapsq',name:'肩甲骨寄せ',cat:'care',target:'肩・背中',load:[],unit:'reps',base:10,step:2,levels:['座って'],steps:['肘を曲げて胸を張る','肩甲骨を寄せて3秒'],cautions:['肩をすくめない'],stop:['痛み']},
{id:'pelvictilt',name:'骨盤ゆらし',cat:'care',target:'腰',load:[],unit:'reps',base:10,step:2,levels:['仰向け'],steps:['仰向けで膝を立てる','腰を床に押しつけ・戻す'],cautions:['小さな動きでOK'],stop:['腰の痛み']},
{id:'kneerock',name:'膝かかえゆらし',cat:'care',target:'腰・お尻',load:[],unit:'sec',base:30,step:5,levels:['両膝'],steps:['仰向けで両膝を胸へ','左右にゆらす'],cautions:[],stop:['痛み']},
{id:'quadset',name:'膝のばし体操',cat:'care',target:'膝・太もも前',load:[],unit:'reps',base:10,step:2,levels:['座って'],steps:['足をのばして座る','膝裏を床に押しつけ5秒'],cautions:[],stop:['膝の痛み']},
];
// セッション型（4週ブロックで順番に回す）
const SESSIONS={
 A:{name:'筋トレA（下半身＋体幹）',items:['squat','glutebridge','plank','deadbug','calfraise','hamstretch'],sets:2},
 B:{name:'筋トレB（上半身＋背中）',items:['pushup','birddog','superman','lunge','tuberow','chest'],sets:2},
 M:{name:'ほぐし・姿勢（10分）',items:['catcow','thoracicrot','wallangel','chintuck','pelvictilt','hipflexor','figure4'],sets:1},
 Q:{name:'すきま5分ケア',items:['armcircle','scapsq','necksd','kneerock','quadset'],sets:1},
};
