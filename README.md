# 🛣️ Delhi-Dehradun Expressway Simulator

A full-stack web application that models the **Delhi-Dehradun Expressway** as a weighted graph and demonstrates **six core computer science algorithms** applied to real-world transportation systems.

The expressway network is represented as a graph where **nodes** are interchanges/cities and **edges** are road segments carrying three attributes: **distance (km)**, **travel time (mins)**, and **toll cost (₹)**.

---

## 📸 Screenshots

> Run the app locally to see the full premium dark-themed UI with glassmorphism, animated gradient orbs, and micro-interactions.

---

## 🏗️ Architecture

```
┌──────────────────────┐       HTTP (REST)       ┌──────────────────────────┐
│     Frontend (UI)    │ ◄────────────────────► │     Backend (Engine)     │
│                      │     localhost:8080       │                          │
│  HTML / CSS / JS     │                         │  C++17 Server            │
│  Served on :3000     │                         │  cpp-httplib + nlohmann  │
│  (Express static)    │                         │  All algorithms in-proc  │
└──────────────────────┘                         └──────────────────────────┘
                                                          │
                                                          ▼
                                                  ┌──────────────┐
                                                  │ expressway.txt│
                                                  │  (Graph Data) │
                                                  └──────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | C++17 with [cpp-httplib](https://github.com/yhirose/cpp-httplib) | REST API server running all 6 algorithms |
| **JSON** | [nlohmann/json](https://github.com/nlohmann/json) | Request/response serialization |
| **Frontend** | Vanilla HTML, CSS, JavaScript | Interactive UI with glassmorphism dark theme |
| **Static Server** | Node.js + Express v5 | Serves the `public/` directory on port 3000 |
| **Data** | `expressway.txt` | Graph definition file loaded at server startup |

---

## 🧠 Algorithms Implemented

All six algorithms are implemented **from scratch** in C++ — no external algorithm libraries are used.

### 1. Shortest Path — Dijkstra's Algorithm

Finds the optimal route between any two interchanges. The user selects a metric to optimize: **Distance**, **Time**, or **Toll**.

**How it works:**
- Maintains a min-priority queue of `(cost, node)` pairs
- Greedily expands the lowest-cost unvisited node
- Reconstructs the path via a parent pointer array
- Early termination when the destination is reached

**Data Structures Used:**
- `std::priority_queue` (min-heap via `std::greater<>`)
- Distance array `dist[V]`, Parent array `parent[V]`

| Complexity | Value |
|-----------|-------|
| **Time** | O((V + E) log V) |
| **Space** | O(V) |

**API:** `GET /api/shortest-path?source={id}&destination={id}&metric={distance|time|toll}`

**Response:**
```json
{
  "found": true,
  "totalCost": 85.2,
  "path": ["Delhi_Akshardham", "UP_Gate", "Dasna", "Hapur"],
  "pathIds": [0, 1, 2, 3]
}
```

---

### 2. Minimum Spanning Tree — Kruskal's Algorithm

Constructs the minimum spanning tree of the network — the subset of edges connecting all nodes with the smallest total weight.

**How it works:**
1. Sort all edges by the chosen metric (distance / time / toll)
2. Iterate over sorted edges; add an edge to the MST if it doesn't form a cycle
3. Cycle detection is done via a **Union-Find (Disjoint Set Union)** data structure with **path compression**

**Data Structures Used:**
- `DSU` class with `find()` (path compression) and `unite()`
- Sorted edge list

| Complexity | Value |
|-----------|-------|
| **Time** | O(E log E) for sorting + O(E α(V)) for Union-Find |
| **Space** | O(V + E) |

> α(V) is the inverse Ackermann function — effectively constant for all practical inputs.

**API:** `GET /api/mst?metric={distance|time|toll}`

**Response:**
```json
{
  "totalWeight": 267.7,
  "mstEdges": [
    { "fromName": "Delhi_Akshardham", "toName": "UP_Gate", "weight": 15.2 },
    { "fromName": "Meerut_South", "toName": "Meerut_North", "weight": 18.0 }
  ]
}
```

---

### 3. Dynamic Toll Management — Fenwick Tree (Binary Indexed Tree)

Enables efficient **point updates** and **prefix sum queries** over toll values. This is used for real-time toll revenue analytics.

**How it works:**
- The Fenwick Tree stores cumulative toll values indexed by edge ID
- **Point Update:** When a toll changes, the delta is propagated through the tree in O(log n)
- **Range Query:** The sum of tolls in range `[L, R]` is computed as `prefix(R) - prefix(L-1)`

**Data Structures Used:**
- `FenwickTree` class with internal array `tree[n+1]`
- Uses bit manipulation (`i & (-i)`) to navigate the tree

| Complexity | Value |
|-----------|-------|
| **Time (Update)** | O(log E) |
| **Time (Query)** | O(log E) |
| **Space** | O(E) |

**APIs:**
- `POST /api/toll/update` — Body: `{"edgeId": 5, "toll": 150.0}`
- `GET /api/toll/query?L={start}&R={end}`

**Response (Query):**
```json
{ "rangeSum": 485.0 }
```

---

### 4. Vehicle Pass Tracking — Bloom Filter

A **probabilistic data structure** for space-efficient membership testing. Used to track which vehicles have passed through the expressway.

**How it works:**
- A bit array of size `m = 10,000` is initialized to all zeros
- When a vehicle ID is recorded, `k = 5` independent hash functions set 5 bits to 1
- To check membership, all 5 hash positions are queried:
  - If **any bit is 0** → the vehicle has **definitely not** passed (no false negatives)
  - If **all bits are 1** → the vehicle has **probably** passed (possible false positive)
- The UI displays the **filter fill rate** (percentage of bits set to 1) as a progress bar

**Data Structures Used:**
- `BloomFilter` class with `std::vector<bool>` bit array
- Hash function: `std::hash<string>(vehicleId + to_string(seed))`

| Complexity | Value |
|-----------|-------|
| **Time (Add/Check)** | O(k) — constant, k=5 |
| **Space** | O(m) — m=10,000 bits ≈ 1.22 KB |
| **False Positive Rate** | ~1% at 1,000 inserted items |

**APIs:**
- `POST /api/vehicle/pass` — Body: `{"vehicleId": "DL-1C-AA-1111"}`
- `GET /api/vehicle/check?vehicleId={id}`

**Response (Check):**
```json
{ "passed": true, "fillRate": 2.35 }
```

---

### 5. Top-K Toll Roads — Sorting / Heap Approach

Identifies the **K most expensive** road segments in the network for revenue analytics.

**How it works:**
- Copies the edge list and sorts in **descending order** by toll value
- Returns the first K edges from the sorted list
- Each result includes the edge ID, endpoint names, and toll amount

**Data Structures Used:**
- `std::sort` with a custom comparator on the `toll` field

| Complexity | Value |
|-----------|-------|
| **Time** | O(E log E) via full sort |
| **Space** | O(E) for the sorted copy |

> Can be optimized to O(E log K) using a min-heap of size K, or O(E) average using Quickselect.

**API:** `GET /api/top-k-tolls?k={number}`

**Response:**
```json
[
  { "id": 14, "fromName": "Delhi_Akshardham", "toName": "Hapur", "toll": 120 },
  { "id": 19, "fromName": "Muzaffarnagar", "toName": "Roorkee", "toll": 100 }
]
```

---

### 6. Negative Cycle Detection — Bellman-Ford Algorithm

Detects **fuel arbitrage loops** in the network. By redefining edge weights as `toll − fuelSavings`, a **negative cycle** indicates a loop where cumulative fuel savings exceed the tolls — meaning a vehicle could profit by driving in circles.

**How it works:**
1. Initialize all distances to 0 (to detect negative cycles reachable from any node)
2. Relax all edges `V` times (one extra iteration beyond the standard V−1)
3. If any edge is still relaxable on the V-th iteration → a negative cycle exists
4. Trace back through `parent[]` pointers to reconstruct the cycle path

**Data Structures Used:**
- Distance array `dist[V]`, Parent array `parent[V]`
- Full edge list traversal for each iteration

| Complexity | Value |
|-----------|-------|
| **Time** | O(V × E) |
| **Space** | O(V) |

**API:** `GET /api/negative-cycle?fuelSavings={amount}`

**Response (cycle found):**
```json
{
  "hasCycle": true,
  "cyclePath": ["Deoband", "Saharanpur", "Roorkee", "Deoband"],
  "cycleWeight": -15.0,
  "message": "Negative cycle detected!"
}
```

**Response (no cycle):**
```json
{
  "hasCycle": false,
  "message": "No negative cycles found. No fuel arbitrage opportunities."
}
```

---

## 📊 Network Data

The expressway graph is defined in `expressway.txt` and loaded at server startup.

### File Format

```
<number_of_nodes>
<node_0_name> <node_1_name> ... <node_n_name>
<from_id> <to_id> <distance_km> <time_mins> <toll_rupees>
<from_id> <to_id> <distance_km> <time_mins> <toll_rupees>
...
```

### Current Network

The default dataset models **14 interchanges** connected by **20 road segments** (40 directed edges after bidirectional expansion):

| ID | Node Name |
|----|-----------|
| 0 | Delhi Akshardham |
| 1 | UP Gate |
| 2 | Dasna |
| 3 | Hapur |
| 4 | Meerut South |
| 5 | Meerut North |
| 6 | Khatauli |
| 7 | Muzaffarnagar |
| 8 | Deoband |
| 9 | Roorkee |
| 10 | Haridwar |
| 11 | Rishikesh |
| 12 | Dehradun |
| 13 | Saharanpur |

The graph includes:
- **12 sequential edges** forming the main expressway corridor (Delhi → Dehradun)
- **8 shortcut/bypass edges** providing alternative routes (e.g., Delhi → Hapur direct, Deoband → Saharanpur → Roorkee loop)

Each edge carries three attributes:
- **Distance** in kilometers (15.2 – 62.0 km)
- **Travel Time** in minutes (10 – 42 mins)
- **Toll Cost** in ₹ (30 – 120)

---

## 📁 Project Structure

```
Delhi-Dehradun-Expressway-Simulator/
│
├── backend/
│   ├── server.cpp          # C++ backend — all 6 algorithms + REST API
│   ├── Makefile             # Build with: make
│   ├── httplib.h            # cpp-httplib (header-only, downloaded at build)
│   └── json.hpp             # nlohmann/json (header-only, downloaded at build)
│
├── public/
│   ├── index.html           # Main HTML — sidebar nav + 6 algorithm panels
│   ├── styles.css           # Premium dark theme (glassmorphism, orbs, animations)
│   └── script.js            # Frontend logic — API calls, result rendering
│
├── expressway.txt           # Graph data file (14 nodes, 20 edges)
├── app.js                   # Express v5 static file server (serves public/)
├── package.json             # Node.js config
├── package-lock.json        # Dependency lock file
├── .gitignore               # Ignores node_modules/, build artifacts, headers
└── README.md                # This file
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **g++** or **clang++** | C++17 support | Compile the backend server |
| **make** | Any | Build automation |
| **Node.js** | v18+ | Frontend static server |
| **curl** | Any | Download header-only libraries |

