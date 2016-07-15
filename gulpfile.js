'use strict'

const fs = require('fs')
const path = require('path')
const gutil = require('gulp-util')
const shell = require('gulp-shell')
const gulp = require('gulp')
const walk = require('walk')
const xlsx = require('xlsx')
const sheet = require('./parser')

const CONFIG_PATH = './data/config'
const OUTPUT_PATH = './data/config_output'

gulp.task('parse', ['svn-update'], cb => {
  // walk through the config folder
  const walker = walk.walk(`${CONFIG_PATH}`)

  walker.on('file', (root, fileStats, next) => {
    if (path.extname(fileStats.name) === '.xlsx') {
      parse(`${root}/${fileStats.name}`)
    }
    next()
  })

  walker.on('end', () => {
    cb()
  })
})

gulp.task('svn-update', shell.task([
  `svn update ${CONFIG_PATH}`
], {verbose: true}))

gulp.task('svn-commit', ['parse'], shell.task([
  `svn commit ${OUTPUT_PATH}/*.txt -m '${new Date()}'`
], {verbose: true}))

gulp.task('default', ['svn-update', 'parse', 'svn-commit'])

function parse(path) {
  gutil.log(gutil.colors.grey(`parsing file: ${path}`))

  // read the excel file, 'wb' is short for workbook
  const wb = xlsx.readFile(path)
  wb.filePath = path

  if (!wb) {
    gutil.log(gutil.colors.red(`Something wrong when parsing the file ${path}`))
    return
  }

  const res = []

  wb.SheetNames.forEach(name => {
    // find the sheet by name, 'ws' is short for worksheet
    const ws = wb.Sheets[name]
    // working on sheet
    // if(name === 'TaskPrizeCfg') {
    const res = sheet(ws, name)
    if(res !== null) {
      fs.writeFile(`${OUTPUT_PATH}/${name}.json.txt`, JSON.stringify(res, null, 4), err => {
        if (err) {
          return console.log(err)
        }

        // console.log(`${name} was saved`)
      })
    }
    // }
  })

  return res
}
