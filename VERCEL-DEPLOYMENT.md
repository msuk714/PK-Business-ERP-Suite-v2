# Vercel Deployment

## Recommended GitHub workflow

```bash
git init
git add .
git commit -m "PK Business ERP Suite v2 BRD client demo"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Then import the repository in Vercel as a Next.js project and deploy using the default configuration.

## Vercel CLI workflow

```bash
npm install
npm run build
npx vercel
npx vercel --prod
```

The CLI will request Vercel authentication and project/team selection. No environment variables are required for the LocalStorage demo.