### 1. Clone the Repository

```bash
git clone https://github.com/shubh152205/Delhi-Dehradun-Expressway-Simulator.git
cd Delhi-Dehradun-Expressway-Simulator
```

### 2. Install System Dependencies

```bash
# Fedora
sudo dnf install gcc-c++ make curl

# Ubuntu / Debian
sudo apt install g++ make curl

# macOS (with Homebrew)
brew install gcc make curl
```

### 3. Download Header-Only Libraries

```bash
cd backend
curl -L -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h
curl -L -o json.hpp https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp
```

### 4. Build & Start the C++ Backend

```bash
# Still in the backend/ directory
make
./server
```

You should see:
```
Graph loaded successfully! Nodes: 14 Edges: 40
Server starting on port 8080...
```

### 5. Install Node Dependencies & Start Frontend

Open a **new terminal**:

```bash
# From project root
npm install
npm start
```

You should see:
```
Frontend server running at http://localhost:3000
```

### 6. Open the Application

Visit **http://localhost:3000** in your browser.

> **Note:** Both servers must be running simultaneously — the frontend on port 3000 makes API calls to the C++ backend on port 8080.

---

## 🔌 API Reference

All endpoints are served by the C++ backend on `http://localhost:8080`. CORS is enabled for all origins.

### Graph Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/graph-data` | Returns all node names and edges with full attributes |

