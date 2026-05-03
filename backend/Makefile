CXX = g++
CXXFLAGS = -std=c++17 -O3 -pthread

all: server

server: server.cpp httplib.h json.hpp
	$(CXX) $(CXXFLAGS) server.cpp -o server

clean:
	rm -f server
