var _ = require('underscore');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var cssMin = require('gulp-minify-css');
var gulp = require('gulp');
var gutil = require('gulp-util');
var handlebars = require('Handlebars');
var jsValidate = require('gulp-jsvalidate');
var markdown = require('gulp-markdown');
var path = require('path');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var tap = require('gulp-tap');
var uglify = require('gulp-uglify');
var webServer = require('gulp-webserver');

var metadata = {
    decades: {},
    events: {},
    localities: {},
    regions: {}
};
var metadataDefaults = {
    title: "Eon 22"
}

function stringSrc(filename, string) {
    var src = require('stream').Readable({ objectMode: true })
    src._read = function() {
        this.push(new gutil.File({
            cwd: "",
            base: "",
            path: filename,
            contents: new Buffer(string)
        }))
        this.push(null)
    }
    return src
}

gulp.task('build', [
    'clean',
    'cname',    
    'css',
    'generate-decades',
    'generate-localities',
    'generate-regions',
    'homepage',    
    'img',
    'js'
]);

gulp.task('clean', function() {
    return gulp.src('docs', { read: false })
    .pipe(clean());
});

gulp.task('cname', ['clean'], function() {
    return stringSrc("CNAME", "eon22.com")
        .pipe(gulp.dest('docs/'))
});

gulp.task('css', ['clean'], function() {
    gulp.src([
            'content/css/bootstrap.min.css',
            'content/css/animate.min.css',
            'content/css/ares.css'
        ])
        .pipe(concat('main.min.css'))
        .pipe(cssMin())
        .pipe(gulp.dest('docs'));
});

gulp.task('default', ['build']);

gulp.task('homepage', ['clean', 'generate-decades', 'generate-regions', 'register-partials'], function() {
    return gulp.src('content/templates/index.hbs')
        .pipe(tap(function(file) {
            var template = handlebars.compile(file.contents.toString());
            var regions = Object.keys(metadata.regions).map(function(key) { return metadata.regions[key]; });
            regions.sort(function(a, b) { return (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0); });
            var html = template({
                regions: regions
            });
            file.contents = new Buffer(html, 'utf-8');
        }))
        .pipe(rename(function(path) {
            path.extname = '.html'
        }))
        .pipe(gulp.dest('docs'));
});

gulp.task('generate-decades', ['clean'], function() {
    return gulp.src('content/templates/decade.hbs')
        .pipe(tap(function(file) {
            var template = handlebars.compile(file.contents.toString());

            return gulp.src('content/timeline/decades/**.md')
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.md');
                    var fileContent = file.contents.toString();
                    var data = {
                        content: file.contents.toString(),
                        linkTitle: "????",
                        name: fileName,
                        title: metadataDefaults.title,
                        url: file.relative.replace('.md', '')
                    };
                    var index = fileContent.indexOf('---');
                    if (index !== -1) {
                        var dataOverride = JSON.parse(fileContent.slice(0, index));
                        if (dataOverride.linkTitle) {
                            data.linkTitle = dataOverride.linkTitle;
                        }
                        if (dataOverride.title) {
                            data.title = dataOverride.title;
                        }

                        fileContent = fileContent.slice(index + 3, fileContent.length);
                        data.content = fileContent;
                    }

                    metadata.decades[data.name] = data;
                    file.contents = new Buffer(fileContent, 'utf-8');
                }))
                .pipe(markdown())
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.html');
                    var data = metadata.decades[fileName];
                    data.content = file.contents.toString();
                    var allEvents = Object.keys(metadata.events).map(function(key) { return metadata.events[key]; });
                    var decadeEvents = allEvents.filter(function(event) {
                        return event.decade === data.linkTitle;
                    });
                    decadeEvents.sort(function(a, b) { return (a.title < b.title) ? 1 : ((b.title < a.title) ? -1 : 0); });
                    data.events = decadeEvents;
                    var html = template(data);
                    file.contents = new Buffer(html, 'utf-8');
                }))
                .pipe(gulp.dest('docs'));
        }));
});

