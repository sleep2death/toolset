'use strict'

const gutil = require('gulp-util')
const xlsx = require('xlsx')

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

// get the row data
function row(ws, range, index, r) {
  const obj = {}

  const cell = xlsx.utils.encode_cell({c: range.s.c, r})
  if(ws[cell] && ws[cell].v === '#') return obj

  for(const key in index.props) {
    const cell = xlsx.utils.encode_cell({c: key, r})
    let value = ws[cell] ? ws[cell].v : null

    if(index.num[key] === true && value === null) {
      value = 0
    }else if(value === null && index.num[key] === false) {
      value = ''
    }

    if(index.num[key] && value === 'true') {
      value = true
    }else if(index.num[key] && value === 'false') {
      value = false
    }

    if(value === '#') return obj

    const propName = index.props[key]

    if(propName === undefined) continue
    obj[propName] = value

    // if group id or id existed, create a field for it
    if(index.key[key] === true) {
      obj.PID = value
    }else if(index.key[key] === 'GROUP') {
      obj.GID = value
    }
  }

  return obj
}

function getData(ws, range, index) {
  const res = {}

  for(let R = range.s.r; R <= range.e.r; ++R) {
    const firstCell = xlsx.utils.encode_cell({c: range.s.c, r: R})
    const firstCellValue = ws[firstCell] ? ws[firstCell].v : null

    // jump the index row
    if(firstCellValue === '$title' || firstCellValue === '$isKey' || firstCellValue === '$isNum') continue

    const vo = row(ws, range, index, R)
    if(!isEmpty(vo)) {
      // group id and id | group id only | id only
      if(vo.GID >= 0 && vo.PID >= 0) {
        if(res[vo.GID] === undefined) res[vo.GID] = {}
        res[vo.GID][vo.PID] = vo
      }else if(vo.GID >= 0 && vo.PID === undefined) {
        if(res[vo.GID] === undefined) res[vo.GID] = []
        res[vo.GID].push(vo)
      }else if(vo.GID === undefined && vo.PID >= 0) {
        res[vo.PID] = vo
      }
    }
  }

  return res
}

function xlsxParser(ws) {
  if(ws['!ref']) {
    const range = xlsx.utils.decode_range(ws['!ref'])

    // find the index objects
    const props = findIndexRow(ws, range, '$title')
    const key = findIndexRow(ws, range, '$isKey')
    const num = findIndexRow(ws, range, '$isNum')

    // if all index fields existed, fill the result
    if(props && key && num) {
      const index = {props, key, num}
      return getData(ws, range, index)
    }

    // gutil.log(gutil.colors.red('Not a valid sheet'), name)
  }

  return null
}

module.exports = xlsxParser
