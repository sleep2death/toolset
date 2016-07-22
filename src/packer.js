'use strict'

const os = require('os')
const fs = require('fs')

const async = require('async')
const exec = require('platform-command').exec

module.exports = (options, next) => {
  let str = ''
  const picH = options.height

  str += `:format=40000${os.EOL}`
  str += `:texture=${options.name}.png${os.EOL}`
  str += `:size=${options.width}x${options.height}${os.EOL}`
  str += `:pivotpoints=enabled${os.EOL}`
  str += `${os.EOL}`

  options.files.forEach(file => {
    const width = file.width
    const height = file.height

    const pX = ((file.trim.width * 0.5) + file.trim.frameX) / width
    const pY = (height - ((file.trim.height * (1 - 0.406)) + file.trim.frameY)) / height

    str += `${file.name};${file.x};${picH - (file.y + file.height)};${width};${height};${pX};${pY}${os.EOL}`
  })

  async.waterfall([
    cb => {
      tpsheet(options, str, cb)
    },
    cb => {
      convert(options, cb)
    },
    cb => {
      remove(options, cb)
    }
  ], next)
}

// write tpsheet file
function tpsheet(options, str, cb) {
  const name = options.name.split('_')
  fs.writeFile(`${options.path}/${name[0]}.tpsheet`, str, err => {
    if (err) {
      return console.log(err)
    }
    cb()
  })
}

// convert png32 to tga24
function convert(options, cb) {
  exec(`convert ${options.path}/${options.name}.png ${options.path}/${options.name}.png`, err => {
    if(err) throw err
    cb()
  })
}

function remove(options, cb) {
  exec(`rm ${options.path}/${options.name}.json`, err => {
    if(err) throw err
    cb()
  })
}
