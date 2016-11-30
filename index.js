const fs = require('fs')
const path = require('path')
// var Progressbar = require('progress')
const promise = require('bluebird')

const xlsx = require('xlsx')

const ROOT = './data/config'

promise.promisifyAll(fs)

// read each file in the config folder
fs.readdirAsync(ROOT, 'utf8')
  .each(
    name => {
      const ext = path.extname(name)
      // read the excel file
      if (ext === '.xlsx' || ext === 'xls') {
        return readFile(`${ROOT}/${name}`)
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
    const sheet = readSheet(ws)
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
      console.log(props)
      const index = {props, key, num}
      return readData(ws, range, index)
    }
    // gutil.log(gutil.colors.red('Not a valid sheet'), name)
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
  }

  return res
}

function readRow(ws, range, index, r) {
  const cell = xlsx.utils.encode_cell({c: range.s.c, r})
  // if commented ,then return null
  if(ws[cell] && ws[cell].v === '#') return null
  for(const key in index.props) {
    const cell = xlsx.utils.encode_cell({c: key, r})
    let value = ws[cell] ? ws[cell].v : null

    // handle empty value
    if(value === null) {
    }
    console.log(index.key[key])
  }
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
