// index.js
import inquirer from "inquirer";
import chalk from "chalk";

const environments = {
  prod: "https://finnhjelpemiddel.nav.no",
  dev: "https://finnhjelpemiddel.intern.dev.nav.no",
};

async function promptEnvironment() {
  const { env } = await inquirer.prompt([
    {
      type: "list",
      name: "env",
      message: "Velg miljø:",
      choices: ["prod", "dev"],
    },
  ]);
  return env;
}

async function fetchRammeavtaler(env, status) {
  const url = `${environments[env]}/agreements/_search`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: { bool: { must: [{ match: { status } }] } },
      from: 0,
      size: 1000,
    }),
  });
  const data = await response.json();
  const rammeavtaler = data.hits?.hits.map((hit) => hit._source) || [];
  rammeavtaler.sort((a, b) => a.title.localeCompare(b.title));
  return rammeavtaler;
}

async function fetchRammeavtaleDetails(env, id) {
  const url = `${environments[env]}/agreements/_search`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: { bool: { must: [{ match: { id } }] } },
      from: 0,
      size: 1,
    }),
  });
  const data = await response.json();
  return data.hits?.hits?.[0]?._source;
}

async function fetchSortiment(env) {
  const url =
    env === "prod"
      ? "https://navikt.github.io/digihot-sortiment/sortiment_av_apostid_per_kategori2.json"
      : "https://navikt.github.io/digihot-sortiment/sortiment_av_apostid_per_kategori_dev2.json";
  const response = await fetch(url);
  const sortiment = await response.json();
  return Object.values(sortiment)
    .flat()
    .map((entry) => entry.postId);
}

async function promptRammeavtaleSelection(rammeavtaler, label) {
  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: `Velg ${label} rammeavtale:`,
      choices: rammeavtaler.map((r) => ({
        name: `${r.title} (${r.identifier})`,
        value: r,
      })),
      pageSize: 30,
    },
  ]);
  return selected;
}

function displaySideBySideDelkontrakter(
  activeDelkontrakter,
  inactiveDelkontrakter,
  sortimentPostIds
) {
  const maxLeft =
    Math.max(...activeDelkontrakter.map((d) => d.title.length)) + 6;

  const leftLabel = chalk.yellow("   Aktiv rammeavtale".padEnd(maxLeft));
  const rightLabel = chalk.yellow("     Kommende rammeavtale");
  console.log(`\n${leftLabel}${rightLabel}`);

  for (
    let i = 0;
    i < Math.max(activeDelkontrakter.length, inactiveDelkontrakter.length);
    i++
  ) {
    const oldDel = activeDelkontrakter[i];
    const newDel = inactiveDelkontrakter[i];

    const oldText = oldDel
      ? `#${oldDel.nr}: ${oldDel.title}`.padEnd(maxLeft)
      : "".padEnd(maxLeft);

    const mark = oldDel && sortimentPostIds.includes(oldDel.id) ? "✅ " : "   ";
    const newText = newDel ? `#${newDel.nr}: ${newDel.title}` : "";

    console.log(`${mark}${oldText}  ${newText}`);
  }
  console.log();
}

async function promptNewDelkontrakterChoice(delkontrakter) {
  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message:
        "Velg hvilke delkontrakter du vil bruke fra den nye rammeavtalen:",
      choices: delkontrakter.map((d) => ({
        name: `#${d.nr}: ${d.title}`,
        value: d.id,
      })),
      pageSize: 15,
    },
  ]);
  return selected;
}

async function main() {
  const env = await promptEnvironment();
  const sortimentPostIds = await fetchSortiment(env);

  // Active
  const active = await fetchRammeavtaler(env, "ACTIVE");
  const selectedActive = await promptRammeavtaleSelection(active, "aktiv");
  const activeDetails = await fetchRammeavtaleDetails(env, selectedActive.id);
  const activeDelkontrakter = activeDetails.posts.sort((a, b) => a.nr - b.nr);
  console.log(chalk.green(`\nValgt aktiv rammeavtale:`));
  console.log(`${chalk.bold("Tittel")}: ${selectedActive.title}`);
  console.log(`${chalk.bold("ID")}: ${selectedActive.id}`);

  // Inactive
  const inactive = await fetchRammeavtaler(env, "INACTIVE");
  const selectedInactive = await promptRammeavtaleSelection(
    inactive,
    "kommende"
  );
  const inactiveDetails = await fetchRammeavtaleDetails(
    env,
    selectedInactive.id
  );
  const inactiveDelkontrakter = inactiveDetails.posts.sort(
    (a, b) => a.nr - b.nr
  );
  console.log(chalk.green(`\nValgt kommende rammeavtale:`));
  console.log(`${chalk.bold("Tittel")}: ${selectedInactive.title}`);
  console.log(`${chalk.bold("ID")}: ${selectedInactive.id}`);

  // Side-by-side comparison
  displaySideBySideDelkontrakter(
    activeDelkontrakter,
    inactiveDelkontrakter,
    sortimentPostIds
  );

  // Select delkontrakter to keep
  const selectedIds = await promptNewDelkontrakterChoice(inactiveDelkontrakter);

  console.log(chalk.blue("\nValgte delkontrakter fra ny rammeavtale:"));
  inactiveDelkontrakter
    .filter((d) => selectedIds.includes(d.id))
    .forEach((d) =>
      console.log(
        `#${chalk.bold(d.nr)}: ${d.title}  ${chalk.gray(`(ID: ${d.id})`)}`
      )
    );
}

main().catch((error) => {
  console.error("Feil oppstod:", error);
});
