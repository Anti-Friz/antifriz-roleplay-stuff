# Build Scripts

## build-release.ps1

Автоматизований скрипт для створення релізу модуля Foundry VTT.

### Функції

- ✅ Автоматична інкрементація patch версії (0.0.x)
- ✅ Оновлення `module.json`
- ✅ Створення Git commit і tag
- ✅ **Автоматичний push до GitHub**
- ✅ Створення архіву `module.zip`
- ✅ Створення GitHub релізу (опціонально)

### Порядок виконання

1. Інкрементує версію в `module.json`
2. Створює Git commit `"Release v0.0.x"`
3. Створює Git tag `v0.0.x`
4. **Пушить зміни до GitHub** (`git push && git push --tags`)
5. Збудовує `module.zip`
6. (Опціонально) Створює GitHub Release з архівом

---

### Використання

#### Базове використання (повний автоматичний реліз)

```powershell
.\scripts\build-release.ps1
```

**Що робить:**

1. Інкрементує patch версію (0.0.1 → 0.0.2)
2. Оновлює `module.json`
3. Створює commit і tag
4. **Пушить до GitHub**
5. Створює `module.zip`

**Після виконання:**

- Версія оновлена і запушена ✅
- Архів готовий ✅
- GitHub release можна створити окремо

---

#### Повний автоматичний реліз з GitHub Release

```powershell
.\scripts\build-release.ps1 -CreateGitHubRelease
```

**Вимоги:**

- Встановлений [GitHub CLI](https://cli.github.com/)
- Авторизація: `gh auth login`

**Що робить:**

1. Все з базового варіанту
2. **Пушить зміни**
3. Створює GitHub Release
4. Завантажує `module.zip` до релізу

**🎉 Після виконання модуль повністю випущений!**

---

#### З кастомними release notes

```powershell
$notes = @"
## ✨ Нові фічі
- Централізована система permissions
- Dual volume controls (GM + Players)
- Broadcast target selector

## 🐛 Виправлення
- Виправлена помилка при зупинці музики
- Broadcast dropdown тепер працює коректно

## 📚 Технічне
- Рефакторинг broadcast системи
- Додано утиліти для діалогів та FilePicker
"@

.\scripts\build-release.ps1 -CreateGitHubRelease -ReleaseNotes $notes
```

---

#### Без інкрементації версії

```powershell
.\scripts\build-release.ps1 -NoVersionBump
```

Використовуй якщо вже вручну оновив версію або просто хочеш перестворити архів.

---

#### Без автоматичного push (для перевірки)

```powershell
.\scripts\build-release.ps1 -SkipPush
```

Створює commit і tag локально, але не пушить. Корисно для перевірки перед публікацією.

---

### Параметри

| Параметр | Тип | Опис |
| ---------- | ----- | ------ |
| `-NoVersionBump` | switch | Не інкрементувати версію |
| `-CreateGitHubRelease` | switch | Створити GitHub Release |
| `-ReleaseNotes` | string | Кастомні release notes (markdown) |
| `-SkipPush` | switch | Не пушити до GitHub (тільки локальний commit/tag) |

---

### Встановлення GitHub CLI (опціонально)

#### Windows

```powershell
winget install GitHub.cli
```

#### Авторизація

```powershell
gh auth login
```

---

### Workflow для нового релізу

#### Варіант 1: Простий (без GitHub Release)

```powershell
# 1. Закоміть всі поточні зміни
git add .
git commit -m "feat: додав нову фічу"

# 2. Запусти build скрипт
.\scripts\build-release.ps1

# 3. Готово! Версія оновлена і запушена
# 4. Створи GitHub Release вручну на https://github.com/Anti-Friz/antifriz-roleplay-stuff/releases
```

#### Варіант 2: Повний автоматичний

```powershell
# 1. Закоміть всі поточні зміни
git add .
git commit -m "feat: додав нову фічу"

# 2. Запусти build скрипт з GitHub Release
.\scripts\build-release.ps1 -CreateGitHubRelease -ReleaseNotes "Опис змін"

# 3. Готово! 🎉 Модуль випущений на GitHub
```

---

### Troubleshooting

#### "GitHub CLI (gh) not found"

```powershell
winget install GitHub.cli
```

#### "Not authenticated with GitHub CLI"

```powershell
gh auth login
```

#### "Version format should be X.Y.Z"

Переконайся що в `module.json` версія має формат `"version": "0.0.1"` (3 числа через крапку).

#### "You have uncommitted changes"

Скрипт знайшов незакомічені файли (крім `module.json`). Можеш:

- Закомітити їх: `git add . && git commit -m "..."`
- Або продовжити реліз з ними (скрипт запитає підтвердження)

#### "Error pushing to remote"

Перевір інтернет з'єднання та доступ до GitHub. Можна запушити вручну:

```powershell
git push && git push --tags
```

---

### Приклади

#### Швидкий патч

```powershell
# Виправив баг, хочу швидко випустити patch
.\scripts\build-release.ps1

# Версія оновлена, запушена, архів готовий
# GitHub Release створи вручну або додай -CreateGitHubRelease
```

#### Повний автоматичний реліз

```powershell
# Все одразу: версія, push, архів, GitHub Release
.\scripts\build-release.ps1 -CreateGitHubRelease -ReleaseNotes "🐛 Hotfix: виправлено критичний баг"
```

#### Перевірка перед релізом

```powershell
# Створити все локально без push
.\scripts\build-release.ps1 -SkipPush

# Перевірити, потім запушити вручну
git push && git push --tags
```

#### Тільки архів (версію вже оновив вручну)

```powershell
.\scripts\build-release.ps1 -NoVersionBump
```

---

### Важливі нюанси

1. **Push перед GitHub Release**: Скрипт спочатку пушить зміни, а потім створює release. Це гарантує що tag існує на GitHub.

2. **Перевірка незакомічених змін**: Скрипт попереджає про незакомічені файли і дає змогу скасувати реліз.

3. **Автоматичне оновлення download URL**: Якщо `download` в `module.json` містить версію (наприклад `/v0.0.1/`), вона автоматично оновиться.

4. **Безпека**: З `-SkipPush` можна перевірити все локально перед публікацією.
