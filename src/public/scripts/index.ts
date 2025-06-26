// append new subpattern row to #sp
let sprow_count = 0;
let used: string[] = [];

function new_sprow(content = "", selected = "") {
    const sp = document.getElementById("sp");
    if (!sp) throw new Error("cannot find #sp");

    const row = document.createElement("tr");
    row.id = `sc_row${sprow_count}`
    row.className = "sc_row";

    const spn = document.createElement("td")
    spn.className = "spn"

    const spn_select = document.createElement("select");
    spn_select.id = `sc_select${sprow_count}`;
    spn_select.name = `sp_names[${sprow_count}]`;
    spn_select.className = "sc_select";

    const options = "-ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const fragment = document.createDocumentFragment(); // append options in memory before adding to DOM

    for (let i = 0; i < options.length; i++) {
        const letter = options[i];

        const option = new Option(
            letter,                 // textContent
            i === 0 ? "" : letter,  // value
            false,                  // defaultSelected
            selected === letter,    // selected
        );

        fragment.appendChild(option);
    }

    spn_select.appendChild(fragment);
    spn.appendChild(spn_select);
    row.appendChild(spn);

    const spc = document.createElement("td");
    spc.className = "spc";

    const spc_input = document.createElement("input");
    spc_input.id = `sc_input${sprow_count}`;
    spc_input.name = "sp_contents[]";
    spc_input.type = "text";
    spc_input.size = 64;
    spc_input.value = content;

    spc.appendChild(spc_input);
    row.appendChild(spc);

    sp.appendChild(row);

    sprow_count++;

    if (selected !== "") used.push(selected);
}

// remove last subpattern row
function remove_sprow() {
    const i = sprow_count > 0 ? sprow_count - 1 : sprow_count;

    document.getElementById(`sc_row${i}`)?.remove();
    document.getElementById(`sc_input${i - 1}`)!.value = "";
    // fixme: some weird behaviour going on when you delete the first row with rows ahead of it

    sprow_count--;
}

// default subpattern rows
new_sprow("a/i/u", "V");
new_sprow("p/t/k/s/m/n", "C");
new_sprow("m/n", "N");
new_sprow();
update_sprows();

// update sprows to remove used options from dropdowns
function update_sprows() {
    const selects = document.querySelectorAll<HTMLSelectElement>(".sc_select");

    selects.forEach(select => {
        const current = select.value;
        const options = Array.from(select.options) as HTMLOptionElement[];

        options.forEach(option => {
            if (option.value === "") return;

            if (used.includes(option.value)) {
                option.disabled = option.value !== current;
            } else {
                option.disabled = false;
            }
        });
    });
}

// remove any unused options from used
// since beforeinput doesn't fire for <select> this is the only way I can think to implement this
function remove_unused() {
    const selects = document.querySelectorAll(".sc_select");
    const found: Record<string, boolean> = {};

    used.forEach(l => {
        found[l] = false;
        selects.forEach(select => {
            if (select.value === l) {
                found[l] = true;
            }
        });
    });

    for (const [k, v] of Object.entries(found)) {
        if (v === false) {
            used.splice(used.indexOf(k), 1);
        }
    }
}

function get_config() {
    function get_value(id: string) {
        const value = document.getElementById(id)?.value
        if (!value) return "";
        return value;
    }
    
    var data: Configuration = {
        n: get_value("numw"),
        r: get_value("pattern"),
    };
    
    for (let i = 0; i < sprow_count - 1; i++) {
        const name = get_value(`sc_select${i}`);
        const value = get_value(`sc_input${i}`);

        if (value === "") {
            warn(`Subpattern <i>${name}</i> has no value set.`);
        }

        data[name] = value;
    }

    return data;
}

function config_blob(data: Configuration) {
    let content = "#awkwords-ts version 0.1";

    for (const [k, v] of Object.entries(data)) {
        content += `\n${k}:${v}`;
    }

    return new Blob([content], {type: "text/plain"});
}

function parse_config(content: string) {
    let ret: Record<string, string> = {}

    // use the #awkwords-ts to verify it's not a png or something that definitely should not be uploaded
    if (!content.startsWith("#awkwords-ts"))
        throw new Error("parse_config did not receive a valid awkwords-ts rules file");

    for (const match of content.matchAll(/([nrA-Z]):(.+)/g)) {
        const [_, k, v] = match;
        ret[k] = v;
    }

    return ret;
}

function load_config(data: Configuration) {
    function set_value(id: string, value: string) {
        const el = document.getElementById(id);
        if (!el) throw new Error(`cannot find #${id} - this is probably an issue with the .awkw file uploaded`);
        el.value = value;
    }

    set_value("numw", data.n || "");
    set_value("pattern", data.r || "");

    const { n, r, ...subpatterns } = data;

    let i = 0;
    for (const [name, value] of Object.entries(subpatterns)) {
        const select = document.getElementById(`sc_select${i}`);
        const input = document.getElementById(`sc_input${i}`);

        if (select && input) {
            select.value = name;
            input.value = value;
        } else {
            console.warn(`No subpattern row for index ${i}, cannot set "${name}".`);
        }

        i++;
    }
}

document.getElementById("sp")?.addEventListener("input", e => {
    if (!e.target?.classList?.contains("sc_select")) return;

    used.push(e.target.value as string);
    remove_unused();

    const selects = document.querySelectorAll(".sc_select")
    const index = Array.from(selects).indexOf(e.target as Element);

    if (e.target.value === "") {
        remove_sprow();
    }

    if (index === sprow_count - 1 && e.target.value !== "") {
        new_sprow();
    }

    update_sprows();
});

