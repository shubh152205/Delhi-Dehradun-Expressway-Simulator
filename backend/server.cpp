#include "httplib.h"
#include "json.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <queue>
#include <limits>
#include <algorithm>
#include <numeric>

using json = nlohmann::json;

struct Edge {
    int id;
    int from;
    int to;
    double distance;
    double time;
    double toll;
};

// Global graph state
int numNodes = 0;
std::vector<std::string> nodeNames;
std::vector<Edge> edges;
std::vector<std::vector<Edge>> adj;

// Fenwick Tree for Tolls
class FenwickTree {
    std::vector<double> tree;
    int n;
public:
    FenwickTree(int size) : n(size) {
        tree.resize(n + 1, 0.0);
    }
    void update(int i, double delta) {
        i += 1;
        while (i <= n) {
            tree[i] += delta;
            i += i & (-i);
        }
    }
    double query(int i) {
        i += 1;
        double sum = 0;
        while (i > 0) {
            sum += tree[i];
            i -= i & (-i);
        }
        return sum;
    }
    double rangeQuery(int left, int right) {
        if(left > right) return 0.0;
        return query(right) - query(left - 1);
    }
};

FenwickTree* tollTree = nullptr;

// Bloom Filter
class BloomFilter {
    std::vector<bool> bit_array;
    int size;
    int num_hashes;
public:
    BloomFilter(int size, int num_hashes) : size(size), num_hashes(num_hashes) {
        bit_array.resize(size, false);
    }
    void add(const std::string& item) {
        for (int i = 0; i < num_hashes; ++i) bit_array[hash(item, i) % size] = true;
    }
    bool check(const std::string& item) {
        for (int i = 0; i < num_hashes; ++i) {
            if (!bit_array[hash(item, i) % size]) return false;
        }
        return true;
    }
    int count_ones() {
        int cnt = 0;
        for(bool b : bit_array) if(b) cnt++;
        return cnt;
    }
    int get_size() { return size; }
private:
    size_t hash(const std::string& item, int i) {
        std::hash<std::string> hasher;
        return hasher(item + std::to_string(i));
    }
};

BloomFilter* vehicleFilter = nullptr;

// Utility to get metric value
double getMetricValue(const Edge& e, const std::string& metric) {
    if (metric == "time") return e.time;
    if (metric == "toll") return e.toll;
    return e.distance; // default to distance
}

// 1. Dijkstra's Algorithm
json runDijkstra(int source, int dest, const std::string& metric) {
    std::vector<double> dist(numNodes, std::numeric_limits<double>::infinity());
    std::vector<int> parent(numNodes, -1);
    std::priority_queue<std::pair<double, int>, std::vector<std::pair<double, int>>, std::greater<>> pq;

    dist[source] = 0.0;
    pq.push({0.0, source});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d > dist[u]) continue;
        if (u == dest) break;

        for (const auto& edge : adj[u]) {
            double weight = getMetricValue(edge, metric);
            if (dist[u] + weight < dist[edge.to]) {
                dist[edge.to] = dist[u] + weight;
                parent[edge.to] = u;
                pq.push({dist[edge.to], edge.to});
            }
        }
    }

    json result;
    if (dist[dest] == std::numeric_limits<double>::infinity()) {
        result["found"] = false;
        result["message"] = "No path found";
        return result;
    }

    result["found"] = true;
    result["totalCost"] = dist[dest];
    
    std::vector<int> path;
    int curr = dest;
    while (curr != -1) {
        path.push_back(curr);
        curr = parent[curr];
    }
    std::reverse(path.begin(), path.end());

    std::vector<std::string> pathNames;
    for (int node : path) {
        pathNames.push_back(nodeNames[node]);
    }
    result["path"] = pathNames;
    result["pathIds"] = path;
    
    return result;
}

// Union-Find for Kruskal's
class DSU {
    std::vector<int> parent;
public:
    DSU(int n) {
        parent.resize(n);
        std::iota(parent.begin(), parent.end(), 0);
    }
    int find(int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent[i]);
    }
    void unite(int i, int j) {
        int root_i = find(i);
        int root_j = find(j);
        if (root_i != root_j) parent[root_i] = root_j;
    }
};

