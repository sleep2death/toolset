'use strict'

const fs = require('fs')

const gulp = require('gulp')
const gutil = require('gulp-util')

const async = require('async')
const xlsx = require('xlsx')

const sheet = require('../src/sprites-config-parser')
const generate = require('../src/generator')

const PATH = './data/sprites'
const PATH_OUTPUT = './data/sprites_output'

const WEAPON_ID = {
  sword: 1,
  spear: 2,
  axe: 3,
  bow: 4,
  staff: 5,
  fist: 6
}

gulp.task('sprites-packing', cb => {
  gutil.log(gutil.colors.yellow(`Start packing from ${PATH}`))

  fs.readdir(PATH, (err, files) => {
    if(err) throw err
    async.eachSeries(files, (file, next) => {
      if(fs.statSync(`${PATH}/${file}`).isDirectory() && file !== '.svn' && file !== 'NPC' && file === 'wulu') {
        pack(file, next)
      }else{
        next()
      }
    }, cb)
  })
})

function pack(file, next) {
  async.waterfall([
    cb => {
      createCharacterDir(file, cb) // create the main folder to hold the character's sprite sheets
    },
    cb => {
      readConfig(file, cb)
    },
    (config, cb) => {
      genNewVO(file, config, cb)
    },
    (vo, cb) => {
      createFolders(file, vo, cb)
    },
    (vo, cb) => {
      vo.PATH = PATH
      vo.PATH_OUTPUT = PATH_OUTPUT
      generate(file, vo, cb)
    }
  ], next)
}

const hasOwnProperty = Object.prototype.hasOwnProperty
function isEmpty(obj) {
  if (obj === null) {
    return true
  }

  if (obj.length > 0) {
    return false
  }

  if (obj.length === 0) {
    return true
  }

  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return false
    }
  }

  return true
}

// make character's output dir
function createCharacterDir(file, cb) {
  const outputDir = `${PATH_OUTPUT}/role_${file}`
  try{
    fs.accessSync(outputDir)
  }catch(err) {
    fs.mkdirSync(outputDir)
  }

  cb()
}

// parsing config
function readConfig(file, cb) {
  const configPath = `${PATH}/${file}/config.xlsx`
  try{
    fs.accessSync(configPath)
    const wb = xlsx.readFile(configPath)
    const res = sheet(wb.Sheets[wb.SheetNames[0]])
    cb(null, res)
  }catch(err) {
    throw err
  }
}

// generates new structs for unity
function genNewVO(file, config, cb) {
  const newVO = {}

  newVO.weapon = {} // create a weapon obj to hold all weapon's sprites
  newVO.body = {} // create a body obj to hold all weapon's sprites
  newVO.avatar = {} // create a avartar obj to hold all avartar's sprites
  newVO.avatar.decoration = {} // create a decoration obj to hold all decoration's sprites

  for(const key in config) {
    newVO.weapon[WEAPON_ID[key]] = {}
    for(const action in config[key]) {
      const aVO = config[key][action]
      newVO.weapon[WEAPON_ID[key]][action] = aVO.weapon
    }
  }

  const body = {}
  const decorations = {}

  for(const key in config) {
    const weaponNum = WEAPON_ID[key]
    // weapon
    newVO.weapon[weaponNum] = {}
    for(const action in config[key]) {
      const aVO = config[key][action]
      newVO.weapon[weaponNum][action] = aVO.weapon
    }

    // body && decorations
    for(const action in config[key]) {
      const aVO = config[key][action]

      if(!body[aVO.body]) {
        body[aVO.body] = {}
        body[aVO.body].str = ''
        body[aVO.body].action = action
      }

      body[aVO.body].str += `_${weaponNum}`

      if(aVO.deco) {
        if(!decorations[aVO.deco]) {
          decorations[aVO.deco] = {}
          decorations[aVO.deco].str = ''
          decorations[aVO.deco].action = action
        }

        decorations[aVO.deco].str += `_${weaponNum}`
      }
    }
  }

  for(const key in body) {
    // const names = key.split('_')
    // let k = reg.exec(names[1])[1]
    // k = (k === 'magic') ? 'skill_magic' : k
    const v = body[key].str === '_1_2_3_4_5_6' ? '' : body[key].str
    newVO.body[body[key].action + v] = key
  }

  for(const key in decorations) {
    // const names = key.split('_')
    // let k = reg.exec(names[1])[1]
    // k = (k === 'magic') ? 'skill_magic' : k
    // const v = decorations[key] === '_1_2_3_4_5_6' ? '' : decorations[key]
    // newVO.avatar.decoration[k + v] = key
    const v = decorations[key].str === '_1_2_3_4_5_6' ? '' : decorations[key].str
    newVO.avatar.decoration[decorations[key].action + v] = key
  }

  cb(null, newVO)
}

// create subfolders by new structs
function createFolders(file, vo, cb) {
  // create body, weapon, decorations
  for(const key in vo) {
    const dir = `${PATH_OUTPUT}/role_${file}/${key}`
    try{
      fs.accessSync(dir)
    }catch(err) {
      fs.mkdirSync(dir)
    }
  }

  // create body
  for(const key in vo.body) {
    const dir = `${PATH_OUTPUT}/role_${file}/body/${key}`
    try{
      fs.accessSync(dir)
    }catch(err) {
      fs.mkdirSync(dir)
    }
  }

  // create weapon
  for(const key in vo.weapon) {
    const dir = `${PATH_OUTPUT}/role_${file}/weapon/${key}`
    try{
      fs.accessSync(dir)
    }catch(err) {
      fs.mkdirSync(dir)
    }

    for(const action in vo.weapon[key]) {
      try{
        fs.accessSync(`${dir}/${action}`)
      }catch(err) {
        fs.mkdirSync(`${dir}/${action}`)
      }
    }
  }

  // create decorations
  const dir = `${PATH_OUTPUT}/role_${file}/avatar/decoration`
  try{
    fs.accessSync(dir)
  }catch(err) {
    fs.mkdirSync(dir)
  }

  if(!isEmpty(vo.avatar.decoration)) {
    for(const key in vo.avatar.decoration) {
      const dir = `${PATH_OUTPUT}/role_${file}/avatar/decoration/${key}`
      try{
        fs.accessSync(dir)
      }catch(err) {
        fs.mkdirSync(dir)
      }
    }
  }
  cb(null, vo)
}
