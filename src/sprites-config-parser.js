'use strict'

const xlsx = require('xlsx')

const ACTION = 0
const PARTS = 1

function getRowData(ws, range, row) {
  const rowData = {}
  let currentAction = null

  for(let C = range.s.c; C <= range.e.c; ++C) {
    const parts = xlsx.utils.encode_cell({c: C, r: PARTS})
    const partsV = ws[parts] ? ws[parts].v : null

    const action = xlsx.utils.encode_cell({c: C, r: ACTION})
    const actionV = ws[action] ? ws[action].v : null
    if(actionV) currentAction = actionV

    const cell = xlsx.utils.encode_cell({c: C, r: row})
    const cellV = ws[cell] ? String(ws[cell].v).trim() : null

    if(partsV && cellV && currentAction) {
      if(!rowData[currentAction]) rowData[actionV] = {}
      if(!rowData[currentAction][partsV]) rowData[currentAction][partsV] = {}

      rowData[currentAction][partsV] = cellV
    }
  }

  return rowData
}

function spritesConfigParser(ws) {
  if(ws['!ref']) {
    const range = xlsx.utils.decode_range(ws['!ref'])
    const result = {}

    for(let R = range.s.r; R <= range.e.r; ++R) {
      const firstCell = xlsx.utils.encode_cell({c: range.s.c, r: R})
      const firstCellValue = ws[firstCell] ? ws[firstCell].v : null

      if(firstCellValue) {
        result[firstCellValue] = getRowData(ws, range, R)
      }
    }
    return result
  }

  return null
}

module.exports = spritesConfigParser
