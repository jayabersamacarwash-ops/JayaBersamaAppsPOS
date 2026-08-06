import fs from 'fs'

const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8')
const lines = content.split('\n')
lines.forEach((line, index) => {
  if (line.includes('fetchAllRows')) {
    console.log(`L${index+1}: ${line.trim()}`)
  }
})
