/*
 * app.js
 *
 * An Express server that queries the VIMOC API for parking data in Palo Alto
 * and Newcastle. Uses the 'async' module to make parallel GET requests. Vroom.
 *
 * Author: Antony Bello
 * Date: June 3, 2015
 *
 */
var app = require('express')();
var request = require('request');
var url = require('url');
var async = require('async');

var APIKEY = ''; // <==== ADD VIMOC API KEY HERE
var NUMBER_OF_ZONES = 2;

app.set('port', process.env.PORT || 8001);

// Instantiate a table of sensors and their GPS Coordinates.
makeTable();

app.post('/occupancies', function(req, res) {
  var cityName = req.headers.city;
  updateOccupancies(process.config.table, cityName, function(response) {
    res.status(201).send(response);
  });
});


/*
 * Updates the occupancies of each sensor in the sensor table.
 *
 * @param coordArr => Associative array of sensors by their ID's
 *
 * Returns updated array.
 */
function updateOccupancies(coordArr, city, callback) {

  var url;

  if (city === 'Palo Alto') {
    url = 'http://api.landscape-computing.com/nboxws/rest/v1/site/' +
      'pa/query/summary/?key=';
  } else {
    url = 'http://api.landscape-computing.com/nboxws/rest/v1/site/' +
      'lg/query/summary/?key=';
  }

  request(url + APIKEY, function(err, response, body) {
    if (err) {
      callback(new Error('Error parsing occupancies'));
    } else {
      var res = body.split("|");
      res.shift();
      res.pop();
      for (var i = 0; i < res.length; i++) {
        var splitRes = res[i].split(":");
        var sensorId = splitRes[0]; // Get the ID
        var occupancy = splitRes[1].split(" ")[1]; // Check sensor's occupancy
        if (coordArr[sensorId] !== undefined) {
          coordArr[sensorId].occupancy = occupancy; // Add occupancy field to mapped sensor
        }
      }
    }
    return callback(coordArr);
  });
}


/*
 * Queries the different zones in Palo Alto for the coordinates of each sensor
 * along with its id.
 *
 * Result => an associative array of sensors with the key being its ID and value
 * being a JSON object. The JSON object stores latitude and longitude, and has
 * an empty field called "Occupancy", which is updated in updateOccupancies().
 */
function makeSensorTable(callback) {

  // Our resulting array
  var coordArr = {};

  var fetch = function(option, cb) {
    request(option, function(err, response, body) {
      if (err) {
        cb(err);
      } else {
        cb(null, body); // First param indicates error, null=> no error
      }
    });
  }

  // Map the fetch function with each option in optionsArr as parameters
  makeOptionsArr(function(optionsArr) {
    async.map(optionsArr, fetch, function(err, results) {
      if (err) {
        callback(err);
      } else {
        fillCoordArr(results, coordArr, function(result) {
          callback(result);
        });
      }
    });
  });

}

function fillCoordArr(results, arr, cb) {

  // Each zone is an array of sensors, and each sensor has an array of coords
  var zones = [results[0].sensorId, results[1].sensorId, results[2].sensorId,
    results[3].sensorId, results[4].sensorId, results[5].sensorId
  ];

  var latLong, lati, longi, sensorId;
  for (var sensors of zones) {
    for (var sensor of sensors) {
      latLong = sensor.gpsCoord[0].split(','); // Get the first coord of spot
      lati = latLong[0];
      longi = latLong[1].trim();
      sensorId = sensor.guid; // Get the ID
      arr[sensorId] = { // Create a associative array/hashmap
        lat: lati,
        long: longi,
        occupancy: ""
      };
    }
  }
  return cb(arr);
}

/******** HELPER FUNCTIONS *******/

// Makes array of options for parallel GET requests.
function makeOptionsArr(cb) {

  var pa_zone1 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/pa_1/?key=';
  var pa_zone2 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/pa_2/?key=';
  var lg_zone1 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_1/?key=';
  var lg_zone2 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_2/?key=';
  var lg_zone3 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_3/?key=';
  var lg_zone4 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_4/?key=';

  var optionsArr = [{
    uri: pa_zone1 + APIKEY,
    json: true
  }, {
    uri: pa_zone2 + APIKEY,
    json: true
  }, {
    uri: lg_zone1 + APIKEY,
    json: true
  }, {
    uri: lg_zone2 + APIKEY,
    json: true
  }, {
    uri: lg_zone3 + APIKEY,
    json: true
  }, {
    uri: lg_zone4 + APIKEY,
    json: true
  }];

  return cb(optionsArr);
}

// Instantiates a table of GPS coordinates for parking spots
function makeTable() {
  makeSensorTable(function(response) {
    process.config.table = response;
  })
};

app.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
