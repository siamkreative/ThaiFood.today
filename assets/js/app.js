/* eslint no-alert: 0 */

'use strict';

//
// Here is how to define your module
// has dependent on mobile-angular-ui
//
var app = angular.module('thaifoodtoday', [
	'ngRoute',
	'mobile-angular-ui',
	'firebase',

	// touch/drag feature: this is from 'mobile-angular-ui.gestures.js'.
	// This is intended to provide a flexible, integrated and and
	// easy to use alternative to other 3rd party libs like hammer.js, with the
	// final pourpose to integrate gestures into default ui interactions like
	// opening sidebars, turning switches on/off ..
	'mobile-angular-ui.gestures'
]);

app.run(function ($transform) {
	window.$transform = $transform;
});

//
// You can configure ngRoute as always, but to take advantage of SharedState location
// feature (i.e. close sidebar on backbutton) you should setup 'reloadOnSearch: false'
// in order to avoid unwanted routing.
//
app.config(function ($routeProvider) {
	$routeProvider.when('/', {
		templateUrl: 'home.html',
		reloadOnSearch: false
	});
	$routeProvider.when('/:type', {
		templateUrl: 'dish_list.html',
		reloadOnSearch: false,
		controller: 'DishController'
	});
	$routeProvider.when('/:type/:id', {
		templateUrl: 'dish_details.html',
		reloadOnSearch: false,
		controller: 'DishController'
	});
});

/**
 * Service Passing Data Between Controllers 
 * http://stackoverflow.com/a/20181543
 */
app.service('dataService', function () {

	var dataSave = function (data) {
		console.log('dataSave', data);
		localStorage.setItem('dishAll', JSON.stringify(data));
	};

	var dataGet = function () {
		var data;
		var from;
		if (localStorage.getItem('dishAll')) {
			from = 'localStorage';
			data = angular.fromJson(localStorage.getItem('dishAll'));
		} else {
			from = 'jsonFile';
			$http.get('./data/all.json')
				.success(function (data) {
					data = data;
					localStorage.setItem('dishAll', JSON.stringify(data));
				})
		}
		console.log('Get Data from', from, data);
		return data;
	};

	return {
		dataGet: dataGet,
		dataSave: dataSave
	};

});

/**
 * Custom Dynamic Controllers
 * Allow passing $routeParams to different templates
 * http://stackoverflow.com/a/11535887/1414881
 */
app.controller('DishController', function ($scope, $http, $routeParams, dataService) {

	var dishNames = [];

	$scope.data = dataService.dataGet();
	$scope.type = $routeParams.type;
	$scope.id = $routeParams.id;
	$scope.categoryImg = 'assets/img/categories/' + $scope.type + '.jpg';
	$scope.dishes = $scope.data[$scope.type];
	$scope.dishes.forEach(function (item) {
		dishNames.push(item.thai_name);
	});
	$scope.dish = $scope.dishes[$scope.id];

	$scope.favToggle = function (obj) {
		obj.preventDefault();

		// Toggle favorite value
		var id = $scope.id || obj.target.parentNode.getAttribute('data-id');
		var dish = $scope.data[$scope.type][id];
		dish.favorite = !dish.favorite;

		// Update localStorage
		dataService.dataSave($scope.data);
	};
});

app.filter('underscoreless', function () {
	return function (input) {
		if (input) {
			return input.replace(/_/g, ' ');
		}
	}
});

app.factory('Auth', ['$firebaseAuth',
	function ($firebaseAuth) {
		return $firebaseAuth();
	}
]);

app.controller('MainController', function ($rootScope, $scope, $http, $routeParams, Auth, dataService) {

	// any time auth state changes, add the user data to scope
	$scope.auth = Auth;
	$scope.auth.$onAuthStateChanged(function (firebaseUser) {
		$scope.firebaseUser = firebaseUser;
	});

	// Get favorites from Dish controller
	$scope.dishByCategories = dataService.dataGet();

	// Needed for the loading screen
	$rootScope.$on('$routeChangeStart', function () {
		$rootScope.loading = true;
	});

	$rootScope.$on('$routeChangeSuccess', function () {
		$rootScope.loading = false;
	});


	/**
	 * Create the main navigation from JSON data
	 * http://stackoverflow.com/a/19544982/1414881
	 * http://stackoverflow.com/a/832262/1414881
	 */
	$scope.categories = [];
	$scope.data = dataService.dataGet();
	angular.forEach($scope.data, function (value, key) {
		var items = {};
		items['name'] = key;
		items['length'] = value.length;

		// Hide categories with less than 5 dishes
		if (value.length > 5) {
			$scope.categories.push(items);
		}
	});

	/**
	 * Dish Details - Play Thai Script
	 * http://responsivevoice.org/api/
	 */
	$scope.play = function (obj) {
		var tts = document.getElementById('tts').innerHTML;
		var button = document.getElementById('play_label');
		if (responsiveVoice.voiceSupport()) {
			responsiveVoice.speak(tts, 'Thai Female');
			// Update the UI
			button.innerHTML = ' Loading...';
			setInterval(function () {
				if (!responsiveVoice.isPlaying()) {
					button.innerHTML = ' Speak';
					button.blur();
				}
			}, 100);
		}
	}
});