const saver = document.getElementById("saver");
if (!saver) throw new Error("cannot find #saver");

saver.addEventListener("click", () => {
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = URL.createObjectURL(config_blob(get_config()));
    a.download = "awkwords-settings.awkw";
    document.body.appendChild(a);
    a.click();
});

// mostly copied from the original function
function select_all() {
    let selection = window.getSelection();
    if (!selection) throw new Error("could not get selection");

    selection.removeAllRanges();

    let range = document.createRange();
    range.selectNodeContents(document.getElementById("words") as Node);

    selection.addRange(range);
}

let warnings: any[] = [];
let stats: Statistics = {};

function warn(text: string) {
    // fixme: is it necessary to check this every time? maybe add better parser logic
    if (warnings.includes(text)) return;

    const warning = document.createElement("div");
    warning.innerHTML = "warning: " + text;
    warning.className = "warning";
    warnings.push(text);

    document.getElementById("outputsec")?.prepend(warning);
}

// generate words from config
// returns an array; these are added to the DOM later
function gen_words() {
    const config = get_config();
    let results = [];

    function gen_word(config: Configuration) {
        const pattern = config.r;

        const sets: Record<string | number, string[]> = {}
        for (const key in config) {
            if (key !== "r" && key !== "n") {
                sets[key] = config[key].split("/");
            }
        }

        function random(n: string | number) {
            const options = sets[n];

            if (!options) {
                warn(`<i>${n}</i> has no subpattern assigned.<br/>
                    To generate a capital letter, enclose it in the escape characters - the double quotes (""), like this: "<i>L</i>"`);
                return "";
            }

            return options[Math.floor(Math.random() * options.length)];
        }

        function parse(pattern: string | any[]) {
            let result = "";
            let i = 0;

            while (i < pattern.length) {
                const char = pattern[i]

                if (char === '"') {
                    i++;
                    let quoted = "";

                    while (i < pattern.length && pattern[i] !== '"') {
                        quoted += pattern[i];
                        i++;
                    }

                    i++;
                    result += quoted;
                } else if (char === "(") {
                    let group = "";
                    let depth = 1;
                    i++;

                    while (i < pattern.length && depth > 0) {
                        if (pattern[i] === "(") depth++;
                        else if (pattern[i] === ")") depth--;
                        if (depth > 0) group += pattern[i];
                        i++;
                    }

                    if (Math.random() < 0.5) {
                        result += parse(group);
                    }
                } else if (/[A-Z]/.test(char)) {
                    result += random(char);
                    i++;
                } else {
                    result += char;
                    i++;
                }
            }

            return result;
        }

        return parse(pattern);
    }

    for (let i = 0; i < Number(config.n); i++) {
        results.push(gen_word(config));
    }

    return results;
}

function filter_duplicates(arr: Iterable<unknown> | null | undefined): string[] {
    return [...new Set(arr)] as string[];
}

function add_words(newline: any, filter: any) {
    document.querySelectorAll(".warning").forEach(e => {e.remove()});

    const start = performance.now();

    var words = gen_words();
    if (filter) words = filter_duplicates(words);

    stats.number = words.length;
    stats.time = (performance.now() - start) / 1000;
    stats.possible = count_outputs();

    const stats_el = document.getElementById("stats")
    if (!stats_el) throw new Error("could not find #stats");

    stats_el.textContent =
        `${stats.number} words | time: ${stats.time} seconds | max. different words: ${stats.possible}`;

    const select_button = document.getElementById("selectbutton")
    if (!select_button) throw new Error("could not find #selectbutton");

    select_button.style.display = "unset";
    stats_el.style.display = "block";

    const words_el = document.getElementById("words");
    if (!words_el) throw new Error("could not find #words");

    words_el.innerHTML = words.join(
        newline ? "<br/>" : " "
    );
}

function count_outputs() {
    const config = get_config();

    const pattern = config.r;
    const sets: Record<string | number, string[]> = {};

    for (const key in config) {
        if (key !== "r" && key !== "n") {
            sets[key] = config[key].split("/");
        }
    }

    function count(pattern: string | any[]) {
        let total = 1;
        let i = 0;

        while (i < pattern.length) {
            const char = pattern[i];

            if (char === "(") {
                let group = "";
                let depth = 1;
                i++;

                while (i < pattern.length && depth > 0) {
                    if (pattern[i] === "(") depth++;
                    else if (pattern[i] === ")") depth--;
                    if (depth > 0) group += pattern[i];
                    i++;
                }

                const included = count(group);
                const excluded = 1;

                total *= (included + excluded);
            } else if (/[A-Z]/.test(char)) {
                const options = sets[char];
                // just ignore invalid sets
                total *= options?.length ?? 1;
                i++;
            } else {
                i++;
            }
        }

        return total;
    }

    return count(pattern);
}

const loader = document.getElementById("loader")
if (!loader) throw new Error("could not find #loader");

loader.addEventListener("click", () => {
    loader.style.visibility = "hidden";
    const loadsec = document.getElementById("loadsec");
    if (!loadsec) throw new Error("could not find #loadsec");
    loadsec.style.display = "block";
});

const open_button = document.getElementById("openbutton");
if (!open_button) throw new Error("could not find #openbutton");

open_button.addEventListener("click", (e) => {
    e.preventDefault();

    const input = document.getElementById("file");
    if (!input) throw new Error("could not find #file");

    const file = input.files[0];

    if (!file) {
        alert("Please select a file.");
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const content = e.target?.result;
        load_config(parse_config(content as string));
    }

    reader.onerror = () => {
        console.error("could not read the file:", reader.error);
    }

    reader.readAsText(file);
});