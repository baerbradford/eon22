var _ = require('underscore');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var cssMin = require('gulp-minify-css');
var fileSystem = require('fs');
var forEach = require('gulp-foreach');
var gulp = require('gulp');
var gutil = require('gulp-util');
var handlebars = require('Handlebars');
var jsValidate = require('gulp-jsvalidate');
var markdown = require('gulp-markdown');
var path = require('path');
var Readable = require('stream').Readable;
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var tap = require('gulp-tap');
var uglify = require('gulp-uglify');
var webServer = require('gulp-webserver');

var metadata = {
    content: {},
    decades: {},
    events: {},
    localities: {},
    regions: {}
};
var metadataDefaults = {
    title: "Eon 22"
}

gulp.task('assets', ['css', 'img', 'js']);

gulp.task('build', ['cname', 'homepage']);

gulp.task('categories', ['assets', 'clean:html', 'pages', 'partials'], categories);

gulp.task('clean', ['clean:assets', 'clean:cname', 'clean:html']);

gulp.task('clean:assets', cleanAssets);

gulp.task('clean:cname', cleanCName);

gulp.task('clean:html', cleanHtml);

gulp.task('cname', ['clean:cname'], cName);

gulp.task('css', ['clean:assets'], css);

gulp.task('default', ['build']);

gulp.task('homepage', ['assets', 'categories', 'clean:html', 'partials'], homepage);

gulp.task('img', ['clean:assets'], img);

gulp.task('js', ['clean:assets'], js);

gulp.task('partials', partials);

gulp.task('pages', ['assets', 'clean:html', 'partials'], pages);

gulp.task('serve', ['default'], serve);

gulp.task('watch', ['default'], watch);

function applyTemplate(stream, file) {
    var fileName = path.basename(file.path, '.html');
    var data = metadata.content[fileName];
    data.content = file.contents.toString();
    var html = data.compiledTemplate(data);
    file.contents = new Buffer(html, 'utf-8');
    return stream;
}

function cName() {
    return stringSrc("CNAME", "eon22.com")
        .pipe(gulp.dest('docs/'));
}

function categories() {
    return gulp.src('content/categories/*.md')
        .pipe(forEach(grabMetadata))
        .pipe(markdown())
        .pipe(forEach(applyTemplate))
        .pipe(rename({
            dirname: ''
        }))
        .pipe(gulp.dest('docs'));
}

function cleanAssets() {
    return gulp.src([
            'docs/css',
            'docs/img',
            'docs/js'
        ], {
            read: false
        })
        .pipe(clean());
}

function cleanCName() {
    return gulp.src('docs/CNAME')
        .pipe(clean());
}

function cleanHtml() {
    return gulp.src('docs/*.html', {
            read: false
        })
        .pipe(clean());
}

function css() {
    return gulp.src([
            'content/css/bootstrap.min.css',
            'content/css/animate.min.css',
            'content/css/ares.css'
        ])
        .pipe(concat('main.min.css'))
        .pipe(cssMin())
        .pipe(gulp.dest('docs'));
}

function grabMetadata(stream, file) {
    var fileName = path.basename(file.path, '.md');
    var fileContent = file.contents.toString();
    var index = fileContent.indexOf('---');
    var fileData = {};

    if (index !== -1) {
        fileData = JSON.parse(fileContent.slice(0, index));
        fileContent = fileContent.slice(index + 3, fileContent.length);
        fileData.content = fileContent;
        fileData.name = fileName;
        fileData.url = file.relative.replace('.md', '');
        fileData.compiledTemplate = handlebars.compile(
            fileSystem.readFileSync('content/templates/' + fileData.template + '.hbs', 'utf8'));
    }

    if (file.path.indexOf('categories') !== -1) {
        var allContent = Object.keys(metadata.content).map(function (key) {
            return metadata.content[key];
        });
        var filteredContent = allContent.filter(function (content) {
            return content.category === fileData.linkTitle;
        });
        fileData.pages = filteredContent;
    }

    metadata.content[fileData.name] = fileData;
    file.contents = new Buffer(fileContent, 'utf-8');;
    return stream;
}

function homepage() {
    return gulp.src('content/templates/index.hbs')
        .pipe(tap(function (file) {
            var template = handlebars.compile(file.contents.toString());
            
            var allContent = Object.keys(metadata.content).map(function (key) {
                return metadata.content[key];
            });
            var regions = allContent.filter(function (content) {
                return content.template === 'region';
            });
            regions.sort(function (a, b) {
                return (a.title > b.title) ? 1 : ((b.title > a.title) ? -1 : 0);
            });
            var decades = allContent.filter(function (content) {
                return content.template === 'decade';
            });
            decades.sort(function (a, b) {
                return (a.linkTitle > b.linkTitle) ? 1 : ((b.linkTitle > a.linkTitle) ? -1 : 0);
            });
            var html = template({
                decades: decades,
                objectCount: allContent.filter(function (content) {
                    return content.template === 'object';
                }).length,
                peopleCount: allContent.filter(function (content) {
                    return content.template === 'person';
                }).length,
                regions: regions
            });
            file.contents = new Buffer(html, 'utf-8');
        }))
        .pipe(rename(function (path) {
            path.extname = '.html'
        }))
        .pipe(gulp.dest('docs'));
}

function img() {
    return gulp.src(['content/img/**/*'])
        .pipe(gulp.dest('docs/img'));
}

function js() {
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
}

function pages() {
    return gulp.src('content/pages/*.md')
        .pipe(forEach(grabMetadata))
        .pipe(markdown())
        .pipe(forEach(applyTemplate))
        .pipe(rename({
            dirname: ''
        }))
        .pipe(gulp.dest('docs'));
}

function partials() {
    return gulp.src('content/templates/partials/**.hbs')
        .pipe(tap(function (file) {
            var fileBaseName = path.basename(file.path, '.hbs');
            var template = handlebars.compile(file.contents.toString());
            handlebars.registerPartial(fileBaseName, template);
        }));
}

function serve() {
    var webConfig = {
        livereload: true,
        middleware: function (req, res, next) {
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
}

function stringSrc(filename, string) {
    var src = require('stream').Readable({
        objectMode: true
    })
    src._read = function () {
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

function watch() {
    return gulp.watch(['content/**'], ['default']);
}