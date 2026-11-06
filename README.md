# SASHecg

SASHecg (pronounced “sash” plus “ECG”) anonymizes one-page ECG reports that arrive together in a single PDF. All of the work happens in the browser. The file is never uploaded.

Use it when a batch of pages puts the patient details in the same upper-left corner. Mark that zone once, apply it to every page, and download a ZIP with one PDF per page.

## Privacy

- There is no backend, account, or telemetry.
- The PDF, the password, and the images stay in this tab’s memory.
- A password, if the file is encrypted, is used only to open it on this device and is not saved.
- Reloading or closing the tab forgets that data.
- Anonymization is permanent. Each page is rasterized (target 220 dpi, within 200–300 when the page size allows), an opaque rectangle is painted over the area, and the result is saved as a one-image PDF. The original text, metadata, and anything under the mask are not copied.
- SASHecg covers only the rectangle you set. It does not search for other names, dates, or numbers that remain visible.

## Requirements

- [Bun](https://bun.sh) 1.1 or newer
- A current browser (Chrome, Edge, Firefox, or Safari)

## Commands

```bash
bun install
bun run dev        # http://127.0.0.1:43123
bun run build
bun run preview
bun run typecheck
bun run lint
bun test
```

`bun test` uses Bun’s test runner. It covers rectangle geometry, file names, page flattening, and an integration case: 100 input pages produce 100 PDFs, the marked text is gone, and the pixels in the target area are replaced.

## Workflow

1. **Upload.** Choose a PDF or drop it. If it is protected, the password is requested on the page. You can also create a three-page synthetic PDF, with no real data, to practice.
2. **Define area.** The starting rectangle covers the upper left (30% of the width and 15.5% of the height). Drag it, use the handles, or type X, Y, width, and height as fractions from 0 to 1. The origin is the top-left of the page as it is displayed. “All pages” applies the same fraction to every sheet. “Exception” stores a different area for the visible page or for the pages you selected.
3. **Review.** Processing builds anonymized thumbnails. Select pages, adjust an exception, and reprocess only those. Shift-click selects a range.
4. **Export.** The ZIP contains `ecg-001.pdf`, `ecg-002.pdf`, and so on, with at least three digits. The ZIP name comes from the original file, for example `report-anonymized.zip`. A second click does not start another download.

“New file” clears the document from this tab.

## How it is built

A single-page app in React, TypeScript, and Vite. Bun installs dependencies, runs the tests, and starts the dev server.

| Piece | Role |
| --- | --- |
| PDF.js | Open the PDF and draw each page, including rotation |
| pdf-lib | Write the output PDF, containing only the masked image |
| fflate | Build the ZIP in the browser |
| Stealth UI | Interface controls |

The interface uses Stealth UI’s light theme, washed with the blush, pink, and lavender pastels `#FCD6F9`, `#FFC6FE`, `#F6B2FF`, `#CEAFFF`, and `#C19BFF`. Text, progress, status, and the mark use a darker plum from that family so the contrast stays readable. Stealth UI is not a single npm package. It is a component registry at `https://www.stealth.pm/r/{name}.json`. The pieces this app uses are copied into `src/components/ui` (button, dropzone, stepper, progress bar, number field, field, input, checkbox, banner, callout, badge, dialog, segmented control, spinner, empty state, scroll area, tooltip, and icon button), plus `src/lib/cn.ts`, `src/lib/motion.ts`, `src/lib/icons.tsx`, and `src/styles/stealth.css`. The shadcn/ui component set is not used. `components.json` points at the `@stealth` registry if you later add another component with `bunx shadcn@latest add @stealth/name`.

The area is stored normalized (0–1) against the page **after rotation**, so an upper-left block stays in the upper left when the size or rotation changes. Pointer coordinates use the page’s CSS box (`getBoundingClientRect`), not the canvas bitmap size.

If a page at 220 dpi would exceed 8 megapixels, or the browser reports memory pressure, the resolution drops and review says so. Pages are processed one at a time, and the run can be cancelled.

## Limitations

- Only what falls inside the rectangle is removed. A note, a name in the margin, or a barcode outside that zone remains visible in the image.
- The output PDF is a picture. It can be viewed and printed, but it no longer has selectable text or the original vector sharpness.
- Very large pages can fall below 200 dpi so the browser does not run out of memory.
- A PDF of several hundred pages uses a lot of RAM because the resulting images are kept until download.
- An encrypted PDF needs its password. SASHecg cannot recover it.
- Output PDFs are new documents and do not copy the source metadata.
- The thumbnail grid shows the anonymized image, not the original file.

## Copy the project to your Mac and GitHub

This project was prepared remotely. No GitHub or Origin repository was created or published. Once the folder is at `~/Documents/breakaway/sash-ecg`:

```bash
cd ~/Documents/breakaway/sash-ecg
bun install
bun test
bun run dev
```

To publish it yourself, create an empty GitHub repository (no README and no license) and, from that folder:

```bash
git init
git add .
git commit -m "Initialize SASHecg"
git branch -M main
git remote add origin git@github.com:YOUR_USER/sash-ecg.git
git push -u origin main
```

If the folder is already a repository, skip `git init`: add the remote and push. Do not upload `node_modules` or `dist`. They are listed in `.gitignore`.

There is no license file.
