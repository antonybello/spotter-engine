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
var dateHelper = require("./date-helper");

var APIKEY = '76e253a5c51ecf1dbf17e9ea6b9d6a2f'; // <==== ADD API KEY HERE
var NUMBER_OF_ZONES = 2;

app.set('port', process.env.PORT || 8001);

app.get('/', function(req, res) {
  res.status(200).send("<b> Welcome to the homepage. <b>");
});

app.post('/data', function(req, res) {

  // Name of the button that the user has clicked
  var buttonName = req.headers.clickedname;

  // Make a start and end date for our query string to the API.
  var date = new Date();
  var startDate = dateHelper.makeStartDateString(date); // One hour from current date
  var currentDate = dateHelper.makeCurrentDateString(date);

  var optionsArr = makeVacancyOptionsArr(buttonName, startDate, currentDate);

  makeZoneVacancyCalls(optionsArr, buttonName, function(response) {
    console.log("zone vacancy request made");
    res.status(201).send(response);
  });
});

// Function that instantiates a table of GPS coordinates for parking spots
function makeTable() {
  makeSensorTable(function(response) {
    process.config.table = response;
  })
};

makeTable();

app.post('/occupancies', function(req, res) {

  var cityName = req.headers.city;

  updateOccupancies(process.config.table, cityName, function(response) {
		res.status(201).send(response);
  });
});


/*
 * Queries the different zones in Palo Alto for the coordinates of each sensor
 * along with its id. Result is an associative array of sensors with the key
 * being its ID and the value being a JSON object. The JSON object stores latitude
 * and longitude, and has an empty field called "Occupancy", which is updated in
 * updateOccupancies().
 */
function makeSensorTable(callback) {

  // Our resulting array
  var coordArr = {};

  var pa_zone1 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/pa_1/?key=';
  var pa_zone2 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/pa_2/?key=';
  var lg_zone1 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_1/?key=';
  var lg_zone2 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_2/?key=';
  var lg_zone3 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_3/?key=';
  var lg_zone4 = 'http://api.landscape-computing.com/nboxws/rest/v1/zone/lg_4/?key=';


  var optionsArr = [{uri: pa_zone1 + APIKEY, json: true},
		 								{uri: pa_zone2 + APIKEY, json: true},
                    {uri: lg_zone1 + APIKEY, json: true},
                    {uri: lg_zone2 + APIKEY, json: true},
                    {uri: lg_zone3 + APIKEY, json: true},
                    {uri: lg_zone4 + APIKEY, json: true}
                  ];

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
  async.map(optionsArr, fetch, function(err, results) {
    if (err) {
      callback(err);
    } else {
      // Each zone is an array of sensors, and each sensor has an array of coords
      var zones = [results[0].sensorId, results[1].sensorId, results[2].sensorId,
                  results[3].sensorId, results[4].sensorId, results[5].sensorId];
      var coordinates, latLong, lati, longi, sensorId;

      for (var sensors of zones) {
        for (var sensor of sensors) {
          latLong = sensor.gpsCoord[0].split(','); // Get the first coord of spot
          lati = latLong[0];
          longi = latLong[1].trim();
          sensorId = sensor.guid; // Get the ID
          coordArr[sensorId] = { // Create a associative array/hashmap
            lat: lati,
            long: longi,
            occupancy: ""
          };
          console.log(sensorId + ' ' + coordArr[sensorId]);
        }
      }
      callback(coordArr)
    }
  });
}


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
	 if(err) {
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
 * Parallel GET requests to the VIMOC API for different zones' vacancies.
 *
 * @param optionsArr => Array of querystrings by zone.
 * @param buttonName => Which button was clicked to get JSON object
 *
 * Returns an array of parking zones (stored as JSON), sorted by their vacancies.
 */
var makeZoneVacancyCalls = function(optionsArr, buttonName, callback) {

  var fetch = function(option, callback) {
    request(option, function(err, response, body) {
      if (err) {
        callback(err);
      } else {
        callback(null, body); // First param indicates error, null=> no error
      }
    });
  }

  // Map the fetch function with each option in optionsArr as parameter
  async.map(optionsArr, fetch, function(err, results) {
    var resultsArr = makeDataStruct(buttonName);
    if (err) {
      callback(new Error('Error retrieving zone vacancies.'))
    } else {
      for (var i = 0; i < results.length; i++) {
        resultsArr[i].vacancy = results[i][0].readingData;
      }
      sortResults(resultsArr, function(response) {
        return callback(response);
      });
    }
  });
}

/*
 *	Parses the request URL and makes custom URIs for the requests
 * based on city.
 *
 * @param buttonName => Which button was clicked.
 * @param start => startdate of the query. Hour from current time.
 * @param end => End date of the query. Current time.
 *
 * Return value: An array of JSON objects with a url for each zone.
 */
function makeVacancyOptionsArr(buttonName, start, end) {

  var newUrl, numberOfZones;
  var zones = [];
  var optionsArr = [];

  if (buttonName === "pabutton") {
    newUrl = url.parse('http://api.landscape-computing.com/nboxws/rest' +
      '/v1/zone/pa_1/query/vacancy?' + start + end + '&key=' + APIKEY);
  } else if (buttonName === "newcbutton") {
    newUrl = url.parse('http://api.landscape-computing.com/nboxws/rest' +
      '/v1/zone/newc_1/query/vacancy?' + start + end + '&key=' + APIKEY);
  } else {
    console.log("Error reading button.");
  }

  for (var i = 0; i < NUMBER_OF_ZONES; i++) {
    zones[i] = replaceWithZone(newUrl, i + 1); // Modifies querystring zone number
    optionsArr.push({
      uri: zones[i],
      json: true
    });
  }
  return optionsArr;
}



/******** HELPER FUNCTIONS *******/

function sortResults(arr, callback) {
  arr = arr.sort(function(a, b) {
    var x = parseFloat(a.vacancy);
    var y = parseFloat(b.vacancy);
    return (x > y) ? -1 : ((x < y) ? 1 : 0); // don't worry about it
  });
  return callback(arr);
}

function makeDataStruct(button) {
  var arr = [];
  if (button === "pabutton") {
    arr = [{
      "name": "Hamilton Avenue",
      "vacancy": ""
    }, {
      "name": "Ramona Street",
      "vacancy": ""
    }];
  } else {
    arr = [{
      "name": "Hotel Delany",
      "vacancy": ""
    }, {
      "name": "Darby Street",
      "vacancy": ""
    }];
  }
  return arr;
}

function replaceWithZone(url, zoneNumber) {
  return url.href.replace("_1", "_" + zoneNumber.toString());
}

app.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
