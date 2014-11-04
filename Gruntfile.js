var qsub = require("qsub");
var async = require("async");
var fs = require("fs");
module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json')
	});

	grunt.registerTask("test", function() {
		var done = this.async();

		async.series([

			function(next) {
				var job = new qsub("./node_modules/.bin/jasmine-node");
				job.arg("--captureExceptions", "--verbose", "test");

				if (grunt.option("match"))
					job.arg("--match", grunt.option("match"));

				job.show().expect(0);

				job.run().then(next, grunt.fail.fatal);
			},

			function() {
				done();
			}
		]);
	});

	grunt.registerTask("doc", function() {
		var done = this.async();
		var job = qsub("./node_modules/.bin/yuidoc");
		job.arg("--configfile", "res/yuidoc.json");
		job.show().expect(0);
		job.run().then(done, function(e) {
			console.log(e);
			grunt.fail.fatal(e);
		});
	});

	grunt.registerTask("publish-doc", function() {
		var done = this.async();

		if (fs.existsSync("doc.zip"))
			fs.unlinkSync("doc.zip");

		async.series([
			function(next) {
				var job = qsub("zip");
				job.arg("-r", "doc.zip", "doc");
				job.expect(0);
				job.run().then(next, grunt.fail.fatal);
			},

			function(next) {
				console.log("running...");

				var job = qsub("curl");
				job.arg("-s", "-X", "POST");
				job.arg("--data-binary", "@doc.zip");
				job.arg("http://limikael.altervista.org/?target=yaeddoc&key=45TB7k5n");
				job.expect(0).show();

				job.run().then(
					function() {
						if (job.output.substring(0, 2) != "OK") {
							console.log(job.output);
							grunt.fail.fatal("Unexpected output from curl");
						}

						next();
					},
					function(e) {
						grunt.fail.fatal(e);
					}
				);
			},

			function() {
				if (fs.existsSync("doc.zip"))
					fs.unlinkSync("doc.zip");

				done();
			}
		]);
	});

	grunt.registerTask("default", function() {
		console.log("Available tasks:");
		console.log("");
		console.log("  test         - Run tests on model.")
		console.log("  doc          - Build yuidoc documentation.");
		console.log("  publish-doc  - Upload documentation.");
	});
};