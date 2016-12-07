'use strict'

const fs = require('fs')
const process = require('process')
const exec = require('child_process').exec
const path = require('path')

const readline = require('readline')
// var Progressbar = require('progress')
const P = require('bluebird')
const chalk = require('chalk')

function fromProcess(childProcess, opts) {
  opts = opts || {}
  return new P((resolve, reject) => {
    let msg = ''
    let errMsg = ''

    childProcess.stdout.on('data', chunk => {
      msg += chunk
    })

    childProcess.stderr.on('data', error => {
      errMsg += error
    })

    childProcess.on('error', error => {
      errMsg += error
    })

    childProcess.on('close', exitCode => {
      const hasError = exitCode !== 0

      const resolutionFunction = hasError ? reject : resolve
      const resolutionMessage = msg + errMsg

      resolutionFunction(resolutionMessage)
    })
  })
}

const xlsx = require('xlsx')

const SRC = './data/config'
const ORG = 'https://192.168.6.215/svn/crossgate/trunk/策划'
const BIN = './data/config_output'

const USR = 'shimin'
const PWD = '123'

const ARGs = `--non-interactive --no-auth-cache --username ${USR} --password ${PWD}`

P.promisifyAll(fs)

// read each file in the config folder
fromProcess(
  // checkout both svn folders
  exec('svn', ['--non-interactive', '--no-auth-cache', '--username', 'aspirin2d', '--password', '123', 'checkout', 'https://192.168.6.215/svn/crossgate/trunk/策划/config', 'data/config'])
)
  .catch(err => {
    throwError(err)
  })
  .then(msg => {
    console.log(msg)

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
  })

function readFile(path) {
  // parsing xlsx
  const wb = xlsx.readFile(path)
  if(!wb) throwError(`Parsing Error: ${path}`)

  wb.SheetNames.forEach(name => {
    // dealing with worksheet
    const ws = wb.Sheets[name]
    ws.path = `${path}/${name}`
    const sheet = readSheet(ws)

    if(sheet) {
      fs.writeFile(`${BIN}/${name}.json.txt`, JSON.stringify(sheet, null, 4), err => {
        if(err) throwError(err)
      })
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
      readline.clearLine(process.stderr)
      readline.cursorTo(process.stderr, 0)
      process.stderr.write(`Parsing ${chalk.styles.green.open}${ws.path}${chalk.styles.green.close}`)
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
        throwError(`PID duplicated ${vo.PID}`)
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
        // console.log('empty id field')
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

      if(index.num[key]) {
        // if the value is boolean string, and type is number
        if(String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'false')
          value = value === 'true'
        else
          value = Number(value)
      }else{
        value = String(value)
      }
    }

    const propName = index.props[key]

    if(propName === undefined) throwError('proper name not found')
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

function throwError(str) {
  process.stderr.write(`\n${chalk.styles.red.open}$`)
  throw new Error(str)
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
