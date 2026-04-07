## Git Commit Message Standards

### Commit Message Format
- Use clear, concise one-liner commit messages
- Keep messages descriptive and meaningful
- Use present tense, imperative mood ("add feature" not "added feature")
- Maximum length: **72 characters** for optimal git log display

### Commit Message Prefixes
- **feat:** new features or functionality
- **fix:** bug fixes and corrections
- **refactor:** code refactoring without changing functionality
- **perf:** performance improvements
- **docs:** documentation changes
- **test:** adding or updating tests
- **chore:** maintenance tasks, dependencies, tooling changes
- **style:** code style changes (formatting, missing semicolons, etc.)
- **ci:** continuous integration changes
- **build:** build system or external dependency changes

### Commit Message Examples
- `feat: add krisflyer miles calculation utility`
- `fix: resolve booking form field syntax error`
- `refactor: centralize payment processing logic`
- `perf: optimize database query for large datasets`
- `test: add unit tests for promo validation`
- `docs: update API documentation for booking endpoints`
- `chore: upgrade ruff to latest version`

### Commit Message Guidelines
- Start with appropriate prefix followed by colon and space
- Use lowercase for the description after the prefix
- No period at the end of the message
- Focus on **what** and **why**, not **how**
- Reference issue numbers when applicable: `fix: resolve #123 booking error`



Generate a git commit message for staged changes in a given directory.

Steps:
1. If a directory argument was provided (e.g. `/commit pelago-worker`), use that path. Otherwise, present the user with this numbered list and ask them to choose:
   ```
   Which directory should I commit in?
   
   ```
   Wait for the user to reply with a name, then resolve it to the full path from the current directory.
2. `cd` into that directory
3. Run `git diff --cached` to see all staged changes. If nothing is staged, run `git diff` and inform the user that no changes are staged
4. Run `git log --oneline -5` to understand recent commit style/conventions
5. Analyze the changes and generate a commit message following the rules above
6. Display the proposed commit message — do NOT run `git commit`