gulp.task('generate-regions', ['clean', 'generate-localities', 'register-partials'], function() {
    return gulp.src('content/templates/region.hbs')
        .pipe(tap(function(file) {
            var template = handlebars.compile(file.contents.toString());

            return gulp.src('content/locations/regions/**.md')
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.md');
                    var fileContent = file.contents.toString();
                    var data = {
                        content: file.contents.toString(),
                        linkTitle: 'Unknown Region',
                        planetColor: "#3673cc",
                        planetLineWidth: 22,
                        planetSize: 51,
                        name: fileName,
                        title: metadataDefaults.title,
                        url: file.relative.replace('.md', '')
                    };
                    var index = fileContent.indexOf('---');
                    if (index !== -1) {
                        var dataOverride = JSON.parse(fileContent.slice(0, index));
                        if (dataOverride.linkTitle) {
                            data.linkTitle = dataOverride.linkTitle;
                        }
                        if (dataOverride.planetColor) {
                            data.planetColor = dataOverride.planetColor;
                        }
                        if (dataOverride.planetLineWidth) {
                            data.planetLineWidth = dataOverride.planetLineWidth;
                        }
                        if (dataOverride.planetSize) {
                            data.planetSize = dataOverride.planetSize;
                        }
                        if (dataOverride.title) {
                            data.title = dataOverride.title;
                        }

                        fileContent = fileContent.slice(index + 3, fileContent.length);
                        data.content = fileContent;
                    }

                    metadata.regions[data.name] = data;
                    file.contents = new Buffer(fileContent, 'utf-8');
                }))
                .pipe(markdown())
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.html');
                    var data = metadata.regions[fileName];
                    data.content = file.contents.toString();
                    var allLocalities = Object.keys(metadata.localities).map(function(key) { return metadata.localities[key]; });
                    var regionLocalities = allLocalities.filter(function(locality) {
                        return locality.region === data.linkTitle;
                    });
                    regionLocalities.sort(function(a, b) { return (a.title < b.title) ? 1 : ((b.title < a.title) ? -1 : 0); });
                    data.localities = regionLocalities;
                    var html = template(data);
                    file.contents = new Buffer(html, 'utf-8');
                }))
                .pipe(gulp.dest('docs'));
        }));
});

gulp.task('generate-localities', ['clean', 'register-partials'], function() {
    return gulp.src('content/templates/locality.hbs')
        .pipe(tap(function(file) {
            var template = handlebars.compile(file.contents.toString());

            return gulp.src('content/locations/localities/**.md')
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.md');
                    var fileContent = file.contents.toString();
                    var data = {
                        content: file.contents.toString(),
                        name: fileName,
                        title: metadataDefaults.title,
                        url: file.relative.replace('.md', '')
                    };
                    var index = fileContent.indexOf('---');
                    if (index !== -1) {
                        var dataOverride = JSON.parse(fileContent.slice(0, index));
                        if (dataOverride.linkTitle) {
                            data.linkTitle = dataOverride.linkTitle;
                        }
                        if (dataOverride.region) {
                            data.region = dataOverride.region;
                        }
                        if (dataOverride.title) {
                            data.title = dataOverride.title;
                        }

                        fileContent = fileContent.slice(index + 3, fileContent.length);
                        data.content = fileContent;
                    }

                    metadata.localities[data.name] = data;
                    file.contents = new Buffer(fileContent, 'utf-8');
                }))
                .pipe(markdown())
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.html');
                    var data = metadata.localities[fileName];
                    data.content = file.contents.toString();
                    var html = template(data);
                    file.contents = new Buffer(html, 'utf-8');
                }))
                .pipe(gulp.dest('docs'));
        }));
});

gulp.task('img', ['clean'], function() {
    gulp.src(['content/img/**/*']).pipe(gulp.dest('docs/img'));
});

gulp.task('js', ['clean'], function() {
    return gulp.src([
            'content/js/jquery.min.js',
            'content/js/jquery.appear.min.js',
            'content/js/jquery.countTo.min.js',
            'content/js/jquery.easypiechart.min.js',
            'content/js/ares.js'
        ])
        .pipe(jsValidate())
        // .pipe(uglify())
        .pipe(concat('main.min.js'))
        .pipe(gulp.dest('docs'));
});

gulp.task('register-partials', [], function() {
    return gulp.src('content/templates/partials/**.hbs')
        .pipe(tap(function(file) {
            var fileBaseName = path.basename(file.path, '.hbs');
            var template = handlebars.compile(file.contents.toString());
            handlebars.registerPartial(fileBaseName, template);
        }));
});

gulp.task('serve', [], function() {
    var webConfig = {
        livereload: true,
        middleware: function(req, res, next) {
            if (req.url.indexOf('.') >= 0) {
                // Already has extension. Don't modify.
                next();
                return;
            }

            // If `/` is requested. append index to it
            if (req.url === '/') {
                req.url = '/index';
            }
            // Append .html.
            const url = req.url + '.html';
            req.url = url;
            next();
        },
        open: 'http://localhost',
        port: 80
    };
    return gulp.src('docs')
        .pipe(webServer(webConfig));
});

gulp.task('watch', [], function() {
    return gulp.watch(['content/**'], ['default']);
});