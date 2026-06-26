#!/usr/bin/env bash
# 把 monorepo 的 aitalky-parent / aitalky-web 两个子目录镜像同步到各自的独立分仓。
#
# 真相源 = 本 monorepo(~/work/aitalky)。开发只在这里进行;分仓是只读镜像,
# 不要直接在分仓改代码——下次同步会覆盖。
#
# 用法:在 monorepo 正常提交后执行
#   bash tools/sync-split-repos.sh
#
# 行为:从 monorepo HEAD 导出子树(仅已跟踪文件,自动排除 target/node_modules),
# 覆盖到分仓工作区(保留分仓自己的 .git / CLAUDE.md / .gitignore),有变化才提交+推送。
set -euo pipefail

MONO=/Users/macintoshhd/work/aitalky

sync_one() {
  sub="$1"; dest="$2"
  echo "── 同步 ${sub} → ${dest}"
  if [ ! -d "${dest}/.git" ]; then echo "  ✗ ${dest} 不是 git 仓库,跳过"; return; fi
  # 清掉分仓里除 .git / CLAUDE.md / .gitignore 外的全部内容(让 monorepo 的"删除"也能同步过去)
  find "${dest}" -mindepth 1 -maxdepth 1 \
    ! -name .git ! -name CLAUDE.md ! -name .gitignore -exec rm -rf {} +
  # 从 monorepo HEAD 导出子树并展开到分仓
  git -C "${MONO}" archive "HEAD:${sub}" | tar -x -C "${dest}"
  # 有变化才提交、推送
  git -C "${dest}" add -A
  if git -C "${dest}" diff --cached --quiet; then
    echo "  = 无变化,跳过"
  else
    git -C "${dest}" -c user.name=negan -c user.email=neganpub@gmail.com \
      commit -q -m "chore: sync from monorepo @ ${SRC_HASH}

${SRC_SUBJ}

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
    git -C "${dest}" push -q origin master
    echo "  ✓ 已提交并推送"
  fi
}

cd "${MONO}"
# 要求 monorepo 干净,避免漏掉未提交改动
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ monorepo 有未提交改动,请先在 monorepo 提交后再同步。"; exit 1
fi
SRC_HASH="$(git rev-parse --short HEAD)"
SRC_SUBJ="$(git log -1 --format=%s)"

sync_one aitalky-parent /Users/macintoshhd/work/aitalky-parent
sync_one aitalky-web    /Users/macintoshhd/work/aitalky-web

echo "✅ 同步完成(源 monorepo @ ${SRC_HASH})"
