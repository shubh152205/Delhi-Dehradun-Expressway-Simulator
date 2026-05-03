/* ===================================================
   Delhi-Dehradun Expressway Simulator — Frontend Logic
   =================================================== */

const API = "http://localhost:8080/api";

// ─── Tab Metadata ──────────────────────────────
const TAB_META = {
    dijkstra: { title: "Shortest Path Finder",     crumb: "Dijkstra's Algorithm · O((V+E) log V)" },
    mst:      { title: "Minimum Spanning Tree",     crumb: "Kruskal's Algorithm · O(E log E)" },
    toll:     { title: "Dynamic Toll Management",   crumb: "Fenwick Tree (BIT) · O(log n) per op" },
    bloom:    { title: "Vehicle Pass Tracking",     crumb: "Bloom Filter · O(k) per op" },
    topk:    { title: "Revenue Analytics",          crumb: "Top-K via Sorting · O(E log E)" },
    bellman:  { title: "Fuel Arbitrage Detection",  crumb: "Bellman-Ford · O(V × E)" },
};

// ─── Init ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initRadioPills();
    initButtons();
    fetchGraphData();
});

// ─── Navigation Tabs ───────────────────────────
function initTabs() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;

            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(`panel-${tab}`).classList.add("active");

            // Update header
            const meta = TAB_META[tab];
            if (meta) {
                document.getElementById("page-title").textContent = meta.title;
                document.getElementById("page-breadcrumb").textContent = meta.crumb;
            }
        });
    });
}

// ─── Radio Pill Groups ─────────────────────────
function initRadioPills() {
    document.querySelectorAll(".radio-group").forEach(group => {
        group.querySelectorAll(".radio-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                group.querySelectorAll(".radio-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                pill.querySelector("input").checked = true;
            });
        });
    });
}

// ─── Button Bindings ───────────────────────────
function initButtons() {
    document.getElementById("btn-dijkstra").addEventListener("click", runDijkstra);
    document.getElementById("btn-mst").addEventListener("click", runMST);
    document.getElementById("btn-toll-update").addEventListener("click", runTollUpdate);
    document.getElementById("btn-toll-query").addEventListener("click", runTollQuery);
    document.getElementById("btn-bloom-add").addEventListener("click", runBloomAdd);
    document.getElementById("btn-bloom-check").addEventListener("click", runBloomCheck);
    document.getElementById("btn-topk").addEventListener("click", runTopK);
    document.getElementById("btn-bellman").addEventListener("click", runBellman);
}

// ─── Connection & Graph Data ───────────────────
async function fetchGraphData() {
    const status = document.getElementById("conn-status");
    try {
        const res = await fetch(`${API}/graph-data`);
        if (!res.ok) throw new Error("Server error");
        const data = await res.json();

        status.classList.add("connected");
        status.querySelector("span").textContent = "Backend Online";

        document.getElementById("stat-nodes").textContent = data.nodes.length;
        document.getElementById("stat-edges").textContent = data.edges.length;

        populateSelects(data.nodes);
    } catch {
        status.classList.add("error");
        status.querySelector("span").textContent = "Backend Offline";
    }
}

function populateSelects(nodes) {
    const src = document.getElementById("sp-source");
    const dst = document.getElementById("sp-dest");
    src.innerHTML = "";
    dst.innerHTML = "";

    nodes.forEach((name, i) => {
        const label = name.replace(/_/g, " ");
        src.add(new Option(`${label}`, i));
        dst.add(new Option(`${label}`, i));
    });

    if (nodes.length > 1) dst.value = nodes.length - 1;
}

// ─── Helpers ───────────────────────────────────
function showLoading(id) {
    document.getElementById(id).innerHTML = `<div class="loading">Computing…</div>`;
}
function showError(id, msg) {
    document.getElementById(id).innerHTML = `<div class="error-msg">✕ ${msg}</div>`;
}
function getSelectedRadio(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "distance";
}

function formatNodeName(n) { return n.replace(/_/g, " "); }

