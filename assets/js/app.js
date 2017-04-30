/* eslint no-alert: 0 */

'use strict';

//
// Here is how to define your module
// has dependent on mobile-angular-ui
//
var app = angular.module('thaifoodtoday', [
	'ngRoute',
	'mobile-angular-ui',
	'LocalStorageModule',
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

// Configure localStorage
app.config(function (localStorageServiceProvider) {
	localStorageServiceProvider
		.setPrefix('ThaiDishes')
		.setStorageType('localStorage')
		.setNotify(true, true)
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

app.directive('isImage', function () {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			element.bind('load', function () {
				console.log('image is loaded');
			});
		}
	};
});

/**
 * Custom Dynamic Controllers
 * Allow passing $routeParams to different templates
 * http://stackoverflow.com/a/11535887/1414881
 */
app.controller('DishController', function ($scope, $http, $routeParams, localStorageService) {
	$scope.type = $routeParams.type;
	$scope.id = $routeParams.id;

	if (localStorageService.isSupported) {

		if (localStorageService.get('dishAll')) {
			// Retrieve Object from JSON
			var data = angular.fromJson(localStorage.getItem('dishAll'));

			$scope.favToggle = function (obj) {
				obj.preventDefault();

				// Toggle favorite value
				var id = $scope.id || obj.target.parentNode.getAttribute('data-id');
				var fav = data[$scope.type][id];
				fav.favorite = !fav.favorite;

				// Update localStorage
				localStorage.setItem('dishAll', JSON.stringify(data));
			};

			var dishNames = [];
			$scope.categoryImg = 'assets/img/categories/' + $scope.type + '.jpg';
			$scope.dishes = data[$scope.type];
			$scope.dishes.forEach(function (item) {
				dishNames.push(item.thai_name);
			});
			$scope.dish = $scope.dishes[$scope.id];

		} else {
			$http.get('./data/all.json')
				.success(function (data) {
					localStorage.setItem('dishAll', JSON.stringify(data));
				})

		}

	}
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

app.controller('MainController', function ($rootScope, $scope, $http, localStorageService, $routeParams, Auth) {

	// any time auth state changes, add the user data to scope
	$scope.auth = Auth;
	$scope.auth.$onAuthStateChanged(function (firebaseUser) {
		console.log(firebaseUser);
		$scope.firebaseUser = firebaseUser;
	});

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
	$http.get('./data/all.json')
		.success(function (data) {
			localStorageService.set('dishAll', JSON.stringify(data));

			angular.forEach(data, function (value, key) {
				var items = {};
				items['name'] = key;
				items['length'] = value.length;

				// Hide categories with less than 5 dishes
				if (value.length > 5) {
					$scope.categories.push(items);
				}
			});
		})

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