// 2. Kruskal's Algorithm
json runKruskal(const std::string& metric) {
    std::vector<Edge> sorted_edges = edges;
    std::sort(sorted_edges.begin(), sorted_edges.end(), [&](const Edge& a, const Edge& b) {
        return getMetricValue(a, metric) < getMetricValue(b, metric);
    });

    DSU dsu(numNodes);
    json mst_edges = json::array();
    double total_weight = 0.0;

    for (const auto& e : sorted_edges) {
        if (dsu.find(e.from) != dsu.find(e.to)) {
            dsu.unite(e.from, e.to);
            total_weight += getMetricValue(e, metric);
            
            json edge_json;
            edge_json["fromName"] = nodeNames[e.from];
            edge_json["toName"] = nodeNames[e.to];
            edge_json["weight"] = getMetricValue(e, metric);
            mst_edges.push_back(edge_json);
        }
    }

    json result;
    result["mstEdges"] = mst_edges;
    result["totalWeight"] = total_weight;
    return result;
}

// 5. Top-K Toll Roads
json getTopKTollRoads(int k) {
    std::vector<Edge> sorted_edges = edges;
    std::sort(sorted_edges.begin(), sorted_edges.end(), [](const Edge& a, const Edge& b) {
        return a.toll > b.toll;
    });

    json result = json::array();
    for (int i = 0; i < std::min(k, (int)sorted_edges.size()); ++i) {
        const auto& e = sorted_edges[i];
        json edge_json;
        edge_json["id"] = e.id;
        edge_json["fromName"] = nodeNames[e.from];
        edge_json["toName"] = nodeNames[e.to];
        edge_json["toll"] = e.toll;
        result.push_back(edge_json);
    }
    return result;
}

// 6. Bellman-Ford Negative Cycle Detection
json detectNegativeCycle(double fuelSavings) {
    std::vector<double> dist(numNodes, 0.0);
    std::vector<int> parent(numNodes, -1);
    int x = -1;

    for (int i = 0; i < numNodes; ++i) {
        x = -1;
        for (const auto& e : edges) {
            double weight = e.toll - fuelSavings;
            if (dist[e.from] + weight < dist[e.to]) {
                dist[e.to] = std::max(-1e9, dist[e.from] + weight); // prevent underflow
                parent[e.to] = e.from;
                x = e.to;
            }
        }
    }

    json result;
    if (x == -1) {
        result["hasCycle"] = false;
        result["message"] = "No negative cycles found. No fuel arbitrage opportunities.";
    } else {
        for (int i = 0; i < numNodes; ++i) {
            x = parent[x];
        }

        std::vector<int> cycle;
        double cycle_weight = 0;
        int v = x;
        while (true) {
            cycle.push_back(v);
            if (v == x && cycle.size() > 1) break;
            
            // find edge weight
            int u = parent[v];
            for(const auto& e : edges) {
                if(e.from == u && e.to == v) {
                    cycle_weight += (e.toll - fuelSavings);
                    break;
                }
            }
            v = parent[v];
        }
        std::reverse(cycle.begin(), cycle.end());

        std::vector<std::string> pathNames;
        for (int node : cycle) {
            pathNames.push_back(nodeNames[node]);
        }

        result["hasCycle"] = true;
        result["cyclePath"] = pathNames;
        result["cycleWeight"] = cycle_weight;
        result["message"] = "Negative cycle detected!";
    }
    return result;
}

void loadGraphData(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        std::cerr << "Failed to open data file!" << std::endl;
        return;
    }

    file >> numNodes;
    nodeNames.resize(numNodes);
    for (int i = 0; i < numNodes; ++i) {
        file >> nodeNames[i];
    }

    adj.resize(numNodes);
    int from, to;
    double dist, time, toll;
    int edge_id = 0;
    while (file >> from >> to >> dist >> time >> toll) {
        Edge e1 = {edge_id, from, to, dist, time, toll};
        edges.push_back(e1);
        adj[from].push_back(e1);
        edge_id++;

        Edge e2 = {edge_id, to, from, dist, time, toll};
        edges.push_back(e2);
        adj[to].push_back(e2);
        edge_id++;
    }
    
    tollTree = new FenwickTree(edge_id);
    for (const auto& e : edges) {
        tollTree->update(e.id, e.toll);
    }

    vehicleFilter = new BloomFilter(10000, 5); // False positive rate ~1% for 1000 items
    
    std::cout << "Graph loaded successfully! Nodes: " << numNodes << " Edges: " << edges.size() << std::endl;
}