function metricUnit(m) {
    if (m === "distance") return "km";
    if (m === "time") return "mins";
    return "₹";
}

// ─── 1. Dijkstra ───────────────────────────────
async function runDijkstra() {
    const src = document.getElementById("sp-source").value;
    const dst = document.getElementById("sp-dest").value;
    const metric = getSelectedRadio("sp-metric");
    const box = "res-dijkstra";

    showLoading(box);

    try {
        const res = await fetch(`${API}/shortest-path?source=${src}&destination=${dst}&metric=${metric}`);
        const data = await res.json();

        if (!data.found) return showError(box, data.message || "No path found.");

        const unit = metricUnit(metric);
        const pathHtml = data.path.map(n =>
            `<span class="route-node">${formatNodeName(n)}</span>`
        ).join(`<span class="route-arrow">→</span>`);

        document.getElementById(box).innerHTML = `
            <div class="result-content">
                <div class="result-metric">
                    <span class="value">${data.totalCost}</span>
                    <span class="unit">${unit}</span>
                </div>
                <div class="result-label">Optimal Route (${data.path.length} stops)</div>
                <div class="route-path">${pathHtml}</div>
            </div>`;
    } catch {
        showError(box, "Could not connect to backend.");
    }
}

// ─── 2. MST ────────────────────────────────────
async function runMST() {
    const metric = getSelectedRadio("mst-metric");
    const box = "res-mst";
    showLoading(box);

    try {
        const res = await fetch(`${API}/mst?metric=${metric}`);
        const data = await res.json();
        const unit = metricUnit(metric);

        let edgesHtml = data.mstEdges.map(e => `
            <div class="mst-edge">
                <span class="nodes">${formatNodeName(e.fromName)} ↔ ${formatNodeName(e.toName)}</span>
                <span class="weight">${e.weight} ${unit}</span>
            </div>`).join("");

        document.getElementById(box).innerHTML = `
            <div class="result-content">
                <div class="result-metric">
                    <span class="value">${data.totalWeight}</span>
                    <span class="unit">${unit}</span>
                </div>
                <div class="result-label">${data.mstEdges.length} edges in MST</div>
                <div class="mst-edge-list">${edgesHtml}</div>
            </div>`;
    } catch {
        showError(box, "Failed to generate MST.");
    }
}

// ─── 3. Toll Management ────────────────────────
async function runTollUpdate() {
    const edgeId = document.getElementById("toll-edge-id").value;
    const toll = document.getElementById("toll-amount").value;
    const box = "res-toll";

    if (!edgeId || !toll) return showError(box, "Provide both Edge ID and Toll Amount.");

    showLoading(box);

    try {
        const res = await fetch(`${API}/toll/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edgeId: parseInt(edgeId), toll: parseFloat(toll) })
        });
        if (res.ok) {
            document.getElementById(box).innerHTML = `
                <div class="success-msg">✓ Edge #${edgeId} toll updated to ₹${toll}</div>`;
        }
    } catch {
        showError(box, "Update request failed.");
    }
}

async function runTollQuery() {
    const L = document.getElementById("toll-l").value;
    const R = document.getElementById("toll-r").value;
    const box = "res-toll";

    if (!L || !R) return showError(box, "Provide both L and R values.");

    showLoading(box);

    try {
        const res = await fetch(`${API}/toll/query?L=${L}&R=${R}`);
        const data = await res.json();

        document.getElementById(box).innerHTML = `
            <div class="result-content">
                <div class="result-label">Range Sum [${L} … ${R}]</div>
                <div class="result-metric">
                    <span class="value">₹${data.rangeSum}</span>
                </div>
            </div>`;
    } catch {
        showError(box, "Query failed.");
    }
}

