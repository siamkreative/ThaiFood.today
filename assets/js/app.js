/* eslint no-alert: 0 */

'use strict';

// Firebase config
var config = {
    apiKey: "AIzaSyBygMs3vVN04SWO4EFgm_FbpUGAN0WKIk0",
    authDomain: "thaifood-today.firebaseapp.com",
    databaseURL: "https://thaifood-today.firebaseio.com",
    storageBucket: "thaifood-today.appspot.com",
    messagingSenderId: "1030275091340"
};
firebase.initializeApp(config);

// OneSignal config
var OneSignal = window.OneSignal || [];
OneSignal.push(['init', {
    appId: '2f72b950-1d3b-4fdf-b2be-fa3593e7f0a4',
    autoRegister: true,
    notifyButton: {
        enable: false
    }
}]);

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
		templateUrl: '/views/home.html',
		reloadOnSearch: false
	});
	$routeProvider.when('/:type', {
		templateUrl: '/views/dish_list.html',
		reloadOnSearch: false,
		controller: 'DishController'
	});
	$routeProvider.when('/:type/:id', {
		templateUrl: '/views/dish_details.html',
		reloadOnSearch: false,
		controller: 'DishController'
	});
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

/**
 * Service Passing Data Between Controllers 
 * http://stackoverflow.com/a/20181543
 */
app.service('dataService', function ($http, $firebaseObject, $firebaseAuth) {

	//save favorites to firebase
	var saveToFirebase = function(data) {
		var user = firebase.auth().currentUser;
		//each user with a their own path to save their favorites to using their uid
		var ref = firebase.database().ref('siam/users/'+user.uid);

		var dbObj = $firebaseObject(ref);
		dbObj.food = data;
		dbObj.$save().then(function(ref) {
			//console.log(ref.key);
		}, function(err) {
			console.log('Error:', err);
		});
	};

	var getDataFromFirebase = function(uid) {
		var ref = firebase.database().ref('siam/users/'+uid)
		var dbObj = $firebaseObject(ref);
		return dbObj;
	}

	return {
		saveToFirebase: saveToFirebase,
		getDataFromFirebase: getDataFromFirebase
	};

});

/**
 * Custom Dynamic Controllers
 * Allow passing $routeParams to different templates
 * http://stackoverflow.com/a/11535887/1414881
 */
app.controller('DishController', function ($scope, $http, $routeParams, dataService, Auth) {
	$scope.auth = Auth;
	$scope.firebaseUser;
	$scope.data;	
	var dishNames = [];
	$scope.type;
	$scope.id;
	$scope.categoryImg;
	$scope.dishes;
	$scope.dish;

	$scope.auth.$onAuthStateChanged(function(firebaseUser) {
		$scope.firebaseUser = firebaseUser;
		if(firebaseUser) {
			var usersFavorites = dataService.getDataFromFirebase(firebaseUser.uid);
			//wait for the async call to come back
			usersFavorites.$loaded().then(function() {
				if(usersFavorites.food) {
					console.log('DishCtrl: recieved user\'s favorite food from DB');	
					setScopeWithData(usersFavorites.food);
				}
				if(!usersFavorites.food) {
					console.log('DishCtrl: NO favorite food saved in DB');	
					loadDefaultData();
				}
			});
		}
		//NO USER logged in load default data
		if(!firebaseUser) {
			loadDefaultData();
		}

		function loadDefaultData() {
			console.log('loading default data');
			$http.get('./data/all.json', {
					cache: true
				})
				.success(function (jsonData) {
					setScopeWithData(jsonData);
				});
		}

		function setScopeWithData(jsonData) {
			$scope.data = jsonData;
			$scope.type = $routeParams.type;
			$scope.id = $routeParams.id;
			$scope.categoryImg = 'assets/img/categories/' + $scope.type + '.jpg';
			$scope.dishes = $scope.data[$scope.type];
			if ($scope.dishes) {
				$scope.dishes.forEach(function (item) {
					dishNames.push(item.thai_name);
				});
				$scope.dish = $scope.dishes[$scope.id];
			}			
		}

	})

	/**
	 * Save/Remove favorites
	 */
	$scope.favToggle = function (obj) {
		obj.preventDefault();
		if (!$scope.firebaseUser) {
			return;
		}

		// Get dish object
		var id = $scope.id || obj.target.parentNode.getAttribute('data-id');
		var dish = $scope.data[$scope.type][id];

		// Toggle value: true/false
		dish.favorite = !dish.favorite;

		// Save to Firebase
		dataService.saveToFirebase($scope.data);
	};



	/**
	 * Dish Details - Play Thai Script
	 * http://responsivevoice.org/api/
	 */
	$scope.speak = function (text) {
		var button = angular.element(event.currentTarget).find('span')[0];
		if (responsiveVoice.voiceSupport()) {
			responsiveVoice.speak(text, 'Thai Female', {
				onstart: function () {
					button.innerText = 'Loading...';
				},
				onend: function () {
					button.innerText = 'Speak';
				}
			});
		}
	};
});

app.controller('MainController', function ($rootScope, $scope, $http, $routeParams, Auth, dataService) {
	$scope.firebaseUser;
	$scope.auth = Auth;
	$scope.categories = [];	

	/**
	 * Any time auth state changes, add the user data to scope
	 * https://github.com/firebase/angularfire
	 */
	$scope.auth.$onAuthStateChanged(function (firebaseUser) {
		$scope.firebaseUser = firebaseUser;
		//USER is logged in 
		if(firebaseUser) {
			var user = firebaseUser;
			//we will store user's favorites here if they have favorites
			var usersFavorites = dataService.getDataFromFirebase(user.uid);
			//wait until the async request comes back
			usersFavorites.$loaded().then(function() {
				//check to see if the user has saved at least one favorite
				// console.log(usersFavorites);
				//USER has favorite food
				if(usersFavorites.food) {
					console.log('MainCtrl: recieved user\'s favorite food from DB');
					$scope.data = usersFavorites.food;
					filterSmallCategories(usersFavorites.food);		
				}
				//USER does not have favorite food
				if(!usersFavorites.food) {
					console.log('MainCtrl: NO favorite food saved in DB');
					loadDefaultData();			
				}

			});
		}
		//NO USER logged in load default data
		if(!firebaseUser) {
			//empty previous users categories
			$scope.categories = [];
			//get rid of user data
			$scope.firebaseUser = null;
			//load default json
			loadDefaultData();
		}

		function loadDefaultData() {
			console.log('loading default data');
			$http.get('./data/all.json', {
					cache: true
				})
				.success(function (jsonData) {
					$scope.data = jsonData;
					filterSmallCategories(jsonData);
				});
		}

		function filterSmallCategories(jsonData) {
			angular.forEach(jsonData, function (val, key) {
				var items = {};
				items['name'] = key;
				items['length'] = val.length;
				// Hide categories with less than 5 dishes
				if (val.length > 5) {
					$scope.categories.push(items);
				}
			});
		}
	});

	// Needed for the loading screen
	$rootScope.$on('$routeChangeStart', function () {
		$rootScope.loading = true;
	});

	$rootScope.$on('$routeChangeSuccess', function () {
		$rootScope.loading = false;
	});
});