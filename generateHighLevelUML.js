import fs from "fs";
import path from "path";

const umlDir = path.resolve("./UML");
const outDir = path.resolve("./UML_HighLevel");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(umlDir).filter(f => f.endsWith(".puml"));

const moduleColors = new Map();
const relations = new Set();

// force lowercase; replace non-word with underscore
const normalize = s => s.toLowerCase().replace(/[^\w]/g, "_");

const dynamicSet = new Set([
  "EventRegistration",
  "KeySituations",
  "AssistantActions",
  "Metrics",
  "UserModel"          // was Usermodel; casing matters
].map(normalize));

const staticSet = new Set([
  "Plan_and_Tasks",
  "UserTraits",
  "MotivationalMechanics",
  "Usertrait_Mechanic:mapping"
].map(normalize));

const defineRegex = /^\s*!define\s+(\w+)\s+(.+)/;
const packageRegex = /^\s*package\s+"?([\w_]+)"?\s*(#[\w]+|\w+)?/;
const relationRegex =
  /^\s*([\w_.]+)\.[\w_]+\s*(?:"([^"]*)"\s*)?(<?[-.o*]+[-.o*]+>?)\s*(?:"([^"]*)"\s*)?([\w_.]+)\.[\w_]+(?:\s*:\s*(.*))?/;

for (const file of files) {
  const text = fs.readFileSync(path.join(umlDir, file), "utf8");
  const lines = text.split(/\r?\n/);
  const defines = new Map();

  for (const line of lines) {
    const defMatch = line.match(defineRegex);
    if (defMatch) {
      defines.set(defMatch[1], defMatch[2].trim());
      continue;
    }

    const pkgMatch = line.match(packageRegex);
    if (pkgMatch) {
      const [, name, colorOrRef] = pkgMatch;
      const shortName = name.split(".").slice(-1)[0]; // raw
      if (!moduleColors.has(shortName)) {
        let color = colorOrRef || "#ffffff";
        if (color && !color.startsWith("#")) {
          color = defines.get(color) || "#ffffff";
        }
        moduleColors.set(shortName, color);
      }
      continue;
    }

    const rel = line.match(relationRegex);
    if (rel) {
      let [, leftPkg, leftCard, arrow, rightCard, rightPkg, label] = rel;
      if (leftPkg && rightPkg && leftPkg !== rightPkg) {
        leftPkg = leftPkg.split(".").slice(-1)[0];
        rightPkg = rightPkg.split(".").slice(-1)[0];
        const cleanedArrow = arrow.replace(/\[hidden\]/g, "--");
        const lCard = leftCard && leftCard.trim() !== "" ? ` "${leftCard.trim()}"` : "";
        const rCard = rightCard && rightCard.trim() !== "" ? ` "${rightCard.trim()}"` : "";
        const lbl = label ? " : " + label.trim() : "";
        relations.add(`${leftPkg}${lCard} ${cleanedArrow}${rCard} ${rightPkg}${lbl}`);
      }
    }
  }
}

const out = [];
out.push("@startuml");
out.push("skinparam shadowing false");
out.push("hide stereotype");
out.push("hide empty members");
out.push("skinparam nodesep 50");
out.push("skinparam ranksep 40");
out.push("skinparam ArrowThickness 0.6");
out.push("skinparam defaultFontSize 12");
out.push("skinparam FolderBorderColor #333333");
out.push("skinparam FolderBackgroundColor #ffffff");
out.push("skinparam folder<<dynamic>> BackgroundColor #fff7e6");
out.push("skinparam folder<<dynamic>> BorderColor #d46b08");
out.push("skinparam folder<<static>> BackgroundColor #f0f5ff");
out.push("skinparam folder<<static>> BorderColor #1d39c4");
out.push("");

// emit folders with stereotypes
for (const [mod, color] of moduleColors.entries()) {
  const norm = normalize(mod);
  const tag =
    dynamicSet.has(norm) ? " <<dynamic>>" :
      staticSet.has(norm) ? " <<static>>" : "";
  // quick debug to verify mapping once
  console.log(`${mod} -> ${norm} ${tag}`);
  out.push(`folder "${mod}" as ${mod}${tag} ${color}`);
}

out.push("");
out.push("' relations (with cardinalities when present)");
for (const r of relations) out.push(r);

out.push("@enduml");

const outPath = path.join(outDir, "master_highlevel.puml");
fs.writeFileSync(outPath, out.join("\n") + "\n", "utf8");
console.log(`✅ Wrote ${outPath}`);
