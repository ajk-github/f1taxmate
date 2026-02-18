# Deploy & push to GitHub

Use this guide to clean the repo and push **f1tax** to GitHub for the first time.

---

## 1. Clean the repo (one-time)

- **Delete build output** so it isn’t committed:
  ```bash
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  ```
- **Keep `.env` out of Git** — it’s already in `.gitignore`. Never commit real keys.
---

## 2. Create the GitHub repo (no local Git yet)

1. Go to [github.com](https://github.com) and sign in.
2. Click **New repository**.
3. Set:
   - **Repository name:** `f1tax` (or any name you prefer).
   - **Visibility:** Private or Public.
   - **Do not** add a README, .gitignore, or license (you already have them locally).
4. Click **Create repository**. Leave the page open; you’ll need the repo URL (e.g. `https://github.com/YOUR_USERNAME/f1tax.git`).

---

## 3. Initialize Git and push from your machine

In PowerShell (or your terminal), from the project root (e.g. `C:\Users\Abdul Jaleel Khan\OneDrive\Desktop\f1tax`):

```powershell
# 1. Initialize Git (if not already)
git init

# 2. Stage all files (respects .gitignore)
git add .

# 3. First commit
git commit -m "Initial commit: F1 tax form app (Next.js, Stripe, PDF generation)"

# 4. Rename branch to main (optional; GitHub default is main)
git branch -M main

# 5. Add GitHub as remote (replace YOUR_USERNAME and f1tax with your repo)
git remote add origin https://github.com/YOUR_USERNAME/f1tax.git

# 6. Push to GitHub
git push -u origin main
```

If GitHub prompts for auth, use a **Personal Access Token** (Settings → Developer settings → Personal access tokens) as the password, or set up SSH and use the SSH URL instead of `https://`.

---

## 4. After first push

- **Env vars for production:** On Vercel/Netlify/your host, set:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - For email: `RESEND_API_KEY` (or whatever your send-forms API uses)
- **PDF templates:** Ensure `public/forms/` has the fillable PDFs the app expects (e.g. `FICA_forms/f843.pdf`, `FICA_forms/f8316.pdf`, `federal_forms/`, `illinois_forms/`). If any are missing, add them and commit, or document where to get them in the README.

---

## Quick checklist

- [ ] `.next` removed / not committed (in `.gitignore`)
- [ ] `.env` not committed (in `.gitignore`)
- [ ] GitHub repo created (empty, no README/gitignore)
- [ ] `git init` and `git add .` and `git commit` done
- [ ] `git remote add origin <url>` and `git push -u origin main` done
- [ ] Production env vars set on your hosting platform
