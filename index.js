'use strict'

const fs = require('fs')
const process = require('process')
const readline = require('readline')
const path = require('path')
// var Progressbar = require('progress')
const promise = require('bluebird')

const xlsx = require('xlsx')

const SRC = './data/config'
const BIN = './data/config_output'

promise.promisifyAll(fs)

// read each file in the config folder
fs.readdirAsync(SRC, 'utf8')
  .each(
    name => {
      const ext = path.extname(name)
      // read the excel file
      if (ext === '.xlsx' || ext === 'xls') {
        this.currentFile = `${SRC}/${name}`
        return readFile(`${SRC}/${name}`)
      }
    }
  )
  .error(
    e => console.log(e)
  )
  .then(
    () => console.log('ALL DONE')
  )

function readFile(path) {
  // parsing xlsx
  const wb = xlsx.readFile(path)
  if(!wb) throw new Error(`Parsing Error: ${path}`)

  wb.SheetNames.forEach(name => {
    // dealing with worksheet
    const ws = wb.Sheets[name]
    ws.path = `${path}/${name}`
    const sheet = readSheet(ws)

    if(sheet) {
    }
  })
}

function readSheet(ws) {
  if(ws['!ref']) {
    const range = xlsx.utils.decode_range(ws['!ref'])

    // find the index objects
    const props = findIndexRow(ws, range, '$title')
    const key = findIndexRow(ws, range, '$isKey')
    const num = findIndexRow(ws, range, '$isNum')

    // if all index fields existed, fill the result
    if(props && key && num) {
      readline.clearLine(process.stderr, 1)
      readline.cursorTo(process.stderr, 0)
      process.stderr.write(` Parsing ${ws.path}...\x1B[0G`)
      // process.stdout.write(` Parsing ${ws.path}...\x1B[0G`)
      const index = {props, key, num}
      return readData(ws, range, index)
    }
  }

  return null
}

function readData(ws, range, index) {
  const res = {}

  for(let R = range.s.r; R <= range.e.r; ++R) {
    const firstCell = xlsx.utils.encode_cell({c: range.s.c, r: R})
    const firstCellValue = ws[firstCell] ? ws[firstCell].v : null

    // jump the index rows
    if(firstCellValue === '$title' || firstCellValue === '$isKey' || firstCellValue === '$isNum') continue

    // read the row
    const vo = readRow(ws, range, index, R)
    if(!vo) continue

    if(vo.GID >= 0 && vo.PID >= 0) {
      if(res[vo.GID] === undefined) res[vo.GID] = {}
      res[vo.GID][vo.PID] = vo
    }else if(vo.GID >= 0 && vo.PID === undefined) {
      if(res[vo.GID] === undefined) res[vo.GID] = []
      res[vo.GID].push(vo)
    }else if(vo.GID === undefined && vo.PID >= 0) {
      if(res[vo.PID]) {
        process.stderr.write(`\n`)
        throw new Error(`PID duplicated ${vo.PID}`)
      }
      res[vo.PID] = vo
    }
  }

  return res
}

function readRow(ws, range, index, r) {
  const cell = xlsx.utils.encode_cell({c: range.s.c, r})
  const data = {}
  // if commented ,then return null
  if(ws[cell] && ws[cell].v === '#') return null
  for(const key in index.props) {
    const cell = xlsx.utils.encode_cell({c: key, r})
    let value = ws[cell] ? ws[cell].v : undefined
    // handle empty value
    if(value === undefined || String(value).trim().length === 0) {
      // if id is empty, ignore it
      if(index.key[key] === true || index.key[key] === 'GROUP') {
        console.log('empty id field')
        return null
      }

      // the default value of number field is 0, string field is ''
      value = index.num[key] === true ? 0 : ''
    }else{
      // return when hit comment tag
      if(value === '#') {
        if(isEmpty(data)) return null
        return data
      }

      // if the value is number, stringify it
      value = index.num[key] ? Number(value) : String(value)
      // if the value is boolean string, and type is number
      if(index.num[key] && value === 'true') throw new Error('string found in number field')
    }

    const propName = index.props[key]

    if(propName === undefined) throw new Error('proper name not found')
    data[propName] = value

    if(index.key[key] === true) data.PID = value
    if(index.key[key] === 'GROUP') data.GID = value
  }

  return data
}

// get the index object by the certain name: $title, $isKey, $isNum
function findIndexRow(ws, range, name) {
  for(let R = range.s.r; R <= range.e.r; ++R) {
    const firstCell = xlsx.utils.encode_cell({c: range.s.c, r: R})
    if(ws[firstCell] && ws[firstCell].v === name) {
      const props = {}
      let commentOn = false

      for(let C = range.s.c + 1; C <= range.e.c; ++C) {
        const cell = xlsx.utils.encode_cell({c: C, r: R})

        if(ws[cell] && ws[cell].v === '#') commentOn = true
        if(ws[cell] && commentOn === false) {
          props[C] = ws[cell].v
        }
      }

      return props
    }
  }

  return null
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
