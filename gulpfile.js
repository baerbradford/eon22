var clean = require('gulp-clean');
var gulp = require('gulp');

gulp.task('build', ['clean']);

gulp.task('clean', ['clean-build', 'clean-docs'])

gulp.task('clean-build', [], function () {
    return gulp.src('build', { read: false})
    .pipe(clean());
});

gulp.task('clean-docs', function () {
    return gulp.src('docs', { read: false})
    .pipe(clean());
});

gulp.task('default', ['build']);