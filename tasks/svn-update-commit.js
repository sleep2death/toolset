'use strict'

const gulp = require('gulp')

const SPRITES_PATH = './data/sprites'
const SPRITES_PATH_OUTPUT = './data/sprites_output'

const shell = require('gulp-shell')

gulp.task('svn.update-sprites', shell.task([
  `svn update ${SPRITES_PATH}`,
  `svn update ${SPRITES_PATH_OUTPUT}`
], {verbose: true}))

gulp.task('svn.commit-sprites', shell.task([
  `svn commit ${SPRITES_PATH_OUTPUT}`
], {verbose: true}))

gulp.task('svn.add-sprites', shell.task([
  `svn add --force ${SPRITES_PATH_OUTPUT}/*`
], {verbose: true}))
