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
    pages: {}
};
var metadataDefaults = {
    title: "Eon 22"
}

function string_src(filename, string) {
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

gulp.task('build', ['clean', 'cname', 'css', 'homepage', 'generate-region-pages', 'img', 'js']);

gulp.task('clean', ['clean-docs'])

gulp.task('clean-docs', function() {
    return gulp.src('docs', { read: false })
        .pipe(clean());
});

gulp.task('cname', ['clean'], function() {
    return string_src("CNAME", "eon22.com")
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

gulp.task('homepage', ['clean', 'register-partials'], function() {
    return gulp.src('content/templates/index.hbs')
        .pipe(tap(function(file) {
            var template = handlebars.compile(file.contents.toString());
            var html = template({});
            file.contents = new Buffer(html, 'utf-8');
        }))
        .pipe(rename(function(path) {
            path.extname = '.html'
        }))
        .pipe(gulp.dest('docs'));
});

gulp.task('generate-region-pages', ['clean', 'register-partials'], function() {
    return gulp.src('content/templates/region.hbs')
        .pipe(tap(function(file) {
            var template = handlebars.compile(file.contents.toString());

            return gulp.src('content/locations/regions/**.md')
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
                        if (dataOverride.title) {
                            data.title = dataOverride.title;
                        }

                        fileContent = fileContent.slice(index + 3, fileContent.length);
                        data.content = fileContent;
                    }

                    metadata.pages[data.name] = data;
                    file.contents = new Buffer(fileContent, 'utf-8');
                }))
                .pipe(markdown())
                .pipe(tap(function(file) {
                    var fileName = path.basename(file.path, '.html');
                    var data = metadata.pages[fileName];
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
        .pipe(uglify())
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