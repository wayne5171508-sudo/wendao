#!/bin/sh
# 把 assets/audio/ 的 pz_／atk_／fx_／sk_／gacha_*.mp3 裡還沒列進 js/asset-list.js 的檔案補進清單（放在 bgm_pz_battle 後面）
# deploy.sh、deploy-staging.sh 會自動執行；也可手動跑：sh sync-asset-list.sh [專案資料夾]
set -e
cd "${1:-$(dirname "$0")}"
perl -0pi -e '
  my $l = $_; my @new = grep { index($l, "\x27$_\x27") < 0 } sort map { glob("assets/audio/${_}_*.mp3") } qw(pz atk fx sk gacha);
  my $ins = join "", map { "  \x27$_\x27,\n" } @new;
  s/^(  \x27assets\/audio\/bgm_pz_battle\.mp3\x27,\n)/$1$ins/m or die "js/asset-list.js 找不到 bgm_pz_battle 那一行\n";
  print STDERR "已加入素材清單：$_\n" for @new;
' js/asset-list.js
