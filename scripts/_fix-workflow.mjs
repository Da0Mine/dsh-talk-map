import fs from 'node:fs'
const f = '.github/workflows/publish.yml'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `# 用 npm Trusted Publishing（OIDC）发布：不存任何 token，也不需要一次性密码。
# 触发方式：推一个 v* 标签（或在 Actions 页面手动 Run workflow）。
on:
  push:
    tags: ['v*']
  workflow_dispatch:`,
  `# 用 npm Trusted Publishing（OIDC）发布：不存任何 token，也不需要一次性密码。
#
# 只保留手动触发：发布是在本机用 npm CLI 完成的，创建 GitHub Release 时会自动打 v* 标签，
# 那个标签以前会触发这里，于是每次发版都跑一遍 `npm publish` → "cannot publish over
# previously published version" → 失败邮件。现在改成只在 Actions 页面手动点。
on:
  workflow_dispatch:`,
)
t = t.replace(
  `      - name: Publish to npm
        run: npm publish --access public --provenance`,
  `      - name: Skip when this version already exists on npm
        id: exists
        run: |
          version=$(node -p "require('./package.json').version")
          echo "version=$version" >> "$GITHUB_OUTPUT"
          if npm view "dsh-talk-map@$version" version >/dev/null 2>&1; then
            echo "published=true" >> "$GITHUB_OUTPUT"
            echo "dsh-talk-map@$version 已存在，跳过发布"
          else
            echo "published=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Publish to npm
        if: steps.exists.outputs.published == 'false'
        run: npm publish --access public --provenance`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('publish.yml: 去掉 tag 触发 + 版本已存在则跳过')
