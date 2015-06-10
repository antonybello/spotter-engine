# Spotter Engine

Spotter Engine is my first crack at making a NodeJS/Express backend, made for my NativeScript [Spotter App](http://www.github.com/antonybello/spotter). It listens for requests made by Spotter and uses Node's 'async' and 'request' modules to make parallel queries to VIMOC Technologies' Landscape Computing API.

## Viewing the vacancy percentages of parking zones within the last hour:

The client sends the ID of the button clicked as a header to the server, which then builds query strings for the API call to VIMOC. The response sent back is a sorted array of JSON objects each containing the parking area and its vacancy percentage from an hour ago to the current time.

## Finding the closest unoccupied parking spots:

The server keeps a hash table of parking spot information. The keys are sensor ID's, and the values are objects containing latitude, longitude, and occupancy. The occupancy fields are updated when the server receives a request, and since there are multiple zones, Node's 'async' module lets us retrieve the information in parallel. We then can map the occupancy to the appropriate sensor object by its ID, and now we have all we need to send a response to the client. The client filters out all the occupied spots, and then sorts the unoccupied ones based on their distance away from the user. 
