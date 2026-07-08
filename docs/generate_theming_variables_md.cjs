const fs = require("fs");
const path = require("path");

const VARIABLE_USAGE_PATTERN = /var\((--[A-Za-z\-_]*)/g;
const SOURCE_FOLDER = path.join(__dirname, "..", "src/lib");
const SOURCE_EXTENSIONS = [".svelte", ".css"];

const DOC_FILE_PATH = path.join(__dirname, "theming_variables.md");
const VARIABLE_SECTION_PATTERN = /(<!-- List start -->)(.|\n)*(<!-- List end -->)/gm;

function collectVariables(dir, variables) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectVariables(fullPath, variables);
    } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const match of content.matchAll(VARIABLE_USAGE_PATTERN)) {
        variables.add(match[1]);
      }
    }
  }
}

const variables = new Set();
collectVariables(SOURCE_FOLDER, variables);
const matchesAsMarkdownListItems = [...variables].sort().map(v => `- \`${v}\``);

const START_TAG_CAPTURE_GROUP = "$1";
const END_TAG_CAPTURE_GROUP = "$3";
const newDependencySectionAsRegexReplaceExpression = [
  START_TAG_CAPTURE_GROUP,
  ...matchesAsMarkdownListItems,
  END_TAG_CAPTURE_GROUP
].join("\n");
const oldContent = fs.readFileSync(DOC_FILE_PATH).toString();
const oldFileDoesNotContainSection =
  oldContent.search(VARIABLE_SECTION_PATTERN) === -1;
if (oldFileDoesNotContainSection) {
  console.error(`Could not find variable section in ${DOC_FILE_PATH}`);
  process.exit(1);
}
fs.writeFileSync(
  DOC_FILE_PATH,
  oldContent.replace(
    VARIABLE_SECTION_PATTERN,
    newDependencySectionAsRegexReplaceExpression
  )
);
console.log(`Successfully wrote to ${DOC_FILE_PATH}`);
