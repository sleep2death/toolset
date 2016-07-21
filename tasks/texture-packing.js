'use strict'

const fs = require('fs')
const gulp = require('gulp')
const gutil = require('gulp-util')
const shell = require('gulp-shell')
const walk = require('walk')
const xlsx = require('xlsx')
const spritesheet = require('spritesheet-js')
const sheet = require('../src/sprites-config-parser')
const packer = require('../src/packer')

const PATH = './data/sprites'
const PATH_OUTPUT = './data/sprites_output'

gulp.task('svn-update-sprites', shell.task([
  `svn update ${PATH}`,
  `svn update ${PATH_OUTPUT}`
], {verbose: true}))

gulp.task('parsing-sprites', ['svn-update-config'], cb => {
  // walk through the config folder
  const walker = walk.walk(`${PATH}`)

  walker.on('directories', (root, dirStatsArray, next) => {
    try {
      fs.statSync(`${root}/config.xlsx`)
      parse(root, dirStatsArray, next)
    }catch(err) {
      next()
    }
  })

  walker.on('end', () => {
    cb()
  })
})

gulp.task('texture-packing', ['parsing-sprites'], shell.task([
  // `echo Done`
  `svn commit ${PATH_OUTPUT}/*.txt -m '${new Date()}'`
], {verbose: true}))

function parse(root, stats, next) {
  // parsing excel config file and save to json
  const configPath = `${root}/config.xlsx`

  const wb = xlsx.readFile(configPath)

  if (!wb) {
    gutil.log(gutil.colors.red(`Something wrong when parsing the file ${configPath}`))
    return
  }

  const res = sheet(wb.Sheets[wb.SheetNames[0]])
  const path = root.split('/')
  const name = path[path.length - 1]

  // console.log(name)

  if(res !== null) {
    fs.writeFile(`${PATH_OUTPUT}/${name}.json.txt`, JSON.stringify(res, null, 4), err => {
      if (err) {
        console.log(err)
      }

      gutil.log(`${name} was saved`)
    })

    next()
    return

    // packing textures
    stats.forEach(stat => {
      const options = {
        format: 'json',
        path: `${PATH_OUTPUT}/${name}`,
        trim: true,
        name: `${stat.name}`
      }
      spritesheet(`${root}/${stat.name}/*.png`, options, err => {
        if(err) throw err
        packer(options)
      })
    })
  }
}