int main() {
    loadGraphData("../expressway.txt");

    httplib::Server svr;

    // CORS middleware
    auto handle_cors = [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        return true;
    };

    svr.Options(R"(.*)", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
    });

    // 1. Dijkstra API
    svr.Get("/api/shortest-path", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        int src = std::stoi(req.get_param_value("source"));
        int dest = std::stoi(req.get_param_value("destination"));
        std::string metric = req.get_param_value("metric");
        res.set_content(runDijkstra(src, dest, metric).dump(), "application/json");
    });

    // 2. Kruskal API
    svr.Get("/api/mst", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        std::string metric = req.get_param_value("metric");
        res.set_content(runKruskal(metric).dump(), "application/json");
    });

    // 3. Fenwick Tree API
    svr.Post("/api/toll/update", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        auto body = json::parse(req.body);
        int edgeId = body["edgeId"];
        double newToll = body["toll"];
        
        double diff = 0.0;
        for(auto& e : edges) {
            if(e.id == edgeId) {
                diff = newToll - e.toll;
                e.toll = newToll;
                break;
            }
        }
        tollTree->update(edgeId, diff);
        res.set_content(json({{"status", "success"}}).dump(), "application/json");
    });

    svr.Get("/api/toll/query", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        int L = std::stoi(req.get_param_value("L"));
        int R = std::stoi(req.get_param_value("R"));
        double sum = tollTree->rangeQuery(L, R);
        res.set_content(json({{"rangeSum", sum}}).dump(), "application/json");
    });

    // 4. Bloom Filter API
    svr.Post("/api/vehicle/pass", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        auto body = json::parse(req.body);
        std::string vehicleId = body["vehicleId"];
        vehicleFilter->add(vehicleId);
        res.set_content(json({{"status", "success"}}).dump(), "application/json");
    });

    svr.Get("/api/vehicle/check", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        std::string vehicleId = req.get_param_value("vehicleId");
        bool passed = vehicleFilter->check(vehicleId);
        
        int ones = vehicleFilter->count_ones();
        int m = vehicleFilter->get_size();
        double fillRate = (double)ones / m * 100.0;

        res.set_content(json({{"passed", passed}, {"fillRate", fillRate}}).dump(), "application/json");
    });

    // 5. Top-K API
    svr.Get("/api/top-k-tolls", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        int k = std::stoi(req.get_param_value("k"));
        res.set_content(getTopKTollRoads(k).dump(), "application/json");
    });

    // 6. Bellman-Ford API
    svr.Get("/api/negative-cycle", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        double fuelSavings = std::stod(req.get_param_value("fuelSavings"));
        res.set_content(detectNegativeCycle(fuelSavings).dump(), "application/json");
    });

    // Get nodes/edges for UI visualization
    svr.Get("/api/graph-data", [&](const httplib::Request& req, httplib::Response& res) {
        handle_cors(req, res);
        json response;
        response["nodes"] = nodeNames;
        json j_edges = json::array();
        for (const auto& e : edges) {
            json edge_json;
            edge_json["id"] = e.id;
            edge_json["from"] = e.from;
            edge_json["to"] = e.to;
            edge_json["distance"] = e.distance;
            edge_json["time"] = e.time;
            edge_json["toll"] = e.toll;
            j_edges.push_back(edge_json);
        }
        response["edges"] = j_edges;
        res.set_content(response.dump(), "application/json");
    });

    std::cout << "Server starting on port 8080..." << std::endl;
    svr.listen("0.0.0.0", 8080);
    return 0;
}
