# My Work

A free website for my school work and projects. Anyone can view and download. Only I can change it.

## Put it online (one time)

1. On GitHub, make a new **public** repository, for example `my-work`.
2. In this folder, run:
   ```
   git init -b main
   git add .
   git commit -m "First version"
   git remote add origin https://github.com/YOUR-NAME/my-work.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source → GitHub Actions**.
4. Wait about a minute. Your site is at `https://YOUR-NAME.github.io/my-work/`.

## Add a PDF

1. On GitHub, open the folder for the class: `files/french`, `files/advanced-functions`, `files/science`, `files/business` or `files/software`.
2. **Add file → Upload files**, drop the PDF, then **Commit changes**.
3. Wait about a minute. It shows up on the site.

The title comes from the file name (`Unit_3-Functions.pdf` becomes "Unit 3 Functions").
To add a short description, upload a text file with the same name: `Unit_3-Functions.txt`.

To update a PDF, upload a new one with the same file name.
To remove one, open it on GitHub and click the trash icon.

## Add a Claude artifact

1. In Claude, share the artifact so it is **public**. If you skip this, visitors cannot open it.
2. On GitHub, open `site.json` and click the pencil icon.
3. Add an entry to `"links"`:
   ```json
   {
     "section": "software",
     "title": "Name of the artifact",
     "description": "One short sentence.",
     "url": "https://claude.ai/...",
     "date": "2026-10-19"
   }
   ```
   `section` is one of: `french`, `advanced-functions`, `science`, `business`, `software`.
4. Commit. Delete the example entry that came with the site.

## Change the title, tagline or sections

Edit `site.json`. A new section also needs a folder `files/<slug>/` for its PDFs.

## Preview on your own computer

```
python3 scripts/build_index.py
python3 -m http.server
```
Then open http://localhost:8000.

## Limits

- GitHub's web upload accepts files up to 25 MB. Use `git push` for bigger ones (limit 100 MB).
- Keep the repository public. GitHub Pages is free for public repositories.
