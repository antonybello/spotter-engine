# Spotter Engine

Spotter Engine is my first crack at making a NodeJS/Express backend, made for my NativeScript [Spotter App](http://www.github.com/antonybello/spotter). It listens for requests made by Spotter and uses Node's 'async' and 'request' modules to make parallel queries to VIMOC Technologies' Landscape Computing API.

When initialized, the server creates a map of all the parking sensors in Palo Alto and Los Gatos. The keys are sensorIDs, and the values are JSON objects storing latitude, longitude, and the occupancy status for each sensor. When the client makes a query, depending on how far away they are from both cities, the server sends requests to the VIMOC API to get real-time occupancy data for each sensor in that specific city. The response from VIMOC is in pipe-delimited format and contains the sensorID and its occupancy. We check if the sensorID exists in our map, and then update the occupancy status. It then returns the response to the mobile client.  