### Shortest Path (Dijkstra)

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/shortest-path` | `source` (int), `destination` (int), `metric` (string) | Returns optimal path and total cost |

`metric` values: `distance`, `time`, `toll`

### Minimum Spanning Tree (Kruskal)

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/mst` | `metric` (string) | Returns MST edges and total weight |

### Toll Management (Fenwick Tree)

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/toll/update` | `{"edgeId": int, "toll": float}` | Update toll for a specific edge |
| `GET` | `/api/toll/query` | `L` (int), `R` (int) | Range sum of tolls for edges [L, R] |

### Vehicle Tracking (Bloom Filter)

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/vehicle/pass` | `{"vehicleId": string}` | Record a vehicle pass |
| `GET` | `/api/vehicle/check` | `vehicleId` (string) | Check if vehicle has passed + fill rate |

### Top-K Toll Roads

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/top-k-tolls` | `k` (int) | Returns K highest toll road segments |

### Negative Cycle Detection (Bellman-Ford)

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/negative-cycle` | `fuelSavings` (float) | Detect negative weight cycles |

---

## 🎨 Frontend Design

The UI features a premium **dark-mode glassmorphism** design:

- **Animated gradient orbs** — three blurred color spheres float behind the content
- **Sidebar navigation** — 6 algorithm modules with SVG icons and algorithm name tags
- **Radio pill selectors** — for metric switching (Distance / Time / Toll)
- **Styled result cards** — route paths rendered as node pills with arrows, MST as an edge list, Top-K as a styled table
- **Bloom Filter progress bar** — visual fill rate indicator
- **Cycle alert banners** — green (safe) / red (danger) status badges
- **Loading spinners** and error states for all API calls
- **Responsive layout** — sidebar collapses to bottom tab bar on mobile
- **Custom scrollbar** — thin, subtle, matches the dark theme

