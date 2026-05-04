const API = "/api";

const PAGE_META = {
    dijkstra: { title: "Shortest Path Finder", breadcrumb: "Dijkstra's Algorithm · O((V+E) log V)" },
    mst:      { title: "Minimum Spanning Tree", breadcrumb: "Kruskal's Algorithm · O(E log E)" },
    toll:     { title: "Toll Management",       breadcrumb: "Fenwick Tree · O(log E) per operation" },
    bloom:    { title: "Vehicle Pass Tracker",  breadcrumb: "Bloom Filter · O(k) constant time" },
    topk:     { title: "Revenue Top-K Analysis",breadcrumb: "Heap Sort · O(E log E)" },
    bellman:  { title: "Negative Cycle Detection", breadcrumb: "Bellman-Ford · O(V × E)" },
};

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initRadioPills();
    initButtons();
    fetchGraphData();
});

function initTabs() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`panel-${tab}`).classList.add("active");
            const m = PAGE_META[tab];
            if (m) {
                document.getElementById("page-title").textContent = m.title;
                document.getElementById("page-breadcrumb").textContent = m.breadcrumb;
            }
        });
    });
}

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

async function fetchGraphData(retries = 5) {
    const status = document.getElementById("conn-status");
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`${API}/graph-data`);
            if (!res.ok) throw new Error("Server error");
            const data = await res.json();
            status.classList.remove("error");
            status.classList.add("connected");
            status.querySelector("span").textContent = "Connected";
            document.getElementById("stat-nodes").textContent = data.nodes.length;
            document.getElementById("stat-edges").textContent = data.edges.length;
            populateSelects(data.nodes);
            return;
        } catch {
            status.classList.remove("connected");
            status.classList.add("error");
            status.querySelector("span").textContent = attempt < retries ? `Connecting... (${attempt}/${retries})` : "Backend offline";
            if (attempt < retries) await new Promise(r => setTimeout(r, 3000));
        }
    }
}

function populateSelects(nodes) {
    const src = document.getElementById("sp-source");
    const dst = document.getElementById("sp-dest");
    src.innerHTML = ""; dst.innerHTML = "";
    nodes.forEach((name, i) => {
        const label = name.replace(/_/g, " ");
        src.add(new Option(label, i));
        dst.add(new Option(label, i));
    });
    if (nodes.length > 1) dst.value = nodes.length - 1;
}

function showLoading(id) { document.getElementById(id).innerHTML = `<div class="loading">Computing…</div>`; }
function showError(id, msg) { document.getElementById(id).innerHTML = `<div class="error-msg">✕ ${msg}</div>`; }
function getRadio(name) { const c = document.querySelector(`input[name="${name}"]:checked`); return c ? c.value : "distance"; }
function fmt(n) { return n.replace(/_/g, " "); }
function unit(m) { return m === "distance" ? "km" : m === "time" ? "mins" : "₹"; }

async function runDijkstra() {
    const src = document.getElementById("sp-source").value;
    const dst = document.getElementById("sp-dest").value;
    const metric = getRadio("sp-metric");
    const box = "res-dijkstra";
    showLoading(box);
    try {
        const res = await fetch(`${API}/shortest-path?source=${src}&destination=${dst}&metric=${metric}`);
        const data = await res.json();
        if (!data.found) return showError(box, data.message || "No path found.");
        const u = unit(metric);
        const pathHtml = data.path.map(n => `<span class="route-node">${fmt(n)}</span>`).join(`<span class="route-arrow">→</span>`);
        document.getElementById(box).innerHTML = `<div class="result-content">
            <div class="result-metric"><span class="value">${data.totalCost}</span><span class="unit">${u}</span></div>
            <div class="result-label">Optimal Route (${data.path.length} stops)</div>
            <div class="route-path">${pathHtml}</div></div>`;
    } catch { showError(box, "Could not connect to backend."); }
}

async function runMST() {
    const metric = getRadio("mst-metric");
    const box = "res-mst";
    showLoading(box);
    try {
        const res = await fetch(`${API}/mst?metric=${metric}`);
        const data = await res.json();
        const u = unit(metric);
        const edges = data.mstEdges.map(e => `<div class="mst-edge"><span class="nodes">${fmt(e.fromName)} ↔ ${fmt(e.toName)}</span><span class="weight">${e.weight} ${u}</span></div>`).join("");
        document.getElementById(box).innerHTML = `<div class="result-content">
            <div class="result-metric"><span class="value">${data.totalWeight}</span><span class="unit">${u}</span></div>
            <div class="result-label">${data.mstEdges.length} edges in MST</div>
            <div class="mst-edge-list">${edges}</div></div>`;
    } catch { showError(box, "Failed to generate MST."); }
}

