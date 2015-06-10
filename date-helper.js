/*
* date-helper.js
*
* Helper functions for making/formatting dates.
*
* Author: Antony Bello
* Date:   June 3, 2015
*
*/

exports.makeCurrentDateString = function(date) {
  var dateJSON = makeDateJSON(date);
	return 'enddate='+dateJSON.year+'-'+dateJSON.month+'-'+dateJSON.day+'T'+
  dateJSON.hour+':'+dateJSON.mins+''+':'+dateJSON.secs;
};

exports.makeStartDateString = function(date) {
  var dateJSON = makeDateJSON(date);
  var newHour = parseInt(dateJSON.hour,10)-1;
  if (newHour === '-1') {
    newHour = '23';
  } else{
    return 'startdate='+dateJSON.year+'-'+dateJSON.month+'-'+dateJSON.day+'T'+
    (makeDoubleDigit(newHour))+':'+dateJSON.mins+''+':'+dateJSON.secs;
  }
  return null;
}

var makeDoubleDigit = function(num) {
  if (num < 10) {
    return '0' + num.toString();
  }
  return num.toString();
}

var makeDateJSON= function(currentDate) {
  return {
    year: currentDate.getFullYear().toString(),
    month: makeDoubleDigit(currentDate.getMonth() + 1), // Months are 0-indexed
    day: 	currentDate.getDate().toString(),
    hour: makeDoubleDigit(currentDate.getHours()),
    mins: makeDoubleDigit(currentDate.getMinutes()),
    secs: makeDoubleDigit(currentDate.getSeconds())
  }
}