**Fonts:** Inter (UI text) + JetBrains Mono (algorithm complexity, code values)

---

## ⚙️ Configuration

### Changing the Network Data

Edit `expressway.txt` to add/remove nodes or edges. The file format is:

```
<numNodes>
<name_0> <name_1> ... <name_n-1>
<from> <to> <distance> <time> <toll>
...
```

- Node IDs are 0-indexed integers
- Edges are automatically treated as **bidirectional** by the backend
- Restart the C++ server after modifying the file

### Bloom Filter Tuning

In `server.cpp` (line 317):
```cpp
vehicleFilter = new BloomFilter(10000, 5);
```
- `10000` — bit array size (`m`)
- `5` — number of hash functions (`k`)
- Optimal false positive rate ≈ `(1 - e^(-kn/m))^k` where `n` = inserted items

---

## 📚 Complexity Summary

| # | Algorithm | Time Complexity | Space Complexity | Data Structure |
|---|-----------|----------------|------------------|----------------|
| 1 | Dijkstra's Shortest Path | O((V+E) log V) | O(V) | Min-Heap (Priority Queue) |
| 2 | Kruskal's MST | O(E log E) | O(V + E) | Union-Find (DSU) |
| 3 | Fenwick Tree Toll Mgmt | O(log E) per op | O(E) | Binary Indexed Tree |
| 4 | Bloom Filter Vehicle Track | O(k) per op | O(m) = 1.22 KB | Bit Array + Hash Functions |
| 5 | Top-K Toll Roads | O(E log E) | O(E) | Sorted Array |
| 6 | Bellman-Ford Neg. Cycle | O(V × E) | O(V) | Edge List + Parent Array |

Where: `V = 14 nodes`, `E = 40 directed edges`, `k = 5 hash functions`, `m = 10,000 bits`

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Backend Language | C++17 |
| HTTP Server | [cpp-httplib](https://github.com/yhirose/cpp-httplib) (header-only) |
| JSON Library | [nlohmann/json](https://github.com/nlohmann/json) (header-only) |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Static Server | Node.js + Express v5 |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| Build System | GNU Make |

---

## 📄 License

This project is licensed under the ISC License.
