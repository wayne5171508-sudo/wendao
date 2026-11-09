#!/bin/sh
# 部署「目前分支」到測試站 wendao-staging（GitHub Pages），不動正式 repo 的 main、不改工作目錄
#   1. 取出目前 HEAD 的檔案（git archive，只含已提交的檔案）到暫存資料夾
#   2. 在暫存資料夾裡改成測試版：
#      - 紅色「測試版」角標、標題【測試】、noindex
#      - manifest 名稱「問道青冥(測試)」、獨立 id、圖示換成 staging/icons（右上紅色「測」）
#      - SW 快取名稱 staging-wendao-<版本>（不能用 wendao- 開頭：正式站更新時會刪掉所有 wendao- 開頭的快取）
#      - localStorage / sessionStorage key 加 staging_ 前綴（正式站與測試站同網域 github.io，存檔會互相覆蓋）
#      - Firebase 設定換成 staging/firebase-config.js（null＝不連雲端）；偵測到正式專案就停止
#   3. 推到 wendao-staging 的 main（強制覆蓋，測試站不保留歷史）
# 用法：在要測的分支、改動都提交後執行  sh deploy-staging.sh
#       DRY=1 sh deploy-staging.sh   只產生測試版檔案並印出路徑，不推送
set -e
cd "$(dirname "$0")"
STAGING_REPO=${STAGING_REPO:-wendao-staging}
PROD_PROJECT=wendao-934c1
git diff --quiet && git diff --cached --quiet || { echo "有未提交的改動，請先提交（測試站只部署已提交的內容）"; exit 1; }
for f in $(grep -oE "'assets/[^']+'" js/asset-list.js | tr -d "'"); do [ -f "$f" ] || { echo "找不到素材：$f"; exit 1; }; done
grep -q "$PROD_PROJECT" staging/firebase-config.js && { echo "staging/firebase-config.js 是正式專案 $PROD_PROJECT 的設定，測試站不可以連正式資料庫"; exit 1; }

BR=$(git rev-parse --abbrev-ref HEAD) SHA=$(git rev-parse --short HEAD) VER=$(date +%Y%m%d%H%M%S)
OWNER=$(gh api user -q .login)
OUT=$(mktemp -d)
git archive HEAD | tar -x -C "$OUT"
cd "$OUT"
rm -f deploy.sh deploy-staging.sh firebase.json database.rules.json   # 部署工具與資料庫規則不放上測試站

# 快取名稱與版本號
sed -i '' "s/^const CACHE = 'wendao-[0-9]*';/const CACHE = 'staging-wendao-$VER';/" sw.js
sed -i '' "s/k.startsWith('wendao-')/k.startsWith('staging-wendao-')/" sw.js
sed -i '' "s/^const ASSET_VER = '[0-9]*';/const ASSET_VER = '$VER';/" js/asset-list.js
grep -q "staging-wendao-$VER" sw.js && grep -q "startsWith('staging-wendao-')" sw.js || { echo "sw.js 沒改到快取名稱，請檢查 CACHE 與 activate 那兩行"; exit 1; }

# 儲存 key：所有 'wendao_ 開頭的 key 加 staging_ 前綴（存檔、備份、音量、開發模式）
sed -i '' "s/'wendao_/'staging_wendao_/g" js/*.js
grep -q "'staging_wendao_idle_v1'" js/state.js || { echo "存檔 key 沒改到，請檢查 js/state.js 的 SAVE_KEY"; exit 1; }

# Firebase：整段 FIREBASE_CFG 換成測試站設定
perl -0pi -e 'BEGIN { local $/; open my $f, "<", "staging/firebase-config.js" or die; $c = <$f>; $c =~ s{^\s*//.*\n}{}mg; } s/const FIREBASE_CFG = \{.*?\};\n/$c/s' js/cloud.js
grep -q "$PROD_PROJECT" js/cloud.js && { echo "js/cloud.js 仍含正式 Firebase 設定，停止部署"; exit 1; }
grep -q "^const FIREBASE_CFG = " js/cloud.js || { echo "js/cloud.js 找不到 FIREBASE_CFG，停止部署"; exit 1; }

# 外觀：標題、角標、noindex、manifest、圖示
TAG='<div id="stagingTag" style="position:fixed;top:max(6px,env(safe-area-inset-top));left:6px;z-index:2147483647;pointer-events:none;background:#d81e28;color:#fff;font:700 12px/1 sans-serif;padding:4px 7px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.5)">測試版</div>'
sed -i '' "s|<title>問道青冥</title>|<title>【測試】問道青冥</title><meta name=\"robots\" content=\"noindex\">|" index.html
sed -i '' "s|<body\([^>]*\)>|<body\1>$TAG|" index.html
grep -q 'stagingTag' index.html && grep -q '【測試】' index.html || { echo "index.html 沒改到標題或角標"; exit 1; }
sed -i '' -e 's/"name": "問道青冥"/"name": "問道青冥(測試)"/' -e 's/"short_name": "問道青冥"/"short_name": "問道青冥(測試)", "id": "wendao-staging"/' manifest.webmanifest
grep -q '問道青冥(測試)' manifest.webmanifest || { echo "manifest 沒改到名稱"; exit 1; }
cp staging/icons/*.png icons/ && rm -rf staging
echo "{\"branch\":\"$BR\",\"commit\":\"$SHA\",\"ver\":\"$VER\"}" > staging.json

[ "$DRY" = 1 ] && { echo "試跑完成（未推送）：$OUT"; exit 0; }
git init -q -b main && git add -A && git commit -qm "staging $VER：$BR@$SHA"
git push -qf "https://github.com/$OWNER/$STAGING_REPO.git" main
echo "已部署 $BR@$SHA 到測試站：https://$OWNER.github.io/$STAGING_REPO/（約 1 分鐘後生效）"
rm -rf "$OUT"
