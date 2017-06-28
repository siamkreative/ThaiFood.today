/* eslint-env node */

'use strict';

var gulp = require('gulp');
var swPrecache = require('sw-precache');

gulp.task('generate-service-worker', function (callback) {
	swPrecache.write(`service-worker.js`, {
		staticFileGlobs: [
			'assets/**/*.{js,css,png,jpg,gif}',
			'views/*.html'
		]
	}, callback);
});