// ─── 4. Bloom Filter ───────────────────────────
async function runBloomAdd() {
    const vid = document.getElementById("vehicle-id").value.trim();
    const box = "res-bloom";
    if (!vid) return showError(box, "Enter a valid vehicle ID.");

    showLoading(box);

    try {
        await fetch(`${API}/vehicle/pass`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicleId: vid })
        });
        document.getElementById(box).innerHTML = `
            <div class="success-msg">✓ Vehicle ${vid} recorded in filter.</div>`;
    } catch {
        showError(box, "Failed to record vehicle.");
    }
}

async function runBloomCheck() {
    const vid = document.getElementById("vehicle-id").value.trim();
    const box = "res-bloom";
    if (!vid) return showError(box, "Enter a valid vehicle ID.");

    showLoading(box);

    try {
        const res = await fetch(`${API}/vehicle/check?vehicleId=${encodeURIComponent(vid)}`);
        const data = await res.json();

        const statusClass = data.passed ? "found" : "not-found";
        const statusText = data.passed
            ? "Likely Passed (probabilistic)"
            : "Definitely Not Passed";
        const statusIcon = data.passed ? "✓" : "✕";

        document.getElementById(box).innerHTML = `
            <div class="result-content">
                <div class="result-label">Vehicle: ${vid}</div>
                <div class="status-pass ${statusClass}">${statusIcon} ${statusText}</div>
                <div class="fill-bar-container">
                    <div class="fill-bar-label">
                        <span>Filter Fill Rate</span>
                        <span>${data.fillRate.toFixed(2)}%</span>
                    </div>
                    <div class="fill-bar">
                        <div class="fill-bar-inner" style="width: ${Math.min(data.fillRate, 100)}%"></div>
                    </div>
                </div>
            </div>`;
    } catch {
        showError(box, "Check failed.");
    }
}

// ─── 5. Top-K ──────────────────────────────────
async function runTopK() {
    const k = document.getElementById("top-k-val").value;
    const box = "res-topk";
    showLoading(box);

    try {
        const res = await fetch(`${API}/top-k-tolls?k=${k}`);
        const data = await res.json();

        const rows = data.map((e, i) => `
            <tr>
                <td class="rank">#${i + 1}</td>
                <td class="segment">${formatNodeName(e.fromName)} ↔ ${formatNodeName(e.toName)}</td>
                <td class="toll-val">₹${e.toll}</td>
            </tr>`).join("");

        document.getElementById(box).innerHTML = `
            <div class="result-content">
                <div class="result-label">Top ${k} highest toll segments</div>
                <table class="topk-table">
                    <thead><tr><th>Rank</th><th>Segment</th><th>Toll</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    } catch {
        showError(box, "Failed to fetch Top-K data.");
    }
}

// ─── 6. Bellman-Ford ───────────────────────────
async function runBellman() {
    const fuel = document.getElementById("fuel-savings").value;
    const box = "res-bellman";
    showLoading(box);

    try {
        const res = await fetch(`${API}/negative-cycle?fuelSavings=${fuel}`);
        const data = await res.json();

        if (!data.hasCycle) {
            document.getElementById(box).innerHTML = `
                <div class="result-content">
                    <div class="cycle-alert safe">✓ No negative cycle detected — network is stable.</div>
                    <p style="font-size:0.82rem;color:var(--text-secondary);">No fuel arbitrage opportunities exist at ₹${fuel}/segment savings.</p>
                </div>`;
        } else {
            const pathHtml = data.cyclePath.map(n =>
                `<span class="route-node">${formatNodeName(n)}</span>`
            ).join(`<span class="route-arrow">→</span>`);

            document.getElementById(box).innerHTML = `
                <div class="result-content">
                    <div class="cycle-alert danger">⚠ Negative cycle detected — arbitrage opportunity!</div>
                    <div class="result-metric">
                        <span class="value">${data.cycleWeight.toFixed(2)}</span>
                        <span class="unit">cycle weight</span>
                    </div>
                    <div class="result-label">Arbitrage Loop</div>
                    <div class="route-path">${pathHtml}</div>
                </div>`;
        }
    } catch {
        showError(box, "Detection failed.");
    }
}
