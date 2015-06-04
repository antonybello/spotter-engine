/*
* app.js
*
* An Express server that queries the VIMOC API for parking data in Palo Alto
* and Newcastle. Uses the 'async' module to make parallel GET requests. Vroom.
*
* Author: Antony Bello
* Date:   June 3, 2015
*
*/

var app = require('express')();
var request = require('request');
var url = require('url');
var async = require('async');
var dateHelper = require("./date-helper");

var APIKEY = '&key=' + ''; // <==== ADD API KEY HERE
var PAZONES = 3;
var NEWCZONES = 2;

app.set('port', process.env.PORT || 8000);

app.get('/', function(req,res) {
	res.status(200).send("<b> Welcome to the homepage. <b>");
});

app.post('/data', function(req, res) {

	// Name of the button that the user has clicked
	var buttonName = req.headers.clickedname;
	
	// Make a start and end date for our query string to the API.
	var date = new Date();
	var startDate = dateHelper.makeStartDateString(date); // One hour from current date
	var currentDate = dateHelper.makeCurrentDateString(date);
	
	var optionsArr = makeOptionsArr(buttonName, startDate, currentDate);
	
	makeCalls(optionsArr, buttonName, function(response) {
		res.status(201).send(response);
	});

});


/*
* Parallel GET requests to the VIMOC API for different zones' vacancies.
*
* @param optionsArr => Array of querystrings by zone.
* @param buttonName => Which button was clicked to get JSON object
*
* Returns an array of parking zones (stored as JSON), sorted by their vacancies.
*/
var makeCalls = function(optionsArr, buttonName, callback) {

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
			console.log(err);
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
function makeOptionsArr(buttonName, start, end) {

	var newUrl, numberOfZones;
	var zones = [];
	var optionsArr = [];

	if (buttonName === "pabutton") {
		numberOfZones = PAZONES;
		newUrl = url.parse('http://api.landscape-computing.com/nboxws/rest' +
			'/v1/zone/pa_1/query/vacancy?' + start + end + APIKEY);
	} else if (buttonName === "newcbutton") {
		numberOfZones = NEWCZONES;
		newUrl = url.parse('http://api.landscape-computing.com/nboxws/rest' +
			'/v1/zone/newc_1/query/vacancy?' + start + end + APIKEY);
	} else {
		console.log("Error reading button.");
	}

	for (var i = 0; i < numberOfZones; i++) {
		zones[i] = replaceWithZone(newUrl, i+1); // Modifies querystring zone number
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
		 return (x > y) ? -1 : ((x < y ) ? 1 : 0); // don't worry about it
		});
		return callback(arr);
}

function makeDataStruct(button) {
	var arr = [];
	if (button === "pabutton") {
		arr = [{"name":"Hamilton Avenue", "vacancy":""},
			 {"name":"Ramona Street", "vacancy":""},
			 {"name":"Bryant Street", "vacancy":""}];
	} else {
		arr = [{"name":"Hotel Delany", "vacancy":""},
		  	{"name":"Darby Street", "vacancy":""}];
	}
	return arr;
}

function replaceWithZone(url, zoneNumber) {
	return url.href.replace("_1", "_" + zoneNumber.toString());
}

app.listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