async function runTollUpdate() {
    const edgeId = document.getElementById("toll-edge-id").value;
    const toll = document.getElementById("toll-amount").value;
    const box = "res-toll";
    if (!edgeId || !toll) return showError(box, "Provide both Edge ID and Toll Amount.");
    showLoading(box);
    try {
        const res = await fetch(`${API}/toll/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edgeId: parseInt(edgeId), toll: parseFloat(toll) }) });
        if (res.ok) document.getElementById(box).innerHTML = `<div class="success-msg">✓ Edge #${edgeId} toll updated to ₹${toll}</div>`;
    } catch { showError(box, "Update request failed."); }
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
        document.getElementById(box).innerHTML = `<div class="result-content">
            <div class="result-label">Range Sum [${L} … ${R}]</div>
            <div class="result-metric"><span class="value">₹${data.rangeSum}</span></div></div>`;
    } catch { showError(box, "Query failed."); }
}

async function runBloomAdd() {
    const vid = document.getElementById("vehicle-id").value.trim();
    const box = "res-bloom";
    if (!vid) return showError(box, "Enter a valid vehicle ID.");
    showLoading(box);
    try {
        await fetch(`${API}/vehicle/pass`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId: vid }) });
        document.getElementById(box).innerHTML = `<div class="success-msg">✓ Vehicle ${vid} recorded in filter.</div>`;
    } catch { showError(box, "Failed to record vehicle."); }
}

async function runBloomCheck() {
    const vid = document.getElementById("vehicle-id").value.trim();
    const box = "res-bloom";
    if (!vid) return showError(box, "Enter a valid vehicle ID.");
    showLoading(box);
    try {
        const res = await fetch(`${API}/vehicle/check?vehicleId=${encodeURIComponent(vid)}`);
        const data = await res.json();
        const cls = data.passed ? "found" : "not-found";
        const txt = data.passed ? "Likely Passed (probabilistic)" : "Definitely Not Passed";
        const ico = data.passed ? "✓" : "✕";
        document.getElementById(box).innerHTML = `<div class="result-content">
            <div class="result-label">Vehicle: ${vid}</div>
            <div class="status-pass ${cls}">${ico} ${txt}</div>
            <div class="fill-bar-container"><div class="fill-bar-label"><span>Filter Fill Rate</span><span>${data.fillRate.toFixed(2)}%</span></div>
            <div class="fill-bar"><div class="fill-bar-inner" style="width:${Math.min(data.fillRate,100)}%"></div></div></div></div>`;
    } catch { showError(box, "Check failed."); }
}

async function runTopK() {
    const k = document.getElementById("top-k-val").value;
    const box = "res-topk";
    showLoading(box);
    try {
        const res = await fetch(`${API}/top-k-tolls?k=${k}`);
        const data = await res.json();
        const rows = data.map((e, i) => `<tr><td class="rank">#${i+1}</td><td class="segment">${fmt(e.fromName)} ↔ ${fmt(e.toName)}</td><td class="toll-val">₹${e.toll}</td></tr>`).join("");
        document.getElementById(box).innerHTML = `<div class="result-content">
            <div class="result-label">Top ${k} highest toll segments</div>
            <table class="topk-table"><thead><tr><th>Rank</th><th>Segment</th><th>Toll</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    } catch { showError(box, "Failed to fetch Top-K data."); }
}

async function runBellman() {
    const fuel = document.getElementById("fuel-savings").value;
    const box = "res-bellman";
    showLoading(box);
    try {
        const res = await fetch(`${API}/negative-cycle?fuelSavings=${fuel}`);
        const data = await res.json();
        if (!data.hasCycle) {
            document.getElementById(box).innerHTML = `<div class="result-content">
                <div class="cycle-alert safe">✓ Network is Safe — No arbitrage loops detected.</div>
                <p style="font-size:.82rem;color:var(--text-secondary)">No fuel arbitrage opportunities exist at ₹${fuel}/segment savings.</p></div>`;
        } else {
            const pathHtml = data.cyclePath.map(n => `<span class="route-node">${fmt(n)}</span>`).join(`<span class="route-arrow">→</span>`);
            document.getElementById(box).innerHTML = `<div class="result-content">
                <div class="cycle-alert danger">⚠ Negative Cycle Detected!</div>
                <div class="result-metric"><span class="value">${data.cycleWeight.toFixed(2)}</span><span class="unit">cycle weight</span></div>
                <div class="result-label">Arbitrage Loop</div>
                <div class="route-path">${pathHtml}</div></div>`;
        }
    } catch { showError(box, "Detection failed."); }
}
