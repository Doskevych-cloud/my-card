### CODEOWNERS — README

GitHub файл `.github/CODEOWNERS` визначає, хто **обов'язково має ревьювити**
PR на конкретні файли. Працює разом з **Branch Protection** на `main`.

## Налаштування (одноразово)

1. Заміни `@COLLEAGUE_USERNAME` у `CODEOWNERS` на реальний GitHub username
   твого співробітника (без email, тільки `@username`).

2. Додай цього співробітника як **collaborator** у репозиторій:
   - GitHub → Settings → Collaborators → Add people → пошук по username

3. Увімкни Branch Protection для `main`:
   - GitHub → Settings → Branches → Add rule
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1)
   - ✅ Require review from Code Owners
   - ✅ Restrict who can push to matching branches → лише ти

## Як співробітник тепер працює

```bash
git clone https://github.com/Doskevych-cloud/my-card
cd my-card
git checkout -b feat/my-new-report
# редагує reports.html
git add reports.html && git commit -m "новий звіт XYZ"
git push -u origin feat/my-new-report
# відкриває PR на GitHub → ти review → merge
```

Якщо він спробує змінити будь-який інший файл (`finance.html`, `header.js`,
`auth.js` тощо), GitHub автоматично заблокує merge до твого approve.
