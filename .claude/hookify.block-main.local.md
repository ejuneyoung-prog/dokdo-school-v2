---
name: block-main-push-merge
enabled: true
event: bash
pattern: git\s+push\b[^;&|]*[\s:+](refs/heads/)?main(\s|$|;|&|\|)|gh\s+pr\s+merge\b|gh\s+api\b[^;&|]*/merges?\b|git\s+(checkout|switch)\s+main\b[^;]*&&[^;]*git\s+merge\b
action: block
---

main 병합은 교수님이 직접 합니다.

main에 직접 올리거나(git push ... main) main으로 병합하는(gh pr merge, gh api .../merge, main에서 git merge) 명령은 실행하지 않습니다.
브랜치에 올리고 PR 링크를 교수님께 드리세요.
