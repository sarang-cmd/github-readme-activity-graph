<p align="center">
    <img src="asset/logo.svg" height="150" alt="GitHub Readme Activity Graph logo" />
</p>

<h1 align="center">GitHub Readme Activity Graph</h1>

<p align="center">
    <em>A dynamically generated activity graph to show your GitHub activities of the last 31 days.</em>
</p>

---

## ⚠️ Please read this first

**This is not my work. Not even a little bit.**

This repository is a fork of the original
[`Ashutosh00710/github-readme-activity-graph`](https://github.com/Ashutosh00710/github-readme-activity-graph)
by **Ashutosh Dwivedi**. Every meaningful line of code, every feature, every
theme, and the whole idea behind this project belong to him and the original
contributors. I did not write this. I am not claiming credit for it.

This fork does include a few small hosting and maintenance adaptations; they
are listed below and do not change who created the original project.

### Why does this fork exist at all?

The hosted service behind the original project stopped working for me, and the
other alternate forks out there just didn't feel right — I really like the
original and I don't like the new ones. So instead of switching to a different
alternate fork, I spun up my own deployment from this fork so I could keep using
the thing I actually enjoy.

That's why this repository exists: to keep a personal deployment of the
original project available, not to replace or rebrand the upstream project.

### What changed in this fork?

The graph features and themes remain the upstream project's. Fork-specific
changes are focused on hosting and maintenance:

- **Vercel hosting:** the Express app can run as a serverless function, with
  Vercel build and route configuration for the personal deployment.
- **Serverless module resolution:** `node-chartist` is loaded through package
  resolution rather than fragile paths into `node_modules`.
- **GitHub API diagnostics:** authentication, rate-limit, and other API failures
  are reported distinctly instead of all being described as an incorrect
  username.
- **Safer error handling:** fallback SVG text is XML-escaped, and request logs
  omit Axios request details that could contain authorization headers.

These changes do not alter the origin or ownership of the core graph project.
For the upstream project and its full history, see the original repository
linked above.

---

## How to use

Just paste the following into your profile README (replace `sarang-cmd` with
your own username):

```md
<p align="center">
  <img
    src="https://github-readme-activity-graph-sarang.vercel.app/graph?username=sarang-cmd&bg_color=0d1117&color=5bcdec&line=5bcdec&point=ffffff&area=true&hide_border=true&cache_seconds=60"
    alt="Sarang's github activity graph"
  />
</p>
```

Or, in the shorter badge style:

```md
[![Activity Graph](https://github-readme-activity-graph-sarang.vercel.app/graph?username=sarang-cmd)](https://github.com/sarang-cmd)
```

## Themes

A bunch of themes ship out of the box (`dracula`, `tokyo-night`, `merko`,
`react-dark`, `github`, `high-contrast`, …). Pass one with `&theme=...`:

```md
.../graph?username=sarang-cmd&theme=dracula
```

See [`THEMES.md`](./THEMES.md) for the full list and previews.

## Customization

Common query parameters (all optional):

| Parameter | What it does |
| --- | --- |
| `username` | GitHub username (required) |
| `theme` | One of the available themes |
| `bg_color`, `color`, `line`, `point`, `area_color`, `title_color`, `border_color` | Custom colors (hex, no `#`) |
| `area` | `true` to fill the area under the line |
| `hide_border` | `true` to hide the border |
| `hide_title` | `true` to hide the title |
| `days` | Number of days to show (1–90, default 31) |
| `custom_title` | Override the graph title |
| `from`, `to` | Custom date range (`YYYY-MM-DD`) |

## Running your own instance

This is a small Node/Express + TypeScript app. To deploy your own:

```bash
git clone https://github.com/sarang-cmd/github-readme-activity-graph.git
cd github-readme-activity-graph
npm install
echo "TOKEN=<your GitHub personal access token>" > .env
npm run build
npm start
```

You'll need a GitHub personal access token with `read:user` scope stored as the
`TOKEN` environment variable. Then point Vercel (or any Node host) at
`src/main.ts`.

## Credits

- **Original project & author:** [Ashutosh Dwivedi](https://github.com/Ashutosh00710)
  ([`Ashutosh00710/github-readme-activity-graph`](https://github.com/Ashutosh00710/github-readme-activity-graph))
- This fork only exists to keep a personal deployment alive. All credit goes to
  the original author and contributors.

## License

MIT — see [`LICENSE`](./LICENSE). The license and copyright belong to the
original author.