# My music site

## One-time setup
1. On GitHub, create a **public** repository (for example `my-music`).
2. Upload everything in this folder to it, including the `audio` folder and the hidden `.github` folder.
   - If the `.github` folder won't upload, use **Add file → Create new file**, type `.github/workflows/deploy.yml` as the name, and paste in the contents of that file.
3. Go to **Settings → Pages**. Under **Source**, choose **GitHub Actions**.
4. Open the **Actions** tab and wait for "Build and publish the site" to turn green (about a minute). Your link appears in Settings → Pages.

## Add a song
1. Name the file **`Artist - Song title.mp3`** (a space, a dash, a space between the artist and the title).
2. In the repo, open the `audio` folder → **Add file → Upload files** → commit.
3. Wait about a minute. The site updates by itself, and the artist name shows on the song.

## Remove a song
Open the file in the `audio` folder → click the **⋯** menu → **Delete file** → commit.

## Change an artist name or title
Open the file in `audio` → **⋯ → Rename** → fix the name → commit.

## Change the look
Edit `theme.css`. The colours and fonts are at the top, with notes. The 3D background colours are marked COLOURS near the top of `fx.js`. Headline and intro text are in `index.html`, marked with ✏️.

## Good to know
- Songs play in the order you added them.
- The browser upload limit is 25 MB per file. For bigger files, use GitHub Desktop or git.
- Anyone can download the MP3s from a public repo.
