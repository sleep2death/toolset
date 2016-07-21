'use strict'

const fs = require('fs')

const async = require('async')
const spritesheet = require('spritesheet-js')
const ProgressBar = require('progress')

const packer = require('../src/packer')

// generate spritesheets by vo
module.exports = function generate(file, vo, cb) {
  // generate body's spritesheet
  const genList = []

  const PATH = vo.PATH
  const PATH_OUTPUT = vo.PATH_OUTPUT

  // body
  for(const key in vo.body) {
    const f = vo.body[key]
    const arr = f.split('_')
    const hasAlpha = arr[2] === 'a'

    const oDir = `${PATH_OUTPUT}/role_${file}/body/${key}` // output dir
    const iDir = `${PATH}/${file}/${f}` // input dir

    if(hasAlpha) {
      // create a folder for alpha channel if not existed
      try{
        fs.accessSync(`${oDir}/a`)
      }catch(err) {
        fs.mkdirSync(`${oDir}/a`)
      }
      genList.push({iDir, oDir: `${oDir}/a`, key: `${key}_a`})

      genList.push({iDir: `${PATH}/${file}/${arr[0]}_${arr[1]}`, oDir, key})
    }else {
      genList.push({iDir, oDir, key})
    }
  }

  // weapon
  for(const key in vo.weapon) {
    const o = `${PATH_OUTPUT}/role_${file}/weapon/${key}`

    for(const action in vo.weapon[key]) {
      const iDir = `${PATH}/${file}/${vo.weapon[key][action]}` // input dir
      const oDir = `${o}/${action}` // output dir

      const f = vo.weapon[key][action]
      const arr = f.split('_')
      const hasAlpha = arr[2] === 'a'

      if(hasAlpha) {
        // create a folder for alpha channel if not existed
        try{
          fs.accessSync(`${oDir}/a`)
        }catch(err) {
          fs.mkdirSync(`${oDir}/a`)
        }
        genList.push({iDir, oDir: `${oDir}/a`, key: `${action}_a`})

        genList.push({iDir: `${PATH}/${file}/${arr[0]}_${arr[1]}`, oDir, key: `${action}`})
      }else {
        genList.push({iDir, oDir, key: `${action}`})
      }
    }
  }

  // deco
  for(const key in vo.avatar.decoration) {
    const f = vo.avatar.decoration[key]
    const arr = f.split('_')
    const hasAlpha = arr[2] === 'a'

    const oDir = `${PATH_OUTPUT}/role_${file}/avatar/decoration/${key}` // output dir
    const iDir = `${PATH}/${file}/${f}` // input dir

    if(hasAlpha) {
      // create a folder for alpha channel if not existed
      try{
        fs.accessSync(`${oDir}/a`)
      }catch(err) {
        fs.mkdirSync(`${oDir}/a`)
      }
      genList.push({iDir, oDir: `${oDir}/a`, key: `${key}_a`})

      genList.push({iDir: `${PATH}/${file}/${arr[0]}_${arr[1]}`, oDir, key})
    }else {
      genList.push({iDir, oDir, key})
    }
  }

  const bar = new ProgressBar('Packing sprites: [:bar] :current/:total :input -> :output', {
    total: genList.length
  })

  async.eachSeries(genList, (io, next) => {
    const options = {
      path: `${io.oDir}`,
      trim: true,
      padding: 1,
      name: `${io.key}`
    }

    spritesheet(`${io.iDir}/*.png`, options, err => {
      if(err) {
        throw err
      }
      packer(options, next)
    })
    bar.tick({input: io.iDir, output: io.oDir})
  }, cb)
}
