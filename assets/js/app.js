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
app.controller('DishController', function ($scope, $http, $routeParams) {
	$scope.type = $routeParams.type;
	$scope.id = $routeParams.id;

	$http.get('./data/all.json')
		.success(function (data) {
			var key = $scope.type;
			var dishNames = [];
			$scope.categoryImg = 'assets/img/categories/' + $scope.type + '.jpg';
			$scope.dishes = data[key];
			$scope.dishes.forEach(function (item) {
				dishNames.push(item.thai_name);
			});
			$scope.dish = $scope.dishes[$scope.id];
		})
});

app.filter('underscoreless', function () {
	return function (input) {
		if (input) {
			return input.replace(/_/g, ' ');
		}
	}
});

app.controller('MainController', function ($rootScope, $scope, $http, localStorageService, $routeParams) {

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
			angular.forEach(data, function (value, key) {
				var items = {};
				items['name'] = key;
				items['length'] = value.length;
				$scope.categories.push(items);
			});
		})

	$scope.dishAll = [];
	$http.get('./data/all.json')
		.success(function (data) {
			$scope.dishAll = data;
		})

	/**
	 * Add to favorites
	 * https://github.com/grevory/angular-local-storage
	 * http://stackoverflow.com/a/18030442/1414881
	 */
	if (localStorageService.isSupported) {

		// Retrieve Favorites
		$scope.favorites = angular.fromJson(localStorageService.get('favorites'));
		if (!$scope.favorites) {
			$scope.favorites = {
				'rice_dishes': {
					0: 'Chok',
					2: 'Khao kha mu'
				},
				'curries': {
					7: 'Kaeng het'
				}
			};
		}

		// Add Favorites
		$scope.favoriteAdd = function (obj) {
			obj.preventDefault();

			// Prepare variables
			var type = $routeParams.type;
			var id = obj.target.parentNode.getAttribute('data-id');
			var name = obj.target.parentNode.getAttribute('data-name');
			var icon = obj.target;

			// Update favorite obj
			var test = $scope.dishAll;
			console.log(test['rice_dishes'][id]);

			// Update localStorage
			// localStorageService.set('favorites', JSON.stringify($scope.favorites));

			// !! NOT WORKING
			// icon.classList.toggle('fa-star-o fa-star');

			// Update UI
			if (icon.className === 'fa fa-star-o') {
				icon.className = 'fa fa-star';
			} else {
				icon.className = 'fa fa-star-o';
			}
		};

		// Remove Favorites
		$scope.favoriteRemove = function (e) {
			var listGroupItem = e.target.parentNode;
			console.log(listGroupItem);
			e.preventDefault();
		}
	}

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