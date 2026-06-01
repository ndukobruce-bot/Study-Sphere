const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "desktop-web");

const files = [
  "admin.html",
  "autopilot.html",
  "billing.html",
  "calendar.html",
  "dashboard.html",
  "exam-mode.html",
  "files.html",
  "flashcards.html",
  "game.html",
  "grades.html",
  "groups.html",
  "index.html",
  "login.html",
  "manifest.json",
  "notes.html",
  "onboarding.html",
  "planner.html",
  "premium.html",
  "profile.html",
  "reminders.html",
  "report.html",
  "summarizer.html",
  "sw.js",
  "tasks.html",
  "timer.html"
];

const dirs = ["assets", "css", "js"];

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(relativeDir) {
  const source = path.join(root, relativeDir);
  const target = path.join(outDir, relativeDir);
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, target, {
    recursive: true,
    filter: item => !item.includes(`${path.sep}.`) && !item.endsWith(".map")
  });
}

resetDir(outDir);
files.forEach(copyFile);
dirs.forEach(copyDir);

const marker = [
  "window.STUDYSPHERE_DESKTOP_BUILD = true;",
  "window.STUDYSPHERE_PLATFORM = \"windows\";",
  ""
].join("\n");
fs.writeFileSync(path.join(outDir, "js", "desktop-build.js"), marker);

files.filter(file => file.endsWith(".html")).forEach(file => {
  const target = path.join(outDir, file);
  let html = fs.readFileSync(target, "utf8");
  if (!html.includes("js/desktop-build.js")) {
    if (html.includes("<script src=\"js/auth.js\"></script>")) {
      html = html.replace("<script src=\"js/auth.js\"></script>", "<script src=\"js/desktop-build.js\"></script>\n  <script src=\"js/auth.js\"></script>");
    } else {
      html = html.replace("</body>", "  <script src=\"js/desktop-build.js\"></script>\n</body>");
    }
  }
  fs.writeFileSync(target, html);
});

console.log(`Prepared Windows desktop web assets in ${outDir}`);
