#!/bin/sh
# 部署《問道青冥》到 GitHub Pages（Pages 直接發佈 main 分支）
#   1. 檢查 js/asset-list.js 列的素材都存在
#   2. 把 sw.js 與 asset-list.js 的版本號改成現在時間：玩家下次開遊戲就會換掉舊快取（同檔名換圖也會更新）
#   3. 提交並推上 main
# 用法：在 main 分支、改動都提交後執行  sh deploy.sh
#       DRY=1 sh deploy.sh   只改版本號、不提交不推送（試跑）
set -e
cd "$(dirname "$0")"
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "請先切到 main 分支"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "有未提交的改動，請先提交"; exit 1; }
for f in $(grep -oE "'assets/[^']+'" js/asset-list.js | tr -d "'"); do [ -f "$f" ] || { echo "找不到素材：$f"; exit 1; }; done
VER=$(date +%Y%m%d%H%M%S)
sed -i '' "s/^const CACHE = 'wendao-[0-9]*';/const CACHE = 'wendao-$VER';/" sw.js
sed -i '' "s/^const ASSET_VER = '[0-9]*';/const ASSET_VER = '$VER';/" js/asset-list.js
grep -q "wendao-$VER" sw.js || { echo "sw.js 的版本號沒改到，請檢查 CACHE 那一行"; exit 1; }
[ "$DRY" = 1 ] && { echo "試跑完成：版本號已改為 $VER（未提交）"; exit 0; }
git commit -qam "deploy $VER"
git push -q origin main
echo "已部署 $VER：https://$(gh api user -q .login).github.io/wendao/"
